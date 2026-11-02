<div align="center">

# 🖥️ Assembly 8086

**Corso base interattivo di Assembly per la classe terza**

Dai registri alla prima chiamata di sistema: teoria, domande, esercizi e simulatore.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![8086](https://img.shields.io/badge/Intel-8086-1e3a8a?style=for-the-badge)

</div>

---

## 📚 Il progetto

**Assembly 8086** è un sito didattico statico per imparare l'assembly del
processore Intel 8086 con la sintassi **MASM/TASM**. È pensato per un percorso
scolastico progressivo: ogni capitolo unisce teoria, verifica immediata e
pratica, senza dare per scontati i concetti dei capitoli precedenti.

I programmi si possono provare con un emulatore come **emu8086** oppure con
**DOSBox** e un assembler (MASM o TASM).

## ✨ Cosa trovi

- **Teoria passo-passo** con esempi commentati e schemi.
- **Domande a risposta multipla** con correzione e spiegazione immediate.
- **Esercizi** con verifica automatica, suggerimenti e soluzioni.
- **Simulatore 8086** per osservare registri, flag e stack.
- **Calcolatore di indirizzi fisici** e **esecuzione guidata** di Hello World.
- **Progressi salvati nel browser** tramite `localStorage`.
- **Layout responsive**, con menu laterale e versione mobile.
- **Nessuna dipendenza esterna**: solo HTML, CSS e JavaScript vanilla.

## 🗺️ Capitoli

| # | Capitolo | Pagina |
|---|----------|--------|
| 1 | I registri general purpose | [`src/registri.html`](src/registri.html) |
| 2 | Operazioni aritmetiche | [`src/aritmetica.html`](src/aritmetica.html) |
| 3 | Dal sorgente al programma in esecuzione | [`src/traduzione.html`](src/traduzione.html) |
| 4 | Lo stack e la sua gestione | [`src/stack.html`](src/stack.html) |
| 5 | La segmentazione | [`src/segmentazione.html`](src/segmentazione.html) |
| 6 | Data stack e gestione dei dati | [`src/data-stack.html`](src/data-stack.html) |
| 7 | I tipi di dati | [`src/tipi-di-dati.html`](src/tipi-di-dati.html) |
| 8 | Hello World e le chiamate di sistema | [`src/hello-world.html`](src/hello-world.html) |

## 📁 Struttura del repository

```text
.
├── README.md
└── src/
    ├── index.html          # home/indice (in preparazione)
    ├── registri.html       # capitolo 1
    ├── aritmetica.html     # capitolo 2
    ├── traduzione.html     # capitolo 3
    ├── stack.html          # capitolo 4
    ├── segmentazione.html  # capitolo 5
    ├── data-stack.html     # capitolo 6
    ├── tipi-di-dati.html   # capitolo 7
    ├── hello-world.html    # capitolo 8
    ├── script.js           # navigazione, quiz, esercizi, simulatore
    └── style.css           # foglio di stile del sito
```

> **Stato**: la home/indice è ancora in preparazione. Per iniziare, apri il
> capitolo 1 dalla tabella qui sopra.

## ▶️ Come iniziare

Clona il repository:

```bash
git clone https://github.com/Samuconfaa/AssemblyDocs.git
cd AssemblyDocs
```

Poi servi la cartella con un server statico:

```bash
python -m http.server 8000
```

e apri nel browser:

```text
http://localhost:8000/src/registri.html
```

In alternativa puoi aprire direttamente `src/registri.html` nel browser.

## 🛠️ Tecnologie

| Tecnologia | Uso |
|------------|-----|
| HTML5 | struttura delle pagine e dei capitoli |
| CSS3 | layout, temi, componenti e responsive design |
| JavaScript (vanilla) | navigazione, quiz, esercizi, simulatore e progressi |
| `localStorage` | salvataggio dei risultati nel browser |

Non sono richiesti framework, build step o installazioni particolari.

## 🤝 Contribuire

Il progetto è sviluppato in collaborazione. Per modificare i contenuti:

1. crea un branch dedicato;
2. lavora su un capitolo o su una funzionalità;
3. apri una pull request verso `main`.

Mantieni gli esempi semplici, verificabili e coerenti con il programma svolto
in classe.

## 👥 Autori

- **Samuele Confalonieri**
- **Alessandro Torchia**
- **Maximiliam Cichello**

## 📄 Licenza

Materiale didattico. Licenza da definire.
