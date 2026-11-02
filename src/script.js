/* ==========================================================
   Assembly 8086 - script del sito didattico
   - layout (menu laterale, pagina precedente / successiva)
   - evidenziazione della sintassi
   - domande a risposta multipla ed esercizi con verifica
   - salvataggio dei progressi (localStorage)
   - mini simulatore di registri e stack
   - calcolatore di indirizzi fisici
   - esecuzione guidata di Hello World
   ========================================================== */
(function (root) {
  'use strict';

  /* ---------------------------------------------------------
     Elenco delle pagine (usato da menu e navigazione)
     --------------------------------------------------------- */
  const PAGES = [
    { id: 'registri',      file: 'registri.html',      title: 'I registri general purpose' },
    { id: 'aritmetica',    file: 'aritmetica.html',    title: 'Operazioni aritmetiche' },
    { id: 'traduzione',    file: 'traduzione.html',    title: 'Dal sorgente al programma in esecuzione' },
    { id: 'stack',         file: 'stack.html',         title: 'Lo stack e la sua gestione' },
    { id: 'segmentazione', file: 'segmentazione.html', title: 'La segmentazione' },
    { id: 'data-stack',    file: 'data-stack.html',    title: 'Data stack e gestione dei dati' },
    { id: 'tipi-di-dati',  file: 'tipi-di-dati.html',  title: 'I tipi di dati' },
    { id: 'hello-world',   file: 'hello-world.html',   title: 'Hello World e le chiamate di sistema' }
  ];

  /* ---------------------------------------------------------
     Utilità
     --------------------------------------------------------- */
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const hex = (v, w) => (v >>> 0).toString(16).toUpperCase().padStart(w, '0');

  /* ---------------------------------------------------------
     Controllo delle risposte
     --------------------------------------------------------- */
  // testo / istruzioni: minuscolo, senza spazi
  function normText(s) {
    return String(s).toLowerCase()
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/\s+/g, '');
  }
  // numeri: accetta 0x1A, 1Ah, 01A, 26 ... (toglie prefisso, suffisso h e zeri iniziali)
  function normNum(s) {
    s = String(s).toLowerCase().replace(/[\u2212\u2013]/g, '-').replace(/\s+/g, '');
    let neg = false;
    if (s[0] === '-') { neg = true; s = s.slice(1); }
    s = s.replace(/^0x/, '').replace(/h$/, '').replace(/^0+(?=.)/, '');
    return (neg ? '-' : '') + s;
  }
  // sequenze di lettere: ignora spazi, virgole, trattini
  function normSeq(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  }
  function normalizer(type) {
    return type === 'num' ? normNum : type === 'seq' ? normSeq : normText;
  }
  function checkAnswer(input, answers, type) {
    const n = normalizer(type);
    const given = n(input);
    if (given === '') return false;
    return String(answers).split('|').some(a => n(a) === given);
  }

  /* ---------------------------------------------------------
     Evidenziazione sintassi assembly
     --------------------------------------------------------- */
  const INSTR = 'mov|xchg|add|sub|inc|dec|neg|mul|imul|div|idiv|push|pop|pushf|popf|and|or|xor|not|shl|shr|cmp|jmp|je|jne|jz|jnz|jc|jnc|ja|jb|jg|jl|loop|call|ret|int|iret|lea|nop|adc|sbb|cli|sti|hlt|test';
  const REGS = 'ax|bx|cx|dx|si|di|bp|sp|ip|al|ah|bl|bh|cl|ch|dl|dh|cs|ds|ss|es|eax|ebx|ecx|edx';
  const DIRS = 'db|dw|dd|dup|proc|endp|end|offset|ptr|byte|word|equ|org';
  const TOKEN = new RegExp(
    '("[^"]*"|\'[^\']*\')' +                                   // 1 stringhe
    '|(\\.(?:model|stack|data|code)\\b|@data)' +                // 2 direttive di sezione
    '|(\\b[a-z_]\\w*(?=:))' +                                   // 3 etichette
    '|(\\b(?:' + INSTR + ')\\b)' +                              // 4 istruzioni
    '|(\\b(?:' + REGS + ')\\b)' +                               // 5 registri
    '|(\\b(?:' + DIRS + ')\\b)' +                               // 6 direttive
    '|(\\b(?:0x[0-9a-f]+|[0-9][0-9a-f]*h|[01]+b|\\d+)\\b)',     // 7 numeri
    'gi'
  );
  const CLASSES = [null, 'str', 'dir', 'lbl', 'ins', 'reg', 'dir', 'num'];

  function highlightLine(line) {
    let code = line, comment = '', q = null;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === q) q = null; }
      else if (c === '"' || c === "'") q = c;
      else if (c === ';') { code = line.slice(0, i); comment = line.slice(i); break; }
    }
    const out = esc(code).replace(TOKEN, function (m) {
      for (let g = 1; g <= 7; g++) {
        if (arguments[g] !== undefined) return '<span class="' + CLASSES[g] + '">' + m + '</span>';
      }
      return m;
    });
    return out + (comment ? '<span class="cmt">' + esc(comment) + '</span>' : '');
  }

  /* ---------------------------------------------------------
     Mini simulatore 8086 (solo registri, flag e stack)
     --------------------------------------------------------- */
  const R16 = ['ax', 'bx', 'cx', 'dx', 'si', 'di', 'bp', 'sp'];
  const R8 = {
    al: ['ax', 0], ah: ['ax', 8], bl: ['bx', 0], bh: ['bx', 8],
    cl: ['cx', 0], ch: ['cx', 8], dl: ['dx', 0], dh: ['dx', 8]
  };
  const ARITY = {
    mov: 2, xchg: 2, add: 2, sub: 2, and: 2, or: 2, xor: 2,
    inc: 1, dec: 1, neg: 1, mul: 1, div: 1, push: 1, pop: 1, nop: 0
  };

  function parseNum(tok) {
    let t = String(tok).trim();
    const ch = /^'(.)'$/.exec(t) || /^"(.)"$/.exec(t);
    if (ch) return ch[1].charCodeAt(0);
    t = t.toLowerCase();
    let neg = false;
    if (t[0] === '-') { neg = true; t = t.slice(1); }
    let v = NaN;
    if (/^0x[0-9a-f]+$/.test(t)) v = parseInt(t.slice(2), 16);
    else if (/^[0-9][0-9a-f]*h$/.test(t)) v = parseInt(t.slice(0, -1), 16);
    else if (/^[01]+b$/.test(t)) v = parseInt(t.slice(0, -1), 2);
    else if (/^[0-9]+d?$/.test(t)) v = parseInt(t, 10);
    return neg ? -v : v;
  }

  function parseOperand(tok) {
    const t = tok.trim().toLowerCase();
    if (t === '') throw new Error('operando mancante');
    if (R16.includes(t)) return { k: 'r16', n: t, size: 16 };
    if (R8[t]) return { k: 'r8', n: t, size: 8 };
    if (/[\[\]]/.test(t) || /\b(ptr|offset)\b/.test(t)) {
      throw new Error('questo simulatore non gestisce la memoria: usa solo registri e numeri');
    }
    const v = parseNum(tok);
    if (Number.isNaN(v)) throw new Error('operando non valido: "' + tok.trim() + '"');
    return { k: 'imm', v: v };
  }

  function newCPU() {
    return { ax: 0, bx: 0, cx: 0, dx: 0, si: 0, di: 0, bp: 0, sp: 0x100,
             flags: { ZF: 0, SF: 0, CF: 0, OF: 0 }, mem: {} };
  }

  function readOp(cpu, op) {
    if (op.k === 'r16') return cpu[op.n];
    if (op.k === 'r8') { const r = R8[op.n]; return (cpu[r[0]] >> r[1]) & 0xFF; }
    return op.v;
  }
  function writeOp(cpu, op, v) {
    if (op.k === 'r16') { cpu[op.n] = v & 0xFFFF; return; }
    const r = R8[op.n];
    cpu[r[0]] = (cpu[r[0]] & ~(0xFF << r[1]) & 0xFFFF) | ((v & 0xFF) << r[1]);
  }

  function commonSize(a, b) {
    if (a.k === 'imm') throw new Error('la destinazione non può essere un numero');
    const size = a.size;
    if (b && b.k !== 'imm' && b.size !== size) {
      throw new Error('i due operandi hanno dimensioni diverse (' + size + ' bit e ' + b.size + ' bit)');
    }
    if (b && b.k === 'imm') {
      const lo = -Math.pow(2, size - 1), hi = Math.pow(2, size) - 1;
      if (b.v < lo || b.v > hi) throw new Error('il numero ' + b.v + ' non entra in ' + size + ' bit');
    }
    return size;
  }

  function setZS(cpu, res, size) {
    cpu.flags.ZF = res === 0 ? 1 : 0;
    cpu.flags.SF = (res >> (size - 1)) & 1;
  }

  function execInstr(cpu, mnem, ops) {
    const need = ARITY[mnem];
    if (need === undefined) throw new Error('istruzione "' + mnem + '" non supportata dal simulatore');
    if (ops.length !== need) throw new Error('"' + mnem + '" richiede ' + need + ' operando/i, ne hai scritti ' + ops.length);
    const a = ops[0], b = ops[1], f = cpu.flags;
    if (mnem === 'nop') return;

    if (mnem === 'push' || mnem === 'pop') {
      if (a.k !== 'r16') throw new Error('push e pop lavorano su registri a 16 bit (AX, BX, CX, DX, SI, DI, BP)');
      if (mnem === 'push') {
        if (cpu.sp < 2) throw new Error('stack overflow: lo stack è pieno');
        const v = cpu[a.n];
        cpu.sp = (cpu.sp - 2) & 0xFFFF;
        cpu.mem[cpu.sp] = v;
      } else {
        if (cpu.sp >= 0x100 || cpu.mem[cpu.sp] === undefined) throw new Error('stack underflow: stai facendo pop ma lo stack è vuoto');
        const v = cpu.mem[cpu.sp];
        delete cpu.mem[cpu.sp];
        cpu.sp = (cpu.sp + 2) & 0xFFFF;
        cpu[a.n] = v;
      }
      return;
    }

    if (mnem === 'mul' || mnem === 'div') {
      if (a.k === 'imm') throw new Error(mnem + ' non accetta un numero: metti prima il valore in un registro');
      const src = readOp(cpu, a);
      if (mnem === 'mul') {
        if (a.size === 8) {
          const r = (cpu.ax & 0xFF) * src;
          cpu.ax = r & 0xFFFF;
          f.CF = f.OF = r > 0xFF ? 1 : 0;
        } else {
          const r = cpu.ax * src;
          cpu.ax = r & 0xFFFF;
          cpu.dx = Math.floor(r / 65536) & 0xFFFF;
          f.CF = f.OF = cpu.dx !== 0 ? 1 : 0;
        }
      } else {
        if (src === 0) throw new Error('divisione per zero: la CPU genererebbe un errore');
        if (a.size === 8) {
          const q = Math.floor(cpu.ax / src), r = cpu.ax % src;
          if (q > 0xFF) throw new Error('overflow nella divisione: il quoziente non entra in AL');
          cpu.ax = ((r & 0xFF) << 8) | q;
        } else {
          const dividend = cpu.dx * 65536 + cpu.ax;
          const q = Math.floor(dividend / src), r = dividend % src;
          if (q > 0xFFFF) throw new Error('overflow nella divisione: il quoziente non entra in AX');
          cpu.ax = q; cpu.dx = r;
        }
      }
      return;
    }

    if (mnem === 'inc' || mnem === 'dec' || mnem === 'neg') {
      const size = commonSize(a);
      const mask = Math.pow(2, size) - 1;
      const x = readOp(cpu, a);
      let res;
      if (mnem === 'inc') {
        res = (x + 1) & mask;
        f.OF = (((x ^ res) & (1 ^ res)) >> (size - 1)) & 1;
      } else if (mnem === 'dec') {
        res = (x - 1) & mask;
        f.OF = (((x ^ 1) & (x ^ res)) >> (size - 1)) & 1;
      } else {
        res = (-x) & mask;
        f.CF = x !== 0 ? 1 : 0;
        f.OF = x === Math.pow(2, size - 1) ? 1 : 0;
      }
      setZS(cpu, res, size);
      writeOp(cpu, a, res);
      return;
    }

    // istruzioni a due operandi
    const size = commonSize(a, b);
    const mask = Math.pow(2, size) - 1;
    const x = readOp(cpu, a);
    const y = (b.k === 'imm' ? b.v : readOp(cpu, b)) & mask;
    let res;
    switch (mnem) {
      case 'mov':
        writeOp(cpu, a, y);
        return;
      case 'xchg':
        if (b.k === 'imm') throw new Error('xchg lavora solo su registri');
        writeOp(cpu, b, x);
        writeOp(cpu, a, y);
        return;
      case 'add': {
        const r = x + y;
        res = r & mask;
        f.CF = r > mask ? 1 : 0;
        f.OF = (((x ^ res) & (y ^ res)) >> (size - 1)) & 1;
        break;
      }
      case 'sub': {
        res = (x - y) & mask;
        f.CF = x < y ? 1 : 0;
        f.OF = (((x ^ y) & (x ^ res)) >> (size - 1)) & 1;
        break;
      }
      case 'and': res = x & y; f.CF = f.OF = 0; break;
      case 'or':  res = x | y; f.CF = f.OF = 0; break;
      case 'xor': res = x ^ y; f.CF = f.OF = 0; break;
      default: throw new Error('istruzione non supportata');
    }
    setZS(cpu, res, size);
    writeOp(cpu, a, res);
  }

  function runProgram(src) {
    const cpu = newCPU();
    const lines = String(src).split('\n');
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].replace(/;.*$/, '').trim();
      if (!line) continue;
      if (++count > 500) return { cpu: cpu, error: 'troppe istruzioni (massimo 500)', line: i + 1, text: lines[i].trim() };
      try {
        const m = /^([a-z]+)\s*(.*)$/i.exec(line);
        if (!m) throw new Error('riga non valida');
        const mnem = m[1].toLowerCase();
        const ops = m[2] ? m[2].split(',').map(parseOperand) : [];
        execInstr(cpu, mnem, ops);
      } catch (e) {
        return { cpu: cpu, error: e.message, line: i + 1, text: lines[i].trim() };
      }
    }
    return { cpu: cpu };
  }

  function renderCPU(cpu) {
    const signed = v => (v >= 0x8000 ? v - 0x10000 : v);
    let h = '<div class="table-wrap"><table><thead><tr><th>Registro</th><th>Parte alta</th><th>Parte bassa</th>' +
            '<th>Hex</th><th>Decimale</th><th>Con segno</th></tr></thead><tbody>';
    ['ax', 'bx', 'cx', 'dx'].forEach(r => {
      const R = r.toUpperCase(), v = cpu[r];
      h += '<tr><td><b>' + R + '</b></td><td>' + R[0] + 'H = ' + hex(v >> 8, 2) + '</td><td>' + R[0] + 'L = ' + hex(v & 255, 2) +
           '</td><td>' + hex(v, 4) + '</td><td>' + v + '</td><td>' + signed(v) + '</td></tr>';
    });
    ['si', 'di', 'bp', 'sp'].forEach(r => {
      const v = cpu[r];
      h += '<tr><td><b>' + r.toUpperCase() + '</b></td><td>—</td><td>—</td><td>' + hex(v, 4) + '</td><td>' + v + '</td><td>' + signed(v) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    const f = cpu.flags;
    h += '<div class="flags"><b>ZF = ' + f.ZF + '</b><b>SF = ' + f.SF + '</b><b>CF = ' + f.CF + '</b><b>OF = ' + f.OF + '</b></div>';
    h += '<h4>Stack (SP = ' + hex(cpu.sp, 4) + ')</h4>';
    const rows = [];
    for (let a = cpu.sp; a < 0x100; a += 2) {
      if (cpu.mem[a] !== undefined) rows.push('<tr><td>' + hex(a, 4) + (a === cpu.sp ? ' ← SP' : '') + '</td><td>' + hex(cpu.mem[a], 4) + '</td></tr>');
    }
    h += rows.length
      ? '<div class="table-wrap"><table><thead><tr><th>Indirizzo (offset in SS)</th><th>Contenuto</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>'
      : '<p><em>Lo stack è vuoto.</em></p>';
    return h;
  }

  /* ---------------------------------------------------------
     Parte che lavora sulla pagina (solo nel browser)
     --------------------------------------------------------- */
  const STORE_KEY = 'assembly8086-progressi-v1';

  function loadData() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch (e) { return {}; }
  }
  function saveData(d) {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(d)); } catch (e) { /* ignora */ }
  }
  function stats(pageId) {
    const d = loadData()[pageId];
    return { done: d ? d.done.length : 0, total: d ? d.total : 0 };
  }
  function isDone(pageId, id) {
    const d = loadData()[pageId];
    return !!(d && d.done.indexOf(id) !== -1);
  }
  function markDone(pageId, id) {
    const data = loadData();
    const e = data[pageId] || { done: [], total: 0 };
    if (e.done.indexOf(id) === -1) e.done.push(id);
    data[pageId] = e;
    saveData(data);
    updateProgressBox(pageId);
    refreshSidebar();
  }

  function mk(tag, cls, text) {
    const el = document.createElement(tag);
    if (cls) el.className = cls;
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function setFb(fb, type, text) {
    fb.className = 'feedback ' + type;
    fb.textContent = text;
  }

  /* ----- layout ----- */
  function buildLayout(pageId) {
    const top = document.createElement('header');
    top.id = 'topbar';
    top.innerHTML = '<button id="menu-btn" type="button" aria-label="Apri o chiudi l\'indice">☰</button>' +
                    '<a class="brand" href="index.html">Assembly <span>8086</span></a>';
    document.body.insertBefore(top, document.body.firstChild);

    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    document.body.appendChild(overlay);

    const side = document.getElementById('sidebar');
    if (side) {
      let h = '<a class="brand" href="index.html">Assembly <span>8086</span></a>' +
              '<p class="brand-sub">Corso base · classe terza</p>' +
              '<div class="side-home"><a href="index.html">⌂ Home e indice</a></div><ol>';
      PAGES.forEach((p, i) => {
        h += '<li data-id="' + p.id + '"' + (p.id === pageId ? ' class="current"' : '') + '><a href="' + p.file + '">' +
             '<span class="num">' + (i + 1) + '</span><span>' + p.title + '</span><span class="pstat"></span></a></li>';
      });
      side.innerHTML = h + '</ol>';
    }

    const toggle = () => document.body.classList.toggle('menu-open');
    document.getElementById('menu-btn').addEventListener('click', toggle);
    overlay.addEventListener('click', toggle);
  }

  function refreshSidebar() {
    document.querySelectorAll('#sidebar li[data-id]').forEach(li => {
      const s = stats(li.dataset.id);
      const stat = li.querySelector('.pstat');
      const complete = s.total > 0 && s.done >= s.total;
      li.classList.toggle('complete', complete);
      li.querySelector('.num').textContent = complete ? '✓' : (PAGES.findIndex(p => p.id === li.dataset.id) + 1);
      stat.textContent = s.total > 0 && !complete ? s.done + '/' + s.total : '';
    });
  }

  function buildPager(pageId) {
    const i = PAGES.findIndex(p => p.id === pageId);
    if (i < 0) return;
    const nav = document.createElement('nav');
    nav.className = 'pager';
    const prev = i > 0 ? PAGES[i - 1] : null;
    const next = i < PAGES.length - 1 ? PAGES[i + 1] : null;
    nav.innerHTML =
      (prev ? '<a class="prev" href="' + prev.file + '"><small>← Capitolo precedente</small>' + prev.title + '</a>'
            : '<a class="prev" href="index.html"><small>←</small>Home e indice</a>') +
      (next ? '<a class="next" href="' + next.file + '"><small>Capitolo successivo →</small>' + next.title + '</a>'
            : '<a class="next" href="index.html"><small>Hai finito il percorso!</small>Torna alla home</a>');
    document.getElementById('content').appendChild(nav);
  }

  function buildProgressBox(pageId) {
    const box = document.createElement('section');
    box.className = 'progress-box';
    box.id = 'progress-box';
    box.innerHTML = '<h2>Il tuo avanzamento in questo capitolo</h2><div class="bar"><div class="fill"></div></div><p></p>';
    document.getElementById('content').appendChild(box);
    updateProgressBox(pageId);
  }
  function updateProgressBox(pageId) {
    const box = document.getElementById('progress-box');
    if (!box) return;
    const s = stats(pageId);
    const pct = s.total ? Math.round(100 * s.done / s.total) : 0;
    box.querySelector('.fill').style.width = pct + '%';
    box.querySelector('p').textContent = s.done + ' di ' + s.total + ' tra domande ed esercizi risolti' +
      (s.total && s.done >= s.total ? ' — capitolo completato! 🎉' : '. I progressi restano salvati in questo browser.');
  }

  /* ----- evidenziazione ----- */
  function highlightAll() {
    document.querySelectorAll('pre.asm').forEach(pre => {
      const lines = pre.textContent.replace(/^\n+|\s+$/g, '').split('\n');
      pre.innerHTML = lines.map(highlightLine).join('\n');
    });
  }

  /* ----- domande e esercizi ----- */
  function setupQuiz(el, id, pageId, idx) {
    const radios = el.querySelectorAll('input[type=radio]');
    radios.forEach(r => { r.name = 'quiz-' + idx; });
    const btn = mk('button', 'btn', 'Verifica');
    btn.type = 'button';
    const fb = mk('div', 'feedback');
    fb.setAttribute('aria-live', 'polite');
    el.appendChild(btn);
    el.appendChild(fb);

    const correct = el.dataset.answer;
    const explain = el.dataset.explain || '';
    let attempts = 0;

    function lockOk() {
      el.classList.remove('ko');
      el.classList.add('ok');
      radios.forEach(r => { r.disabled = true; });
      btn.disabled = true;
    }

    if (isDone(pageId, id)) {
      radios.forEach(r => { if (r.value === correct) r.checked = true; });
      lockOk();
      setFb(fb, 'ok', '✔ Già risolta. ' + explain);
      return;
    }

    btn.addEventListener('click', () => {
      const sel = el.querySelector('input:checked');
      if (!sel) { setFb(fb, 'warn', 'Scegli una risposta e poi premi Verifica.'); return; }
      attempts++;
      if (sel.value === correct) {
        lockOk();
        setFb(fb, 'ok', '✔ Corretto! ' + explain);
        markDone(pageId, id);
      } else {
        el.classList.add('ko');
        let msg = '✖ Non è questa.';
        if (attempts >= 2) {
          const right = el.querySelector('input[value="' + correct + '"]');
          if (right) right.closest('label').classList.add('reveal');
          msg += ' La risposta giusta è quella evidenziata. ' + explain;
        } else {
          msg += ' Riprova: rileggi la teoria qui sopra.';
        }
        setFb(fb, 'ko', msg);
      }
    });
  }

  function setupExercise(el, id, pageId) {
    const type = el.dataset.type || 'text';
    const answers = el.dataset.answers || '';
    const solution = el.dataset.solution || answers.split('|')[0];
    const explain = el.dataset.explain || '';
    const hint = el.dataset.hint || '';

    const row = mk('div', 'answer-row');
    if (el.dataset.label) row.appendChild(mk('span', 'answer-label', el.dataset.label));
    const input = document.createElement('input');
    input.type = 'text';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.placeholder = el.dataset.placeholder || 'La tua risposta';
    const btn = mk('button', 'btn', 'Verifica');
    btn.type = 'button';
    row.appendChild(input);
    row.appendChild(btn);
    const fb = mk('div', 'feedback');
    fb.setAttribute('aria-live', 'polite');
    el.appendChild(row);
    el.appendChild(fb);

    let attempts = 0;
    function lockOk() {
      el.classList.remove('ko');
      el.classList.add('ok');
      input.disabled = true;
      btn.disabled = true;
    }

    if (isDone(pageId, id)) {
      input.value = solution;
      lockOk();
      setFb(fb, 'ok', '✔ Già risolto. ' + explain);
      return;
    }

    function check() {
      if (!input.value.trim()) { setFb(fb, 'warn', 'Scrivi una risposta e poi premi Verifica.'); return; }
      attempts++;
      if (checkAnswer(input.value, answers, type)) {
        lockOk();
        setFb(fb, 'ok', '✔ Corretto! ' + explain);
        markDone(pageId, id);
      } else {
        el.classList.add('ko');
        let msg = '✖ Non è corretto.';
        if (attempts >= 3) msg += ' La soluzione è: ' + solution + '. ' + explain;
        else if (hint) msg += ' Suggerimento: ' + hint;
        else msg += ' Riprova.';
        setFb(fb, 'ko', msg);
      }
    }
    btn.addEventListener('click', check);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
  }

  function initQuizzes(pageId) {
    const items = Array.from(document.querySelectorAll('.quiz, .exercise'));
    const ids = items.map((_, i) => pageId + '-' + i);
    const data = loadData();
    const entry = data[pageId] || { done: [], total: 0 };
    entry.total = items.length;
    entry.done = entry.done.filter(x => ids.indexOf(x) !== -1);
    data[pageId] = entry;
    saveData(data);
    items.forEach((el, i) => {
      if (el.classList.contains('quiz')) setupQuiz(el, ids[i], pageId, i);
      else setupExercise(el, ids[i], pageId);
    });
    updateProgressBox(pageId);
  }

  /* ----- simulatore ----- */
  function initSims() {
    document.querySelectorAll('.sim').forEach(sim => {
      const ta = sim.querySelector('textarea');
      ta.spellcheck = false;
      ta.rows = Math.max(6, ta.value.split('\n').length + 1);
      const initial = ta.value;
      const bar = mk('div', 'sim-bar');
      const run = mk('button', 'btn', '▶ Esegui');
      run.type = 'button';
      const reset = mk('button', 'btn secondary', '⟲ Ripristina esempio');
      reset.type = 'button';
      bar.appendChild(run);
      bar.appendChild(reset);
      bar.appendChild(mk('small', '', 'Scorciatoia: Ctrl + Invio'));
      const out = mk('div', 'sim-out');
      sim.appendChild(bar);
      sim.appendChild(out);

      function exec() {
        const res = runProgram(ta.value);
        let h = '';
        if (res.error) {
          h += '<div class="sim-error">⚠ Riga ' + res.line + ' (<code>' + esc(res.text) + '</code>): ' + esc(res.error) + '</div>';
        }
        out.innerHTML = h + renderCPU(res.cpu);
      }
      run.addEventListener('click', exec);
      reset.addEventListener('click', () => { ta.value = initial; exec(); });
      ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); exec(); } });
      exec();
    });
  }

  /* ----- calcolatore indirizzo fisico ----- */
  function parseHex16(s) {
    s = String(s).trim().toLowerCase().replace(/^0x/, '').replace(/h$/, '');
    return /^[0-9a-f]{1,4}$/.test(s) ? parseInt(s, 16) : NaN;
  }
  function initSegCalc() {
    const box = document.getElementById('seg-calc');
    if (!box) return;
    const s = document.getElementById('calc-seg');
    const o = document.getElementById('calc-off');
    const out = document.getElementById('calc-out');
    function upd() {
      const sv = parseHex16(s.value), ov = parseHex16(o.value);
      if (Number.isNaN(sv) || Number.isNaN(ov)) {
        out.textContent = 'Scrivi due numeri esadecimali di al massimo 4 cifre (es. 1234 e 0010).';
        return;
      }
      const shifted = sv * 16, phys = shifted + ov;
      let t = hex(sv, 4) + 'h × 16 = ' + hex(shifted, 5) + 'h  (cioè il segmento con uno zero in più a destra)\n' +
              hex(shifted, 5) + 'h + ' + hex(ov, 4) + 'h = ' + hex(phys, 5) + 'h\n' +
              'Indirizzo fisico = ' + hex(phys, 5) + 'h  (decimale ' + phys + ')';
      if (phys > 0xFFFFF) t += '\nAttenzione: supera 1 MB; sull\'8086 l\'indirizzo "fa il giro" e riparte da zero.';
      out.innerHTML = esc(t).replace(/\n/g, '<br>').replace(/ {2}/g, '&nbsp;&nbsp;');
    }
    s.addEventListener('input', upd);
    o.addEventListener('input', upd);
    upd();
  }

  /* ----- esecuzione guidata di Hello World ----- */
  const STEPPERS = {
    hello: {
      code: [
        '.model small',
        '.stack 100h',
        '',
        '.data',
        '    msg db "Hello, World!", 0Dh, 0Ah, "$"',
        '',
        '.code',
        'main proc',
        '    mov ax, @data',
        '    mov ds, ax',
        '',
        '    mov dx, offset msg',
        '    mov ah, 09h',
        '    int 21h',
        '',
        '    mov ah, 4Ch',
        '    mov al, 0',
        '    int 21h',
        'main endp',
        'end main'
      ],
      steps: [
        { lines: [], note: 'Premi «Avanti» per eseguire il programma un passo alla volta e guardare cosa cambia in registri e schermo.',
          ax: '?', dx: '?', ds: '?', screen: '' },
        { lines: [0, 1], note: 'Direttive: .model small e .stack 100h non sono istruzioni per la CPU. Dicono all\'assembler come organizzare il programma (un segmento codice e uno dati, al massimo 64 KB ciascuno) e di riservare 100h byte per lo stack.',
          ax: '?', dx: '?', ds: '?', screen: '' },
        { lines: [3, 4], note: 'Il dato msg viene messo nel data segment. Sono 16 byte: i 13 caratteri di «Hello, World!», poi 0Dh (ritorno a inizio riga), 0Ah (nuova riga) e «$», il terminatore che serve al DOS per sapere dove finisce il testo.',
          ax: '?', dx: '?', ds: '?', screen: '' },
        { lines: [8], note: 'mov ax, @data: AX riceve il numero di segmento del data segment (lo decide il sistema operativo quando carica il programma).',
          ax: 'indirizzo del segmento dati', dx: '?', ds: '?', screen: '' },
        { lines: [9], note: 'mov ds, ax: ora DS punta al nostro segmento dati. Si passa da AX perché un numero non può essere scritto direttamente in un registro di segmento.',
          ax: 'indirizzo del segmento dati', dx: '?', ds: 'segmento dati', screen: '' },
        { lines: [11], note: 'mov dx, offset msg: DX riceve la posizione di msg all\'interno del segmento dati. Essendo la prima variabile, il suo offset è 0000h.',
          ax: 'indirizzo del segmento dati', dx: '0000h', ds: 'segmento dati', screen: '' },
        { lines: [12], note: 'mov ah, 09h: in AH si scrive il numero del servizio richiesto al DOS. La funzione 09h significa «stampa la stringa che si trova all\'indirizzo DS:DX».',
          ax: 'AH = 09h', dx: '0000h', ds: 'segmento dati', screen: '' },
        { lines: [13], note: 'int 21h: la CPU salva FLAGS, CS e IP sullo stack, cerca nella tabella dei vettori (indirizzo 0000:0084h) dove si trova il codice del DOS e ci salta. Il DOS legge AH = 09h, stampa i byte da DS:DX fino al «$» e poi esegue iret, che ripristina IP, CS e FLAGS: il programma riprende dall\'istruzione successiva.',
          ax: 'AH = 09h', dx: '0000h', ds: 'segmento dati', screen: 'Hello, World!\n_' },
        { lines: [15], note: 'mov ah, 4Ch: nuovo servizio del DOS, il numero 4Ch significa «termina il programma».',
          ax: 'AH = 4Ch', dx: '0000h', ds: 'segmento dati', screen: 'Hello, World!\n_' },
        { lines: [16], note: 'mov al, 0: la funzione 4Ch vuole in AL il codice di uscita. Per convenzione 0 vuol dire «tutto è andato bene».',
          ax: 'AH = 4Ch, AL = 00h', dx: '0000h', ds: 'segmento dati', screen: 'Hello, World!\n_' },
        { lines: [17], note: 'int 21h: stesso meccanismo di prima, ma questa volta il DOS vede AH = 4Ch, libera la memoria del programma e ridà il controllo al sistema. Il programma è finito!',
          ax: 'AH = 4Ch, AL = 00h', dx: '0000h', ds: 'segmento dati', screen: 'Hello, World!\nC:\\>_' }
      ]
    }
  };

  function initSteppers() {
    document.querySelectorAll('.stepper').forEach(rootEl => {
      const def = STEPPERS[rootEl.dataset.id];
      if (!def) return;
      rootEl.innerHTML =
        '<pre class="asm-steps"></pre>' +
        '<div class="stepper-side"><div class="stepper-note"></div><div class="stepper-state"></div>' +
        '<div class="screen" aria-label="Schermo simulato"></div></div>' +
        '<div class="stepper-ctrl">' +
        '<button type="button" class="btn secondary" data-a="reset">⟲ Da capo</button>' +
        '<button type="button" class="btn secondary" data-a="prev">◀ Indietro</button>' +
        '<button type="button" class="btn" data-a="next">Avanti ▶</button>' +
        '<span class="stepper-count"></span></div>';
      const pre = rootEl.querySelector('.asm-steps');
      pre.innerHTML = def.code.map((l, i) => '<span class="cl" data-i="' + i + '">' + (l ? highlightLine(l) : ' ') + '</span>').join('');
      let cur = 0;
      function render() {
        const st = def.steps[cur];
        pre.querySelectorAll('.cl').forEach(sp => sp.classList.toggle('active', st.lines.indexOf(+sp.dataset.i) !== -1));
        rootEl.querySelector('.stepper-note').textContent = st.note;
        rootEl.querySelector('.stepper-state').innerHTML =
          '<table><tbody><tr><th>AX</th><td>' + esc(st.ax) + '</td></tr><tr><th>DX</th><td>' + esc(st.dx) +
          '</td></tr><tr><th>DS</th><td>' + esc(st.ds) + '</td></tr></tbody></table>';
        rootEl.querySelector('.screen').textContent = st.screen || '_';
        rootEl.querySelector('.stepper-count').textContent = 'Passo ' + cur + ' di ' + (def.steps.length - 1);
        rootEl.querySelector('[data-a=prev]').disabled = cur === 0;
        rootEl.querySelector('[data-a=next]').disabled = cur === def.steps.length - 1;
      }
      rootEl.addEventListener('click', e => {
        const a = e.target.dataset && e.target.dataset.a;
        if (a === 'next' && cur < def.steps.length - 1) cur++;
        else if (a === 'prev' && cur > 0) cur--;
        else if (a === 'reset') cur = 0;
        else return;
        render();
      });
      render();
    });
  }

  /* ----- home ----- */
  function fillHome() {
    document.querySelectorAll('[data-progress-for]').forEach(el => {
      const s = stats(el.dataset.progressFor);
      if (s.total === 0) { el.textContent = 'Non ancora iniziato'; return; }
      if (s.done >= s.total) { el.textContent = '✓ Completato (' + s.done + '/' + s.total + ')'; el.classList.add('done'); return; }
      el.textContent = s.done + ' / ' + s.total + ' risolti';
    });
    const reset = document.getElementById('reset-progress');
    if (reset) {
      reset.addEventListener('click', () => {
        if (confirm('Vuoi davvero azzerare tutti i progressi salvati in questo browser?')) {
          try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignora */ }
          location.reload();
        }
      });
    }
  }

  /* ----- avvio ----- */
  function init() {
    const pageId = document.body.dataset.page || 'home';
    buildLayout(pageId);
    highlightAll();
    initSims();
    initSegCalc();
    initSteppers();
    if (pageId === 'home') {
      fillHome();
    } else {
      initQuizzes(pageId);
      buildProgressBox(pageId);
      buildPager(pageId);
    }
    refreshSidebar();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { normText, normNum, normSeq, checkAnswer, runProgram, highlightLine, parseNum, PAGES };
  }
})(typeof window !== 'undefined' ? window : globalThis);
