# Modulo 1 — Introduzione all'Assembly

> **Prerequisiti**: nessuno.
> **Architettura di riferimento**: x86-64, sintassi Intel, NASM, Linux 64 bit.
> **Obiettivo del modulo**: capire *che cosa* è l'Assembly, *dove* si colloca
> rispetto a linguaggi e hardware, e *come* un programma viene eseguito.

---

## 1. Introduzione e definizione

**Assembly** (o *linguaggio assembly*) è una famiglia di linguaggi di
programmazione che rappresentano in forma testuale e mnemonica le istruzioni di
una specifica **ISA** (*Instruction Set Architecture*), cioè l'insieme delle
istruzioni che un processore sa eseguire.

Tre definizioni utili, da tenere separate:

1. **Linguaggio macchina**: la sequenza di byte che il processore esegue
   direttamente. È l'unico linguaggio che la CPU comprende.
2. **Linguaggio assembly**: la rappresentazione leggibile di quei byte tramite
   nomi simbolici (*mnemonici*) come `mov`, `add`, `jmp`, più nomi per registri e
   indirizzi.
3. **Programma eseguibile**: un file (su Linux, in formato ELF) che contiene il
   codice macchina, i dati e le informazioni che il sistema operativo usa per
   caricarlo in memoria.

Il punto centrale: **l'Assembly non viene eseguito dal processore**. Il
processore esegue byte. L'Assembly è il livello di scrittura che un *assembler*
traduce in quei byte. A runtime l'Assembly non esiste più.

Altra precisazione fondamentale: **"Assembly" non è un solo linguaggio**. È un
nome collettivo. L'Assembly x86-64 è diverso dall'Assembly ARM64, che è diverso
dall'Assembly MIPS. Persino sulla stessa ISA esistono **dialetti sintattici**
diversi (NASM, GAS, MASM): stesso codice macchina, testo diverso.

---

## 2. Spiegazione teorica approfondita

### 2.1 Che cos'è Assembly (punto 1.1 del programma)

#### Livelli di astrazione

Un linguaggio ad alto livello (C, Python, Java) descrive *che cosa* calcolare e
delega a qualcun altro *come* farlo. L'Assembly descrive *come*, istruzione per
istruzione.

| Livello | Esempio | Chi traduce | Cosa vedi tu |
|---|---|---|---|
| Alto livello | `if (a < b) c = a + b;` | compilatore / interprete | variabili, tipi, blocchi |
| Assembly | `cmp edi, esi` / `jge ...` / `add eax, edi` | assembler | registri, memoria, salti |
| Macchina | `39 F7`, `7D 05`, `01 F8` | — (eseguito dalla CPU) | byte |

Un linguaggio ad alto livello **nasconde**: i registri, la posizione esatta delle
variabili in memoria, la dimensione degli oggetti, la gestione dello stack, le
convenzioni di chiamata. L'Assembly **espone tutto questo**.

Conseguenze pratiche di essere "a basso livello":

- Non esistono tipi veri: esistono **dimensioni** (byte, word, dword, qword) e
  interpretazioni (intero con segno, senza segno, indirizzo, carattere).
- Non esiste la gestione automatica della memoria: niente garbage collector,
  niente controlli dei limiti, niente inizializzazione automatica.
- Non esistono costrutti: un `if` è un confronto seguito da un salto; un ciclo è
  un salto all'indietro; una funzione è una `call`.
- Il codice è **specifico per l'architettura**: istruzioni, registri e codifiche
  cambiano da ISA a ISA. Un eseguibile x86-64 non gira su ARM64 (serve emulazione
  o traduzione, come QEMU o Rosetta 2).

#### ISA e microarchitettura: due cose diverse

- **ISA**: il contratto visibile al software. Definisce istruzioni, registri,
  modalità di indirizzamento, tipi di dato, formato delle istruzioni, modello di
  memoria, comportamento in caso di errore.
- **Microarchitettura**: *come* un particolare processore implementa l'ISA
  (pipeline, cache, unità di esecuzione). Due CPU con la stessa ISA (es. Intel e
  AMD per x86-64) eseguono lo stesso binario con prestazioni diverse.

L'**ABI** (*Application Binary Interface*) è un livello ancora diverso: non dice
quali istruzioni esistono, ma *come* le funzioni si parlano (dove passano i
parametri, chi preserva quali registri, allineamento dello stack). Ne parleremo
nel Modulo 9 e nel Modulo 14.

#### CISC e RISC

- **x86-64** è di impostazione **CISC**: istruzioni di lunghezza variabile
  (da 1 a 15 byte), molti modi di indirizzamento, istruzioni che operano
  direttamente su memoria.
- **ARM64, MIPS, RISC-V** sono di impostazione **RISC** (*load-store*): poche
  istruzioni semplici, lunghezza per lo più fissa, accesso alla memoria solo con
  istruzioni di caricamento/salvataggio dedicate.

Questa distinzione è storica e pratica, ma non va assolutizzata: i processori
x86 moderni decodificano le istruzioni complesse in micro-operazioni interne,
quindi "CISC vs RISC" descrive l'ISA, non necessariamente il funzionamento
interno.

#### Codifica delle istruzioni: opcode e operandi

Un'istruzione macchina contiene almeno:

- un **opcode**: il codice dell'operazione (`mov`, `add`, `jmp`, ...);
- zero o più **operandi**: su cosa opera (registri, memoria, valori immediati).

Su x86-64 un'istruzione può avere, oltre a opcode e operandi, campi aggiuntivi:

- **prefissi** (es. dimensione dell'operando, ripetizione);
- **REX**, che in 64 bit estende registri e larghezza degli operandi;
- **ModR/M** e **SIB**, che descrivono la forma degli operandi (registro,
  memoria, indirizzamento con base e indice);
- uno **spostamento** (*displacement*) e/o un **immediato**.

Esempio concreto e verificabile:

```
B8 3C 00 00 00     ; mov eax, 60
0F 05              ; syscall
```

- `B8` è l'opcode di `mov` verso un registro a 32 bit con immediato a 32 bit;
- `3C 00 00 00` è il valore 60 (0x3C) scritto in **little-endian**: il byte meno
  significativo per primo;
- `0F 05` è la codifica di `syscall`.

Da qui si vede perché l'Assembly è più leggibile del codice macchina, ma anche
perché la corrispondenza non è "una riga = un byte": una riga può occupare da 1 a
15 byte.

#### Assembly e codice sorgente

| Concetto | Natura | Chi lo usa |
|---|---|---|
| Sorgente `.asm` | testo | il programmatore |
| Oggetto `.o` | binario rilocabile | l'assembler produce, il linker consuma |
| Eseguibile | binario con intestazioni e punti di ingresso | il sistema operativo |

Il percorso tipico su Linux:

```
main.asm --(nasm -f elf64)--> main.o --(ld)--> main
```

L'assembler traduce i mnemonici in byte e produce un file oggetto ELF
rilocabile; il linker risolve i riferimenti (simboli, indirizzi) e produce
l'eseguibile; il **loader** del sistema operativo lo carica in memoria e
trasferisce il controllo al punto di ingresso.

Attenzione: non tutto ciò che scrivi in un file `.asm` diventa un'istruzione.
Le **direttive** (`section .text`, `global _start`, `db`, `equ`) sono istruzioni
per l'assembler, non per la CPU. Anche le **macro** vengono espanse e possono
generare più istruzioni. La corrispondenza 1:1 vale per le istruzioni, non per
l'intero file.

#### Differenze tra le architetture

| Aspetto | 8086 (16 bit) | x86 32 bit | x86-64 | ARM64 | MIPS | RISC-V |
|---|---|---|---|---|---|---|
| Registri generali | 8 da 16 bit | 8 da 32 bit | 16 da 64 bit | 31 da 64 bit + zero/SP | 32 da 32/64 bit | 32 (x0 = zero) |
| Program counter | `IP` | `EIP` | `RIP` | `PC` non scrivibile direttamente | `PC` | `PC` |
| Lunghezza istruzioni | variabile | variabile | variabile (1–15 B) | fissa 4 B (A64) | fissa 4 B | 4 B, 2 B con estensione C |
| Accesso a memoria | molti operandi in memoria | molti operandi in memoria | molti operandi in memoria | solo load/store | solo load/store | solo load/store |
| Flag | sì (`FLAGS`) | sì (`EFLAGS`) | sì (`RFLAGS`) | solo `NZCV` tramite confronti | no flag centrali | nessun registro flag |
| Modello di memoria | segmentato, 1 MB | flat, 4 GB | flat, 64 bit virtuali | flat | flat | flat |

Dettagli che vale la pena fissare subito:

- **8086 / modalità reale**: indirizzi a 20 bit ottenuti combinando *segmento* e
  *offset* (`CS`, `DS`, `SS`, `ES`), limite di 1 MB, nessuna protezione della
  memoria. È la modalità in cui parte un bootloader.
- **x86 32 bit**: registri `eax`...`edi`, memoria "flat" a 4 GB, convenzioni di
  chiamata come `cdecl` e `stdcall`.
- **x86-64**: aggiunge `r8`–`r15`, estende i registri a 64 bit, introduce
  l'indirizzamento relativo a `RIP` e la convenzione System V AMD64 su Linux.
- **ARM64 (A64)**: istruzioni a 4 byte, nessuna scrittura diretta del `PC`,
  parametri nei registri `x0`–`x7`, risultato in `x0`. La maggior parte delle
  istruzioni non tocca i flag: si confrontano esplicitamente i valori.
- **ARM32 (A32)**: 16 registri, esecuzione condizionale su quasi tutte le
  istruzioni, variante Thumb a 16 bit.
- **MIPS**: 32 registri (`$0` è sempre zero), *delay slot* dopo i salti, risultati
  di moltiplicazione/divisione in `HI`/`LO`.
- **RISC-V**: 32 registri (`x0` è zero cablato), nessun registro flag, ISA modulare
  (`M` per moltiplicazione, `A` per atomici, `F`/`D` per virgola mobile, `C` per
  istruzioni compresse).

---

### 2.2 Come funziona un programma (punto 1.2 del programma)

#### Il modello di von Neumann

Un calcolatore è composto da CPU, memoria e dispositivi di I/O collegati da bus.
Nel modello di von Neumann **istruzioni e dati stanno nella stessa memoria**: è
questo che permette a un programma di essere caricato come dati e poi eseguito
come codice.

Componenti della CPU che ci interessano:

- **unità di controllo**: legge, decodifica e coordina l'esecuzione;
- **ALU**: esegue operazioni aritmetiche e logiche;
- **registri**: memoria interna piccolissima e velocissima;
- **cache** (L1/L2/L3): memoria intermedia tra registri e RAM;
- **contatore di programma** (`RIP` su x86-64): indirizzo della prossima
  istruzione;
- **registro dei flag** (`RFLAGS`): esito dell'ultima operazione (zero, segno,
  riporto, overflow, ...).

Gerarchia delle memorie, dal più veloce al più lento: registri → cache → RAM →
disco. Più ci si allontana dalla CPU, più aumenta la latenza.

#### Ruolo della memoria

La RAM è un insieme di **byte numerati**. Ogni byte ha un indirizzo. Le variabili
non hanno nomi a runtime: hanno indirizzi. Un intero a 32 bit occupa 4 byte
consecutivi; su x86-64 i byte sono memorizzati in **little-endian**.

Il sistema operativo offre a ogni processo uno **spazio di indirizzi virtuale**:
il programma vede indirizzi che non coincidono con quelli fisici. Le mappe di
paginazione traducono indirizzi virtuali in fisici e permettono isolamento e
protezione tra processi. Un programma tipico ha regioni distinte per codice,
dati inizializzati, dati non inizializzati, heap e stack.

#### Ruolo dei registri

I registri sono la memoria di lavoro della CPU. Sono pochi e velocissimi.
Contengono valori temporanei, indirizzi, contatori, puntatori allo stack.

Un registro **non è una variabile persistente**: quando il sistema operativo
passa da un processo all'altro (*context switch*) salva e ripristina lo stato dei
registri. Il programmatore non deve assumere che un registro mantenga un valore
"per sempre", soprattutto attraverso chiamate e interruzioni.

#### Ruolo del sistema operativo

Il sistema operativo, per un programma:

1. crea un processo e uno spazio di indirizzi;
2. carica l'eseguibile in memoria (loader);
3. imposta lo stack e i parametri iniziali;
4. porta `RIP` al punto di ingresso (`_start`);
5. gestisce le **system call** (richieste al kernel: leggere, scrivere, uscire);
6. gestisce l'I/O, lo scheduling e la protezione (modalità utente vs kernel).

Un programma utente non può accedere direttamente a porte hardware o a memoria
del kernel: deve chiedere tramite system call. Su x86-64 Linux si usa
l'istruzione `syscall`, con il numero della chiamata in `rax` e gli argomenti in
registri concordati (`rdi`, `rsi`, `rdx`, `r10`, `r8`, `r9`).

#### Ciclo Fetch–Decode–Execute

Il modello classico, in quattro fasi:

1. **Fetch**: la CPU legge dalla memoria l'istruzione all'indirizzo contenuto in
   `RIP`.
2. **Decode**: interpreta i byte, riconosce opcode e operandi, determina
   l'operazione e la lunghezza dell'istruzione.
3. **Execute**: esegue l'operazione (ALU, accesso a memoria, salto, ...).
4. **Writeback**: scrive il risultato in un registro o in memoria, aggiorna i
   flag e aggiorna `RIP`.

`RIP` avanza automaticamente alla fine dell'istruzione appena eseguita, a meno
che l'istruzione non sia un salto, una chiamata, un ritorno o un'eccezione.

**Onestà sul modello**: i processori moderni non eseguono una istruzione alla
volta. Hanno pipeline (fasi sovrapposte), esecuzione *superscalare* (più
istruzioni per ciclo), esecuzione *out-of-order*, predizione dei salti e cache.
Il ciclo Fetch–Decode–Execute resta il modello concettuale corretto per capire
*che cosa* succede, non per contare i cicli di clock.

#### Dalla sorgente all'esecuzione

```
testo .asm
   │  assembler (nasm)
   ▼
oggetto .o  (codice + dati + tabella dei simboli + rilocazioni)
   │  linker (ld)
   ▼
eseguibile ELF  (intestazioni, sezioni, punto di ingresso)
   │  loader (kernel)
   ▼
processo in memoria  (RIP = _start, stack pronto)
   │
   ▼
esecuzione delle istruzioni, una dopo l'altra (concettualmente)
   │
   ▼
system call exit → il processo termina
```

#### Un'istruzione, tanti operandi

Un'istruzione può avere operandi di tre nature:

- **registro**: `eax`, `rdi`, ...
- **memoria**: `[rbx]`, `[rbp - 8]`, `[tabella + rcx*4]`, ...
- **immediato**: una costante codificata nell'istruzione, es. `60`.

Il numero e il tipo di operandi dipendono dall'istruzione: `mov` ne ha due,
`inc` ne ha uno, `ret` nessuno. Non tutte le combinazioni sono ammesse: ad
esempio non si può fare `mov [a], [b]` (memoria → memoria) su x86; serve un
registro intermedio.

---

### 2.3 Confronto con altri linguaggi (punto 1.3 del programma)

#### Assembly vs C

Il C è il linguaggio più vicino all'Assembly: un compilatore C traduce
direttamente in Assembly e poi in codice macchina. Molti costrutti C hanno una
traduzione quasi diretta:

| C | Idea in Assembly |
|---|---|
| `a + b` | `add` su registri |
| `if (x == 0)` | `cmp`/`test` + salto condizionato |
| `for (...)` | etichetta + `inc`/`cmp` + salto |
| chiamata di funzione | `call` + convenzione ABI |
| variabile locale | posizione sullo stack o in un registro |

Differenze cruciali:

- Il C ha **tipi** e regole; l'Assembly no. In C un `int` è almeno 16 bit (32 su
  Linux x86-64); in Assembly decidi tu la larghezza dell'operazione.
- Il C ha **comportamento indefinito** (overflow con segno, accesso fuori dai
  limiti, uso dopo `free`). In Assembly non c'è una rete di sicurezza: il
  comportamento è quello che l'hardware fa, anche se è un disastro.
- Il compilatore C **ottimizza**: riordina, elimina codice, usa istruzioni SIMD.
  L'Assembly scritto a mano è ottimo per controllo preciso, ma nella maggior
  parte dei casi un buon compilatore produce codice uguale o migliore.

#### Assembly vs C++

Il C++ aggiunge astrazioni (classi, template, RAII, eccezioni, RTTI). A livello
di codice macchina molte astrazioni **svaniscono**: una chiamata a un metodo non
virtuale è una normale `call`; un `std::vector` è un puntatore più due dimensioni
e chiamate a funzioni. Altre hanno un costo: tabelle virtuali, gestione delle
eccezioni, distruttori, allocazioni.

In Assembly non esiste nulla di tutto questo: se vuoi una "classe" devi
costruirtela con memoria e convenzioni.

#### Assembly vs Python

Python (CPython) non viene compilato in codice macchina: viene compilato in
**bytecode** per una macchina virtuale, che è a sua volta un programma C. Ogni
operazione Python passa attraverso il ciclo dell'interprete, con controlli
dinamici dei tipi, gestione degli oggetti e conteggio dei riferimenti.

Distanza di astrazione: enorme. Un ciclo Python che somma un milione di numeri
esegue milioni di iterazioni dell'interprete; lo stesso ciclo in Assembly esegue
milioni di poche istruzioni native. Da qui i divari di prestazioni di uno o due
ordini di grandezza, che però dipendono dal carico di lavoro e dalle librerie
native usate.

#### Assembly vs Java

Java compila in **bytecode** eseguito dalla JVM. La JVM però non si limita a
interpretare: il **JIT** compila a runtime le parti più usate in codice macchina,
sfruttando informazioni raccolte durante l'esecuzione. Il risultato può essere
molto vicino (a volte migliore) di un programma C compilato staticamente, perché
il JIT conosce il comportamento reale del programma.

Anche qui: il linguaggio non è "lento" in sé; il costo dipende da macchina
virtuale, garbage collector, allocazioni e JIT.

#### Tabella riassuntiva

| Criterio | Assembly | C | C++ | Python | Java |
|---|---|---|---|---|---|
| Astrazione | minima | bassa | media/alta | alta | alta |
| Portabilità del sorgente | nulla | alta | alta | alta | alta |
| Controllo dell'hardware | totale | limitato | limitato | nullo | nullo |
| Gestione memoria | manuale | manuale | manuale/RAII | automatica | automatica (GC) |
| Prestazioni tipiche | massime se scritto bene | molto alte | molto alte | basse | alte (JIT) |
| Manutenibilità | bassa | media | media | alta | alta |
| Debug | difficile | medio | medio | facile | facile |

#### Quando usare Assembly

**Sì, ha senso** quando serve:

- controllo esatto di registri, flag, istruzioni o timing;
- accesso a funzionalità non esposte dal linguaggio (porte I/O, MSR, istruzioni
  speciali);
- codice che deve girare senza runtime né librerie (bootloader, firmware, codice
  di avvio);
- vincoli estremi di dimensione o prestazioni, dopo aver misurato;
- crittografia che deve essere *constant-time* e resistere ad attacchi temporali;
- reverse engineering, analisi di malware, sicurezza, didattica.

**No, non ha senso** per la logica applicativa: portabilità, manutenibilità e
costi di sviluppo sono quasi sempre più importanti del guadagno teorico.

---

### 2.4 Applicazioni dell'Assembly (punto 1.4 del programma)

- **Sistemi embedded**: microcontrollori con poche risorse (AVR, PIC, 8051,
  Cortex-M). L'Assembly serve per routine di interrupt, inizializzazione,
  timing stretto, risparmio di memoria. Oggi molto codice embedded è in C, ma il
  livello di avvio e i punti critici restano spesso in Assembly.
- **Sistemi operativi**: cambio di contesto, ingresso delle interruzioni,
  gestione della memoria, stub delle system call, codice di avvio. Il kernel è
  scritto in gran parte in C, ma i punti in cui il C non basta sono in Assembly
  (o in C con `asm` inline).
- **Bootloader**: il firmware parte in modalità reale a 16 bit; il primo settore
  (MBR, 512 byte, firma `0x55AA`) deve stare in uno spazio minuscolo, quindi si
  scrive in Assembly. Poi si passa a modalità protetta o long mode. UEFI cambia
  le regole: si usano eseguibili PE e molto C.
- **Driver e interazione con l'hardware**: I/O su porte (`in`/`out`), accesso a
  registri speciali, descrittori DMA. Spesso C con `asm` inline o *intrinsic*.
- **Ottimizzazione**: cicli interni, elaborazione di immagini/audio, DSP, uso di
  SIMD (SSE/AVX, NEON). Prima si misura con strumenti come `perf`, poi si
  interviene.
- **Reverse engineering**: disassemblare binari (`objdump`, Ghidra, IDA),
  ricostruire logica, analizzare firmware e malware.
- **Sicurezza informatica**: shellcode, ROP/JOP, exploit da buffer overflow,
  studio delle mitigazioni (NX, ASLR, stack canary, CET). Anche difesa: codice
  constant-time, hardening, analisi di vulnerabilità.
- **Debugging a basso livello**: `gdb`, breakpoint, watchpoint, ispezione di
  registri e memoria, core dump, analisi di crash senza sorgente.

---

## 3. Funzionamento passo per passo

Prendiamo un programma minimo (anteprima del Modulo 4; qui interessa solo
seguire l'esecuzione, non imparare la sintassi NASM):

```nasm
section .text
global _start

_start:
    mov eax, 60      ; numero della system call: exit
    xor edi, edi     ; codice di uscita = 0
    syscall          ; invoca il kernel
```

Codice macchina corrispondente:

```
B8 3C 00 00 00    mov eax, 60
31 FF             xor edi, edi
0F 05             syscall
```

Traccia dell'esecuzione:

| Passo | `RIP` | Istruzione | Effetto sui registri | Effetto sui flag |
|---|---|---|---|---|
| 0 | indirizzo di `_start` | — | `RSP` punta allo stack; `argc`/`argv` sono sullo stack | valore iniziale |
| 1 | `_start` | fetch/decode/execute di `mov eax, 60` | `EAX = 60`; `RAX` diventa `0x000000000000003C` | **invariati** (`mov` non modifica i flag) |
| 2 | `_start + 5` | `xor edi, edi` | `EDI = 0` | `ZF = 1`, `CF = 0`, `OF = 0`, `SF = 0` |
| 3 | `_start + 7` | `syscall` | il kernel legge `RAX = 60` → `exit`, `RDI = 0` → stato | il processo termina |

Dettagli da notare:

- **`mov eax, 60` scrive un registro a 32 bit**: su x86-64, scrivere `EAX`
  azzera automaticamente la parte alta di `RAX`. È una regola dell'architettura,
  non una convenzione. (La vedremo nel Modulo 2.)
- **`mov` non tocca i flag**: i flag cambiano solo con istruzioni che li
  producono (aritmetiche, logiche, confronti).
- **`xor edi, edi` azzera un registro** e imposta `ZF = 1`. È un modo comune per
  mettere a zero: più corto di `mov edi, 0` (2 byte contro 5).
- **`syscall` non "torna" al programma**: la system call `exit` termina il
  processo. Il codice dopo non verrebbe eseguito.
- Il codice di uscita 0 è visibile nella shell con `echo $?`.

---

## 4. Sintassi e istruzioni coinvolte

In questo modulo **non ci sono istruzioni da imparare a memoria**. Le tre
istruzioni viste sono anticipazioni:

| Istruzione | Significato | Modulo in cui sarà formalizzata |
|---|---|---|
| `mov` | copia un valore in un registro o in memoria | 5 |
| `xor` | OR esclusivo bit a bit; con operandi uguali azzera | 6 |
| `syscall` | richiesta al kernel Linux | 13 |

Ciò che invece è già utile sapere è la **forma** di una riga Assembly NASM:

```nasm
etichetta:  mnemonico operando1, operando2   ; commento
```

- `etichetta:` è un nome simbolico per un indirizzo (facoltativa);
- `mnemonico` è l'operazione;
- gli operandi sono separati da virgola;
- `;` introduce un commento fino a fine riga.

E le **direttive** (non istruzioni):

| Direttiva | Significato |
|---|---|
| `section .text` | inizia la sezione del codice eseguibile |
| `section .data` | dati inizializzati |
| `section .bss` | dati non inizializzati |
| `global _start` | esporta il simbolo `_start` (punto di ingresso) |
| `db`, `dw`, `dd`, `dq` | definiscono dati di 1, 2, 4, 8 byte |

Infine, la differenza di **dialetto**. Lo stesso codice macchina si scrive:

```nasm
; NASM, sintassi Intel: destinazione, sorgente
mov eax, 60
```

```gas
# GAS, sintassi AT&T: sorgente, destinazione, con % e $
movl $60, %eax
```

Chi impara l'Assembly deve sapere che Intel e AT&T descrivono la **stessa**
macchina con ordine degli operandi e simboli diversi. Non sono architetture
diverse, sono notazioni diverse.

---

## 5. Esempi semplici commentati

### Esempio 1 — decodificare byte

```
B8 3C 00 00 00
```

- `B8`: opcode "copia un immediato a 32 bit in un registro a 32 bit";
- `3C 00 00 00`: immediato in little-endian → `0x0000003C` = 60;
- poiché l'opcode `B8` indica il registro `EAX`, l'istruzione è `mov eax, 60`.

### Esempio 2 — riconoscere un'istruzione dal testo

```
31 C0
```

- `31` è l'opcode di `xor` con operando registro/memoria e registro;
- `C0` è il byte ModR/M che codifica "registro `eax` con `eax`";
- quindi `xor eax, eax`: azzera `EAX` e imposta `ZF = 1`.

### Esempio 3 — dalla sorgente all'eseguibile

```sh
nasm -f elf64 uscita.asm -o uscita.o   # traduce il testo in oggetto ELF64
ld uscita.o -o uscita                  # collega e produce l'eseguibile
./uscita                               # esegue
echo $?                                # mostra il codice di uscita (0)
```

Ogni comando ha un ruolo distinto: `nasm` non produce un eseguibile, `ld` non
compila, il loader del kernel non assembla nulla.

---

## 6. Esempi più complessi

### 6.1 Da una funzione C all'Assembly

```c
int somma(int a, int b) {
    return a + b;
}
```

Una traduzione **illustrativa** in x86-64, convenzione System V AMD64 (i
parametri interi arrivano in `edi`, `esi`; il risultato torna in `eax`):

```nasm
somma:
    mov eax, edi     ; risultato = primo parametro
    add eax, esi     ; risultato += secondo parametro
    ret              ; torna al chiamante
```

Lettura:

- `edi` ed `esi` contengono `a` e `b` per convenzione, non per magia: è l'ABI
  che lo stabilisce;
- `eax` è il registro del valore di ritorno;
- `ret` preleva dallo stack l'indirizzo di ritorno e lo mette in `RIP`.

Un compilatore reale potrebbe generare `lea eax, [rdi + rsi]`, oppure
ottimizzare la funzione in modi diversi a seconda del contesto. L'output esatto
dipende da compilatore, versione e opzioni: **non va memorizzato**, va letto.

### 6.2 La stessa funzione su ARM64

```asm
somma:
    add w0, w0, w1   ; x0/w0 = primo parametro e valore di ritorno, x1/w1 = secondo
    ret
```

Confronto: stesse idee (parametri in registri, risultato in registro, ritorno con
`ret`), ma registri, nomi e convenzioni cambiano. Questo è il senso di "Assembly
è specifico per l'architettura".

### 6.3 Un processo dall'inizio alla fine

1. Scrivi `uscita.asm`.
2. `nasm` produce `uscita.o` con una sezione `.text` e il simbolo `_start`.
3. `ld` produce `uscita`, un ELF con punto di ingresso `_start`.
4. La shell chiede al kernel di eseguirlo; il kernel crea il processo, mappa
   l'eseguibile, prepara lo stack.
5. `RIP` punta a `_start`; la CPU esegue `mov`, `xor`, `syscall`.
6. Il kernel esegue `exit(0)` e il processo termina.
7. La shell legge il codice di uscita.

In tutto questo, l'Assembly è servito **solo nel passaggio 1→2**. Dopo, esistono
solo byte e hardware.

---

## 7. Collegamenti con argomenti precedenti

Questo è il primo modulo, quindi i collegamenti sono soprattutto in avanti:

- **Modulo 2 (registri)**: qui abbiamo solo nominato `RAX`, `RDI`, `RIP`,
  `RFLAGS`. Nel prossimo modulo vedremo dimensioni, nomi storici (`AX`, `EAX`,
  `RAX`), usi e regole.
- **Modulo 3 (memoria e indirizzamento)**: qui abbiamo parlato di byte,
  indirizzi e little-endian; là vedremo come si accede davvero alla memoria.
- **Modulo 4 (struttura NASM)**: la sintassi vista qui in anteprima diventerà
  completa.
- **Modulo 7 (flag)**: `ZF`, `CF`, `OF`, `SF` sono stati solo citati.
- **Modulo 9 (stack e funzioni)**: `ret` e la convenzione di chiamata.
- **Modulo 13 (system call)**: `syscall`, `rax`, `rdi`.
- **Modulo 14 (interfacciamento con C)**: l'ABI System V in dettaglio.

Collegamento con conoscenze pregresse: se conosci C, molte cose ti sembreranno
familiari ma "senza rete di sicurezza"; se conosci Python o Java, il salto è più
grande perché qui non c'è nessuna macchina virtuale che ti protegga.

---

## 8. Errori frequenti

1. **"L'Assembly è un linguaggio solo"**: no, è una famiglia; x86-64, ARM64 e
   MIPS hanno istruzioni diverse.
2. **Confondere ISA e sintassi**: `mov eax, 60` (NASM) e `movl $60, %eax` (GAS)
   sono la stessa istruzione macchina. Intel/AT&T sono dialetti, non
   architetture.
3. **Credere che la CPU esegua l'Assembly**: la CPU esegue byte. L'Assembly è
   testo per l'assembler.
4. **Confondere sorgente ed eseguibile**: `nasm` produce un oggetto, non un
   eseguibile; serve il linker.
5. **Pensare che "basso livello" significhi "sempre più veloce"**: un Assembly
   scritto male è più lento di un buon C compilato.
6. **Pensare che una riga di C corrisponda a una riga di Assembly**: il
   compilatore può generare zero, una o molte istruzioni.
7. **Credere che i registri conservino i valori tra processi o chiamate**: il
   sistema operativo li salva e ripristina; l'ABI stabilisce chi li preserva.
8. **Dimenticare che `mov` non imposta i flag**: molti principianti si aspettano
   che `mov eax, 0` imposti `ZF`. Non lo fa.
9. **Assumere che il ciclo Fetch–Decode–Execute descriva i tempi reali**: i
   processori moderni sono pipeline fuori ordine con predizione.
10. **Dimenticare la dimensione degli operandi**: `mov eax, ...` e
    `mov rax, ...` non sono la stessa cosa, anche se il valore è piccolo.
11. **Scrivere indirizzi a mano in un eseguibile moderno**: ASLR, PIE e
    rilocazioni cambiano gli indirizzi a runtime.
12. **Confondere "Assembly" con "reverse engineering"**: il reverse engineering
    *usa* la lettura dell'Assembly, non è la stessa disciplina.

---

## 9. Riepilogo finale

- L'Assembly è la rappresentazione mnemonica delle istruzioni di una ISA; la CPU
  esegue solo codice macchina.
- Ogni architettura ha il suo Assembly; sulla stessa ISA possono esistere più
  dialetti sintattici (NASM/Intel, GAS/AT&T).
- Un'istruzione macchina contiene opcode e operandi; su x86-64 la lunghezza è
  variabile (1–15 byte) e la codifica usa campi come ModR/M, SIB, displacement e
  immediato.
- Un programma percorre: sorgente → oggetto → eseguibile → processo in memoria.
- Il processore esegue il ciclo Fetch–Decode–Execute; `RIP` indica la prossima
  istruzione, `RFLAGS` registra l'esito delle operazioni.
- La memoria è indirizzata a byte ed è little-endian su x86-64; il sistema
  operativo fornisce memoria virtuale, stack, protezione e system call.
- I registri sono pochi, veloci e non persistenti; l'ABI decide chi li preserva.
- Rispetto ai linguaggi ad alto livello, l'Assembly offre controllo totale ma
  niente sicurezza, portabilità o manutenzione facile.
- L'Assembly si usa dove serve controllo o assenza di runtime: avvio, kernel,
  driver, embedded, crittografia, ottimizzazione mirata, sicurezza, didattica.

---

## 10. Esercizi di verifica

> Le soluzioni non sono incluse. Chiedile quando vuoi.

### Esercizi facili

1. Spiega con parole tue la differenza tra linguaggio assembly e linguaggio
   macchina.
2. Elenca tre cose che un linguaggio ad alto livello nasconde e che l'Assembly
   espone.
3. Che cosa contiene un file oggetto `.o` e perché non è ancora un eseguibile?
4. Descrivi le quattro fasi del ciclo Fetch–Decode–Execute e il ruolo di `RIP`.
5. Cita tre applicazioni reali dell'Assembly e spiega in una frase perché lì è
   utile.

### Esercizi intermedi

6. Decodifica questi byte e spiega cosa fa ciascuna istruzione:
   `B8 3C 00 00 00`, `31 C0`, `0F 05`.
7. Perché `xor eax, eax` è preferibile a `mov eax, 0` per azzerare un registro?
   Considera sia la dimensione del codice sia i flag.
8. Spiega perché scrivere `mov eax, 60` su x86-64 azzera anche la parte alta di
   `RAX`.
9. Un programma C contiene `int f(int a, int b) { return a + b; }`. Perché non
   puoi sapere a priori quante istruzioni Assembly genererà il compilatore?
10. Descrivi il percorso completo di un file `.asm` fino alla sua esecuzione,
    indicando il ruolo di assembler, linker, loader e kernel.

### Esercizi difficili

11. Spiega perché la stessa istruzione Assembly non può essere portata
    direttamente da x86-64 a ARM64, mentre un programma C può essere ricompilato.
12. Confronta l'uso dei flag in x86-64 e in ARM64: perché in ARM64 molte
    operazioni non aggiornano alcun flag?
13. Un programma scritto in Assembly risulta più lento di uno equivalente in C
    compilato con `-O2`. Elenca almeno quattro possibili cause.
14. Spiega perché il modello Fetch–Decode–Execute è concettualmente corretto ma
    inadeguato a prevedere le prestazioni reali di un programma.

### Esercizi "prevedi il risultato"

15. Dato il programma del paragrafo 3, quale valore ha `RAX` dopo la prima
    istruzione? E `RDI` dopo la seconda? Quali flag cambiano?
16. Se sostituisci `xor edi, edi` con `mov edi, 5`, quale codice di uscita
    osserva la shell? Perché?
17. Se il programma esegue `mov eax, 60` seguito da `mov edi, 0` e poi
    `syscall`, il processo termina? Con quale stato?
18. Se in un programma manca la `syscall` finale e il codice dopo è casuale
    (byte non validi come istruzioni), cosa può succedere alla CPU?
19. Un eseguibile compilato per ARM64 viene copiato su una macchina x86-64 e
    avviato. Cosa succede e perché?

### Esercizi "scrivi da zero"

20. Scrivi la traccia (non serve ancora la sintassi perfetta) di un programma
    che termini con codice di uscita 42.
21. Descrivi, in pseudo-Assembly, un ciclo che sommi i numeri da 1 a 10 in un
    registro, indicando quale istruzione di confronto e quale salto useresti.
22. Descrivi come tradurre in Assembly il costrutto
    `if (x > y) max = x; else max = y;`, specificando registri ipotetici per
    `x`, `y`, `max`.

---

**Prossimo modulo**: *Modulo 2 — Registri x86-64*. Dimmi **"prosegui"** quando
sei pronto, oppure chiedi chiarimenti, correzioni o le soluzioni degli esercizi.
