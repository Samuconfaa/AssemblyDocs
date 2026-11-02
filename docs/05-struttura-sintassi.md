# Modulo 5 — Struttura e sintassi del codice Assembly

> **Prerequisiti**: Moduli 1–4 (codice macchina, memoria, dati, registri).
> **Architettura di riferimento**: x86-64, sintassi Intel, NASM, Linux 64 bit.
> **Obiettivo del modulo**: saper scrivere, leggere e organizzare un file
> Assembly: sezioni, etichette, istruzioni, operandi, direttive, differenze tra
> Intel e AT&T.

---

## 1. Introduzione e definizione

Un file Assembly non è solo una lista di istruzioni. È composto da tre tipi di
righe:

1. **istruzioni**: producono codice macchina (`mov`, `add`, `call`, ...);
2. **direttive**: parlano all'assembler, non alla CPU (`section`, `global`, `db`,
   `equ`, ...);
3. **etichette e commenti**: organizzano e documentano il codice.

La struttura tipica di un programma NASM su Linux:

```nasm
; commento
default rel

section .data
    msg db "Ciao", 10
    msg_len equ $ - msg

section .bss
    buf resb 64

section .text
    global _start

_start:
    mov rax, 1          ; write
    mov rdi, 1          ; stdout
    lea rsi, [msg]
    mov rdx, msg_len
    syscall

    mov rax, 60         ; exit
    xor edi, edi
    syscall
```

Ogni parte ha un ruolo preciso:

| Parte | Ruolo |
|---|---|
| `section .data` | dati inizializzati (presenti nel file) |
| `section .bss` | dati non inizializzati (riservati, non nel file) |
| `section .text` | codice eseguibile |
| `global _start` | esporta il punto di ingresso |
| `_start:` | etichetta del punto di ingresso |
| istruzioni | codice macchina |
| direttive | layout, simboli, dati |

---

## 2. Spiegazione teorica approfondita

### 5.1 Struttura di un programma

#### Organizzazione generale

Un file `.asm` può contenere, in qualsiasi ordine:

- commenti;
- direttive di sezione;
- definizioni di dati;
- dichiarazioni di simboli (`global`, `extern`, `equ`);
- etichette e istruzioni;
- macro e direttive del preprocessore (`%define`, `%macro`, `%include`).

L'ordine **non** è del tutto libero: le direttive di sezione cambiano la sezione
corrente, e tutto ciò che segue appartiene a quella sezione finché non ne appare
un'altra.

#### Etichette

Un'**etichetta** (*label*) è un nome simbolico associato a un indirizzo:

```nasm
inizio:             ; etichetta di codice
    nop

messaggio:          ; etichetta di dati
    db "hello", 0
```

L'etichetta vale l'indirizzo della riga a cui è applicata. Non genera codice.

#### Istruzioni

Un'**istruzione** è un comando per la CPU, tradotto in uno o più byte:

```nasm
mov eax, 60
add eax, ebx
syscall
```

#### Operandi

Gli **operandi** sono ciò su cui l'istruzione agisce:

- **registro**: `eax`, `rax`, `xmm0`;
- **immediato**: `60`, `0x3C`, `'A'`;
- **memoria**: `[rbx]`, `[rbp - 8]`, `[tabella + rcx*4]`.

#### Commenti

In NASM il commento inizia con `;` e arriva a fine riga:

```nasm
mov eax, 60      ; numero della syscall exit
```

In GAS (AT&T) il commento inizia con `#`; `;` in GAS separa istruzioni, non è un
commento. È un errore classico quando si passa da un dialetto all'altro.

#### Direttive

Le **direttive** sono comandi per l'assembler:

```nasm
section .text      ; cambia sezione
global _start      ; esporta un simbolo
msg db "hi", 0     ; emette byte
buf resb 64        ; riserva 64 byte
SIZE equ 64        ; definisce una costante
```

Non sono istruzioni macchina (anche se alcune, come `db`, producono byte di
dati).

#### Sezione del codice

`section .text` contiene le istruzioni eseguibili. È la sezione mappata con
permesso di esecuzione. Il punto di ingresso (`_start`) sta qui.

#### Sezione dei dati

- `section .data`: dati inizializzati, presenti nel file eseguibile;
- `section .bss`: dati non inizializzati, solo riservati (non occupano spazio nel
  file; l'ELF li descrive come `NOBITS` e il loader li azzera);
- `section .rodata`: dati in sola lettura (stringhe, tabelle costanti).

#### Punto di ingresso

Il **punto di ingresso** è l'indirizzo da cui il sistema operativo inizia
l'esecuzione. Su Linux con `ld` e NASM il simbolo convenzionale è `_start`:

```nasm
global _start
_start:
    ; ...
```

Il linker, se non trova `_start`, emette un avviso e sceglie un punto di
ingresso di default. Con `ld -e simbolo` si può scegliere un altro simbolo.

Differenza importante:

- `_start` è chiamato direttamente dal kernel: **non ha un indirizzo di
  ritorno** sullo stack e non può fare `ret`; deve terminare con una system call
  (`exit`).
- `main` è chiamato dalla libreria C (`crt0`/`__libc_start_main`), che gli passa
  `argc`/`argv` e gestisce il ritorno; `main` può fare `ret`.

### 5.2 Sintassi delle istruzioni

#### Mnemonico

Il **mnemonico** è il nome dell'operazione: `mov`, `add`, `sub`, `jmp`, `call`,
`ret`, `syscall`.

In NASM i mnemonici **non** sono case-sensitive: `MOV`, `mov` e `Mov` sono la
stessa cosa. Le etichette, invece, sono case-sensitive.

#### Operando sorgente e destinazione

Nella sintassi **Intel** (NASM) l'ordine è:

```nasm
mnemonico destinazione, sorgente
```

Esempio: `mov eax, ebx` copia `ebx` in `eax`.

Nella sintassi **AT&T** (GAS) l'ordine è invertito:

```asm
mnemonico sorgente, destinazione
```

Esempio: `movl %ebx, %eax` copia `%ebx` in `%eax`.

L'ordine è la prima cosa da controllare quando si legge codice dell'altro
dialetto.

#### Istruzioni con zero operandi

Non hanno operandi espliciti:

```nasm
nop          ; nessuna operazione
ret          ; ritorno
leave        ; mov rsp, rbp; pop rbp
syscall      ; system call
cqo          ; estende il segno di RAX in RDX
clc          ; azzera CF
```

Alcune hanno operandi **impliciti**: `syscall` usa `rax`, `rdi`, ...;
`cqo` usa `rax`/`rdx`.

#### Istruzioni con un operando

```nasm
inc rax      ; incrementa
dec rbx      ; decrementa
neg eax      ; complemento a due
not al       ; complemento a uno
push rax     ; stack
pop rbx      ; stack
jmp etichetta
call funzione
mul rbx      ; unsigned, usa RDX:RAX
div rcx      ; unsigned, usa RDX:RAX
```

Alcune hanno operandi impliciti aggiuntivi: `mul`/`div` usano `rdx:rax`.

#### Istruzioni con due operandi

Sono la maggioranza:

```nasm
mov rax, rbx
add eax, 1
sub rdx, rcx
cmp al, 0
test eax, eax
lea rax, [rbx + 8]
imul eax, ebx
shl eax, 1
```

#### Istruzioni con più operandi

Alcune ISA/istruzioni ammettono tre o più operandi:

```nasm
imul eax, ebx, 4        ; dest, src, immediato
shld eax, ebx, 4        ; dest, src, conteggio
vaddps ymm0, ymm1, ymm2 ; AVX: dest, src1, src2
```

AVX-512 può arrivare a quattro operandi (destinazione mascherata, due sorgenti,
immediato):

```nasm
vpternlogd zmm0{k1}, zmm1, zmm2, 0x96
```

#### Tipi di operandi

| Tipo | Esempio | Note |
|---|---|---|
| registro | `eax`, `rax`, `xmm0` | dentro la CPU |
| immediato | `60`, `0x3C`, `'A'` | codificato nell'istruzione |
| memoria | `[rbx]`, `[rbp-8]`, `[tab+rcx*4]` | indirizzo calcolato |
| implicito | `rax` in `mul` | non scritto nell'istruzione |

#### Dimensioni degli operandi

La dimensione è determinata da:

1. il registro usato (`al` = 1 byte, `ax` = 2, `eax` = 4, `rax` = 8);
2. la parola chiave esplicita (`byte`, `word`, `dword`, `qword`);
3. l'istruzione stessa.

```nasm
mov al,  [rbx]        ; 1 byte
mov ax,  [rbx]        ; 2 byte
mov eax, [rbx]        ; 4 byte
mov rax, [rbx]        ; 8 byte

mov byte  [rbx], 1    ; esplicito
mov word  [rbx], 1
mov dword [rbx], 1
mov qword [rbx], 1
```

Senza informazione sufficiente, NASM segnala errore:

```nasm
mov [rbx], 1          ; errore: dimensione non specificata
```

#### Indirizzamento in memoria

Forma generale:

```nasm
[base + indice*scala + spostamento]
```

- `base`: registro (es. `rbx`, `rbp`);
- `indice`: registro (es. `rcx`, `rsi`), **non** `rsp`;
- `scala`: 1, 2, 4 o 8;
- `spostamento`: costante (0, 8, -16, ...).

Esempi:

```nasm
mov eax, [rbx]              ; [rbx]
mov eax, [rbx + 8]          ; [rbx + 8]
mov eax, [rbx + rcx*4]      ; array di int
mov eax, [rbx + rcx*4 + 16] ; con offset
mov rax, [rel variabile]    ; RIP-relative
```

#### Operandi immediati e segno

Gli immediati sono codificati nell'istruzione. Su x86-64:

- `mov r64, imm64` esiste, ma è lungo (10 byte);
- molte istruzioni accettano solo `imm32` con estensione del segno;
- NASM può scegliere codifiche più corte equivalenti.

```nasm
mov rax, -1                 ; imm32 con segno, 7 byte
mov rax, 0x1122334455667788 ; imm64, 10 byte
```

### 5.3 Convenzioni sintattiche

#### Sintassi Intel (NASM)

```nasm
mov eax, 60
mov rax, [rbx + 8]
mov byte [rbx], 1
lea rax, [rbx + rcx*4]
add eax, ebx
```

Caratteristiche:

- destinazione a sinistra, sorgente a destra;
- nessun prefisso `%` sui registri;
- nessun `$` sugli immediati;
- memoria tra parentesi quadre;
- dimensione tramite parole chiave (`byte`, `dword`, ...);
- commento con `;`.

#### Sintassi AT&T (GAS)

```asm
movl $60, %eax
movq 8(%rbx), %rax
movb $1, (%rbx)
leaq (%rbx,%rcx,4), %rax
addl %ebx, %eax
```

Caratteristiche:

- sorgente a sinistra, destinazione a destra;
- registri con `%`;
- immediati con `$`;
- memoria con `spostamento(base, indice, scala)`;
- suffisso di dimensione sul mnemonico (`b`, `w`, `l`, `q`);
- commento con `#`;
- `;` separa istruzioni, non è un commento.

#### Differenze in tabella

| Aspetto | Intel (NASM) | AT&T (GAS) |
|---|---|---|
| Ordine | `dest, src` | `src, dest` |
| Registri | `eax` | `%eax` |
| Immediati | `60` | `$60` |
| Memoria | `[rbx + 8]` | `8(%rbx)` |
| Indice scalato | `[rbx + rcx*4]` | `(%rbx,%rcx,4)` |
| Dimensione | `mov dword [rbx], 1` | `movl $1, (%rbx)` |
| Commento | `;` | `#` |
| Direttive | `section`, `global` | `.section`, `.globl` |
| Direttiva di sintassi | — | `.intel_syntax noprefix` |

#### Prefissi e suffissi

- **Intel/NASM**: la dimensione è nella parola chiave dell'operando, non nel
  mnemonico.
- **AT&T/GAS**: il suffisso sul mnemonico indica la dimensione:
  - `b` = byte (8 bit);
  - `w` = word (16 bit);
  - `l` = long (32 bit);
  - `q` = quad (64 bit).

```asm
movb $1, (%rbx)      # 1 byte
movw $1, (%rbx)      # 2 byte
movl $1, (%rbx)      # 4 byte
movq $1, (%rbx)      # 8 byte
```

#### Rappresentazione dei registri

- Intel: `rax`, `eax`, `ax`, `al`, `r8`, `r8d`, ...
- AT&T: `%rax`, `%eax`, `%ax`, `%al`, `%r8`, `%r8d`, ...

#### Rappresentazione delle costanti

- Intel/NASM: `60`, `0x3C`, `0b1010`, `0o17`, `'A'`.
- AT&T/GAS: `$60`, `$0x3C`, `$0b1010`, `$'A'`.

Attenzione: in AT&T `$` distingue l'immediato dall'indirizzo di memoria:

```asm
movl $msg, %eax      # indirizzo di msg (immediato)
movl msg, %eax       # contenuto all'indirizzo msg
```

In Intel/NASM:

```nasm
mov eax, msg         # indirizzo di msg
mov eax, [msg]       # contenuto all'indirizzo msg
```

#### Rappresentazione degli indirizzi

Intel/NASM:

```nasm
[base + indice*scala + spostamento]
```

AT&T/GAS:

```asm
spostamento(base, indice, scala)
```

Esempio equivalente:

```nasm
mov eax, [rbx + rcx*4 + 8]
```

```asm
movl 8(%rbx,%rcx,4), %eax
```

### 5.4 Etichette

#### Definizione

Un'etichetta è un nome per un indirizzo. In NASM si scrive:

```nasm
nome:
```

Il colon è facoltativo, ma è consigliato per chiarezza.

#### Etichette per le istruzioni

```nasm
inizio:
    mov eax, 1
    jmp inizio
```

Una `jmp` a un'etichetta viene tradotta in un salto relativo; l'assembler
calcola lo spostamento.

#### Etichette per i dati

```nasm
messaggio:
    db "hello", 0

lunghezza equ $ - messaggio
```

L'etichetta vale l'indirizzo del primo byte. `$` è l'indirizzo corrente e
`$$` è l'inizio della sezione.

#### Etichette locali e globali

- **Globali**: visibili ad altri file se esportate con `global` (o `.globl` in
  GAS). Sono usate per funzioni e punti di ingresso.
- **Locali**: in NASM un'etichetta che inizia con `.` è locale all'ultima
  etichetta non locale:

```nasm
somma:
    xor eax, eax
.loop:
    add eax, ecx
    dec ecx
    jnz .loop
    ret

altra:
.loop:              ; etichetta diversa da somma.loop
    nop
```

Il nome completo è `somma.loop`, ma si può usare `.loop` nel contesto di
`somma`.

Esistono anche etichette speciali che iniziano con `..@`: non finiscono nella
tabella dei simboli e sono usate per scopi interni/macro.

#### Salti verso un'etichetta

```nasm
    jmp avanti
    nop
avanti:
    ret
```

I salti a breve distanza usano uno spostamento a 8 bit; quelli più lontani a 32
bit. L'assembler sceglie la codifica (e può fare più passate per risolvere le
dimensioni).

#### Risoluzione delle etichette

L'assemblaggio avviene in più passate:

1. **Prima passata**: raccoglie simboli, dimensioni, sezioni, riferimenti non
   risolti.
2. **Passate successive**: calcola gli indirizzi e codifica le istruzioni,
   scegliendo le forme di salto appropriate.
3. **Rilocazioni**: i riferimenti a simboli esterni o ad altri oggetti restano
   da risolvere al linker.

Per questo si possono usare etichette definite **dopo** l'istruzione che le
referenzia (riferimenti in avanti).

In un eseguibile PIE gli indirizzi assoluti non sono noti al link time: per i
dati si usa l'indirizzamento relativo a `rip` (`[rel simbolo]` o `default rel`).

### 5.5 Direttive dell'assembler

#### `BITS`

Imposta la modalità di default per l'output **binario**:

```nasm
BITS 16      ; codice a 16 bit (bootloader, modalità reale)
BITS 32
BITS 64
```

Per `-f elf64` la modalità è determinata dal formato: `BITS` non serve (e non
cambia l'ELF). È invece essenziale per `-f bin`, dove il default è 16 bit.

#### `SECTION` / `SEGMENT`

Cambiano la sezione corrente:

```nasm
section .text
section .data
section .bss
section .rodata
```

`SEGMENT` è un sinonimo di `SECTION` in NASM (con differenze nel formato `obj`,
non rilevanti qui).

Attributi utili:

```nasm
section .data align=16
section .bss nobits
section .note.GNU-stack noalloc noexec nowrite progbits
```

L'ultima riga evita l'avviso di stack eseguibile con linker moderni.

#### `GLOBAL`

Esporta un simbolo, rendendolo visibile ad altri file e al linker:

```nasm
global _start
global mia_funzione
```

#### `EXTERN`

Dichiara un simbolo definito altrove:

```nasm
extern printf
extern scrivi_messaggio
```

Il linker risolverà il riferimento. In un eseguibile PIE, le chiamate a funzioni
di libreria possono richiedere `wrt ..plt` (es. `call printf wrt ..plt`).

#### `EQU`

Definisce una costante:

```nasm
BUFSIZE equ 64
msg_len equ $ - msg
```

- il valore è calcolato in fase di assemblaggio;
- non occupa memoria;
- non può essere ridefinita (per valori riassegnabili si usa `%assign`).

#### `TIMES`

Ripete un'istruzione o una definizione di dati:

```nasm
times 64 db 0          ; 64 byte a zero
times 4  dd 0          ; 4 dword a zero
times 4  nop           ; 4 NOP
```

L'espressione deve essere valutabile in fase di assemblaggio.

#### `RESB`, `RESW`, `RESD`, `RESQ`

Riservano spazio non inizializzato:

```nasm
buffer  resb 128       ; 128 byte
vettore resw 32        ; 32 word (64 byte)
tabella resd 16        ; 16 dword (64 byte)
grande  resq 8         ; 8 qword (64 byte)
```

Si usano tipicamente in `.bss`. In altre sezioni riservano comunque spazio, ma
non emettono dati inizializzati. Per dati inizializzati si usano `db`/`dw`/`dd`/
`dq` o `times`.

#### `DB`, `DW`, `DD`, `DQ`

Emettono dati di 1, 2, 4, 8 byte:

```nasm
b1  db 0x41
b2  db "hello", 0
w1  dw 0x1234
d1  dd 0x12345678
q1  dq 0x1122334455667788
arr dd 1, 2, 3, 4
f1  dd 1.0             ; float IEEE 754 binary32
d2  dq 1.0             ; double IEEE 754 binary64
```

Nota: `db "hello"` **non** aggiunge il terminatore `0`; va messo esplicitamente
se serve.

#### `ALIGN`

Allinea il punto corrente:

```nasm
align 16
```

Aggiunge padding fino al multiplo richiesto. In `.bss` si usa `alignb`, che
riserva spazio senza emettere byte.

#### Altre direttive NASM utili

| Direttiva | Uso |
|---|---|
| `default rel` | indirizzamento relativo a `RIP` per i dati |
| `default abs` | indirizzamento assoluto |
| `%define` | macro testuale |
| `%assign` | costante riassegnabile |
| `%macro` / `%endmacro` | macro con parametri |
| `%include` | include un altro file |
| `%if` / `%ifdef` / `%else` / `%endif` | assemblaggio condizionale |
| `%rep` / `%endrep` | ripetizione nel preprocessore |
| `CPU` | limita il set di istruzioni accettate |
| `ORG` | indirizzo di origine (solo output bin) |
| `STRUC` / `ISTRUC` | definizione e istanziazione di strutture |
| `COMMON` | simbolo comune (ELF) |

#### Direttive e istruzioni: differenza

| Direttiva | Istruzione |
|---|---|
| eseguita dall'assembler | eseguita dalla CPU |
| non produce codice macchina (di solito) | produce codice macchina |
| controlla layout, simboli, dati | esegue operazioni |
| es. `section`, `global`, `equ` | es. `mov`, `add`, `call` |

Attenzione: alcune direttive **producono byte** (`db`, `dw`, `dd`, `dq`,
`times`, `align`) ma quei byte sono dati o padding, non istruzioni.

---

## 3. Funzionamento passo per passo

### 3.1 Dalla sorgente all'esecuzione

```sh
nasm -f elf64 programma.asm -o programma.o
ld programma.o -o programma
./programma
echo $?
```

1. **Preprocessore NASM**: espande `%define`, `%macro`, `%include`, `%if`.
2. **Assembler**: prima passata per simboli e dimensioni; passate successive per
   codificare istruzioni e risolvere etichette locali.
3. **Oggetto ELF**: contiene sezioni, simboli, rilocazioni.
4. **Linker**: unisce oggetti, risolve `extern`, imposta l'entry point.
5. **Loader**: il kernel mappa l'eseguibile, prepara lo stack, salta a `_start`.
6. **Esecuzione**: le istruzioni vengono eseguite; `exit` termina il processo.

Comandi di ispezione:

```sh
readelf -h programma     # entry point, tipo
readelf -S programma     # sezioni
readelf -l programma     # segmenti (program header)
objdump -d -Mintel programma
nm programma             # simboli
```

### 3.2 Risoluzione di un'etichetta

```nasm
_start:
    jmp avanti
    nop
avanti:
    ret
```

- prima passata: `_start` e `avanti` vengono registrate con dimensioni note;
- seconda passata: la `jmp` viene codificata come salto relativo; lo
  spostamento è `avanti - (indirizzo dopo la jmp)`;
- se la distanza non entra in 8 bit, si usa la forma a 32 bit.

Con un'etichetta esterna:

```nasm
extern puts
call puts
```

- l'assembler emette una rilocazione;
- il linker sostituisce l'indirizzo;
- in PIE può servire una PLT (`wrt ..plt`).

### 3.3 Codifica di alcune istruzioni

| Istruzione | Byte | Note |
|---|---|---|
| `mov eax, 60` | `B8 3C 00 00 00` | opcode + imm32 |
| `mov rax, rbx` | `48 89 D8` | REX.W + opcode + ModR/M |
| `mov rax, [rbx]` | `48 8B 03` | load da memoria |
| `lea rax, [rbx+8]` | `48 8D 43 08` | calcolo indirizzo |
| `push rax` | `50` | opcode breve |
| `ret` | `C3` | ritorno |
| `syscall` | `0F 05` | syscall Linux |

La lunghezza variabile rende la decodifica x86 più complessa rispetto alle ISA
a istruzioni fisse.

### 3.4 Sezioni e layout

```nasm
section .data
    msg db "Ciao", 10
    len equ $ - msg

section .bss
    buf resb 64

section .text
    global _start
_start:
    ; ...
```

- `.data` finisce nel file con i byte di `msg`;
- `.bss` non occupa spazio nel file, ma il loader riserva e azzera 64 byte;
- `.text` contiene il codice;
- `len` è una costante, non occupa memoria.

---

## 4. Sintassi e istruzioni coinvolte

In questo modulo si consolidano le forme già viste e si aggiungono le direttive.
Istruzioni usate negli esempi:

| Istruzione | Forma | Modulo |
|---|---|---|
| `mov` | 2 operandi | 5 |
| `lea` | 2 operandi | 5 |
| `add`, `sub` | 2 operandi | 6 |
| `cmp`, `test` | 2 operandi | 7 |
| `jmp`, `jcc` | 1 operando | 8 |
| `call`, `ret` | 1 / 0 operandi | 9 |
| `push`, `pop` | 1 operando | 9 |
| `inc`, `dec`, `neg`, `not` | 1 operando | 6 |
| `imul` | 2 o 3 operandi | 11 |
| `syscall` | 0 operandi (impliciti) | 13 |

Direttive:

| Direttiva | Uso |
|---|---|
| `section` / `segment` | sezione corrente |
| `global` / `extern` | simboli esportati/importati |
| `equ` | costante |
| `times` | ripetizione |
| `db`/`dw`/`dd`/`dq` | dati |
| `resb`/`resw`/`resd`/`resq` | spazio riservato |
| `align`/`alignb` | allineamento |
| `bits` | modalità per output bin |
| `default rel` | indirizzamento RIP-relative |

---

## 5. Esempi semplici commentati

### Esempio 1 — Anatomia di una riga

```nasm
etichetta:  mov eax, 60      ; commento
```

- `etichetta:` = nome per l'indirizzo della riga;
- `mov` = mnemonico;
- `eax` = destinazione (Intel);
- `60` = sorgente immediata;
- `; commento` = ignorato dall'assembler.

### Esempio 2 — Programma minimo

```nasm
section .text
global _start

_start:
    mov eax, 60      ; syscall exit
    xor edi, edi     ; status 0
    syscall
```

Riga per riga:

- `section .text`: seleziona la sezione di codice;
- `global _start`: esporta `_start` per il linker;
- `_start:`: etichetta del punto di ingresso;
- `mov eax, 60`: numero della syscall `exit`;
- `xor edi, edi`: `edi = 0`, `ZF = 1`, `CF = 0`, `OF = 0`;
- `syscall`: invoca il kernel; il processo termina.

### Esempio 3 — Hello world

```nasm
default rel

section .data
    msg db "Ciao", 10
    msg_len equ $ - msg

section .text
    global _start

_start:
    mov rax, 1              ; write
    mov rdi, 1              ; stdout
    lea rsi, [msg]          ; buffer
    mov rdx, msg_len        ; lunghezza
    syscall

    mov rax, 60             ; exit
    xor edi, edi
    syscall
```

- `default rel`: gli indirizzi dei dati sono relativi a `RIP`;
- `msg` contiene 5 byte: `C i a o \n`;
- `$ - msg` calcola la lunghezza;
- `lea rsi, [msg]`: carica l'indirizzo, non il contenuto;
- `syscall` con `rax = 1` scrive su `stdout`;
- `exit(0)` termina.

### Esempio 4 — Ciclo con etichetta locale

```nasm
section .text
global _start

_start:
    mov edi, 10
    call somma
    mov edi, eax
    mov eax, 60
    syscall

somma:
    xor eax, eax
    mov ecx, edi
.loop:
    add eax, ecx
    dec ecx
    jnz .loop
    ret
```

- `call somma` spinge l'indirizzo di ritorno;
- `eax` accumula, `ecx` conta;
- `.loop` è locale a `somma`;
- `dec` imposta `ZF` quando `ecx` arriva a 0; `jnz` salta finché non è zero;
- `ret` torna al chiamante;
- `mov edi, eax` passa il risultato (55) come codice di uscita.

### Esempio 5 — Dati e spazio riservato

```nasm
section .data
    align 8
    tabella: times 4 dq 0
    nome: db "NASM", 0

section .bss
    buffer: resb 128
    alignb 16
    area: resq 8
```

- `align 8` allinea `tabella` a 8 byte;
- `times 4 dq 0` crea 4 qword a zero;
- `db "NASM", 0` crea 5 byte con terminatore;
- `resb`/`resq` riservano spazio in `.bss`;
- `alignb` allinea senza emettere byte.

---

## 6. Esempi più complessi

### 6.1 Funzione con frame pointer e registri callee-saved

```nasm
section .text
global _start

_start:
    mov rdi, 7
    call quadrato
    mov edi, eax
    mov eax, 60
    syscall

quadrato:
    push rbp
    mov rbp, rsp
    push rbx                 ; callee-saved
    mov rbx, rdi
    imul rbx, rdi
    mov rax, rbx
    pop rbx
    pop rbp
    ret
```

- `push rbp`/`mov rbp, rsp` creano il frame;
- `push rbx` preserva un registro callee-saved;
- `imul rbx, rdi` calcola il quadrato;
- `pop rbx`/`pop rbp` ripristinano;
- `ret` torna al chiamante.

### 6.2 Macro

```nasm
%macro scrivi 2
    mov rax, 1
    mov rdi, 1
    lea rsi, [rel %1]
    mov rdx, %2
    syscall
%endmacro

section .data
    msg db "ok", 10

section .text
    global _start
_start:
    scrivi msg, 3
    mov rax, 60
    xor edi, edi
    syscall
```

La macro viene espansa dal preprocessore: non esiste a runtime, e il codice
finale contiene le istruzioni espanse.

### 6.3 Stesso codice in Intel e AT&T

Intel/NASM:

```nasm
mov eax, 60
mov rax, [rbx + 8]
mov byte [rbx], 1
lea rax, [rbx + rcx*4]
add eax, ebx
```

AT&T/GAS:

```asm
movl $60, %eax
movq 8(%rbx), %rax
movb $1, (%rbx)
leaq (%rbx,%rcx,4), %rax
addl %ebx, %eax
```

Stessa macchina, dialetti diversi.

### 6.4 Simboli globali ed esterni

File 1:

```nasm
global mia_funzione
section .text
mia_funzione:
    mov rax, rdi
    add rax, rsi
    ret
```

File 2:

```nasm
extern mia_funzione
section .text
global _start
_start:
    mov rdi, 3
    mov rsi, 4
    call mia_funzione
    mov edi, eax
    mov eax, 60
    syscall
```

Link:

```sh
nasm -f elf64 uno.asm -o uno.o
nasm -f elf64 due.asm -o due.o
ld uno.o due.o -o programma
```

Il linker risolve `mia_funzione` e imposta l'entry point `_start`.

### 6.5 Eseguibile PIE e indirizzamento relativo

```nasm
default rel
section .data
    msg db "ciao", 10

section .text
    global _start
_start:
    lea rsi, [msg]
```

Con `default rel`, `[msg]` diventa `[rip + offset]`. Senza, NASM userebbe un
indirizzo assoluto a 32 bit, che in un PIE può non essere valido o richiedere
rilocazioni.

---

## 7. Collegamenti con argomenti precedenti

- **Modulo 1**: il percorso sorgente → oggetto → eseguibile → processo; qui
  abbiamo visto i comandi e le sezioni.
- **Modulo 2**: sezioni e regioni del processo, memoria virtuale, allineamento.
- **Modulo 3**: `db`/`dw`/`dd`/`dq`, dimensioni, little-endian, stringhe e
  terminatori.
- **Modulo 4**: registri, `rsp`/`rbp`, convenzioni di chiamata.
- **Modulo 5**: questa lezione è il ponte verso la programmazione concreta.
- **Modulo 6**: aritmetica e logica.
- **Modulo 7**: flag e confronti.
- **Modulo 8**: salti ed etichette.
- **Modulo 9**: funzioni, stack frame, `call`/`ret`.
- **Modulo 13**: syscall e I/O.
- **Modulo 14**: `extern`, ABI, linking con C.

---

## 8. Errori frequenti

1. **Dimenticare `global _start`**: il linker non trova l'entry point.
2. **Dimenticare `section .text`**: il codice finisce nella sezione sbagliata.
3. **Usare `;` come commento in GAS**: in GAS separa istruzioni; il commento è
   `#`.
4. **Invertire l'ordine degli operandi** tra Intel e AT&T.
5. **Dimenticare `%` o `$` in AT&T**.
6. **Dimenticare la dimensione dell'operando**: `mov [rbx], 1` è ambiguo.
7. **Scrivere `mov [a], [b]`**: memoria → memoria non è ammesso.
8. **Ridefinire una costante `equ`**: non è consentito; usare `%assign`.
9. **Usare `resb` in `.data` aspettandosi byte nel file**: usa `times` o `db`.
10. **Dimenticare il terminatore `0` in una stringa C**.
11. **Aspettarsi che `db "hi"` includa `\0`**: non lo include.
12. **Fare `ret` da `_start`**: non c'è un indirizzo di ritorno; usare `exit`.
13. **Sbagliare lo scope delle etichette locali**: `.loop` appartiene all'ultima
    etichetta non locale.
14. **Assumere che le etichette siano case-insensitive**: NASM le tratta come
    case-sensitive.
15. **Usare `align` in `.bss`**: serve `alignb`.
16. **Dimenticare `default rel` in un PIE**: indirizzi assoluti non validi o
    rilocazioni indesiderate.
17. **Confondere `global` ed `extern`**: il primo esporta, il secondo importa.
18. **Dimenticare `wrt ..plt` per chiamate a librerie in PIE**.
19. **Usare `BITS 64` con `elf64` aspettandosi un effetto**: per ELF la modalità
    è già determinata.
20. **Lasciare `_start` senza syscall di uscita**: il processo può continuare in
    memoria non valida e crashare.

---

## 9. Riepilogo finale

- Un file Assembly contiene istruzioni, direttive, etichette e commenti.
- Le sezioni principali sono `.text` (codice), `.data` (dati inizializzati),
  `.bss` (spazio riservato), `.rodata` (sola lettura).
- `_start` è il punto di ingresso convenzionale per `ld`; deve terminare con
  `exit`, non con `ret`.
- In Intel/NASM l'ordine è `dest, src`; in AT&T è `src, dest`; cambiano anche
  prefissi, suffissi, commenti e sintassi della memoria.
- Le etichette sono indirizzi; `.nome` è locale all'ultima etichetta non locale;
  `$` è l'indirizzo corrente e `$$` l'inizio della sezione.
- Le direttive controllano layout e simboli: `section`, `global`, `extern`,
  `equ`, `times`, `db`/`dw`/`dd`/`dq`, `resb`/..., `align`.
- La dimensione degli operandi va specificata quando non è deducibile.
- L'assemblaggio è multi-passata; le etichette possono essere usate prima della
  definizione; i simboli esterni sono risolti dal linker.
- La sintassi è solo la superficie: ogni riga ha un effetto su sezioni,
  indirizzi, registri e codice macchina.

---

## 10. Esercizi di verifica

> Soluzioni non incluse. Chiedile quando vuoi.

### Esercizi facili

1. Elenca le tre sezioni principali di un programma NASM e cosa contengono.
2. A cosa serve `global _start`?
3. Qual è la differenza tra `_start` e `main`?
4. Scrivi la sintassi Intel e AT&T di `mov eax, 60`.
5. Qual è il commento in NASM? E in GAS?

### Esercizi intermedi

6. Spiega la differenza tra `db "hi"` e `db "hi", 0`.
7. A cosa serve `$ - msg`? Fai un esempio.
8. Spiega la differenza tra `resb` e `times ... db`.
9. Scrivi un'etichetta locale e spiega a quale etichetta non locale appartiene.
10. Traduci in AT&T: `mov rax, [rbx+8]`, `lea rax, [rbx+rcx*4]`,
    `mov byte [rbx], 1`.
11. Spiega la differenza tra `global` ed `extern`.
12. Perché `mov [rbx], 1` dà errore e come si corregge?

### Esercizi difficili

13. Descrivi le passate dell'assembler e come viene risolto un salto in avanti.
14. Perché in un PIE serve l'indirizzamento relativo a `RIP`? Cosa succede con
    un indirizzo assoluto?
15. Spiega il ruolo di `BITS` e perché è irrilevante con `elf64`.
16. Confronta `section .data` e `section .bss` in termini di file e memoria.
17. Perché `equ` non può essere ridefinito e `%assign` sì?
18. Spiega come `times`, `align` e `resb` influenzano il layout.

### Esercizi "prevedi il risultato"

19. Cosa contiene la tabella dei simboli dopo `global _start` e `_start:`?
20. Se `msg` è a `0x402000` e `msg_len equ $ - msg` con 5 byte, quanto vale
    `msg_len`?
21. Dato `mov rax, -1`, quanti byte occupa l'istruzione e perché?
22. Se `rsp` vale `0x...FF8` prima di `call`, cosa vale all'ingresso della
    funzione?
23. Cosa succede se `_start` esegue `ret`?
24. Cosa fa `align 16` in `.text`? E `alignb 16` in `.bss`?

### Esercizi "scrivi da zero"

25. Scrivi un programma completo che stampi `"Ciao\n"` ed esca con 0.
26. Scrivi un file con `.data`, `.bss`, una funzione e un ciclo con etichetta
    locale.
27. Traduci un piccolo programma da Intel a AT&T e spiega ogni differenza.

---

**Prossimo modulo**: il Modulo 6 del tuo programma. Dimmi **"prosegui"** quando
sei pronto, oppure chiedi chiarimenti o le soluzioni degli esercizi.
