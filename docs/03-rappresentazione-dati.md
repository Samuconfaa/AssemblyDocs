# Modulo 3 — Rappresentazione dei dati

> **Prerequisiti**: Moduli 1 e 2 (codice macchina, memoria a byte, little-endian,
> gerarchia delle memorie, registri come contenitori).
> **Architettura di riferimento**: x86-64, NASM, Linux 64 bit.
> **Obiettivo del modulo**: capire come i numeri, i caratteri e i valori in
> virgola mobile diventano bit e byte, come si interpretano e come si manipolano
> in Assembly.

---

## 1. Introduzione e definizione

Un processore non conosce numeri, lettere o numeri decimali: conosce **bit**,
cioè valori 0 e 1. Tutto ciò che un programma manipola è una sequenza di bit, e
il **significato** di quella sequenza dipende da una convenzione:

- `0b00110101` può essere il numero 53, il carattere `'5'`, una maschera di bit,
  parte di un indirizzo o un campo di un numero in virgola mobile;
- gli stessi 4 byte possono valere un intero con segno, uno senza segno, un
  `float` o un pezzo di testo.

La rappresentazione dei dati è quindi l'insieme delle **regole di codifica** che
danno significato ai bit. In Assembly queste regole non sono automatiche: le
sceglie il programmatore, e le istruzioni usate devono essere coerenti con la
scelta.

Da qui deriva una distinzione che accompagna tutto il corso:

| Livello | Chi decide il significato |
|---|---|
| C, Python, Java | il tipo dichiarato (`int`, `float`, `str`, ...) |
| Assembly | l'istruzione e il programmatore (dimensione, segno, formato) |
| Hardware | niente: esegue operazioni su bit |

---

## 2. Spiegazione teorica approfondita

### 3.1 Sistemi di numerazione

Un **sistema di numerazione posizionale** in base *b* rappresenta un numero con
cifre `0..b-1`, ciascuna pesata con una potenza di *b*.

```
valore = dₙ·bⁿ + ... + d₁·b¹ + d₀·b⁰
```

#### Decimale (base 10)

Cifre `0–9`. È la notazione che usiamo per comunicare, non quella che usa la
macchina.

#### Binario (base 2)

Cifre `0–1`. È la notazione naturale dell'hardware: un bit è acceso o spento.

```
1011₂ = 1·2³ + 0·2² + 1·2¹ + 1·2⁰ = 8 + 0 + 2 + 1 = 11₁₀
```

#### Ottale (base 8)

Cifre `0–7`. Ogni cifra ottale corrisponde esattamente a **3 bit**. Era usato
spesso sui sistemi con word di 12, 24 o 36 bit; oggi è raro, ma resta utile per
i permessi dei file Unix (`0755`).

#### Esadecimale (base 16)

Cifre `0–9` e `A–F` (10–15). Ogni cifra esadecimale corrisponde a **4 bit**
(un *nibble*). È la notazione di comodo per l'Assembly: due cifre esadecimali =
un byte, sedici cifre = 64 bit.

```
0x2F = 2·16 + 15 = 32 + 15 = 47₁₀ = 0b0010_1111
```

#### Conversioni

**Decimale → binario** (parte intera): divisioni successive per 2, si leggono i
resti in ordine inverso.

```
156 / 2 = 78  resto 0   ↑
 78 / 2 = 39  resto 0   |
 39 / 2 = 19  resto 1   |
 19 / 2 =  9  resto 1   |
  9 / 2 =  4  resto 1   |
  4 / 2 =  2  resto 0   |
  2 / 2 =  1  resto 0   |
  1 / 2 =  0  resto 1   |
156₁₀ = 10011100₂
```

**Binario → decimale**: somma dei pesi delle posizioni a 1.

**Binario ↔ esadecimale**: raggruppa i bit a gruppi di 4 partendo da destra,
aggiungendo zeri a sinistra se serve.

```
1001_1100₂ = 0x9C
```

**Binario ↔ ottale**: gruppi di 3 bit.

```
100_111_100₂ = 234₈
```

**Tra basi qualsiasi**: si passa per il decimale, oppure si usano divisioni
successive per la base di destinazione.

**Parte frazionaria**: moltiplicazioni successive per la base; si leggono le
parti intere in ordine diretto.

```
0,625 · 2 = 1,25  → 1
0,25  · 2 = 0,50  → 0
0,50  · 2 = 1,00  → 1
0,625₁₀ = 0,101₂
```

Alcune frazioni decimali non hanno rappresentazione binaria finita: `0,1₁₀` è
`0,0001100110011...₂` periodico. Questo è il motivo profondo per cui `0.1` non è
esatto in virgola mobile (paragrafo 3.5).

**Numero negativo → complemento a due**: si rappresenta il valore assoluto, si
invertono i bit e si aggiunge 1 (paragrafo 3.2). In alternativa, con N bit:
`valore = 2^N - |numero|`.

```
-42 con 8 bit:  42 = 0b0010_1010
                inverti → 1101_0101
                +1      → 1101_0110 = 0xD6 = 214
                2⁸ - 42 = 256 - 42 = 214 = 0xD6
```

---

### 3.2 Rappresentazione dei numeri interi

#### Senza segno (unsigned)

Tutti i bit contribuiscono al valore:

```
unsigned N bit: 0 … 2^N - 1
```

Con 8 bit: `0 … 255`. Con 16: `0 … 65535`. Con 32: `0 … 4294967295`. Con 64:
`0 … 18446744073709551615`.

#### Con segno (signed): panoramica

Esistono tre schemi storici:

| Schema | Idea | Zero | Intervallo (N bit) |
|---|---|---|---|
| Modulo e segno | MSB = segno, resto = magnitudine | due zeri (+0, −0) | −(2^{N−1}−1) … +(2^{N−1}−1) |
| Complemento a uno | negativo = bit invertiti | due zeri | −(2^{N−1}−1) … +(2^{N−1}−1) |
| Complemento a due | negativo = invertiti + 1 | un solo zero | −2^{N−1} … +(2^{N−1}−1) |

Il **complemento a due** è lo standard su x86, ARM, RISC-V e quasi tutte le
architetture moderne, perché:

- ha un solo zero;
- l'addizione funziona identicamente per valori con e senza segno (stesso
  circuito);
- la sottrazione è un'addizione con il negativo;
- il range è asimmetrico ma massimizza i valori rappresentabili.

#### MSB e LSB

- **MSB** (*Most Significant Bit*): il bit di peso maggiore. In un numero con
  segno in complemento a due è il **bit di segno**.
- **LSB** (*Least Significant Bit*): il bit di peso minore.

```
0b1011_0110
  ↑      ↑
 MSB    LSB
```

#### Complemento a due in pratica

Con 8 bit:

```
+5   = 0000_0101
-5   = 1111_1011   (0000_0101 → 1111_1010 → +1)
+127 = 0111_1111
-128 = 1000_0000
-1   = 1111_1111
```

Intervalli:

| Bit | Unsigned | Signed (complemento a due) |
|---|---|---|
| 8 | 0 … 255 | −128 … 127 |
| 16 | 0 … 65 535 | −32 768 … 32 767 |
| 32 | 0 … 4 294 967 295 | −2 147 483 648 … 2 147 483 647 |
| 64 | 0 … 18 446 744 073 709 551 615 | −9 223 372 036 854 775 808 … 9 223 372 036 854 775 807 |

Nota l'asimmetria: il minimo negativo non ha un positivo corrispondente. Questo
crea un caso limite importante: `neg` del minimo produce di nuovo il minimo e
imposta **OF**.

#### Estensione del segno

Se un valore occupa meno bit di quanti ne servono, bisogna decidere come
riempire i bit alti:

- **zero extension** (valori unsigned): aggiungi zeri;
- **sign extension** (valori signed): replica il MSB.

```
0xFB con 8 bit:
  unsigned → 0x00FB  (251)
  signed   → 0xFFFB  (65536 − 5 = 65531 = −5 in 16 bit)
```

In x86-64: `movzx` per zero extension, `movsx` per sign extension; da 32 a 64
bit si usa `movsxd` (o `cdqe` da `eax`). Attenzione: scrivere un registro a 32
bit **azzera** la parte alta, quindi non è una sign extension.

#### Overflow e underflow

- **Overflow (signed)**: il risultato non è rappresentabile. Si ha quando si
  sommano due valori con lo stesso segno e il risultato ha segno opposto.
- **Carry (unsigned)**: il risultato supera `2^N - 1`; il bit che esce dalla
  posizione più alta è il riporto.
- **Underflow (unsigned)**: si sottrae un valore più grande, serve un prestito
  (*borrow*).
- **Underflow (signed)**: il risultato scende sotto il minimo rappresentabile.

x86 segnala queste situazioni con flag diversi:

| Situazione | Flag |
|---|---|
| Carry unsigned in addizione | `CF = 1` |
| Borrow unsigned in sottrazione | `CF = 1` |
| Overflow signed | `OF = 1` |
| Risultato zero | `ZF = 1` |
| Risultato negativo (signed) | `SF = 1` |

Esempi con 8 bit:

```
127 + 1   = 1000_0000 (-128)  CF=0, OF=1   overflow signed
255 + 1   = 0000_0000 (0)     CF=1, OF=0   carry unsigned
0 - 1     = 1111_1111 (-1)    CF=1, OF=0   borrow unsigned
-128 - 1  = 0111_1111 (+127)  CF=0, OF=1   underflow signed
```

`CF` e `OF` rispondono a domande diverse: **CF** riguarda l'aritmetica senza
segno, **OF** quella con segno. Lo stesso risultato in bit può essere corretto in
un'interpretazione e sbagliato nell'altra.

---

### 3.3 Operazioni binarie

#### Addizione

Tabella:

```
0+0=0  0+1=1  1+0=1  1+1=10 (0 con riporto 1)
```

Esempio:

```
  1011
+ 0110
------
 10001
```

Il riporto si propaga verso sinistra. In un processore, l'addizione è realizzata
con un circuito che propaga il carry; l'ultimo carry è `CF`.

#### Sottrazione

```
0-0=0  1-0=1  1-1=0  0-1=1 con prestito 1
```

Esempio:

```
  1010
- 0011
------
  0111
```

In complemento a due, `a - b` si calcola come `a + (~b + 1)`. Il riporto finale
che esce viene ignorato; il prestito è segnalato da `CF` nelle istruzioni `sub`.

#### Moltiplicazione

Binaria: come in decimale, con somme parziali e scorrimenti.

```
  0110  (6)
× 0011  (3)
------
  0110
 0110
------
10010  (18)
```

Per i numeri con segno si può:

- moltiplicare i valori assoluti e applicare il segno;
- usare l'algoritmo di Booth (sfruttato dall'hardware).

Su x86: `mul` per unsigned, `imul` per signed. Le forme a un operando usano
`RDX:RAX`; le forme a due/tre operandi producono un risultato troncato e
segnalano in `CF`/`OF` se il risultato non ci sta. (Modulo 11.)

#### Divisione

Divisione lunga: quoziente e resto.

```
10010 / 0011 = 0110  resto 0000   (18 / 3 = 6, resto 0)
```

Regole:

- divisione per zero → eccezione (su x86 `#DE`, *divide error*);
- se il quoziente non entra nella dimensione prevista, si ha overflow della
  divisione;
- `div` è unsigned, `idiv` è signed;
- `idiv` tronca verso zero, e il resto ha il segno del dividendo (come in C).

#### Carry e borrow

- **Carry**: bit che esce dalla posizione più significativa in un'addizione
  unsigned.
- **Borrow**: richiesta di prestare 1 nella sottrazione unsigned.
- Nelle addizioni multi-precisione si usa `adc` (*add with carry*) per propagare
  il carry; nelle sottrazioni `sbb` (*subtract with borrow*).

#### Operazioni bit a bit

| Operazione | Regola | Uso tipico |
|---|---|---|
| `AND` | 1 solo se entrambi 1 | mascherare, estrarre bit |
| `OR` | 1 se almeno uno è 1 | impostare bit |
| `XOR` | 1 se diversi | invertire bit, azzerare (x^x=0) |
| `NOT` | inverte tutti i bit | complemento a uno |

#### Maschere binarie

Con `x = 0b1011_0110`:

| Operazione | Risultato | Effetto |
|---|---|---|
| `x & 0x0F` | `0x06` | estrae il nibble basso |
| `x & 0xF0` | `0xB0` | estrae il nibble alto |
| `x \| 0x01` | `0xB7` | imposta il bit 0 |
| `x & ~0x01` | `0xB6` | azzera il bit 0 |
| `x ^ 0x01` | `0xB7` | inverte il bit 0 |
| `x & 0x80` | `0x80` | verifica il MSB (test) |

#### Shift e rotazioni

- `shl`/`sal`: shift logico a sinistra (moltiplica per 2);
- `shr`: shift logico a destra (divide per 2, riempie con 0);
- `sar`: shift aritmetico a destra (divide per 2, replica il segno);
- `rol`/`ror`/`rcl`/`rcr`: rotazioni.

Esempio con `0xB6` (8 bit):

```
shl 1 → 0x6C, CF=1   (182·2 = 364 → 364 mod 256 = 108 = 0x6C)
shr 1 → 0x5B         (182/2 = 91)
sar 1 → 0xDB         (-74/2 = -37 = 219 = 0xDB)
```

Attenzione: `sar` arrotonda verso −∞, mentre `idiv` tronca verso zero. Per
`-7 / 2`: `sar` dà `-4`, `idiv` dà `-3` con resto `-1`.

---

### 3.4 Rappresentazione dei caratteri

#### ASCII

**ASCII** (*American Standard Code for Information Interchange*) assegna un
codice a 7 bit (0–127) a lettere, cifre, punteggiatura e comandi.

Sottoinsieme da conoscere a memoria:

| Carattere | Decimale | Esadecimale |
|---|---|---|
| NUL | 0 | `0x00` |
| TAB | 9 | `0x09` |
| LF (newline) | 10 | `0x0A` |
| CR | 13 | `0x0D` |
| spazio | 32 | `0x20` |
| `'0'` | 48 | `0x30` |
| `'9'` | 57 | `0x39` |
| `'A'` | 65 | `0x41` |
| `'Z'` | 90 | `0x5A` |
| `'a'` | 97 | `0x61` |
| `'z'` | 122 | `0x7A` |
| DEL | 127 | `0x7F` |

Proprietà utili:

- le cifre sono consecutive: `'0' + d` dà il carattere della cifra `d`;
- le lettere maiuscole e minuscole sono consecutive;
- la differenza tra maiuscola e minuscola è **32** (`0x20`), cioè un solo bit:
  `'a' ^ 0x20 = 'A'`;
- `'7' - '0' = 7`, non 55.

I codici 128–255 dipendono dalla codifica estesa (Latin-1, CP437, Windows-1252,
...): non sono ASCII standard.

#### Caratteri come byte

Un carattere ASCII occupa un byte. Una stringa è una sequenza di byte, spesso
con un terminatore (`0x00` in C) oppure con una lunghezza esplicita.

```
"Hi" in memoria: 48 69     (oppure 48 69 00 con terminatore)
```

Il carattere `'A'` e il numero 65 hanno **la stessa rappresentazione** ma
significati diversi: dipende dall'operazione che fai. Sommare 1 a `'A'` dà
`'B'`; sommare 1 a 65 dà 66.

#### Unicode

ASCII copre solo l'inglese. **Unicode** assegna un **code point** (`U+0000` …
`U+10FFFF`) a caratteri di tutte le lingue, simboli, emoji.

Unicode è un insieme di code point, **non** una codifica di byte. Le codifiche
principali:

- **UTF-8**: lunghezza variabile, 1–4 byte, compatibile con ASCII;
- **UTF-16**: unità da 2 byte, con coppie surrogate per i code point oltre
  `U+FFFF`;
- **UTF-32**: 4 byte per code point, semplice ma sprecone.

#### UTF-8

| Code point | Byte | Pattern |
|---|---|---|
| `U+0000`–`U+007F` | 1 | `0xxxxxxx` |
| `U+0080`–`U+07FF` | 2 | `110xxxxx 10xxxxxx` |
| `U+0800`–`U+FFFF` | 3 | `1110xxxx 10xxxxxx 10xxxxxx` |
| `U+10000`–`U+10FFFF` | 4 | `11110xxx 10xxxxxx 10xxxxxx 10xxxxxx` |

Esempi:

```
'A'      U+0041 → 41
'è'      U+00E8 → C3 A8
'€'      U+20AC → E2 82 AC
'😀'     U+1F600 → F0 9F 98 80
U+10FFFF        → F4 8F BF BF
```

Proprietà:

- ASCII è un sottoinsieme di UTF-8 (i primi 128 code point hanno la stessa
  codifica);
- i byte di continuazione iniziano con `10` e non possono mai essere confusi con
  l'inizio di un carattere: UTF-8 è **auto-sincronizzante**;
- le codifiche *overlong* e i surrogate (`U+D800`–`U+DFFF`) non sono validi in
  UTF-8;
- UTF-16 richiede una convenzione di endianness o un BOM.

#### Carattere e valore numerico

Distinzione da tenere ferma:

| Concetto | Esempio | Valore |
|---|---|---|
| carattere | `'5'` | byte `0x35` = 53 |
| valore numerico | `5` | byte `0x05` |
| code point | `U+0035` | concetto astratto |
| byte UTF-8 | `0x35` | codifica di `U+0035` |

Per convertire una cifra in numero: `c - '0'`. Per convertire un numero in
cifra: `n + '0'`, assumendo `0 ≤ n ≤ 9`.

---

### 3.5 Numeri in virgola mobile

#### Rappresentazione

I numeri reali si rappresentano in forma **segno × mantissa × 2^esponente**, cioè
in notazione scientifica binaria:

```
(-1)^s × 1.f × 2^(e - bias)
```

dove:

- `s` è il bit di segno;
- `e` è l'esponente **polarizzato** (bias);
- `f` è la parte frazionaria della mantissa (il bit iniziale `1` è implicito nei
  numeri normalizzati).

#### IEEE 754

| Formato | Bit | Segno | Esponente | Mantissa | Bias |
|---|---|---|---|---|---|
| half (binary16) | 16 | 1 | 5 | 10 | 15 |
| single (binary32) | 32 | 1 | 8 | 23 | 127 |
| double (binary64) | 64 | 1 | 11 | 52 | 1023 |
| extended (x87) | 80 | 1 | 15 | 64 | 16383 |

Su x86-64, `float` del C è binary32, `double` è binary64; le istruzioni SSE/AVX
lavorano su questi formati, mentre l'unità x87 usa il formato esteso a 80 bit.

#### Decodifica di un esempio

`0x41480000`:

```
0 10000010 10010000000000000000000
↑ ↑        ↑
s e=130    f=0.5625
```

- segno 0 → positivo;
- esponente reale = 130 − 127 = 3;
- mantissa = 1 + 0,5625 = 1,5625;
- valore = 1,5625 × 2³ = 12,5.

#### Codifica di un esempio

`0,15625`:

```
0,15625 = 0,00101₂ = 1,01₂ × 2⁻³
esponente = −3 + 127 = 124 = 0111_1100
segno 0, mantissa 0100...
→ 0 01111100 01000000000000000000000 = 0x3E200000
```

#### Casi speciali

| Esponente | Mantissa | Significato |
|---|---|---|
| tutti 0 | 0 | zero (positivo o negativo) |
| tutti 0 | ≠ 0 | numero **denormalizzato** |
| tutti 1 | 0 | infinito (positivo o negativo) |
| tutti 1 | ≠ 0 | NaN (*Not a Number*) |

- **Normalizzati**: `1.f × 2^(e−bias)`.
- **Denormalizzati**: `0.f × 2^(1−bias)`; servono a rappresentare valori molto
  piccoli, con perdita di precisione. Il più piccolo positivo single è
  `0x00000001` ≈ 1,4 × 10⁻⁴⁵.
- **Infinito**: risultati come `1/0`, overflow di un'operazione. `∞ − ∞` dà NaN.
- **NaN**: `0/0`, `∞/∞`, operazioni non valide. `NaN != NaN` è vero; non usare
  `==` per confrontare risultati che possono essere NaN.
- **Zero con segno**: `+0` e `−0` hanno bit diversi ma confrontano uguali;
  `1/+0 = +∞`, `1/−0 = −∞`.

#### Precisione ed errori

- binary32 ha 24 bit di significando (1 implicito + 23): circa **7 cifre
  decimali**.
- binary64 ha 53 bit: circa **15–17 cifre decimali**.
- La spaziatura tra numeri rappresentabili (*ulp*) dipende dall'esponente: a
  `1,0` in single è `2⁻²³` ≈ 1,19 × 10⁻⁷.
- `0.1` non è rappresentabile esattamente: in single è circa
  `0,100000001490116...`, in double circa `0,10000000000000000555...`.
- Arrotondamento predefinito: **al più vicino, con parità** (*round to nearest,
  ties to even*).
- Errori tipici: rappresentazione, arrotondamento, **cancellazione** (sottrazione
  di valori quasi uguali), accumulo (somme di molti termini), confronti esatti.

Conseguenze pratiche:

```
0.1 + 0.2 == 0.3        // probabilmente falso
```

Si confronta con una tolleranza (`|a−b| < ε`) oppure si usano rappresentazioni
esatte (interi, decimali a precisione arbitraria).

---

### 3.6 Endianness

**Endianness** è l'ordine in cui i byte di un valore multi-byte vengono scritti
in memoria.

Prendiamo `0x12345678` (4 byte):

| Ordine | Byte 0 | Byte 1 | Byte 2 | Byte 3 |
|---|---|---|---|---|
| Big-endian | `12` | `34` | `56` | `78` |
| Little-endian | `78` | `56` | `34` | `12` |

- **Big-endian**: il byte più significativo è all'indirizzo più basso. È
  l'ordine di rete (*network byte order*).
- **Little-endian**: il byte meno significativo è all'indirizzo più basso. È
  l'ordine di **x86/x86-64**, di ARM64 su Linux e, in pratica, di RISC-V.

Regole da fissare:

- l'endianness riguarda i **byte**, non i bit: dentro un byte non cambia nulla;
- non cambia il valore nel registro: `mov eax, [addr]` ricostruisce il valore
  corretto, perché la CPU conosce il proprio ordine;
- conta quando leggi/scrivici byte singoli, quando scambi dati tra sistemi
  diversi, quando interpreti formati di file o pacchetti di rete;
- ARM è **bi-endian** (configurabile), ma i sistemi Linux ARM64 sono
  little-endian; MIPS storicamente bi-endian; i formati di rete sono big-endian.

Esempio in NASM:

```nasm
section .data
    valore: dd 0x12345678
```

In memoria su x86-64:

```
78 56 34 12
```

Per invertire l'ordine dei byte di un registro si usa `bswap`; per i protocolli
di rete esistono `htons`/`htonl` e le funzioni inverse.

---

### 3.7 Dimensioni dei dati

| Nome | Bit | Byte | Cifre esadecimali |
|---|---|---|---|
| bit | 1 | 1/8 | — |
| nibble | 4 | 1/2 | 1 |
| byte | 8 | 1 | 2 |
| word (x86) | 16 | 2 | 4 |
| dword | 32 | 4 | 8 |
| qword | 64 | 8 | 16 |
| xmmword | 128 | 16 | 32 |
| ymmword | 256 | 32 | 64 |
| zmmword | 512 | 64 | 128 |

**Attenzione alla parola "word"**: su x86 = 16 bit; su ARM64 = 32 bit; su altri
contesti può significare la dimensione naturale del registro. In NASM si usano
parole chiave esplicite (`byte`, `word`, `dword`, `qword`).

#### Dimensioni dei registri x86-64

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

Regole importanti:

- scrivere `eax` azzera i 32 bit alti di `rax`;
- scrivere `ax` o `al` **non** azzera i bit alti: li preserva;
- `ah`/`bh`/`ch`/`dh` non sono utilizzabili insieme a un prefisso REX (quindi
  non con `r8`–`r15` o con operandi a 64 bit).

#### Dimensioni degli operandi

La dimensione è determinata dal registro e dall'istruzione:

```nasm
mov eax, [rbx]        ; legge 4 byte (dword)
mov rax, [rbx]        ; legge 8 byte (qword)
mov al,  [rbx]        ; legge 1 byte
```

Se la dimensione non è deducibile, NASM segnala errore:

```nasm
mov [rbx], 1          ; ambiguo: quanti byte?
mov dword [rbx], 1    ; corretto: 4 byte
```

#### Architetture a 16, 32 e 64 bit

| Aspetto | 8086 (16 bit) | i386 (32 bit) | x86-64 |
|---|---|---|---|
| Registri generali | 8 × 16 bit | 8 × 32 bit | 16 × 64 bit |
| Puntatori | 16 bit (near) / 32 (far) | 32 bit | 64 bit |
| Spazio di indirizzi | 1 MB (segmentato) | 4 GB | 2⁴⁸ byte virtuali (2⁵⁷ con 5 livelli) |
| `int` in C (Linux) | 16 bit | 32 bit | 32 bit |
| `long` in C (Linux) | 32 bit | 32 bit | 64 bit |
| `size_t` | 16 bit | 32 bit | 64 bit |
| Convenzione di chiamata | — | `cdecl`/`stdcall` | System V AMD64 |

Nota: `int` resta a 32 bit anche su x86-64; è `long` e il puntatore che passano a
64 bit (modello LP64 su Linux). Su Windows il modello è LLP64 (`long` resta 32
bit): un'altra differenza da tenere presente.

---

## 3. Funzionamento passo per passo

Seguiamo `-42` dalla scrittura all'elaborazione.

### Passo 1 — Scelta della rappresentazione

Il programmatore decide: intero con segno a 8 bit. Il range è −128…127, quindi
−42 è rappresentabile.

### Passo 2 — Codifica in complemento a due

```
42       = 0010_1010
inverti  = 1101_0101
+1       = 1101_0110 = 0xD6
```

### Passo 3 — Memorizzazione

Su x86-64, un byte non ha problemi di endianness:

```
memoria: D6
```

Per un `dword`, invece, l'ordine dei 4 byte sarebbe little-endian.

### Passo 4 — Caricamento

```nasm
mov al, [rbx]      ; AL = 0xD6
```

Il valore in `AL` è lo stesso pattern di bit. Il significato dipende
dall'interpretazione:

- unsigned: 214;
- signed: −42.

### Passo 5 — Estensione

```nasm
movsx eax, al      ; EAX = 0xFFFFFFD6  (-42)
movzx eax, al      ; EAX = 0x000000D6  (+214)
```

Stesso byte, risultati diversi. La scelta dipende dal tipo originale.

### Passo 6 — Aritmetica e flag

```nasm
add al, 42
```

```
  1101_0110  (0xD6, -42)
+ 0010_1010  (0x2A, +42)
-----------
1 0000_0000  → AL = 0x00, carry out = 1
```

Dopo l'istruzione:

- `AL = 0`;
- `ZF = 1` (risultato zero);
- `CF = 1` (riporto unsigned: 214 + 42 = 256, non rappresentabile in 8 bit);
- `OF = 0` (signed: −42 + 42 = 0, nessun overflow);
- `SF = 0`.

Lo stesso risultato è "overflow" per l'unsigned e "perfetto" per il signed. È
il senso di CF e OF.

---

## 4. Sintassi e istruzioni coinvolte

Questo modulo è soprattutto teorico, ma introduce il vocabolario che servirà.
Istruzioni e direttive citate (formalizzate nei moduli indicati):

| Elemento | Uso | Modulo |
|---|---|---|
| `db`, `dw`, `dd`, `dq` | definire dati di 1, 2, 4, 8 byte | 4 |
| `times`, `equ` | ripetizione e costanti | 4 |
| `byte`, `word`, `dword`, `qword` | dimensione dell'operando | 4–5 |
| `movzx`, `movsx`, `movsxd` | zero/sign extension | 5 |
| `add`, `sub`, `adc`, `sbb` | aritmetica e propagazione del carry | 6 |
| `neg` | complemento a due | 6 |
| `and`, `or`, `xor`, `not` | operazioni bit a bit e maschere | 6 |
| `shl`, `shr`, `sar`, `rol`, `ror` | shift e rotazioni | 6 |
| `mul`, `imul`, `div`, `idiv`, `cqo` | moltiplicazione e divisione | 11 |
| `bswap` | inversione dei byte | 15 |

Esempio di dati in NASM:

```nasm
section .data
    b:  db 0xD6              ; 1 byte
    w:  dw 0x1234            ; 2 byte
    d:  dd 0x12345678        ; 4 byte
    q:  dq 0x1122334455667788; 8 byte
    arr: times 4 dd 0        ; 4 dword azzerati

section .text
    movzx eax, byte [b]      ; zero extension
    movsx ecx, byte [b]      ; sign extension
```

Nota: NASM non "conosce" il tipo; conosce la dimensione e il valore. Il
significato lo decidono le istruzioni.

---

## 5. Esempi semplici commentati

### Esempio 1 — Conversioni

```
156₁₀ = 1001_1100₂ = 0x9C = 234₈
0x2F  = 0010_1111₂ = 47₁₀ = 57₈
0b1011_0110 = 0xB6 = 182₁₀ (unsigned) / −74 (signed)
```

### Esempio 2 — Intervalli

Con 8 bit:

```
unsigned: 0 … 255
signed:   -128 … 127
```

Quindi `0xFF` è 255 come unsigned e −1 come signed. `0x80` è 128 come unsigned e
−128 come signed.

### Esempio 3 — Byte in memoria

```nasm
section .data
    x: dd 0x12345678
```

Dump little-endian:

```
78 56 34 12
```

Se leggi `byte [x]` ottieni `0x78`; se leggi `dword [x]` ottieni `0x12345678`.

### Esempio 4 — Caratteri

```nasm
mov al, 'A'       ; AL = 0x41 = 65
xor al, 0x20      ; AL = 0x61 = 'a'
```

Conversione cifra → numero:

```nasm
mov al, '7'       ; 0x37
sub al, '0'       ; 0x07
```

### Esempio 5 — Float

```nasm
; 0x41480000 = 12.5 in binary32
; segno 0, esponente 130 → 3, mantissa 1.5625 → 12.5
```

---

## 6. Esempi più complessi

### 6.1 Addizione multi-precisione a 128 bit

Due numeri a 128 bit memorizzati come due `qword` ciascuno (parte bassa,
parte alta):

```nasm
; somma di (rdx:rax) + (rcx:rbx)
add rax, rbx        ; parte bassa, imposta CF
adc rdx, rcx        ; parte alta + carry
```

Se la parte bassa produce carry, `adc` lo aggiunge alla parte alta. Senza `adc`
il risultato sarebbe sbagliato ogni volta che la somma bassa supera 2⁶⁴−1.
Analogamente, `sbb` propaga il prestito nelle sottrazioni multi-precisione.

### 6.2 Signed contro unsigned dopo una sottrazione

```nasm
mov al, 0xFF        ; 255 unsigned, -1 signed
mov bl, 0x01
cmp al, bl
```

- come unsigned: 255 > 1 → `ja`/`jb` danno "maggiore";
- come signed: −1 < 1 → `jg`/`jl` danno "minore".

Quindi:

```nasm
jb  unsigned_less   ; preso? no: 255 non è sotto 1
jl  signed_less     ; preso? sì: -1 è sotto 1
```

La stessa `cmp` produce gli stessi flag; cambia l'istruzione di salto che
interpreta quei flag. (Modulo 8.)

### 6.3 Errore di accumulo in virgola mobile

```c
float s = 0.0f;
for (int i = 0; i < 10; i++) s += 0.1f;
if (s == 1.0f) { /* spesso non entra qui */ }
```

`0.1f` non è esatto; sommarlo dieci volte accumula errore. Il confronto esatto è
fragile: si usa una tolleranza o si calcola in un modo numericamente stabile.

### 6.4 UTF-8 in memoria

La stringa `"Aè€"`:

```
'A'  → 41
'è'  → C3 A8
'€'  → E2 82 AC
```

Byte totali: `41 C3 A8 E2 82 AC` (6 byte, 3 caratteri). Se conti i byte ottieni
6; se conti i code point ottieni 3. In C, `strlen` conta i byte, non i caratteri.

### 6.5 Endianness in un pacchetto di rete

Un campo a 32 bit in un pacchetto è in **network byte order** (big-endian). Su
x86-64, dopo aver letto 4 byte in un registro, bisogna invertirli:

```nasm
mov eax, [packet]
bswap eax           ; ora il valore corrisponde al numero big-endian
```

Senza `bswap`, leggeresti `0x78563412` invece di `0x12345678`.

---

## 7. Collegamenti con argomenti precedenti

- **Modulo 1**: il little-endian era stato introdotto con `mov eax, 60`; qui è
  stato generalizzato.
- **Modulo 2**: la memoria è a byte, le cache trasferiscono linee, gli accessi
  non allineati costano; tutto questo si appoggia alla rappresentazione dei
  dati.
- **Modulo 2, word/dword/qword**: qui abbiamo chiarito le dimensioni e le
  differenze tra architetture.
- **In avanti — Modulo 4**: direttive `db`/`dd`/`dq`, sezioni e layout dei dati.
- **Modulo 5**: `mov`, `movzx`, `movsx`, estensione del segno.
- **Modulo 6**: aritmetica, bit a bit, shift, maschere.
- **Modulo 7**: flag `CF`, `OF`, `ZF`, `SF` e loro significato.
- **Modulo 8**: salti condizionati signed/unsigned.
- **Modulo 11**: `mul`, `imul`, `div`, `idiv`, carry e overflow.
- **Modulo 13**: conversione numero ↔ stringa per l'I/O.
- **Modulo 14**: tipi C e ABI (float in XMM, interi in registri).

---

## 8. Errori frequenti

1. **Confondere `'5'` con `5`**: `0x35` contro `0x05`.
2. **"Word = 32 bit"**: su x86 è 16 bit.
3. **Usare zero extension su un valore negativo**: `movzx` di `0xFF` dà 255,
   non −1.
4. **Credere che il complemento a due sia simmetrico**: −128 non ha +128 in 8
   bit.
5. **Confondere `CF` e `OF`**: `CF` è unsigned, `OF` è signed.
6. **Pensare che `neg` del minimo dia il massimo**: dà di nuovo il minimo e
   imposta `OF`.
7. **Usare `shr` su valori negativi**: serve `sar` per la divisione aritmetica.
8. **Dimenticare che `sar` arrotonda verso −∞**, mentre `idiv` tronca verso
   zero.
9. **Confrontare float con `==`**: quasi sempre sbagliato.
10. **Credere che `0.1` sia esatto**: non lo è in binario.
11. **Confondere endianness dei byte con ordine dei bit**: i bit dentro un byte
    non si invertono.
12. **Scrivere `mov [mem], 1`**: dimensione ambigua, serve `dword`/`qword`/...
13. **Dimenticare che scrivere `eax` azzera la parte alta di `rax`**: non è una
    sign extension.
14. **Usare `mul` per valori signed**: serve `imul`.
15. **Dividere per zero**: su x86 genera `#DE`, non un valore infinito.
16. **Credere che ASCII = Unicode = UTF-8**: sono tre cose diverse.
17. **Contare caratteri contando byte in UTF-8**: un carattere può occupare più
    byte.
18. **Assumere che `char` sia sempre signed o sempre unsigned**: in C è
    implementazione-dipendente.
19. **Scordare che `inc`/`dec` non modificano `CF`**: rilevante nelle addizioni
    multi-precisione.
20. **Leggere un valore a 64 bit da un buffer a 32 bit**: si leggono byte
    adiacenti non previsti.

---

## 9. Riepilogo finale

- Tutto è bit; il significato dipende dalla convenzione (tipo, istruzione,
  dimensione).
- Le basi 2, 8 e 16 sono raggruppamenti di bit: 1 cifra ottale = 3 bit, 1 cifra
  esadecimale = 4 bit.
- Unsigned usa tutti i bit; signed in complemento a due usa il MSB come segno e
  ha range asimmetrico.
- Complemento a due: invertire i bit e aggiungere 1; un solo zero; addizione
  unica per signed e unsigned.
- Estensione: zeri per unsigned, replica del segno per signed (`movzx` vs
  `movsx`).
- `CF` segnala carry/borrow unsigned, `OF` segnala overflow signed; sono flag
  diversi.
- Le operazioni bit a bit e le maschere permettono di estrarre, impostare,
  azzerare e invertire bit.
- ASCII è a 7 bit; le cifre e le lettere sono consecutive; maiuscole e minuscole
  differiscono di `0x20`.
- Unicode è un insieme di code point; UTF-8 è una codifica a 1–4 byte,
  compatibile con ASCII; carattere ≠ byte ≠ valore numerico.
- IEEE 754 rappresenta i reali con segno, esponente polarizzato e mantissa;
  ha normalizzati, denormalizzati, infiniti, NaN e errori di arrotondamento.
- L'endianness è l'ordine dei byte in memoria: little-endian su x86-64,
  big-endian nelle reti; non cambia il valore nel registro.
- Le dimensioni (byte, word, dword, qword) e le regole dei registri determinano
  cosa viene letto/scritto; "word" cambia significato tra architetture.
- La stessa sequenza di bit può essere un intero, un carattere, un float o un
  indirizzo: in Assembly la scelta è del programmatore.

---

## 10. Esercizi di verifica

> Soluzioni non incluse. Chiedile quando vuoi.

### Esercizi facili

1. Converti in binario, ottale ed esadecimale: 156, 47, 200.
2. Converti in decimale: `0b1011_0110`, `0x2F`, `0o234`.
3. Quanti bit servono per rappresentare 1000 in binario? E quante cifre
   esadecimali?
4. Elenca i valori ASCII di `'0'`, `'A'`, `'a'`, dello spazio e di LF.
5. Spiega la differenza tra `'5'`, `5` e `"5"`.

### Esercizi intermedi

6. Rappresenta −42 in complemento a due a 8, 16 e 32 bit.
7. Scrivi l'intervallo rappresentabile a 8, 16 e 32 bit per unsigned e signed.
8. Estendi `0xFB` a 16 bit come unsigned e come signed. Spiega la differenza.
9. Calcola `0xB6 & 0x0F`, `0xB6 | 0x01`, `0xB6 ^ 0x01`, `0xB6 & ~0x01`.
10. Spiega perché `0.1` non è rappresentabile esattamente in binario.
11. Decodifica `0x41480000` come binary32.
12. Spiega la differenza tra `0x12345678` in memoria little-endian e
    big-endian.

### Esercizi difficili

13. Perché il complemento a due permette di usare lo stesso circuito per
    addizione signed e unsigned?
14. Spiega perché il range del complemento a due è asimmetrico e quali
    conseguenze ha su `neg`.
15. Distingui carry e overflow con un esempio in cui `CF=0` e `OF=1`, e uno in
    cui `CF=1` e `OF=0`.
16. Perché `sar` e `idiv` possono dare risultati diversi su valori negativi?
17. Spiega come UTF-8 garantisce l'auto-sincronizzazione e perché i byte di
    continuazione non possono essere confusi con l'inizio di un carattere.
18. Descrivi i casi speciali di IEEE 754 e il comportamento di `NaN` nei
    confronti.

### Esercizi "prevedi il risultato"

19. Con 8 bit: `127 + 1`, `255 + 1`, `0 - 1`, `-128 - 1`. Per ciascuno indica
    risultato, `CF` e `OF`.
20. Dato `AL = 0xD6`, quali valori ottieni con `movzx eax, al` e
    `movsx eax, al`?
21. Dopo `mov al, 'a'` e `xor al, 0x20`, quale carattere contiene `AL`?
22. Quanti byte occupa la stringa UTF-8 `"è"`? E quanti caratteri?
23. Leggi `0x12345678` con `mov eax, [mem]` su x86-64: quale valore ottieni?
    E se leggi `byte [mem]`?
24. In binary32, quali sono i bit di `12.5` e di `0.15625`?

### Esercizi "scrivi da zero"

25. Scrivi una sequenza NASM che converta il carattere in `AL` da cifra a
    valore numerico, assumendo che sia una cifra valida.
26. Scrivi una sequenza che verifichi se il bit 3 di `AL` è impostato, senza
    modificare `AL`.
27. Descrivi come sommeresti due numeri a 128 bit memorizzati in memoria,
    indicando quali istruzioni usare e perché.

---

**Prossimo modulo**: il Modulo 4 del tuo programma. Dimmi **"prosegui"** quando
sei pronto, oppure chiedi chiarimenti o le soluzioni degli esercizi.
