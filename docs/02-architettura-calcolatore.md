# Modulo 2 — Architettura del calcolatore

> **Prerequisiti**: Modulo 1 (Assembly, ISA, codice macchina, ciclo di esecuzione).
> **Architettura di riferimento**: x86-64, NASM, Linux 64 bit.
> **Obiettivo del modulo**: capire da quali parti è fatto un calcolatore, come la
> CPU esegue le istruzioni, come funzionano le memorie e perché esistono famiglie
> di architetture diverse (von Neumann/Harvard, CISC/RISC).

---

## 1. Introduzione e definizione

Un **calcolatore** è un sistema che esegue operazioni su dati rappresentati in
forma binaria. Le parti che ci interessano per capire l'Assembly sono cinque:

1. **CPU** (processore): esegue le istruzioni.
2. **Memoria centrale** (RAM): contiene programmi e dati in esecuzione.
3. **Memoria non volatile** (ROM/flash): contiene il firmware di avvio.
4. **Cache**: memoria intermedia dentro o vicino alla CPU.
5. **Bus e periferiche**: collegano e alimentano il resto (dischi, tastiera,
   rete, GPU, ...).

Sopra tutto questo c'è il **sistema operativo**, che crea l'illusione di un
ambiente ordinato: memoria virtuale, processi, file, system call.

L'idea da fissare subito: **l'Assembly non descrive solo istruzioni, descrive il
loro effetto su una macchina concreta**. Capire registri, cache, bus e memoria
virtuale significa capire *perché* un programma Assembly è veloce o lento, e
perché alcune istruzioni esistono.

---

## 2. Spiegazione teorica approfondita

### 2.1 Componenti principali

#### CPU (Central Processing Unit)

Il processore è il componente che **legge, decodifica ed esegue** le istruzioni.
Al suo interno:

- **unità di controllo (CU)**: coordina il ciclo di istruzione, gestisce i
  segnali interni ed esterni, decide cosa fare e quando;
- **ALU** (*Arithmetic Logic Unit*): esegue operazioni aritmetiche (somma,
  sottrazione, ...) e logiche (AND, OR, XOR, shift, confronti);
- **registri**: memoria interna piccolissima e veloce (valori, indirizzi, flag);
- **unità di decodifica**: trasforma i byte delle istruzioni in operazioni
  interne;
- **unità di gestione della memoria** (MMU): traduce indirizzi virtuali in fisici;
- **cache** interne (L1, spesso L2) e logica di controllo;
- **FPU/SIMD**: unità per virgola mobile e operazioni vettoriali.

Nei processori moderni molte di queste parti sono replicate per **core**.

#### Memoria RAM

Contiene i programmi e i dati in esecuzione. È **volatile**: perde il contenuto
allo spegnimento. È organizzata in **celle numerate** (byte) e accessibile
tramite indirizzi. È molto più grande della cache e molto più lenta.

#### Memoria ROM

Memoria **non volatile**, scrivibile in fabbrica o (nelle varianti flash/EEPROM)
aggiornabile. Contiene il **firmware**: il codice che parte prima del sistema
operativo (BIOS/UEFI su PC, bootloader su schede embedded). Sui PC moderni il
firmware risiede in un chip flash SPI sulla scheda madre.

#### Cache

Memoria piccola e velocissima che conserva copie di dati e istruzioni usati di
recente o probabilmente usati a breve. È il ponte tra registri (velocissimi,
pochissimi) e RAM (grande, lenta). Ne parliamo in dettaglio nel paragrafo 2.3.

#### Bus

Insieme di collegamenti che trasportano informazioni. Storicamente si distingue:

- **bus degli indirizzi**: quali celle si vogliono leggere/scrivere; la sua
  larghezza determina lo spazio di indirizzamento (20 bit → 1 MB nell'8086; 32
  bit → 4 GB; 64 bit teorici → spazio enorme, in pratica 48/57 bit virtuali);
- **bus dei dati**: i valori trasferiti; la sua larghezza determina quanti bit
  passano per volta;
- **bus di controllo**: comandi (lettura, scrittura), clock, interrupt, ecc.

Nei sistemi moderni i bus "classici" sono in gran parte sostituiti da
collegamenti punto-punto (PCI Express, link tra core e memoria, interconnect tra
chiplet), ma il modello concettuale resta valido.

#### Periferiche di input/output

Dispositivi esterni e i loro **controller** (disco, tastiera, rete, USB, GPU).
Due meccanismi importanti:

- **I/O memory-mapped**: i registri del dispositivo sono mappati in indirizzi di
  memoria, quindi si accede con normali istruzioni di load/store.
- **I/O su porte**: spazio separato di indirizzi I/O, accessibile con istruzioni
  dedicate (`in`/`out` su x86).

Le periferiche comunicano con la CPU tramite **interrupt** (la CPU viene
avvisata) e possono trasferire dati direttamente in memoria con **DMA** (*Direct
Memory Access*), senza far copiare ogni byte alla CPU.

---

### 2.2 CPU

#### Che cos'è il processore

È un circuito integrato che esegue un **programma** letto dalla memoria. Un
processore moderno contiene più **core**, ciascuno capace di eseguire un flusso di
istruzioni, più cache condivise, controller di memoria e interfacce.

#### Come vengono eseguite le istruzioni

Il modello di riferimento è il **ciclo di istruzione**:

1. **Fetch** — la CPU legge dalla memoria l'istruzione all'indirizzo contenuto
   in `RIP` (x86-64).
2. **Decode** — interpreta i byte: riconosce opcode, operandi, lunghezza;
   internamente li traduce in **micro-operazioni**.
3. **Execute** — esegue l'operazione: ALU, accesso a memoria, salto, chiamata.
4. **Write-back** — scrive il risultato in un registro o in memoria; aggiorna i
   flag; `RIP` avanza.

Questo è il modello didattico. Il processore reale sovrappone le fasi
(pipeline), ne esegue più di una per ciclo (superscalare) e può eseguirle fuori
ordine (out-of-order).

#### Clock e frequenza

Il **clock** è il segnale che scandisce il ritmo interno. La frequenza (Hz)
indica i cicli al secondo: 3 GHz = 3 miliardi di cicli/s, quindi un ciclo dura
circa 0,33 ns.

Attenzione: **la frequenza non è la prestazione**. Contano anche:

- quante istruzioni si completano per ciclo (**IPC**);
- l'efficienza della pipeline e delle cache;
- il numero di core;
- la latenza della memoria;
- il tipo di carico di lavoro.

Due CPU a 3 GHz possono avere prestazioni molto diverse. I processori moderni
hanno frequenze **base** e **turbo**, che dipendono da carico, temperatura e
alimentazione.

#### Ciclo di istruzione in dettaglio

Esempio didattico con cinque stadi tipici (modello RISC classico):

```
IF  →  ID  →  EX  →  MEM  →  WB
```

- **IF** (*Instruction Fetch*): preleva l'istruzione, aggiorna il PC.
- **ID** (*Instruction Decode*): decodifica, legge i registri operando.
- **EX** (*Execute*): ALU, calcolo di indirizzi, confronti.
- **MEM** (*Memory*): load/store, se l'istruzione accede alla memoria.
- **WB** (*Write-Back*): scrive il risultato nel registro.

Su x86 le pipeline sono più profonde (spesso 15–20 stadi) perché la decodifica è
più complessa e le istruzioni hanno lunghezza variabile.

#### Pipeline

La pipeline sovrappone l'esecuzione di più istruzioni: mentre una è in execute,
la successiva è in decode, un'altra è in fetch. Idealmente si completa
un'istruzione per ciclo, ma intervengono **hazard**:

- **strutturali**: due istruzioni vogliono la stessa risorsa (es. la stessa
  unità o la stessa porta di memoria);
- **dati**: un'istruzione ha bisogno del risultato di una precedente non ancora
  pronto (dipendenza RAW); mitigata con **forwarding/bypass** o **stall**;
- **controllo**: un salto condizionato rende incerta la prossima istruzione;
  mitigata con la **predizione dei salti**.

Una predizione errata costa decine di cicli: la pipeline deve essere svuotata.
Per questo i salti prevedibili (cicli con contatore) sono molto più economici di
salti casuali.

#### Parallelismo a livello di istruzione (ILP)

L'ILP è la possibilità di eseguire più istruzioni contemporaneamente perché sono
indipendenti. Si ottiene con:

- **pipeline** (più istruzioni in fasi diverse);
- **superscalarità** (più istruzioni avviate per ciclo);
- **esecuzione out-of-order** (l'ordine di esecuzione non coincide con l'ordine
  del programma, ma il risultato resta corretto);
- **register renaming** (elimina dipendenze "false" sui nomi dei registri);
- **speculazione** (esegue lavoro "probabile" e lo annulla se sbaglia).

Limiti: dipendenze reali tra dati, latenza della memoria, salti imprevedibili,
larghezza delle unità di esecuzione e della finestra di istruzioni.

#### Core e thread

- Un **core** è un'unità fisica di esecuzione con le proprie risorse.
- Un **thread hardware** è un contesto di esecuzione che condivide le unità di
  un core tramite **SMT** (*Simultaneous Multithreading*, "Hyper-Threading" su
  Intel). Due thread hardware sullo stesso core hanno registri separati ma
  condividono cache e unità di esecuzione: il guadagno è reale ma **non è il
  doppio**.
- Un **thread software** è un concetto del sistema operativo: un flusso di
  esecuzione con il proprio stack e il proprio stato. Il SO lo assegna a un
  thread hardware.

Quindi: "core" e "thread" non sono sinonimi. `nproc` su Linux mostra i thread
hardware disponibili al sistema (core × SMT), non necessariamente i core fisici.

---

### 2.3 Memorie

#### Primaria e secondaria

- **Primaria**: direttamente accessibile dalla CPU (registri, cache, RAM). Veloce
  e costosa per bit; la RAM è volatile.
- **Secondaria**: persistente e molto più capiente (SSD, HDD, flash). Non è
  indirizzabile direttamente dalle normali istruzioni: i dati vanno portati in
  memoria primaria dal sistema operativo.

#### RAM e ROM

| Caratteristica | RAM | ROM/flash |
|---|---|---|
| Volatilità | volatile | non volatile |
| Velocità | alta (ma molto sotto la cache) | bassa in lettura, molto bassa in scrittura |
| Scopo | programmi e dati in esecuzione | firmware, configurazione, avvio |
| Tecnologie | SRAM (cache), DRAM (memoria principale) | mask ROM, PROM, EPROM, EEPROM, flash |

**SRAM** usa bistabili (flip-flop): veloce, costosa, usata nelle cache. **DRAM**
usa condensatori: densa ed economica, ma richiede **refresh** periodico e ha
latenza maggiore.

#### Cache

La cache sfrutta due proprietà dei programmi:

- **località temporale**: un dato appena usato è probabile che venga riusato;
- **località spaziale**: se uso un dato, è probabile che usi anche i vicini.

Per questo si trasferisce memoria in blocchi chiamati **linee di cache**
(tipicamente 64 byte su x86-64). Livelli tipici:

| Livello | Dimensione tipica | Latenza tipica | Note |
|---|---|---|---|
| Registri | centinaia di byte | < 1 ciclo | dentro la CPU |
| L1 | 32–64 KiB | 4–5 cicli | spesso separata istruzioni/dati |
| L2 | 256 KiB–2 MiB | 10–20 cicli | per core |
| L3 | 8–32 MiB | 30–70 cicli | condivisa tra core |
| RAM | GB | 60–100 ns | centinaia di cicli |

I numeri sono ordini di grandezza: dipendono dalla microarchitettura. Il punto
concettuale è il **salto di latenza** tra un livello e il successivo.

Quando la CPU cerca un dato:

- **hit**: il dato è nella cache, si procede velocemente;
- **miss**: si scende al livello successivo, si copia la linea e si continua.

Le cache hanno anche politiche di **associatività** (dove può stare una linea),
**sostituzione** (quale linea eliminare) e **coerenza** tra core (protocolli come
MESI). Sono dettagli di microarchitettura, ma spiegano fenomeni come il *false
sharing* e i crolli di prestazioni su accessi irregolari.

#### Gerarchia delle memorie

```
registri  <  L1  <  L2  <  L3  <  RAM  <  SSD/HDD
velocità  ───────────────────────────────────────►
capacità  ◄───────────────────────────────────────
costo/bit ◄───────────────────────────────────────
```

La gerarchia esiste perché non è possibile avere memoria insieme grande, veloce
ed economica. Il programma deve essere scritto in modo da sfruttare le cache
(accessi sequenziali, riuso dei dati, strutture compatte).

#### Indirizzi, celle, byte e word

- La memoria è **indirizzabile a byte**: ogni byte ha un indirizzo.
- Una **cella** è l'unità minima indirizzabile: su x86 un byte.
- Una **word** è l'unità "naturale" dell'architettura, ma il significato cambia:

| Termine | x86 | ARM64 |
|---|---|---|
| byte | 8 bit | 8 bit |
| word | **16 bit** | **32 bit** |
| dword | 32 bit | 64 bit ("doubleword") |
| qword | 64 bit | — |

Questo è un classico errore da esame: su x86 `word` significa 16 bit, non 32.
NASM usa parole chiave esplicite: `byte`, `word`, `dword`, `qword`, `tword`,
`oword`, `yword`, `zword`.

#### Lettura e scrittura in memoria

Una lettura tipica:

1. la CPU calcola l'indirizzo (da un registro, da un registro più uno
   spostamento, da base + indice × scala, ...);
2. controlla la cache;
3. se c'è un miss, la richiesta va al livello successivo;
4. il dato viene caricato in un registro.

Una scrittura segue lo stesso percorso, ma deve anche gestire la coerenza tra
cache e memoria.

Dettagli importanti per l'Assembly:

- **Allineamento**: accedere a un `dword` a un indirizzo multiplo di 4 è più
  efficiente. Su x86 un accesso non allineato funziona ma può costare; su altre
  architetture può causare fault. Un accesso che attraversa il confine di una
  linea di cache costa due accessi.
- **Little-endian** su x86-64: il byte meno significativo è al primo indirizzo.
- **Confini di pagina**: un accesso che attraversa due pagine può richiedere due
  traduzioni e, se una pagina non è mappata, causare un fault.
- **Memoria non inizializzata**: non c'è garanzia sul contenuto (spesso zero per
  le pagine nuove del sistema operativo, ma non farci affidamento).

#### Memoria virtuale

Il programma non vede la RAM fisica: vede uno **spazio di indirizzi virtuale**.
La **MMU** traduce ogni indirizzo virtuale in fisico usando le **tabelle delle
pagine**, gestite dal sistema operativo.

- Lo spazio è diviso in **pagine** (tipicamente 4 KiB; pagine grandi 2 MiB o
  1 GiB).
- Ogni voce di tabella contiene l'indirizzo fisico e i **permessi** (lettura,
  scrittura, esecuzione, presenza).
- La traduzione è accelerata dal **TLB** (*Translation Lookaside Buffer*), una
  cache di traduzioni recenti.
- Se la pagina non è presente, si ha un **page fault**: il kernel la carica (da
  file o swap) o termina il processo se l'accesso è illegale.
- Il **demand paging** carica le pagine solo quando servono.

La memoria virtuale dà:

- **isolamento** tra processi (lo stesso indirizzo virtuale può mappare frame
  fisici diversi);
- **protezione** (codice non scrivibile, dati non eseguibili: NX);
- **condivisione** (librerie mappate una volta sola);
- **ASLR** (indirizzi randomizzati a ogni esecuzione);
- la possibilità di usare più memoria della RAM fisica (swap).

Su x86-64 con paginazione a 4 livelli gli indirizzi virtuali sono di 48 bit
utili (con paginazione a 5 livelli si arriva a 57 bit). Questo spiega perché un
"64 bit" non usa davvero 64 bit di indirizzo.

#### Pagine e segmenti virtuali

Due concetti che vanno tenuti separati:

1. **Pagine (paging)**: suddivisione della memoria virtuale in blocchi di
   dimensione fissa. È il meccanismo principale su x86-64.
2. **Segmentazione**: suddivisione in blocchi di dimensione variabile con base e
   limite. Su x86 era centrale in modalità reale (`CS`, `DS`, `SS`, `ES`); in
   modalità a 64 bit è quasi disattivata, tranne le basi di `FS`/`GS` usate per
   il thread-local storage.

Attenzione a un terzo uso del termine: nei file **ELF** i "segmenti" (descritti
dai *program header*) sono regioni da caricare in memoria, mentre le "sezioni"
(`.text`, `.data`, `.bss`) servono al linker. Non sono i segmenti della CPU.

Layout tipico di un processo Linux x86-64 (indirizzi indicativi):

```
alta memoria
┌─────────────────────────┐
│ kernel (non accessibile)│
├─────────────────────────┤
│ stack            ↓      │  cresce verso il basso
│ ...                     │
│ heap             ↑      │  cresce verso l'alto
├─────────────────────────┤
│ .bss  (non inizializzati)│
│ .data (inizializzati)   │
│ .text (codice)          │
└─────────────────────────┘
bassa memoria
```

Con eseguibili non PIE il codice parte tipicamente intorno a `0x400000`; con
PIE (default moderno) gli indirizzi sono randomizzati.

---

### 2.4 Architettura Von Neumann e Harvard

#### Von Neumann

Un'unica memoria contiene **sia istruzioni sia dati**, con un unico percorso di
accesso (concettualmente un solo bus). È il modello dei computer general-purpose
e della maggior parte dei processori x86.

Vantaggi:

- semplicità e flessibilità: la memoria è una sola, dimensionabile a piacere;
- un programma può essere trattato come dato (caricato, modificato, generato);
- costo contenuto.

Svantaggi:

- **collo di bottiglia di von Neumann**: fetch delle istruzioni e accesso ai dati
  competono per lo stesso canale;
- un programma può sovrascrivere se stesso (potente, ma pericoloso);
- possibilità di eseguire dati (da cui le mitigazioni NX/W^X).

#### Harvard

Memorie e percorsi **separati** per istruzioni e dati. La CPU può prelevare
un'istruzione e contemporaneamente leggere un dato.

Vantaggi:

- nessuna competizione tra fetch e accesso ai dati;
- pipeline più regolare;
- sicurezza intrinseca: i dati non sono eseguibili.

Svantaggi:

- due memorie e due bus: più costo e complessità;
- meno flessibilità (un programma non può facilmente modificarsi);
- dimensioni separate da bilanciare.

#### Modello reale: Harvard modificata

I processori moderni non sono né von Neumann puri né Harvard puri. Tipicamente:

- **L1 separata** per istruzioni (L1I) e dati (L1D);
- **L2/L3 unificate**;
- **RAM unica**.

Questo è chiamato **architettura Harvard modificata**: si ottengono i vantaggi
della separazione vicino alla CPU senza duplicare tutta la memoria.

Esempi:

- **von Neumann**: PC classici, x86, molti sistemi general-purpose;
- **Harvard**: microcontrollori AVR e PIC, DSP, alcuni Cortex-M (interfacce
  separate I/D);
- **Harvard modificata**: x86-64 e ARM moderni con cache L1 separate.

---

### 2.5 Architetture CISC e RISC

#### CISC

**Complex Instruction Set Computer**: istruzioni numerose, potenti e di forma
variabile. Caratteristiche tipiche:

- lunghezza variabile (x86: 1–15 byte);
- molti modi di indirizzamento;
- operazioni che leggono/scrivono direttamente in memoria;
- istruzioni complesse implementate anche con **microcodice**;
- forte attenzione alla **compatibilità** e alla **densità del codice**.

Esempio: **x86/x86-64**.

#### RISC

**Reduced Instruction Set Computer**: poche istruzioni semplici e regolari.
Caratteristiche tipiche:

- lunghezza fissa (4 byte, con eventuali estensioni compresse);
- architettura **load-store**: solo load/store accedono alla memoria;
- molti registri;
- operazioni ALU solo tra registri;
- decodifica semplice, adatta alla pipeline;
- istruzioni condizionali o *select* invece di salti ovunque.

Esempi: **ARM/ARM64**, **MIPS**, **RISC-V**, **POWER**.

#### Differenze in tabella

| Aspetto | CISC (x86-64) | RISC (ARM64, RISC-V) |
|---|---|---|
| Numero di istruzioni | molte, anche complesse | poche, semplici |
| Lunghezza | variabile (1–15 B) | fissa (4 B), a volte compressa |
| Operandi in memoria | sì, frequenti | no, solo load/store |
| Registri | 16 GPR | 31–32 |
| Decodifica | complessa, micro-operazioni | semplice e regolare |
| Pressione sul codice | minore (codice denso) | maggiore (più istruzioni) |
| Pipeline | profonda, con decodifica costosa | naturale, profonda |
| Compatibilità storica | fortissima | minore |

#### Esempi concreti

- **x86-64**: un'istruzione può sommare un registro a un valore in memoria:
  `add eax, [rbx]`. La CPU la decodifica in micro-operazioni (load + add).
- **ARM64**: la stessa operazione richiede due istruzioni:
  `ldr w1, [x0]` poi `add w0, w0, w1`. In compenso la pipeline è più semplice.
- **RISC-V**: nessun registro flag; i confronti producono un valore, i salti
  usano quel valore (`blt`, `bge`, ...). La ISA è modulare: `M` per
  moltiplicazione/divisione, `A` per atomici, `F`/`D` per virgola mobile, `C` per
  istruzioni compresse.
- **MIPS**: nelle versioni classiche i salti hanno **delay slot** (l'istruzione
  successiva al salto viene eseguita comunque); i risultati di mul/div finiscono
  in `HI`/`LO`.

#### Vantaggi e svantaggi

**CISC**

- Pro: codice denso (meno byte, migliore uso della cache di istruzioni),
  compatibilità, meno istruzioni da scrivere, operazioni potenti.
- Contro: decodifica complessa, consumo energetico, pipeline complicate,
  istruzioni di lunghezza variabile più difficili da prelevare in parallelo.

**RISC**

- Pro: decodifica semplice, pipeline efficienti, basso consumo, molti registri,
  buon target per i compilatori, ISA più pulite da insegnare.
- Contro: più istruzioni per fare lo stesso lavoro (codice più grande), accesso
  alla memoria più esplicito, compatibilità storica limitata.

**Mito da sfatare**: "RISC è sempre più veloce di CISC". Non è vero in assoluto.
I core x86 moderni traducono le istruzioni complesse in micro-operazioni simili a
quelle RISC; il confronto reale dipende da implementazione, carico di lavoro,
consumo e costo. La distinzione descrive il **modello di ISA**, non garantisce
prestazioni.

---

## 3. Funzionamento passo per passo

Seguiamo l'esecuzione di un frammento (sintassi NASM, dettagli nei moduli
successivi):

```nasm
    mov eax, [rbx]    ; carica 4 byte dall'indirizzo in RBX
    add eax, ecx      ; somma ECX a EAX
```

### Passo 1 — Fetch

La CPU usa `RIP` per leggere i byte dell'istruzione `mov`. La richiesta passa
prima dalla **L1I** (cache istruzioni). Se c'è un miss, scende a L2, L3, RAM. La
linea contenente l'istruzione viene copiata nella cache.

### Passo 2 — Decode

I byte vengono decodificati: opcode `mov`, operando destinazione `eax`, operando
sorgente `[rbx]` (indirizzo in `RBX`). Internamente l'istruzione diventa
micro-operazioni: calcolo dell'indirizzo, load, scrittura del registro.

### Passo 3 — Lettura degli operandi e accesso ai dati

La CPU legge `RBX` e usa il valore come indirizzo. La richiesta di dati passa
dalla **L1D** (cache dati), separata dalla L1I. Se il dato non è in cache, si
scende nella gerarchia. Se l'indirizzo non è mappato, scatta un **page fault** e
interviene il kernel.

### Passo 4 — Execute

L'ALU somma `ECX` a `EAX`. Le istruzioni sono indipendenti? No: `add` dipende dal
valore caricato da `mov`. La pipeline può usare **forwarding** per non aspettare
il write-back, ma la latenza del load (tipicamente 4–5 cicli se in L1, centinaia
se in RAM) resta un vincolo.

### Passo 5 — Write-back e aggiornamento di RIP

Il risultato viene scritto in `EAX`; i flag vengono aggiornati da `add` (non da
`mov`, che non li tocca). `RIP` avanza oltre le due istruzioni.

### Passo 6 — Ripetizione

Il ciclo ricomincia. Se il frammento è dentro un ciclo, la **predizione dei
salti** e la **cache** determinano gran parte delle prestazioni: un ciclo con
accessi sequenziali in memoria è veloce; uno con accessi casuali e salti
imprevedibili è lento.

---

## 4. Sintassi e istruzioni coinvolte

In questo modulo **non si introducono nuove istruzioni**. Compaiono solo, come
esempi, forme già viste o anticipate:

| Elemento | Significato | Modulo |
|---|---|---|
| `mov eax, [rbx]` | carica un `dword` dalla memoria | 5 |
| `add eax, ecx` | somma tra registri | 6 |
| `[rbx]` | operando in memoria: indirizzo contenuto in `RBX` | 3 |
| `byte`, `word`, `dword`, `qword` | dimensioni degli operandi | 3 |

Cose utili da riconoscere già ora:

- **`word` su x86 = 16 bit**; su ARM64 "word" = 32 bit. Il contesto conta.
- Un riferimento a memoria tra parentesi quadre non significa "il contenuto di
  `RBX`", ma "la memoria all'indirizzo contenuto in `RBX`".
- La dimensione dell'operazione è determinata dall'istruzione e dal registro
  usato: `eax` implica 32 bit, `rax` 64 bit.

Strumenti (non istruzioni) per osservare la macchina su Linux:

```sh
lscpu                          # modello, core, thread, cache
getconf PAGE_SIZE              # dimensione pagina (spesso 4096)
getconf LEVEL1_DCACHE_LINESIZE # linea cache dati L1 (spesso 64)
grep -E 'MHz|cache size' /proc/cpuinfo
```

---

## 5. Esempi semplici commentati

### Esempio 1 — Un `dword` in cache

```nasm
mov eax, [rbx]
```

- legge 4 byte a partire dall'indirizzo in `RBX`;
- se l'indirizzo è allineato a 4 e la linea è in L1, costa pochi cicli;
- se attraversa il confine di una linea di cache, servono due linee;
- se attraversa il confine di una pagina non mappata, si ha un fault.

### Esempio 2 — Sedici interi, una linea

Un array di 16 `int` (4 byte ciascuno) occupa 64 byte: **una** linea di cache su
x86-64. Sommarli in sequenza è efficiente: dopo il primo accesso, gli altri 15
sono nella stessa linea.

### Esempio 3 — Registro vs memoria

```nasm
add eax, ecx        ; solo ALU, nessun accesso alla memoria
add eax, [rbx]      ; carica dalla memoria, poi somma
```

La prima è molto più prevedibile e veloce. La seconda dipende dalla cache: può
costare pochi cicli o centinaia. Non è "colpa dell'istruzione", è la gerarchia
delle memorie.

### Esempio 4 — Lo stesso indirizzo virtuale, processi diversi

Due processi possono usare entrambi l'indirizzo virtuale `0x400000`. La MMU,
usando tabelle diverse, li mappa su frame fisici diversi. È l'isolamento della
memoria virtuale: nessun processo vede la RAM dell'altro.

---

## 6. Esempi più complessi

### 6.1 Un ciclo di somma: dove vanno i cicli

```nasm
; rdi = puntatore all'array di int
; rsi = numero di elementi
    xor eax, eax          ; somma = 0
    xor ecx, ecx          ; indice = 0
.loop:
    add eax, [rdi + rcx*4] ; somma += array[i]
    inc rcx                ; i++
    cmp rcx, rsi           ; i < n ?
    jb  .loop              ; salto se unsigned below
```

Analisi:

- **Cache**: accesso sequenziale → località spaziale ottima. Ogni 16 iterazioni
  si passa a una nuova linea (64 byte / 4 byte per `int` = 16 elementi).
- **Pipeline**: `add eax, ...` ha una dipendenza *loop-carried* su `eax`: ogni
  iterazione dipende dalla precedente. Il compilatore potrebbe spezzare la somma
  in più accumulatori parziali per aumentare l'ILP.
- **Salti**: `jb .loop` è quasi sempre preso per `n` grande: la predizione è
  facile. L'errore avviene solo all'ultima iterazione.
- **Load**: `add eax, [mem]` è tradotta in load + add; la latenza del load (4–5
  cicli in L1) può dominare se non c'è parallelismo sufficiente.
- **Flag**: `inc` modifica `ZF/SF/OF/PF` ma **non** `CF`; il `cmp` successivo
  imposta i flag usati da `jb`. (Dettagli nei moduli 6 e 7.)

Morale: un ciclo Assembly "sembra" breve, ma il tempo reale dipende da cache,
dipendenze, predizione e larghezza delle unità.

### 6.2 Page fault e memoria virtuale

Un programma accede a un indirizzo di un array allocato con `malloc` ma mai
toccato:

1. la pagina è mappata ma non ancora fisicamente presente (o è copy-on-write);
2. la CPU genera un **page fault**;
3. il kernel trova la pagina libera, la inizializza (o la carica dal file), aggiorna
   la tabella delle pagine;
4. l'istruzione viene rieseguita e completa.

Il primo accesso è quindi molto più lento dei successivi. È uno dei motivi per
cui "inizializzare" un buffer prima di usarlo può spostare il costo, non
eliminarlo.

### 6.3 Perché la stessa istruzione ha costi diversi

`mov eax, [rbx]` può costare:

| Situazione | Costo indicativo |
|---|---|
| linea in L1D | 4–5 cicli |
| linea in L2 | 10–20 cicli |
| linea in L3 | 30–70 cicli |
| linea in RAM | centinaia di cicli |
| page fault | migliaia di cicli (o terminazione) |

L'istruzione è identica; cambia il **percorso nella gerarchia**. Questo è il
motivo per cui Assembly e prestazioni non si possono separare dall'architettura.

---

## 7. Collegamenti con argomenti precedenti

- **Modulo 1**: il ciclo Fetch–Decode–Execute, `RIP`, cache, memoria virtuale e
  CISC/RISC sono stati introdotti; qui sono stati approfonditi.
- **Modulo 1, "come funziona un programma"**: il loader, lo stack iniziale e le
  system call sono il ponte tra architettura e sistema operativo.
- **In avanti — Modulo 3**: indirizzamento e accesso alla memoria; qui abbiamo
  visto *perché* la memoria è organizzata a byte e pagine.
- **Modulo 4**: struttura NASM e sezioni (`.text`, `.data`, `.bss`), che
  corrispondono alle regioni del processo viste qui.
- **Modulo 7**: flag e `RFLAGS`; qui abbiamo visto dove si collocano.
- **Modulo 9**: stack e chiamate; lo stack è una regione dello spazio di
  indirizzi.
- **Modulo 13**: syscall, page fault e I/O.
- **Modulo 15**: ottimizzazione e misure con `perf`; qui abbiamo capito *cosa*
  misurare.

---

## 8. Errori frequenti

1. **"Word = 32 bit"**: su x86 `word` = 16 bit; su ARM64 "word" = 32 bit. Il
   termine è architettura-dipendente.
2. **Confondere frequenza e prestazioni**: 4 GHz non batte automaticamente
   3 GHz; contano IPC, cache, core e carico.
3. **"Core = thread"**: un core può ospitare più thread hardware (SMT), e i
   thread del sistema operativo sono un'altra cosa ancora.
4. **"L'hyper-threading raddoppia le prestazioni"**: condivide le unità di
   esecuzione; il guadagno è parziale e dipende dal carico.
5. **"La RAM è tutta ugualmente veloce"**: cache, righe, banchi e pattern di
   accesso cambiano radicalmente i tempi.
6. **"Indirizzo virtuale = indirizzo fisico"**: la MMU traduce; due processi
   possono usare lo stesso indirizzo virtuale per frame diversi.
7. **"64 bit = 64 bit di indirizzo"**: su x86-64 la memoria virtuale è a 48 bit
   (57 con paginazione a 5 livelli).
8. **"La ROM non si può modificare"**: flash ed EEPROM si aggiornano; la mask
   ROM no.
9. **"Harvard significa due memorie fisiche separate"**: nei processori moderni
   è spesso una separazione di cache (Harvard modificata), con RAM unica.
10. **"CISC è vecchio e lento, RISC è nuovo e veloce"**: i core x86 traducono in
    micro-operazioni; il confronto dipende dall'implementazione.
11. **"Un accesso non allineato va sempre in fault"**: su x86 funziona (con
    possibile penalità); su altre architetture dipende.
12. **Confondere i segmenti x86 con i segmenti ELF**: i primi sono un meccanismo
    della CPU (oggi quasi disattivato), i secondi sono regioni descritte dai
    program header del file eseguibile.
13. **"La cache è una sola"**: L1I, L1D, L2, L3, TLB sono cache diverse con
    scopi e comportamenti diversi.
14. **Dimenticare il costo dei page fault**: il primo accesso a memoria nuova può
    costare migliaia di cicli.

---

## 9. Riepilogo finale

- Un calcolatore è CPU + memoria + cache + bus + periferiche, con il sistema
  operativo a gestire risorse e protezione.
- La CPU esegue un ciclo Fetch–Decode–Execute; i processori reali usano pipeline,
  superscalarità, out-of-order, predizione e cache.
- Frequenza ≠ prestazioni: contano IPC, cache, core, latenza della memoria.
- Core, thread hardware e thread software sono tre concetti distinti.
- La gerarchia registri → cache → RAM → disco sfrutta località temporale e
  spaziale; le latenze crescono di ordini di grandezza.
- La memoria è indirizzabile a byte; "word" ha significati diversi tra x86 e
  ARM64; x86-64 è little-endian.
- La memoria virtuale fornisce isolamento, protezione, condivisione e ASLR tramite
  pagine, tabelle delle pagine e TLB.
- Von Neumann usa una memoria unica; Harvard ne usa due; i processori moderni
  sono Harvard modificata (L1 separate, RAM unica).
- CISC (x86) punta su istruzioni ricche e codice denso; RISC (ARM64, MIPS,
  RISC-V) su istruzioni semplici, load-store e pipeline regolari. Nessuna delle
  due è "sempre migliore".
- Le prestazioni di un programma Assembly dipendono dall'interazione tra
  istruzioni, cache, memoria virtuale e microarchitettura.

---

## 10. Esercizi di verifica

> Soluzioni non incluse. Chiedile quando vuoi.

### Esercizi facili

1. Elenca i cinque componenti principali di un calcolatore e la funzione di
   ciascuno.
2. Descrivi i quattro stadi del ciclo di istruzione e indica cosa fa `RIP`.
3. Che differenza c'è tra RAM, ROM e cache?
4. Perché esiste la gerarchia delle memorie? Cita località temporale e spaziale.
5. Che cosa sono un core, un thread hardware e un thread software?

### Esercizi intermedi

6. Spiega perché la frequenza del clock da sola non determina le prestazioni.
7. Descrivi una situazione in cui un accesso a `mov eax, [rbx]` costa pochi
   cicli e una in cui ne costa centinaia.
8. Perché su x86 `word` significa 16 bit? Che cosa significa su ARM64?
9. Spiega il ruolo di MMU, tabelle delle pagine, TLB e page fault.
10. Confronta von Neumann e Harvard, poi spiega perché i processori moderni sono
    "Harvard modificata".
11. Riassumi le differenze tra CISC e RISC con almeno cinque criteri.

### Esercizi difficili

12. Un programma accede a un array di 1 MiB in ordine sequenziale e uno in ordine
    casuale. Spiega perché il primo è molto più veloce, citando linee di cache e
    località.
13. Due processi scrivono nello stesso indirizzo virtuale `0x400000`. Perché non
    si sovrascrivono? Quali strutture hardware e software lo impediscono?
14. Spiega perché un ciclo con una dipendenza *loop-carried* su un registro può
    essere più lento di un ciclo con due accumulatori indipendenti.
15. Perché la distinzione CISC/RISC non basta a prevedere quale processore sarà
    più veloce su un dato programma?

### Esercizi "prevedi il risultato"

16. Un array di 32 `int` (4 byte) viene letto in sequenza. Quante linee di cache
    da 64 byte vengono toccate come minimo?
17. Un accesso a `dword` parte da un indirizzo `0x...FFE`. Cosa succede a livello
    di linea di cache?
18. Un processo accede per la prima volta a una pagina mallocata e mai usata.
    Cosa succede e perché il primo accesso è più lento dei successivi?
19. Su una macchina con 4 core e SMT attivo, `nproc` restituisce 8. Quanti core
    fisici ci sono e perché?
20. Un eseguibile x86-64 "64 bit" usa indirizzi virtuali a 48 bit. Cosa significa
    concretamente e perché non usa tutti i 64 bit?

### Esercizi "scrivi da zero"

21. Scrivi lo pseudo-codice di un programma che somma un array di `int` e indica
    quali strutture (registri, memoria, cache) intervengono a ogni passo.
22. Descrivi, senza scrivere codice definitivo, come modificheresti il ciclo del
    paragrafo 6.1 per usare due accumulatori e aumentare l'ILP.
23. Progetta (a parole) un esperimento per misurare la differenza tra un accesso
    sequenziale e uno casuale a un array, indicando cosa misureresti e come.

---

**Prossimo modulo**: il Modulo 3 del tuo programma. Dimmi **"prosegui"** quando
sei pronto, oppure chiedi chiarimenti o le soluzioni degli esercizi.
