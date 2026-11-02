# Modulo 4 — Registri della CPU

> **Prerequisiti**: Moduli 1–3 (ciclo di esecuzione, architettura, dimensioni dei
> dati, complemento a due, little-endian).
> **Architettura di riferimento**: x86-64, NASM, Linux 64 bit.
> **Obiettivo del modulo**: conoscere i registri x86-64, capire come si accede
> alle loro porzioni, quali sono le convenzioni d'uso e cosa cambia scrivendo in
> dimensioni diverse.

---

## 1. Introduzione e definizione

Un **registro** è una piccola area di memoria interna alla CPU, accessibile in
modo estremamente rapido, usata per contenere valori temporanei: operandi,
risultati, indirizzi, contatori, flag di stato.

I registri sono il livello più alto della gerarchia delle memorie:

```
registri  <  cache L1  <  L2  <  L3  <  RAM  <  disco
```

Caratteristiche:

- **pochissimi**: su x86-64 ci sono 16 registri di uso generale da 64 bit, più
  registri speciali e vettoriali;
- **velocissimi**: l'accesso avviene dentro la pipeline, senza passare dalla
  cache;
- **non indirizzabili**: non hanno un indirizzo di memoria; si nominano
  direttamente nelle istruzioni;
- **non persistenti**: il sistema operativo li salva e ripristina al cambio di
  processo; l'ABI stabilisce chi li preserva tra chiamate.

### Registri e RAM: differenze

| Aspetto | Registri | RAM |
|---|---|---|
| Posizione | dentro la CPU | esterna, sul bus di memoria |
| Capacità | decine/centinaia di byte | gigabyte |
| Latenza | ~1 ciclo (o meno) | centinaia di cicli |
| Indirizzamento | per nome | per indirizzo |
| Persistenza | fino alla prossima istruzione che li sovrascrive | fino a spegnimento/rilascio |
| Chi li gestisce | il programmatore e il compilatore | il programmatore, tramite indirizzi |

Poiché i registri sono pochi, il compilatore deve **allocarli** con cura. Quando
non bastano, i valori vengono "versati" in memoria (*register spilling*), con un
costo.

### Generali e specializzati

- **Registri di uso generale (GPR)**: `rax`, `rbx`, `rcx`, `rdx`, `rsi`, `rdi`,
  `rbp`, `rsp`, `r8`–`r15`. Possono contenere dati o indirizzi, ma alcuni hanno
  ruoli convenzionali.
- **Registri specializzati**: `rip` (program counter), `rflags` (flag), registri
  di segmento, di controllo, di debug, x87/MMX/SIMD.

---

## 2. Spiegazione teorica approfondita

### 4.2 Registri generali x86-64

I 16 registri di uso generale sono una delle novità di x86-64 rispetto a x86 a
32 bit (che ne aveva 8). I nomi derivano dalla storia dell'8086:

| Registro | Nome storico | Ruolo tradizionale |
|---|---|---|
| `rax` | Accumulator | accumulatore, risultati, `mul`/`div` |
| `rbx` | Base | puntatore base, dati |
| `rcx` | Count | contatore di cicli e stringhe, shift |
| `rdx` | Data | dati, parte alta di `mul`/`div` |
| `rsi` | Source Index | indice sorgente nelle stringhe |
| `rdi` | Destination Index | indice destinazione nelle stringhe |
| `rbp` | Base Pointer | puntatore al frame dello stack |
| `rsp` | Stack Pointer | cima dello stack |
| `r8`–`r15` | — | aggiunti in x86-64 |

Attenzione: i ruoli "storici" sono **convenzioni**, non vincoli dell'hardware.
Puoi usare `rax` come contatore o `rcx` come accumulatore, ma alcune istruzioni
impongono registri specifici e l'ABI impone chi preservare.

#### `rax` — Accumulatore

- **Funzione**: registro principale per risultati e operazioni aritmetiche.
- **Uso**: valore di ritorno delle funzioni (System V AMD64 e Windows x64),
  numero di system call su Linux, accumulatore implicito in `mul`/`div`
  (`rdx:rax`), sorgente/destinazione implicita in alcune istruzioni di stringa.
- **Storia**: l'8086 aveva `ax`, l'accumulatore; molte istruzioni avevano forme
  più corte specifiche per l'accumulatore.
- **Convenzioni**: **caller-saved** in entrambe le ABI; per le funzioni variadiche
  System V, `al` contiene il numero di registri vettoriali usati.
- **Attenzione**: scrivere `eax` azzera la parte alta di `rax`.

#### `rbx` — Base

- **Funzione**: registro generico, tradizionalmente usato come base per
  indirizzi di memoria.
- **Uso**: dati persistenti all'interno di una funzione; nei modelli PIC a 32
  bit era usato per il GOT (`ebx`).
- **Storia**: "base register" nell'8086; poteva indirizzare memoria con
  `[bx]`.
- **Convenzioni**: **callee-saved** in System V e Windows: chi lo usa deve
  salvarne e ripristinarne il valore.

#### `rcx` — Count

- **Funzione**: contatore.
- **Uso**: contatore per `rep` e `loop`, conteggio degli shift (`cl`), quarto
  argomento intero in System V, primo argomento in Windows x64.
- **Storia**: "count register"; le istruzioni di stringa usavano `cx`.
- **Convenzioni**: **caller-saved** (System V); **volatile** su Windows (primo
  argomento).
- **Attenzione**: `syscall` su Linux **sovrascrive** `rcx` con l'indirizzo di
  ritorno.

#### `rdx` — Data

- **Funzione**: registro dati, secondo operando implicito nelle moltiplicazioni
  e divisioni.
- **Uso**: parte alta del prodotto/dividendo in `mul`/`div` (`rdx:rax`), terzo
  argomento in System V, secondo in Windows, porta per le istruzioni `in`/`out`
  (`dx`).
- **Storia**: "data register".
- **Convenzioni**: **caller-saved** / volatile.

#### `rsi` — Source Index

- **Funzione**: indice sorgente per le operazioni su stringhe.
- **Uso**: `movs`, `lods`, `cmps` leggono da `[rsi]`; secondo argomento intero in
  System V.
- **Storia**: "source index" dell'8086.
- **Convenzioni**: **caller-saved** in System V, **callee-saved** su Windows
  x64.

#### `rdi` — Destination Index

- **Funzione**: indice destinazione per le operazioni su stringhe.
- **Uso**: `movs`, `stos`, `scas` scrivono/leggono `[rdi]`; primo argomento
  intero in System V.
- **Storia**: "destination index".
- **Convenzioni**: **caller-saved** in System V, **callee-saved** su Windows
  x64.

#### `rbp` — Base Pointer

- **Funzione**: puntatore al frame dello stack (base del frame corrente).
- **Uso**: accesso a parametri e variabili locali con offset stabili; può essere
  liberato come registro generico se il compilatore omette il frame pointer
  (`-fomit-frame-pointer`).
- **Storia**: "base pointer"; in 16 bit era il registro base tipico per accedere a
  parametri e variabili locali nello stack.
- **Convenzioni**: **callee-saved** in entrambe le ABI.

#### `rsp` — Stack Pointer

- **Funzione**: puntatore alla cima dello stack (indirizzo più basso, perché lo
  stack cresce verso il basso).
- **Uso**: `push`, `pop`, `call`, `ret` lo modificano automaticamente; accesso a
  parametri passati sullo stack.
- **Storia**: "stack pointer".
- **Convenzioni**: **speciale**, non va usato come registro generico. In System V,
  prima di una `call` `rsp` deve essere allineato a 16 byte; all'ingresso della
  funzione, dopo il push dell'indirizzo di ritorno, `rsp % 16 == 8`.

#### `r8`–`r15`

- **Funzione**: registri generici aggiunti in x86-64.
- **Uso**: argomenti 5° e 6° in System V (`r8`, `r9`); `r10` è il quarto
  argomento delle **system call** Linux; `r11` è sovrascritto da `syscall`;
  `r12`–`r15` sono callee-saved.
- **Storia**: non esistevano prima di x86-64.
- **Convenzioni**:
  - System V: `r8`–`r11` caller-saved; `r12`–`r15` callee-saved.
  - Windows: `r8`, `r9` argomenti; `r10`, `r11` volatile; `r12`–`r15`
    callee-saved.

#### Tabella riassuntiva delle convenzioni

| Registro | System V AMD64 | Windows x64 | Note |
|---|---|---|---|
| `rax` | ritorno, caller-saved | ritorno, volatile | syscall number su Linux |
| `rbx` | callee-saved | callee-saved | — |
| `rcx` | 4° arg, caller-saved | 1° arg, volatile | shift count `cl` |
| `rdx` | 3° arg, caller-saved | 2° arg, volatile | `rdx:rax` |
| `rsi` | 2° arg, caller-saved | callee-saved | stringhe |
| `rdi` | 1° arg, caller-saved | callee-saved | stringhe |
| `rbp` | callee-saved | callee-saved | frame pointer |
| `rsp` | speciale | speciale | stack |
| `r8` | 5° arg, caller-saved | 3° arg, volatile | — |
| `r9` | 6° arg, caller-saved | 4° arg, volatile | — |
| `r10` | caller-saved | volatile | 4° arg **syscall** |
| `r11` | caller-saved | volatile | clobber da `syscall` |
| `r12`–`r15` | callee-saved | callee-saved | — |

Regola pratica: **caller-saved** = il chiamante deve salvare il valore se gli
serve dopo la chiamata; **callee-saved** = la funzione chiamata deve preservarlo.

### 4.3 Sotto-registri

Su x86-64 ogni registro di uso generale ha porzioni più piccole, con nomi
storici:

| 64 bit | 32 bit | 16 bit | 8 bit alto | 8 bit basso |
|---|---|---|---|---|
| `rax` | `eax` | `ax` | `ah` | `al` |
| `rbx` | `ebx` | `bx` | `bh` | `bl` |
| `rcx` | `ecx` | `cx` | `ch` | `cl` |
| `rdx` | `edx` | `dx` | `dh` | `dl` |
| `rsi` | `esi` | `si` | — | `sil` |
| `rdi` | `edi` | `di` | — | `dil` |
| `rbp` | `ebp` | `bp` | — | `bpl` |
| `rsp` | `esp` | `sp` | — | `spl` |
| `r8`–`r15` | `r8d`–`r15d` | `r8w`–`r15w` | — | `r8b`–`r15b` |

#### Struttura

```
RAX  [ 63 ........................ 32 ][ 31 ...... 16 ][ 15 ... 8 ][ 7 ... 0 ]
                                        AX              AH         AL
                                                         └── EAX ──┘
```

- `al` = bit 0–7;
- `ah` = bit 8–15;
- `ax` = bit 0–15;
- `eax` = bit 0–31;
- `rax` = bit 0–63.

`sil`, `dil`, `bpl`, `spl` sono i corrispondenti a 8 bit bassi dei registri che
non hanno una forma "alta": sono stati introdotti con x86-64.

#### Effetti della scrittura

Questa è la regola più importante del modulo:

| Scrittura | Effetto |
|---|---|
| `rax` (64 bit) | sostituisce tutti i 64 bit |
| `eax` (32 bit) | scrive i 32 bit bassi e **azzera i 32 bit alti** |
| `ax` (16 bit) | scrive i 16 bit bassi, **preserva** i 48 bit alti |
| `al` (8 bit) | scrive gli 8 bit bassi, **preserva** i 56 bit alti |

Esempio:

```nasm
mov rax, 0x1122334455667788
mov al,  0xAA                  ; RAX = 0x11223344556677AA
mov ax,  0xBBCC                ; RAX = 0x112233445566BBCC
mov eax, 0xDDEEFF00            ; RAX = 0x00000000DDEEFF00
xor eax, eax                   ; RAX = 0x0000000000000000
```

La scrittura a 32 bit è l'unica che azzera la parte alta: è una scelta
dell'architettura per evitare dipendenze parziali e permettere di usare
`mov eax, eax` come zero-extension.

#### `ah`, `bh`, `ch`, `dh` e il prefisso REX

I registri `ah`/`bh`/`ch`/`dh` non possono essere codificati insieme a un
prefisso **REX** (usato per `r8`–`r15`, per gli operandi a 64 bit e per
`sil`/`dil`/`bpl`/`spl`). Quindi:

```nasm
mov ah, 1          ; ok
mov r8b, 1         ; ok
mov ah, r8b        ; errore: REX + AH non sono codificabili
```

In pratica, nei programmi a 64 bit si usano `al`, `bl`, ... e i registri
`r8b`–`r15b`; `ah`–`dh` compaiono soprattutto in codice legacy.

#### `eip` e `rip`

- `rip` è il **program counter** a 64 bit: contiene l'indirizzo della prossima
  istruzione.
- `eip` è la porzione a 32 bit; in modalità a 64 bit **non è un registro
  indirizzabile** con `mov`.
- Non si può scrivere `rip` direttamente: lo cambiano `jmp`, `call`, `ret`,
  interruzioni e `syscall`.
- Per leggere l'indirizzo corrente si usa `lea` con indirizzamento relativo:

```nasm
lea rax, [rel etichetta]   ; indirizzo di etichetta
```

In x86-64 l'indirizzamento relativo a `rip` è il default per i dati se si usa
`default rel` o la parola chiave `rel`; in 32 bit non esisteva e si usavano
indirizzi assoluti o il trucco `call`/`pop`.

#### Perché le porzioni esistono

Le porzioni sono un residuo storico reso utile dalla **compatibilità**:

- il codice 8086 usa `ax`, `al`, `ah`;
- il codice 386 usa `eax`;
- il codice x86-64 usa `rax`.

La CPU espone tutte le viste sullo stesso registro fisico. Questo permette di
eseguire codice vecchio senza emulazione, ma crea le regole di scrittura
parziale viste sopra.

### 4.4 Registri speciali

#### Instruction Pointer (`rip`)

- Contiene l'indirizzo della prossima istruzione da eseguire.
- Avanza automaticamente dopo ogni istruzione.
- È modificato da salti, chiamate, ritorni, eccezioni e interruzioni.
- È la base dell'indirizzamento relativo (`[rip + offset]`), che rende il codice
  posizione-indipendente (PIE).
- Su x86-64 non è scrivibile direttamente; per leggerlo si usa `lea`.

#### Stack Pointer (`rsp`)

- Punta alla cima dello stack.
- `push` decrementa `rsp` e scrive; `pop` legge e incrementa; `call` inserisce
  l'indirizzo di ritorno; `ret` lo preleva.
- Lo stack cresce verso indirizzi più bassi.
- In System V, `rsp` deve essere allineato a 16 byte prima di una `call`.

#### Base Pointer (`rbp`)

- Puntatore al frame corrente.
- Convenzione classica:

```nasm
push rbp
mov  rbp, rsp
sub  rsp, 32        ; spazio per locali
; ... uso di [rbp-8], [rbp-16], ...
leave               ; mov rsp, rbp; pop rbp
ret
```

- È opzionale: con `-fomit-frame-pointer` il compilatore usa `rbp` come registro
  generico e accede allo stack tramite `rsp` con offset.
- È **callee-saved**.

#### Program Counter nelle altre architetture

| Architettura | Come si chiama / si accede |
|---|---|
| x86-64 | `rip`, non scrivibile direttamente, leggibile con `lea` |
| x86 32 bit | `eip`, non direttamente indirizzabile |
| 8086 | `ip`, 16 bit |
| ARM64 | `pc` non è un GPR; si leggono indirizzi con `adr`/`adrp`; il ritorno è in `x30` (LR) |
| ARM32 | `pc` è `r15`; letture storicamente davano `pc+8` per la pipeline |
| MIPS | `pc` non è un GPR; `jal` salva il ritorno in `$ra`; delay slot |
| RISC-V | `pc` non è un GPR; `auipc` per indirizzi PC-relativi; `jal` salva in `ra` |

Concetto comune: il PC è un registro **architetturale** che il programmatore non
può sempre leggere o scrivere come gli altri; le modalità di accesso dipendono
dall'ISA.

#### Instruction Register (concetto)

L'**IR** è il registro che, nelle architetture didattiche, contiene l'istruzione
in fase di decodifica. Su x86-64 **non è visibile al programmatore**: è un
concetto microarchitetturale. Distinguere sempre:

- **registri architetturali**: definiti dall'ISA, visibili al software (`rax`,
  `rip`, `rflags`, ...);
- **registri microarchitetturali**: interni all'implementazione (IR, registri di
  pipeline, registri di rinomina, buffer di riordino), non garantiti dall'ISA.

#### Flag Register (`rflags`)

Contiene i flag di stato e di controllo. I più importanti:

| Bit | Flag | Significato |
|---|---|---|
| 0 | `CF` | carry (unsigned) |
| 2 | `PF` | parità del byte basso |
| 4 | `AF` | auxiliary carry (BCD) |
| 6 | `ZF` | zero |
| 7 | `SF` | segno |
| 8 | `TF` | trap/single-step |
| 9 | `IF` | interrupt enable |
| 10 | `DF` | direction (stringhe) |
| 11 | `OF` | overflow (signed) |
| 12–13 | `IOPL` | privilege level per I/O |
| 14 | `NT` | nested task |
| 16 | `RF` | resume |
| 17 | `VM` | virtual 8086 |
| 18 | `AC` | alignment check |
| 21 | `ID` | CPUID disponibile |

- I flag di stato (`CF`, `PF`, `AF`, `ZF`, `SF`, `OF`) sono prodotti da
  operazioni aritmetiche e logiche.
- `DF` controlla la direzione delle istruzioni di stringa (`cld` lo azzera,
  `std` lo imposta).
- `IF` abilita le interruzioni (`sti`/`cli`, privilegiate).
- `TF` serve ai debugger per l'esecuzione passo-passo.
- Istruzioni utili: `lahf`/`sahf` (byte basso dei flag in `ah`),
  `pushfq`/`popfq` (salvataggio/ripristino completo), `clc`/`stc`/`cmc`,
  `cld`/`std`.

Nota: `mov` **non** modifica i flag; `add`, `sub`, `cmp`, `test`, `xor`, ... sì.

#### Registri di controllo

Sono registri privilegiati (accessibili solo in modalità kernel), usati per
configurare la CPU:

| Registro | Funzione principale |
|---|---|
| `cr0` | modalità protetta (`PE`), paging (`PG`), cache, write-protect |
| `cr2` | indirizzo lineare che ha causato l'ultimo page fault |
| `cr3` | base della tabella delle pagine (e PCID) |
| `cr4` | funzionalità: PAE, PGE, SSE, SMEP, SMAP, 5-level paging (`LA57`) |
| `cr8` | task priority register (64 bit) |

Si accedono con `mov` da/verso registri generali, solo a livello 0:

```nasm
mov rax, cr3
mov cr3, rax
```

Accessi da livello utente causano `#GP` (general protection fault).

#### MSR

I **Model-Specific Registers** sono registri di configurazione identificati da un
numero, non da un nome. Si leggono/scrivono con:

```nasm
mov ecx, 0xC0000080   ; IA32_EFER
rdmsr                 ; EDX:EAX = valore
; ...
wrmsr                 ; scrive EDX:EAX
```

Esempi importanti:

| MSR | Indirizzo | Uso |
|---|---|---|
| `IA32_EFER` | `0xC0000080` | `SCE` (syscall), `LME`/`LMA` (long mode), `NXE` |
| `STAR` | `0xC0000081` | selettori per `syscall`/`sysret` |
| `LSTAR` | `0xC0000082` | indirizzo del gestore `syscall` |
| `FMASK` | `0xC0000084` | maschera dei flag all'ingresso |
| `FS_BASE` | `0xC0000100` | base del segmento `fs` (TLS utente su Linux) |
| `GS_BASE` | `0xC0000101` | base del segmento `gs` (per-CPU kernel) |
| `KERNEL_GS_BASE` | `0xC0000102` | base `gs` del kernel, scambiata con `swapgs` |

#### Registri di debug

- `dr0`–`dr3`: indirizzi dei breakpoint hardware (fino a 4);
- `dr6`: stato dei breakpoint;
- `dr7`: controllo (abilitazione, tipo di accesso, lunghezza).

Sono privilegiati; i debugger li usano tramite il sistema operativo (`ptrace`).

#### Registri di segmento

| Registro | Uso tradizionale |
|---|---|
| `cs` | code segment |
| `ds` | data segment |
| `ss` | stack segment |
| `es` | extra segment |
| `fs` | general purpose (TLS su Linux) |
| `gs` | general purpose (per-CPU kernel) |

- **Modalità reale (8086)**: indirizzo fisico = `segmento × 16 + offset`; limite
  1 MB; `cs:ip`, `ss:sp`, `ds:si`, ...
- **Modalità protetta (32 bit)**: i selettori indicano voci di GDT/LDT con base,
  limite e privilegio; la segmentazione è attiva.
- **Long mode (64 bit)**: base e limite di `cs`, `ds`, `es`, `ss` sono ignorati
  (base 0); restano rilevanti `cs`/`ss` per il livello di privilegio. Le basi di
  `fs` e `gs` restano attive e sono usate per thread-local storage e dati
  per-CPU.

Istruzioni: `mov` da/verso registri di segmento (con restrizioni), `push`/`pop`
per alcuni, `swapgs` nel passaggio utente/kernel, `wrfsbase`/`rdgsbase` se
supportati.

#### Altri registri speciali

- **GDTR/IDTR**: base e limite della GDT e della IDT; `lgdt`/`lidt`, `sgdt`/`sidt`.
- **LDTR/TR**: selettori del LDT e del task register; `lldt`/`ltr`, `sldt`/`str`.
- **Registri di performance**: contatori hardware (MSR, `rdpmc`).
- **Registri di tracing**: `debugctl`, buffer di trace (MSR).

### 4.5 Registri SIMD e floating point

#### x87

- 8 registri `st0`–`st7`, da 80 bit, organizzati come **stack**.
- Usati dalla FPU x87 per `float`, `double` e `long double`.
- Istruzioni: `fld`, `fst`, `fstp`, `fadd`, `fmul`, ...
- Oggi usati principalmente per `long double` (80 bit) e per compatibilità.
- Attenzione: la gestione a stack può causare overflow/underflow dello stack
  x87.

#### MMX

- 8 registri `mm0`–`mm7`, da 64 bit.
- Introdotti nel 1997 per operazioni SIMD su interi.
- **Alias** dei registri x87: usare MMX invalida lo stato x87; serve `emms` per
  ripristinare la modalità x87.
- Superati da SSE2; oggi si trovano solo in codice legacy.

#### XMM

- 16 registri `xmm0`–`xmm15` in modalità 64 bit (8 in 32 bit), da **128 bit**.
- Introdotti con SSE; usati per virgola mobile e interi packed.
- Istruzioni: `movaps` (allineato), `movups` (non allineato), `addps`/`addpd`,
  `addss`/`addsd`, `paddd`, `pxor`, ...
- In System V: `xmm0`–`xmm7` per argomenti e ritorno in virgola mobile;
  `xmm8`–`xmm15` caller-saved. In Windows x64: `xmm0`–`xmm3` argomenti,
  `xmm6`–`xmm15` callee-saved.

#### YMM

- 16 registri `ymm0`–`ymm15`, da **256 bit** (AVX).
- La metà bassa coincide con `xmm`; la metà alta è separata.
- Istruzioni: `vaddps`, `vmovaps`, `vmovdqu`, ...
- Passare da AVX a SSE senza `vzeroupper` può causare penalità di transizione.

#### ZMM

- 32 registri `zmm0`–`zmm31`, da **512 bit** (AVX-512).
- I 16 registri bassi coincidono con `ymm`/`xmm`; i 16 alti richiedono EVEX.
- Maschere `k0`–`k7` per operazioni condizionali per elemento.
- Supporto e prestazioni dipendono dalla CPU; su alcune CPU AVX-512 causa
  riduzione di frequenza.

#### Scalari e vettoriali

| Tipo | Esempio | Cosa contiene |
|---|---|---|
| Scalare | `addss xmm0, xmm1` | 1 `float` nella lane bassa |
| Vettoriale | `addps xmm0, xmm1` | 4 `float` (128 bit) |
| Vettoriale | `vaddps ymm0, ymm1, ymm2` | 8 `float` (256 bit) |
| Vettoriale | `vaddps zmm0, zmm1, zmm2` | 16 `float` (512 bit) |

I registri vettoriali sono **più larghi** e contengono più valori dello stesso
tipo, elaborati in parallelo (SIMD: *Single Instruction, Multiple Data*).

Attenzione: un registro `xmm` contiene bit, non un tipo. Puoi interpretarlo come
4 `int`, 4 `float`, 8 `short`, 16 `char`, 2 `double`, a seconda dell'istruzione.

#### Utilizzo nei calcoli paralleli

- elaborazione di immagini, audio, video;
- crittografia (AES-NI, SHA);
- algebra lineare e machine learning;
- confronto e ricerca di stringhe (SSE4.2);
- auto-vettorizzazione dei compilatori.

#### Trasferimenti tra GPR e SIMD

```nasm
movd  eax, xmm0     ; bassi 32 bit
movq  rax, xmm0     ; bassi 64 bit
movd  xmm0, eax
movq  xmm0, rax
movdqa xmm0, [buf]  ; 16 byte allineati
movdqu xmm0, [buf]  ; 16 byte non allineati
```

---

## 3. Funzionamento passo per passo

### 3.1 Scritture parziali

Stato iniziale: `RAX = 0x1122334455667788`.

| Istruzione | `RAX` dopo | Spiegazione |
|---|---|---|
| `mov al, 0xAA` | `0x11223344556677AA` | solo il byte basso |
| `mov ax, 0xBBCC` | `0x112233445566BBCC` | due byte bassi, `AL = 0xCC` |
| `mov eax, 0xDDEEFF00` | `0x00000000DDEEFF00` | 32 bit, parte alta azzerata |
| `mov rax, 0x0102030405060708` | `0x0102030405060708` | tutti i 64 bit |
| `xor eax, eax` | `0x0000000000000000` | azzera tutto, `ZF = 1` |

Nota: `xor` modifica i flag; `mov` no.

### 3.2 Chiamata di funzione

```nasm
; chiamante
mov rdi, 10          ; 1° argomento
mov rsi, 20          ; 2° argomento
call somma           ; spinge l'indirizzo di ritorno
; al ritorno: RAX = risultato
```

```nasm
somma:
    lea rax, [rdi + rsi]   ; RAX = 30, non tocca i flag
    ret
```

- `rdi`/`rsi` sono caller-saved: il chiamante non può assumere che la funzione
  li preservi.
- `rax` contiene il risultato.
- Se la funzione usasse `rbx`, dovrebbe salvarlo e ripristinarlo.

### 3.3 System call

```nasm
mov rax, 1           ; syscall write
mov rdi, 1           ; fd = stdout
lea rsi, [rel msg]   ; buffer
mov rdx, 6           ; lunghezza
syscall
```

- numero della syscall in `rax`;
- argomenti in `rdi`, `rsi`, `rdx`, `r10`, `r8`, `r9`;
- risultato in `rax`;
- `rcx` e `r11` vengono sovrascritti dal meccanismo di `syscall`;
- `r10` sostituisce `rcx` perché `rcx` serve al ritorno.

### 3.4 SIMD scalare e packed

```nasm
; scalare: un float
movss xmm0, [a]
addss xmm0, [b]
movss [c], xmm0

; packed: quattro float in parallelo
movups xmm0, [a]
addps  xmm0, [b]
movups [c], xmm0
```

Stessa ALU vettoriale, ma nel secondo caso lavora su 4 lane contemporaneamente.

---

## 4. Sintassi e istruzioni coinvolte

| Istruzione | Uso | Modulo |
|---|---|---|
| `mov` | copia tra registri/memoria/immediati | 5 |
| `movzx` / `movsx` | zero/sign extension | 5 |
| `lea` | calcola un indirizzo (o somma) senza accedere alla memoria | 5 |
| `xchg` | scambia due operandi | 5 |
| `push` / `pop` | stack | 9 |
| `add` / `sub` | aritmetica, aggiorna i flag | 6 |
| `xor` | azzeramento e bit a bit | 6 |
| `and`, `or`, `not` | maschere | 6 |
| `shl`, `shr`, `sar` | shift, conteggio in `cl` | 6 |
| `test` / `cmp` | confronti, aggiornano i flag | 7 |
| `jmp`, `jcc`, `call`, `ret` | controllo di flusso | 8–9 |
| `syscall` | system call Linux | 13 |
| `lahf` / `sahf` | flag bassi in `ah` | 7 |
| `pushfq` / `popfq` | salvataggio `rflags` | 7 |
| `movd` / `movq` | trasferimento GPR ↔ XMM | 15 |
| `movaps` / `movups` | load/store 128 bit | 15 |
| `addps` / `addss` | somma packed/scalare | 15 |
| `emms` | ripristino x87 dopo MMX | 15 |
| `rdmsr` / `wrmsr` | registri MSR (kernel) | — |
| `swapgs` | scambio base GS (kernel) | — |

Regole di sintassi:

```nasm
mov rax, rbx        ; registro ← registro
mov eax, 42         ; registro ← immediato
mov rax, [rbx]      ; registro ← memoria
mov [rbx], rax      ; memoria ← registro
lea rax, [rbx + 8]  ; indirizzo (somma), nessun accesso
mov byte [rbx], 7   ; dimensione esplicita
```

Non sono ammessi `mov [a], [b]` (memoria → memoria) né due operandi in memoria
nella stessa istruzione.

---

## 5. Esempi semplici commentati

### Esempio 1 — Azzerare un registro

```nasm
xor eax, eax        ; 2 byte, azzera RAX, imposta ZF=1
mov eax, 0          ; 5 byte, azzera RAX, non tocca i flag
mov rax, 0          ; 7 byte, azzera RAX, non tocca i flag
```

`xor` è più compatto ed è il modo idiomatico; se ti servono i flag invariati,
usa `mov`.

### Esempio 2 — Zero extension implicita

```nasm
mov ecx, 0xFFFFFFFF ; RCX = 0x00000000FFFFFFFF (non -1!)
movsxd rcx, ecx     ; RCX = 0xFFFFFFFFFFFFFFFF (-1)
```

La scrittura a 32 bit azzera la parte alta; per estendere il segno serve
`movsxd`.

### Esempio 3 — Scambiare due registri

```nasm
xchg rax, rbx
```

`xchg` è atomico con la memoria ed evita la sequenza con registro temporaneo.

### Esempio 4 — Indirizzo di un'etichetta

```nasm
lea rax, [rel messaggio]   ; indirizzo del primo byte
```

`lea` non legge la memoria: calcola l'indirizzo.

### Esempio 5 — Leggere i flag bassi

```nasm
add eax, ebx
lahf                 ; AH = SF:ZF:0:AF:0:PF:1:CF
```

---

## 6. Esempi più complessi

### 6.1 Prologo ed epilogo con frame pointer

```nasm
funzione:
    push rbp              ; salva il frame pointer del chiamante
    mov  rbp, rsp         ; nuovo frame
    sub  rsp, 32          ; spazio per locali
    mov  qword [rbp-8], 0 ; variabile locale
    ; ... corpo ...
    leave                 ; mov rsp, rbp; pop rbp
    ret
```

All'ingresso `rsp % 16 == 8`; dopo `push rbp` è allineato; dopo `sub rsp, 32`
resta allineato. Prima di una `call` interna serve allineamento a 16.

### 6.2 Funzione variadica

In System V, per le funzioni variadiche:

```c
int printf(const char *fmt, ...);
```

Il chiamante mette in `al` il numero di registri vettoriali usati per gli
argomenti. Il callee salva i registri argomento in un'area di salvataggio
(`reg_save_area`) e usa `va_list`. In Assembly:

```nasm
mov eax, 0          ; nessun argomento in XMM
call printf
```

Dimenticare `al` può far leggere al callee registri XMM non inizializzati.

### 6.3 SIMD: somma di due array di float

```nasm
; rdi = a, rsi = b, rdx = c, ecx = n (multiplo di 4)
.loop:
    movups xmm0, [rdi]
    movups xmm1, [rsi]
    addps  xmm0, xmm1
    movups [rdx], xmm0
    add rdi, 16
    add rsi, 16
    add rdx, 16
    sub ecx, 4
    jnz .loop
```

Ogni iterazione elabora 4 float; con AVX si passerebbe a 8, con AVX-512 a 16.
L'allineamento e la dimensione del blocco determinano prestazioni e correttezza.

### 6.4 Context switch (concetto)

Al cambio di processo il kernel salva i registri del processo uscente e carica
quelli dell'entrante:

- registri generali, `rip`, `rflags`, `rsp`;
- registri SIMD (se usati);
- registri di segmento/FS/GS;
- stato x87/MMX.

È il motivo per cui i registri non sono "persistenti" tra processi e perché
l'ABI deve stabilire chi preserva cosa tra funzioni.

### 6.5 Posizione indipendente del codice

```nasm
default rel
lea rax, [messaggio]
```

Con `default rel` NASM genera indirizzamenti relativi a `rip`, adatti a
eseguibili PIE dove gli indirizzi assoluti non sono noti al link time.

---

## 7. Collegamenti con argomenti precedenti

- **Modulo 1**: il ciclo Fetch–Decode–Execute e `rip`; qui abbiamo visto i
  registri coinvolti e il loro uso.
- **Modulo 2**: i registri sono il livello più alto della gerarchia delle
  memorie; il context switch spiega la non persistenza.
- **Modulo 3**: le dimensioni dei dati (byte/word/dword/qword) e le regole di
  scrittura parziale; il complemento a due spiega perché `movsx` esiste.
- **Modulo 5**: `mov`, `movzx`, `movsx`, `lea`, `xchg`.
- **Modulo 6**: uso di `rax`/`rdx` in `mul`/`div`, `cl` negli shift.
- **Modulo 7**: `rflags` in dettaglio.
- **Modulo 8**: `rip` e salti.
- **Modulo 9**: `rsp`/`rbp`, stack frame, `call`/`ret`.
- **Modulo 13**: `rax`, `rdi`, `rsi`, `rdx`, `r10`, `r8`, `r9` nelle syscall.
- **Modulo 14**: convenzioni di chiamata complete.
- **Modulo 15**: SIMD e ottimizzazione.

---

## 8. Errori frequenti

1. **Assumere che i registri mantengano il valore tra chiamate**: rispetta
   caller-saved/callee-saved.
2. **Usare `rsp` come registro generico**: rompe stack, chiamate e ritorni.
3. **Non allineare lo stack a 16 byte prima di `call`** in System V.
4. **Aspettarsi sign extension da una scrittura a 32 bit**: `mov eax, -1` dà
   `0x00000000FFFFFFFF`, non `0xFFFFFFFFFFFFFFFF`.
5. **Usare `ah` con un registro `r8`–`r15` o con un operando a 64 bit**: REX non
   è codificabile con `ah`.
6. **Credere che `mov` aggiorni i flag**: non lo fa.
7. **Confondere `r8` con `r8d`/`r8w`/`r8b`**: sono porzioni diverse.
8. **Usare `rcx` come conteggio di shift**: serve `cl`.
9. **Dimenticare che `rep` usa `rcx`** (o `ecx`/`cx` a seconda della dimensione
   dell'indirizzo).
10. **Aspettarsi che `syscall` preservi `rcx` e `r11`**: li sovrascrive.
11. **Usare `rcx` come quarto argomento di syscall**: si usa `r10`.
12. **Accedere ai registri di controllo da user mode**: `#GP`.
13. **Usare i registri di segmento come in modalità reale su x86-64**: base e
    limite sono ignorati (tranne FS/GS).
14. **Usare MMX senza `emms`**: stato x87 corrotto.
15. **Mischiare AVX e SSE senza `vzeroupper`**: penalità di transizione.
16. **Assumere che i registri XMM siano callee-saved in System V**: sono
    caller-saved.
17. **Leggere registri non inizializzati**: il valore è indeterminato.
18. **Scrivere `rip` con `mov`**: non è possibile.
19. **Confondere `eip` con un registro indirizzabile in 64 bit**: non lo è.
20. **Dimenticare che `rbp` è callee-saved se lo usi come frame pointer**:
    salvalo e ripristinalo.

---

## 9. Riepilogo finale

- I registri sono la memoria più veloce e più piccola della CPU; non hanno
  indirizzi e non sono persistenti.
- x86-64 ha 16 GPR da 64 bit: `rax`, `rbx`, `rcx`, `rdx`, `rsi`, `rdi`, `rbp`,
  `rsp`, `r8`–`r15`.
- Ogni GPR ha porzioni storiche (64/32/16/8 bit); scrivere `eax` azzera la parte
  alta di `rax`, scrivere `ax`/`al` no.
- `rax` è il registro dei risultati e delle syscall; `rcx` il contatore; `rdx`
  completa `rax` in `mul`/`div`; `rsi`/`rdi` sono gli indici delle stringhe;
  `rsp`/`rbp` gestiscono lo stack.
- Le convenzioni di chiamata stabiliscono argomenti, ritorno e registri
  caller/callee-saved: System V e Windows x64 sono diverse.
- `rip` è il program counter, non scrivibile direttamente; `rflags` contiene i
  flag di stato e controllo.
- I registri di controllo, MSR, debug e segmento sono privilegiati o speciali;
  in long mode la segmentazione è quasi disattivata, tranne FS/GS.
- x87, MMX, XMM, YMM e ZMM coprono virgola mobile e SIMD; i registri vettoriali
  contengono più lane e lavorano in parallelo.
- Conoscere i registri significa capire il costo delle istruzioni, le
  convenzioni delle funzioni e il comportamento del codice generato dal
  compilatore.

---

## 10. Esercizi di verifica

> Soluzioni non incluse. Chiedile quando vuoi.

### Esercizi facili

1. Elenca i 16 registri di uso generale di x86-64 e il loro nome storico.
2. Quali sono le porzioni di `rax`? Quanti bit ha ciascuna?
3. Quali registri sono callee-saved in System V AMD64?
4. A cosa serve `rip`? Si può scrivere con `mov`?
5. Quali registri contengono gli argomenti di una syscall Linux?

### Esercizi intermedi

6. Spiega la differenza tra `mov eax, 0xFFFFFFFF` e `mov rax, -1`.
7. Perché `xor eax, eax` è preferibile a `mov eax, 0`? Quando useresti `mov`?
8. Descrivi l'effetto di `mov al`, `mov ax`, `mov eax`, `mov rax` sullo stesso
   registro.
9. Perché `ah` non può essere usato con `r8`–`r15`?
10. Spiega la differenza tra caller-saved e callee-saved con un esempio.
11. Elenca i flag principali di `rflags` e cosa indicano.
12. Qual è la differenza tra `xmm`, `ymm` e `zmm`?

### Esercizi difficili

13. Perché scrivere un registro a 32 bit azzera la parte alta, mentre scrivere a
    16 o 8 bit no? Quali problemi evita questa scelta?
14. Spiega come `syscall` usa `rcx` e `r11` e perché gli argomenti non usano
    `rcx`.
15. Descrivi cosa deve salvare il kernel in un context switch e perché.
16. Spiega il ruolo di `rbp` e cosa cambia con `-fomit-frame-pointer`.
17. Confronta la gestione del program counter in x86-64, ARM64 e RISC-V.
18. Perché i registri MMX sono un problema insieme a x87? Come si risolve?

### Esercizi "prevedi il risultato"

19. Partendo da `RAX = 0x1122334455667788`, esegui in sequenza `mov al, 0xAA`,
    `mov ax, 0xBBCC`, `mov eax, 0xDDEEFF00`. Qual è `RAX` dopo ogni passo?
20. Dopo `mov eax, -1`, quanto vale `RAX`? E dopo `movsxd rax, eax`?
21. Se `AL = 0xFF` e `movzx eax, al`, quanto vale `EAX`? E con `movsx`?
22. Quali registri sono modificati da `syscall` oltre a `rax`?
23. In System V, quanti argomenti interi passano nei registri? E in Windows x64?
24. Se `rsp` vale `0x...FF8` prima di una `call`, è allineato correttamente?

### Esercizi "scrivi da zero"

25. Scrivi il prologo e l'epilogo di una funzione che usa `rbx` e `r12` come
    registri persistenti.
26. Scrivi una sequenza che copi 4 `int` da un array a un altro usando XMM.
27. Scrivi una chiamata a `write(1, msg, len)` con la convenzione delle syscall
    Linux.

---

**Prossimo modulo**: il Modulo 5 del tuo programma. Dimmi **"prosegui"** quando
sei pronto, oppure chiedi chiarimenti o le soluzioni degli esercizi.
