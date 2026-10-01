(function () {
'use strict';
const C = window.COURSE;
const $ = (s, e = document) => e.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`(.+?)`/g, '<code>$1</code>');
const plain = s => String(s).replace(/\*\*|`/g, '');
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- state ----------
let ST = { xp: 0, done: {}, quiz: {}, best: 0, theme: '', rate: 1, voice: '', topics: {}, plan: null, planCfg: null };
try { Object.assign(ST, JSON.parse(localStorage.getItem('hsc_state') || '{}')); } catch (e) {}
const save = () => { try { localStorage.setItem('hsc_state', JSON.stringify(ST)); } catch (e) {} };
function addXP(n) { ST.xp += n; save(); updateXP(); }
function updateXP() { $('#xp').textContent = ST.xp; $('#lvl').textContent = 'Lv ' + (Math.floor(ST.xp / 100) + 1); }

function withDeep(l) {   // insert the deep-dive blocks right after the opening chat bubbles
  const d = (C.deep && C.deep[l.id]) || []; if (!d.length) return l.blocks;
  const i = l.blocks.findIndex(b => b.t !== 'say'), k = i < 0 ? l.blocks.length : i;
  return [...l.blocks.slice(0, k), ...d, ...l.blocks.slice(k)];
}
const hash = str => { let h = 5381; for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const qkey = (lid, b) => lid + ':' + hash(b.q);
const LESSONS = [
  ...C.beginner.map((l, i) => ({ ...l, blocks: withDeep(l), track: 'beginner', n: i + 1 })),
  ...C.cert.map((l, i) => ({ ...l, blocks: withDeep(l), track: 'cert', n: i + 1 })),
];
const byId = id => LESSONS.find(l => l.id === id);
const trackName = { beginner: 'Beginner: Start Here', cert: 'Certification Prep' };

// ---------- confetti ----------
function confetti(n = 40, x = innerWidth / 2, y = innerHeight / 3) {
  const colors = ['#ff7a3d', '#ffd84d', '#1fa59a', '#3b6cf6', '#ff5d8f', '#8b5cf6'];
  for (let i = 0; i < n; i++) {
    const c = el('div', 'conf'); c.style.left = x + 'px'; c.style.top = y + 'px';
    c.style.background = colors[i % colors.length];
    c.style.setProperty('--dx', (Math.random() * 600 - 300) + 'px'); c.style.setProperty('--dy', (Math.random() * 400 + 100) + 'px');
    document.body.appendChild(c); setTimeout(() => c.remove(), 1500);
  }
}

// ---------- text to speech ----------
const synth = window.speechSynthesis;
const TTS = { on: false, paused: false, list: [], i: 0, token: 0 };
const bar = $('#listenBar');
function setBtns() {
  $('#lbPlay').disabled = TTS.on && !TTS.paused;
  $('#lbPause').disabled = !TTS.on; $('#lbStop').disabled = !TTS.on;
  $('#lbPause').textContent = TTS.paused ? '▶ Resume' : '⏸ Pause';
}
function clearMark() { document.querySelectorAll('.speaking').forEach(e => e.classList.remove('speaking')); }
function stopSpeak() {
  TTS.token++; TTS.on = false; TTS.paused = false; clearMark();
  if (synth) synth.cancel(); setBtns();
}
function speakNext() {
  clearMark();
  if (!TTS.on || TTS.i >= TTS.list.length) { stopSpeak(); return; }
  const e = TTS.list[TTS.i], tok = ++TTS.token;
  e.classList.add('speaking'); e.scrollIntoView({ behavior: 'smooth', block: 'center' });
  const u = new SpeechSynthesisUtterance(e.dataset.speak);
  u.rate = +ST.rate || 1; u.lang = 'en-US';
  const v = synth.getVoices().find(v => v.name === ST.voice); if (v) u.voice = v;
  u.onend = () => { if (tok === TTS.token && TTS.on) { TTS.i++; speakNext(); } };
  u.onerror = () => { if (tok === TTS.token) stopSpeak(); };
  synth.speak(u); setBtns();
}
function playList(list, start = 0) {
  if (!synth) { alert('Your browser does not support read-aloud. Try Chrome, Edge or Safari.'); return; }
  stopSpeak(); TTS.list = list; TTS.i = start; TTS.on = true; speakNext();
}
function initListenBar() {
  if (!synth) { return; }
  const fill = () => {
    const sel = $('#lbVoice'); const vs = synth.getVoices().filter(v => /^en/i.test(v.lang));
    sel.innerHTML = (vs.length ? vs : synth.getVoices()).map(v => `<option ${v.name === ST.voice ? 'selected' : ''}>${esc(v.name)}</option>`).join('');
  };
  fill(); synth.onvoiceschanged = fill;
  $('#lbRate').value = String(ST.rate);
  $('#lbRate').onchange = e => { ST.rate = +e.target.value; save(); };
  $('#lbVoice').onchange = e => { ST.voice = e.target.value; save(); };
  $('#lbPlay').onclick = () => playList([...document.querySelectorAll('#lesson [data-speak]')], 0);
  $('#lbPause').onclick = () => { if (TTS.paused) { synth.resume(); TTS.paused = false; } else { synth.pause(); TTS.paused = true; } setBtns(); };
  $('#lbStop').onclick = stopSpeak;
}
function spkBtn(target) {
  const b = el('button', 'spk', '🔊'); b.title = 'Read this aloud'; b.setAttribute('aria-label', 'Read aloud');
  b.onclick = ev => { ev.preventDefault(); ev.stopPropagation(); playList([target], 0); };
  return b;
}
function speakable(node, text) { node.dataset.speak = plain(text); return node; }

// ---------- illustrations (inline SVG) ----------
const SVG = {
  layers: () => `<svg viewBox="0 0 520 300" role="img" aria-label="AI contains machine learning which contains generative AI">
    <circle cx="190" cy="150" r="130" fill="#ffe0c9" stroke="#2b2a33" stroke-width="3"/>
    <circle cx="190" cy="185" r="88" fill="#bff0ea" stroke="#2b2a33" stroke-width="3"/>
    <circle class="pulse" cx="190" cy="210" r="46" fill="#ffd84d" stroke="#2b2a33" stroke-width="3"/>
    <text x="190" y="62" text-anchor="middle" font-family="Patrick Hand" font-size="22" fill="#2b2a33">AI</text>
    <text x="190" y="130" text-anchor="middle" font-family="Patrick Hand" font-size="19" fill="#2b2a33">Machine Learning</text>
    <text x="190" y="205" text-anchor="middle" font-family="Patrick Hand" font-size="15" fill="#2b2a33">Generative</text>
    <text x="190" y="223" text-anchor="middle" font-family="Patrick Hand" font-size="15" fill="#2b2a33">AI (Claude!)</text>
    <g font-family="Nunito" font-size="15" fill="#2b2a33"><text x="350" y="80">AI: any smart-acting software</text><text x="350" y="150">ML: learns from examples</text><text x="350" y="220">GenAI: creates new text,</text><text x="350" y="240">images, code</text></g>
    <path class="flowline" d="M335 76 L290 76 M335 146 L270 146 M335 216 L240 216" stroke="#ff7a3d" stroke-width="3" fill="none"/></svg>`,
  network: () => `<svg viewBox="0 0 520 260" role="img" aria-label="A simple neural network">
    ${[0, 1, 2].map(i => [0, 1, 2, 3].map(j => `<line class="flowline" x1="90" y1="${50 + i * 80}" x2="260" y2="${35 + j * 62}" stroke="#3b6cf6" stroke-width="1.5" opacity=".5"/>`).join('')).join('')}
    ${[0, 1, 2, 3].map(j => [0, 1].map(k => `<line class="flowline" x1="260" y1="${35 + j * 62}" x2="430" y2="${90 + k * 80}" stroke="#ff5d8f" stroke-width="1.5" opacity=".5"/>`).join('')).join('')}
    ${[0, 1, 2].map(i => `<circle cx="90" cy="${50 + i * 80}" r="18" fill="#bff0ea" stroke="#2b2a33" stroke-width="3"/>`).join('')}
    ${[0, 1, 2, 3].map(j => `<circle class="pulse" style="animation-delay:${j * .3}s" cx="260" cy="${35 + j * 62}" r="18" fill="#ffd84d" stroke="#2b2a33" stroke-width="3"/>`).join('')}
    ${[0, 1].map(k => `<circle cx="430" cy="${90 + k * 80}" r="18" fill="#ffb3c9" stroke="#2b2a33" stroke-width="3"/>`).join('')}
    <g font-family="Patrick Hand" font-size="18" fill="#2b2a33" text-anchor="middle"><text x="90" y="250">Input (your words)</text><text x="260" y="250">Many tiny "dials"</text><text x="430" y="250">Output (next word)</text></g></svg>`,
  family: () => `<svg viewBox="0 0 520 260" role="img" aria-label="Three model sizes: small fast, balanced, most capable">
    ${[['Small & fast', 70, '#bff0ea', '⚡ cheap, quick'], ['Balanced', 120, '#ffd84d', '⚖️ everyday work'], ['Most capable', 180, '#ffb3c9', '🧠 hardest problems']].map((m, i) =>
      `<rect x="${40 + i * 160}" y="${210 - m[1]}" width="130" height="${m[1]}" rx="12" fill="${m[2]}" stroke="#2b2a33" stroke-width="3"><animate attributeName="height" from="0" to="${m[1]}" dur="1s" fill="freeze"/><animate attributeName="y" from="210" to="${210 - m[1]}" dur="1s" fill="freeze"/></rect>
       <text x="${105 + i * 160}" y="${200 - m[1] / 2}" text-anchor="middle" font-family="Patrick Hand" font-size="20" fill="#2b2a33">${m[0]}</text>
       <text x="${105 + i * 160}" y="235" text-anchor="middle" font-family="Nunito" font-size="14" fill="#2b2a33">${m[3]}</text>`).join('')}</svg>`,
  stateless: () => `<svg viewBox="0 0 520 220" role="img" aria-label="Each call must contain the whole conversation">
    <g font-family="Nunito" font-size="15" fill="#2b2a33">
    <rect x="20" y="20" width="200" height="50" rx="12" fill="#ece6ff" stroke="#2b2a33" stroke-width="3"/><text x="32" y="50">Call 1: "Hi, I'm Asha"</text>
    <rect x="20" y="90" width="200" height="110" rx="12" fill="#ece6ff" stroke="#2b2a33" stroke-width="3"/><text x="32" y="115">Call 2 sends ALL:</text><text x="32" y="140">"Hi, I'm Asha"</text><text x="32" y="160">"Nice to meet you"</text><text x="32" y="180">"What's my name?"</text>
    <rect x="300" y="80" width="190" height="60" rx="30" fill="#bff0ea" stroke="#2b2a33" stroke-width="3"/><text x="325" y="116">🤖 Claude: "Asha!"</text></g>
    <path class="flowline" d="M225 140 L295 112" stroke="#ff7a3d" stroke-width="4" fill="none"/>
    <text x="260" y="205" text-anchor="middle" font-family="Patrick Hand" font-size="18" fill="#6b6878">No memory between calls. YOU send the history.</text></svg>`,
  shield: () => `<svg viewBox="0 0 520 220" role="img" aria-label="Layers of defence">
    ${[0, 1, 2, 3].map(i => `<rect x="${30 + i * 28}" y="${20 + i * 22}" width="${460 - i * 56}" height="${180 - i * 44}" rx="18" fill="${['#ffe0c9', '#fff3c4', '#bff0ea', '#e4e6ff'][i]}" stroke="#2b2a33" stroke-width="3"/>`).join('')}
    <g font-family="Patrick Hand" font-size="17" fill="#2b2a33"><text x="42" y="42">Layer 1: system prompt rules</text><text x="72" y="64">Layer 2: input and output checks</text><text x="102" y="86">Layer 3: limited tool permissions</text></g>
    <text x="260" y="140" text-anchor="middle" font-size="40" class="pulse">🛡️</text><text x="260" y="165" text-anchor="middle" font-family="Patrick Hand" font-size="17" fill="#2b2a33">Human approval for risky actions</text></svg>`,
  rag: () => `<svg viewBox="0 0 520 200" role="img" aria-label="RAG pipeline">
    ${['📄 Docs', '✂️ Chunks', '🔢 Index', '🔍 Retrieve', '🤖 Claude'].map((t, i) => `<g><rect x="${10 + i * 102}" y="60" width="90" height="70" rx="12" fill="${['#ffe0c9', '#fff3c4', '#bff0ea', '#e4e6ff', '#ffb3c9'][i]}" stroke="#2b2a33" stroke-width="3"/><text x="${55 + i * 102}" y="102" text-anchor="middle" font-family="Patrick Hand" font-size="17" fill="#2b2a33">${t}</text></g>`).join('')}
    <path class="flowline" d="M100 95 H112 M202 95 H214 M304 95 H316 M406 95 H418" stroke="#ff7a3d" stroke-width="4"/>
    <text x="260" y="170" text-anchor="middle" font-family="Patrick Hand" font-size="18" fill="#6b6878">Find the right pages first, then answer using them.</text></svg>`,
};

// ---------- block renderers ----------
const WHO = { clo: ['🤖', 'Clo'], owl: ['🦉', 'Prof. Owl'], you: ['🧑‍🎓', 'You'] };
const R = {};

R.say = b => {
  const [emo, name] = WHO[b.who] || WHO.clo;
  const d = el('div', 'say who-' + b.who);
  d.append(el('div', 'av', `${emo}<small>${name}</small>`));
  const bub = el('div', 'bubble', fmt(b.text)); bub.append(spkBtn(d)); d.append(bub);
  return speakable(d, name + ' says: ' + b.text);
};
R.h = b => el('h2', '', esc(b.text));
R.p = b => { const d = el('div', 'p'); d.append(el('div', '', fmt(b.text)), spkBtn(d)); return speakable(d, b.text); };
R.brain = b => { const d = el('div', 'box brain', `<span class="tag">🧠 BRAIN POWER</span><p>${fmt(b.text)}</p>`); d.append(spkBtn(d)); d.lastChild.style.cssText = 'position:absolute;right:-8px;top:-14px'; return speakable(d, 'Brain power. ' + b.text); };
R.faq = b => {
  const d = el('details', 'box qa'); d.append(el('summary', '', '<b>There are no Dumb Questions:</b> ' + fmt(b.q)), el('div', '', fmt(b.a)));
  return speakable(d, 'There are no dumb questions. ' + b.q + ' ' + b.a);
};
R.pts = b => { const d = el('div', 'box pts', `<span class="tag">✏️ ${esc(b.title || 'BULLET POINTS')}</span><ul>${b.items.map(i => `<li>${fmt(i)}</li>`).join('')}</ul>`); return speakable(d, (b.title || 'Bullet points') + '. ' + b.items.join('. ')); };
R.code = b => {
  const d = el('div', '', ''); d.style.position = 'relative';
  const pre = el('pre'); pre.textContent = b.text; const c = el('button', 'copy', 'Copy');
  c.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(b.text); c.textContent = 'Copied!'; setTimeout(() => c.textContent = 'Copy', 1200); };
  d.append(pre, c); return d;
};
R.img = b => { const f = el('figure', '', (SVG[b.name] || (() => ''))() + `<figcaption>${esc(b.cap || '')}</figcaption>`); return speakable(f, 'Picture. ' + (b.cap || '')); };

R.ex = b => {
  const d = el('div', 'box');
  d.innerHTML = `<span class="tag">🔍 EXAMPLE</span><h3>${esc(b.title)}</h3>
    <div class="ba"><div class="a"><h4>${b.la || '😬 Weak'}</h4>${esc(b.a)}</div><div class="b" hidden><h4>${b.lb || '😎 Better'}</h4>${esc(b.b)}</div></div>
    <div class="row"><button class="btn small">Show the better version ✨</button></div><div class="why" hidden>💡 ${fmt(b.why)}</div>`;
  const btn = $('button', d), bb = $('.b', d), why = $('.why', d);
  btn.onclick = () => { bb.hidden = false; why.hidden = false; btn.disabled = true; };
  return speakable(d, 'Example. ' + b.title + '. Weak version: ' + b.a + '. Better version: ' + b.b + '. Why: ' + b.why);
};

R.scn = b => {
  const d = el('div', 'box scn', `<span class="tag">🎬 SCENARIO</span><h3>${esc(b.title)}</h3><p>${fmt(b.sit)}</p><p><i>What would you do? Think first, then reveal.</i></p>
    <div class="row"><button class="btn small">👀 Reveal the answer</button></div><div class="why" hidden>${fmt(b.ans)}</div>`);
  const bt = $('button', d), why = $('.why', d); bt.onclick = () => { why.hidden = false; bt.disabled = true; };
  return speakable(d, 'Scenario. ' + b.title + '. ' + b.sit + ' Answer: ' + b.ans);
};
R.table = b => {
  const d = el('div', 'box tbl', `<span class="tag">📋 COMPARE</span><h3>${esc(b.title)}</h3><div class="tw"><table><thead><tr>${b.head.map(h => `<th>${fmt(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map(r => `<tr>${r.map(c => `<td>${fmt(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
  return speakable(d, 'Comparison table. ' + b.title + '. ' + b.rows.map(r => r.join(', ')).join('. '));
};
R.quiz = (b, ctx) => {
  const d = el('div', 'box quiz'); const key = qkey(ctx.lid, b);
  d.innerHTML = `<span class="tag">🏆 QUIZ</span><p><b>${fmt(b.q)}</b></p><div class="opts"></div><div class="fb" hidden></div>`;
  const opts = $('.opts', d), fb = $('.fb', d);
  const draw = () => {
    opts.innerHTML = ''; fb.hidden = true;
    const order = shuffle(b.opts.map((o, i) => i));   // shuffled so the right answer is not always the same letter
    order.forEach((orig, i) => {
      const bt = el('button', 'opt', `${'ABCD'[i]}. ${fmt(b.opts[orig])}`);
      bt.onclick = () => {
        const ok = orig === b.ans;
        [...opts.children].forEach((x, k) => { x.disabled = true; if (order[k] === b.ans) x.classList.add('ok'); });
        if (!ok) bt.classList.add('bad');
        fb.hidden = false; fb.className = 'fb ' + (ok ? 'ok' : 'bad');
        fb.innerHTML = (ok ? '🎉 Correct! ' : '🤔 Not quite. ') + fmt(b.why) + (ok ? '' : ' <button class="btn small ghost">Try again</button>');
        if (!ok) $('button', fb).onclick = draw;
        if (ST.quiz[key] === undefined) { ST.quiz[key] = ok ? 1 : 0; if (ok) { addXP(10); const r = bt.getBoundingClientRect(); confetti(30, r.left + 40, r.top); } save(); }
        else if (ok) { const r = bt.getBoundingClientRect(); confetti(18, r.left + 40, r.top); }
        updateProgressBar();
      };
      opts.append(bt);
    });
  };
  draw();
  return speakable(d, 'Quiz. ' + b.q + ' ' + 'The choices are: ' + b.opts.join('. Or. '));
};

R.pen = (b, ctx) => {
  const d = el('div', 'box pen'); const key = qkey(ctx.lid, b);
  d.innerHTML = `<span class="tag">✏️ SHARPEN YOUR PENCIL</span><p><b>${fmt(b.q)}</b></p>
    <div class="row"><input class="txt" placeholder="Type your answer..." aria-label="Your answer"><button class="btn small">Check</button><button class="btn small ghost">Show answer</button></div><div class="fb" hidden></div>`;
  const inp = $('input', d), [chk, show] = d.querySelectorAll('button'), fb = $('.fb', d);
  const check = () => {
    const v = inp.value.trim().toLowerCase(); if (!v) return;
    const ok = b.answers.some(a => v.includes(a.toLowerCase()));
    fb.hidden = false; fb.className = 'fb ' + (ok ? 'ok' : 'bad');
    fb.innerHTML = ok ? '✅ Yes! ' + fmt(b.why) : '🤔 Not yet. Give it another go, or press "Show answer".';
    if (ok && ST.quiz[key] === undefined) { ST.quiz[key] = 1; addXP(10); confetti(25); save(); updateProgressBar(); }
  };
  chk.onclick = check; inp.onkeydown = e => { if (e.key === 'Enter') check(); };
  show.onclick = () => { fb.hidden = false; fb.className = 'fb ok'; fb.innerHTML = '📖 Answer: <b>' + fmt(b.show) + '</b>. ' + fmt(b.why); };
  return speakable(d, 'Sharpen your pencil. ' + b.q);
};

R.match = (b, ctx) => {
  const d = el('div', 'box match', `<span class="tag">🔗 MATCH IT UP</span><h3>${esc(b.title)}</h3><p class="score"></p><div class="cols"><div class="L"></div><div class="Rr"></div></div>`);
  const L = $('.L', d), Rr = $('.Rr', d), sc = $('.score', d); let sel = null, done = 0;
  b.pairs.forEach((p, i) => { const c = el('button', 'chip', fmt(p[0])); c.dataset.i = i; L.append(c); });
  shuffle(b.pairs.map((p, i) => [p[1], i])).forEach(([t, i]) => { const c = el('button', 'chip', fmt(t)); c.dataset.i = i; Rr.append(c); });
  const upd = () => { sc.textContent = `Matched ${done} of ${b.pairs.length}`; };
  upd();
  d.addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c || c.disabled) return;
    if (c.parentNode === L) { L.querySelectorAll('.chip').forEach(x => x.classList.remove('sel')); sel = c; c.classList.add('sel'); return; }
    if (!sel) { sc.textContent = 'Pick something on the left first 👈'; return; }
    if (sel.dataset.i === c.dataset.i) {
      sel.classList.remove('sel'); sel.classList.add('ok'); c.classList.add('ok'); sel.disabled = c.disabled = true; sel = null; done++; upd();
      if (done === b.pairs.length) { sc.textContent = '🎉 All matched!'; confetti(40); addXP(10); }
    } else { c.classList.add('bad'); setTimeout(() => c.classList.remove('bad'), 450); }
  });
  return speakable(d, 'Match it up. ' + b.title + '. ' + b.pairs.map(p => p[0] + ' goes with ' + p[1]).join('. '));
};

R.order = b => {
  const d = el('div', 'box order', `<span class="tag">🔢 PUT IT IN ORDER</span><h3>${esc(b.title)}</h3><p class="score">Click the steps in the correct order.</p><div class="items"></div><div class="row"><button class="btn small ghost">Reset</button></div>`);
  const items = $('.items', d), sc = $('.score', d); let next = 0;
  const draw = () => {
    next = 0; items.innerHTML = ''; sc.textContent = 'Click the steps in the correct order.';
    shuffle(b.items.map((t, i) => [t, i])).forEach(([t, i]) => { const c = el('button', 'chip', fmt(t)); c.dataset.i = i; items.append(c); });
  };
  draw();
  items.onclick = e => {
    const c = e.target.closest('.chip'); if (!c || c.disabled) return;
    if (+c.dataset.i === next) {
      c.classList.add('ok'); c.disabled = true; c.prepend(el('span', 'n', next + 1)); next++;
      if (next === b.items.length) { sc.textContent = '🎉 Perfect order!'; confetti(40); addXP(10); }
    } else { c.classList.add('bad'); sc.textContent = '🙈 Not that one yet. Think about what must happen first.'; setTimeout(() => c.classList.remove('bad'), 450); }
  };
  $('button.ghost', d).onclick = draw;
  return speakable(d, 'Put it in order. ' + b.title + '. The correct order is: ' + b.items.join(', then '));
};

R.flash = b => {
  const d = el('div', 'box', `<span class="tag">🃏 FLASHCARDS</span><h3>${esc(b.title)}</h3><p>Click a card to flip it.</p><div class="flash"></div>`);
  b.cards.forEach(c => {
    const k = el('button', 'fcard', `<div class="in"><div class="f">${fmt(c[0])}</div><div class="b">${fmt(c[1])}</div></div>`);
    k.onclick = () => k.classList.toggle('flip'); $('.flash', d).append(k);
  });
  return speakable(d, 'Flashcards. ' + b.title + '. ' + b.cards.map(c => c[0] + ': ' + c[1]).join('. '));
};

R.flow = b => {
  const d = el('div', 'box flow', `<span class="tag">🎬 WATCH IT WORK</span><h3>${esc(b.title)}</h3><div class="flowrow"></div><div class="cap">Press play, or click any step.</div><div class="row"><button class="btn small">▶ Play animation</button></div>`);
  const row = $('.flowrow', d), cap = $('.cap', d), steps = [];
  b.steps.forEach((s, i) => { const st = el('div', 'step', `<span class="ic">${s[0]}</span><b>${esc(s[1])}</b>`); st.onclick = () => show(i); row.append(st); steps.push(st); });
  let timer = null;
  function show(i) { steps.forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('seen', k < i); }); cap.innerHTML = `<b>${i + 1}. ${esc(b.steps[i][1])}:</b> ${fmt(b.steps[i][2])}`; }
  $('button', d).onclick = e => {
    clearInterval(timer); let i = 0; show(0); e.target.textContent = '↻ Replay';
    timer = setInterval(() => { i++; if (i >= steps.length) { clearInterval(timer); return; } show(i); }, 1900);
  };
  return speakable(d, 'Watch it work. ' + b.title + '. ' + b.steps.map((s, i) => 'Step ' + (i + 1) + ', ' + s[1] + '. ' + s[2]).join(' '));
};

R.sort = (b, ctx) => {
  const d = el('div', 'box sort', `<span class="tag">🗂️ SORT IT</span><h3>${esc(b.title)}</h3><p class="score"></p><div class="sortcard"></div><div class="row cats"></div>`);
  const card = $('.sortcard', d), cats = $('.cats', d), sc = $('.score', d);
  let items = shuffle(b.items), i = 0, right = 0;
  const draw = () => {
    if (i >= items.length) { card.innerHTML = `🎯 You got ${right} of ${items.length}!`; cats.innerHTML = ''; const r = el('button', 'btn small ghost', '↻ Play again'); r.onclick = () => { items = shuffle(b.items); i = 0; right = 0; draw(); }; cats.append(r); if (right === items.length) { confetti(40); addXP(10); } return; }
    sc.textContent = `Card ${i + 1} of ${items.length}`; card.style.animation = 'none'; void card.offsetWidth; card.style.animation = ''; card.innerHTML = fmt(items[i][0]);
    cats.innerHTML = ''; b.cats.forEach((c, k) => {
      const bt = el('button', 'btn small' + (k % 2 ? ' alt' : ''), esc(c));
      bt.onclick = () => { const ok = k === items[i][1]; if (ok) right++; card.innerHTML = (ok ? '✅ ' : '❌ Actually: <b>' + esc(b.cats[items[i][1]]) + '</b>. ') + fmt(items[i][0]); cats.innerHTML = ''; const n = el('button', 'btn small', 'Next ➜'); n.onclick = () => { i++; draw(); }; cats.append(n); };
      cats.append(bt);
    });
  };
  draw();
  return speakable(d, 'Sort it. ' + b.title + '. Categories: ' + b.cats.join(' or ') + '. Examples: ' + b.items.map(x => x[0] + ' is ' + b.cats[x[1]]).join('. '));
};

// ---- toys ----
const TOK_COLORS = ['#ffe0c9', '#bff0ea', '#fff3c4', '#e4e6ff', '#ffd1e0', '#d7f5c8'];
function roughTokens(text) {
  const out = []; (text.match(/\s?[A-Za-z]+|\s?\d+|\s?[^\sA-Za-z\d]|\s+/g) || []).forEach(w => {
    const core = w.trimStart(); if (/^[A-Za-z]+$/.test(core) && core.length > 7) { const lead = w.length - core.length; out.push(w.slice(0, lead) + core.slice(0, 5)); for (let k = 5; k < core.length; k += 4) out.push(core.slice(k, k + 4)); } else out.push(w);
  }); return out;
}
R.toy = b => {
  const d = el('div', 'box toy');
  if (b.name === 'tokenizer') {
    d.innerHTML = `<span class="tag">🧪 TRY IT: TOKEN SPLITTER</span><p>Type anything. Watch it split into colourful tokens. (This is a <i>rough</i> imitation. Real tokenizers differ.)</p>
      <textarea class="txt" aria-label="Text to split">Unbelievably, Claude reads tokens, not letters!</textarea><p class="score"></p><div class="out"></div>`;
    const ta = $('textarea', d), out = $('.out', d), sc = $('.score', d);
    const run = () => { const t = roughTokens(ta.value); out.innerHTML = t.map((x, i) => `<span class="tok" style="background:${TOK_COLORS[i % 6]};animation-delay:${i * 25}ms">${esc(x.replace(/ /g, '·')) || '·'}</span>`).join(''); sc.innerHTML = `<b>${t.length}</b> tokens · <b>${ta.value.length}</b> characters · <b>${(ta.value.trim().split(/\s+/).filter(Boolean).length)}</b> words`; };
    ta.oninput = run; run();
    return speakable(d, 'Try it. The token splitter. Type any sentence and watch it break into tokens.');
  }
  if (b.name === 'temp') {
    const words = [['blue', 3], ['clear', 2], ['cloudy', 1.4], ['falling', 0.2], ['purple', -0.8], ['delicious', -2.5]];
    d.innerHTML = `<span class="tag">🧪 TRY IT: TEMPERATURE DIAL</span><p>Claude finishes: <b>"The sky is ____"</b>. Slide the dial and see how likely each word is.</p>
      <div class="row"><label>Temperature: <b class="tv">0.7</b></label><input type="range" min="0" max="1.5" step="0.05" value="0.7"></div><div class="bars"></div>
      <div class="row"><button class="btn small">🎲 Pick a word 5 times</button></div><div class="picks sortcard" style="min-height:40px;font-size:1rem"></div>`;
    const rng = $('input', d), bars = $('.bars', d), tv = $('.tv', d), picks = $('.picks', d);
    const probs = () => { const T = Math.max(+rng.value, 0.05); const e = words.map(w => Math.exp(w[1] / T)); const s = e.reduce((a, c) => a + c, 0); return e.map(x => x / s); };
    const draw = () => { tv.textContent = (+rng.value).toFixed(2); const p = probs(); bars.innerHTML = words.map((w, i) => `<div class="pbar"><span class="l">${w[0]}</span><span class="t"><i style="width:${(p[i] * 100).toFixed(1)}%"></i></span><span class="v">${(p[i] * 100).toFixed(0)}%</span></div>`).join(''); };
    rng.oninput = draw; draw();
    $('button', d).onclick = () => { const p = probs(); picks.innerHTML = Array.from({ length: 5 }, () => { let r = Math.random(), k = 0; while (k < p.length - 1 && r > p[k]) { r -= p[k]; k++; } return `"${words[k][0]}"`; }).join(' · '); };
    return speakable(d, 'Try it. The temperature dial. Low temperature makes Claude pick the most likely word almost every time. High temperature gives more surprising choices.');
  }
  if (b.name === 'ctx') {
    const CAP = 10; const msgs = []; const colors = ['#ffe0c9', '#bff0ea', '#fff3c4', '#e4e6ff', '#ffd1e0'];
    d.innerHTML = `<span class="tag">🧪 TRY IT: CONTEXT WINDOW</span><p>This tiny window holds <b>${CAP} units</b>. Add chat messages. When it overflows, the oldest ones fall out and Claude can no longer see them.</p>
      <div class="row"><button class="btn small" data-s="2">Short message (2)</button><button class="btn small alt" data-s="4">Medium message (4)</button><button class="btn small ghost" data-s="7">Pasted document (7)</button><button class="btn small ghost" data-r="1">Reset</button></div>
      <p class="score"></p><div class="win"></div>`;
    const win = $('.win', d), sc = $('.score', d); let n = 0;
    const draw = () => {
      let total = 0; const vis = new Set(); for (let i = msgs.length - 1; i >= 0; i--) { if (total + msgs[i].s <= CAP) { total += msgs[i].s; vis.add(i); } else break; }
      win.innerHTML = msgs.map((m, i) => `<span class="m ${vis.has(i) ? '' : 'gone'}" style="background:${colors[m.n % 5]}">#${m.n} (${m.s})</span>`).join('') || '<i>Empty. Add a message!</i>';
      const gone = msgs.length - vis.size; sc.innerHTML = `Used <b>${total}</b> of ${CAP}. ` + (gone ? `😱 <b>${gone}</b> old message(s) forgotten!` : 'Everything still fits.');
    };
    d.addEventListener('click', e => { const bt = e.target.closest('button'); if (!bt) return; if (bt.dataset.r) { msgs.length = 0; n = 0; } else if (bt.dataset.s) { msgs.push({ n: ++n, s: +bt.dataset.s }); } draw(); });
    draw();
    return speakable(d, 'Try it. The context window game. Add messages and watch the oldest ones get forgotten when the window is full.');
  }
  return d;
};

// ---------- progress ----------
function lessonStats(l) {
  const qs = l.blocks.filter(b => b.t === 'quiz' || b.t === 'pen');
  const got = qs.filter(b => ST.quiz[qkey(l.id, b)] !== undefined).length;
  return { total: qs.length, got };
}
function updateProgressBar() { const pb = $('#lessonProg'); if (!pb) return; const l = byId(pb.dataset.id); const s = lessonStats(l); pb.firstChild.style.width = (s.total ? s.got / s.total * 100 : 0) + '%'; $('#lessonProgTxt').textContent = `${s.got}/${s.total} questions answered`; }
function trackProgress(t) { const ls = LESSONS.filter(l => l.track === t); return { done: ls.filter(l => ST.done[l.id]).length, total: ls.length }; }

// ---------- views ----------
const app = $('#app');
function mount(node) { app.innerHTML = ''; app.append(node); window.scrollTo(0, 0); app.focus({ preventScroll: true }); observe(); }
let io;
function observe() {
  if (io) io.disconnect();
  io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: .08 });
  document.querySelectorAll('.reveal').forEach(n => io.observe(n));
}
function nav(name) { document.querySelectorAll('.top nav a').forEach(a => a.classList.toggle('on', a.dataset.nav === name)); }

const MASCOT = `<svg class="mascot" viewBox="0 0 260 280" role="img" aria-label="Clo the friendly robot waving">
  <ellipse cx="130" cy="262" rx="70" ry="10" fill="rgba(0,0,0,.15)"/>
  <line x1="130" y1="20" x2="130" y2="48" stroke="#2b2a33" stroke-width="5"/><circle cx="130" cy="16" r="9" fill="#ff5d8f" stroke="#2b2a33" stroke-width="4" class="pulse"/>
  <rect x="55" y="45" width="150" height="120" rx="34" fill="#bff0ea" stroke="#2b2a33" stroke-width="5"/>
  <g class="eye"><circle cx="102" cy="100" r="16" fill="#fff" stroke="#2b2a33" stroke-width="4"/><circle cx="106" cy="102" r="7" fill="#2b2a33"/></g>
  <g class="eye"><circle cx="158" cy="100" r="16" fill="#fff" stroke="#2b2a33" stroke-width="4"/><circle cx="162" cy="102" r="7" fill="#2b2a33"/></g>
  <path d="M105 135 Q130 155 155 135" stroke="#2b2a33" stroke-width="5" fill="none" stroke-linecap="round"/>
  <rect x="75" y="170" width="110" height="80" rx="22" fill="#ffd84d" stroke="#2b2a33" stroke-width="5"/>
  <text x="130" y="220" text-anchor="middle" font-family="Patrick Hand" font-size="28" fill="#2b2a33">Hi!</text>
  <g class="arm"><rect x="185" y="180" width="50" height="16" rx="8" fill="#ffd84d" stroke="#2b2a33" stroke-width="4"/></g>
  <rect x="25" y="180" width="50" height="16" rx="8" fill="#ffd84d" stroke="#2b2a33" stroke-width="4"/></svg>`;

function viewHome() {
  nav('home'); const b = trackProgress('beginner'), c = trackProgress('cert');
  const d = el('div', '', `
  <section class="hero"><div><h1>Learn Claude <span>from zero to certified</span></h1>
    <p>Never touched AI before? Perfect. This book-style site uses stories, pictures, little games and <b>lots of quizzes</b>. Every paragraph has a 🔊 button, so you can <b>listen</b> as well as read.</p>
    <div class="cta-row"><a class="btn" href="#/track/beginner">🌱 Start as a beginner</a><a class="btn alt" href="#/track/cert">🎓 Certification prep</a><a class="btn ghost" href="#/certs">🏅 Exam plans</a><a class="btn ghost" href="#/exam">📝 Practice exam</a></div></div>
    <div class="hero-art">${MASCOT}</div></section>
  <section class="grid2">
    <div class="card"><h3>🌱 Beginner: Start Here</h3><p>${C.beginner.length} friendly lessons. What AI is, how Claude works, how to talk to it, and how to stay safe.</p><div class="bar"><i style="width:${b.done / b.total * 100}%"></i></div><small>${b.done}/${b.total} lessons done</small><p><a class="btn small" href="#/track/beginner">Open</a></p></div>
    <div class="card"><h3>🎓 Certification Prep</h3><p>${C.cert.length} modules on architecture: tools, agents, RAG, MCP, evals, Claude Code, plus a timed practice exam.</p><div class="bar"><i style="width:${c.done / c.total * 100}%"></i></div><small>${c.done}/${c.total} modules done</small><p><a class="btn small alt" href="#/track/cert">Open</a></p></div>
  </section>
  <h2 style="margin-top:34px">How this book works</h2>
  <div class="how"><div><span>🔊</span><b>Listen</b>Press 🔊 on any block, or "Play lesson" at the bottom.</div><div><span>🧠</span><b>Brain Power</b>Stop and think before the answer.</div><div><span>🎬</span><b>Watch it work</b>Animated diagrams you can replay.</div><div><span>🧪</span><b>Try it</b>Toys that show how AI really behaves.</div><div><span>🏆</span><b>Quizzes</b>Earn XP and confetti for correct answers.</div><div><span>❓</span><b>No dumb questions</b>Answers to what everyone secretly wonders.</div></div>`);
  mount(d);
}

function viewTrack(t) {
  nav(t); const ls = LESSONS.filter(l => l.track === t);
  const d = el('div', '', `<h1>${t === 'beginner' ? '🌱' : '🎓'} ${trackName[t]}</h1><p>${t === 'beginner' ? 'No experience needed. Go in order, it builds step by step.' : 'Architecture topics for the certification. Do the lessons, then try the practice exam.'}</p>`);
  if (t === 'cert') d.append(el('div', 'note-box', '📌 Heads-up: these modules are built from general knowledge of Claude architecture. Compare them with your official course outline and exam guide, and check the docs for current model names and features.'));
  const list = el('div', 'lesson-list');
  ls.forEach(l => {
    const s = lessonStats(l);
    const a = el('a', 'lesson-item reveal' + (ST.done[l.id] ? ' done' : ''), `<div class="num">${l.n}</div><div class="emo">${l.emoji}</div><div><b>${esc(l.title)}</b><small>${esc(l.sub || '')} · ${s.got}/${s.total} questions</small></div><div class="tick">${ST.done[l.id] ? '✅' : '➜'}</div>`);
    a.href = '#/lesson/' + l.id; list.append(a);
  });
  d.append(list);
  if (t === 'cert') d.append(el('p', '', '<br><a class="btn" href="#/exam">📝 Take the practice exam</a>'));
  mount(d);
}

function viewLesson(id) {
  const l = byId(id); if (!l) return viewHome();
  nav(l.track);
  const root = el('div', ''); root.id = 'lesson';
  root.append(el('div', 'lesson-head', `<div class="crumbs"><a href="#/track/${l.track}">${trackName[l.track]}</a> › Lesson ${l.n}</div><div class="big">${l.emoji}</div><h1>${esc(l.title)}</h1><div class="crumbs">${esc(l.sub || '')}</div>
    <div class="bar" id="lessonProg" data-id="${l.id}"><i></i></div><small id="lessonProgTxt"></small>`));
  l.blocks.forEach((b, idx) => {
    const fn = R[b.t]; if (!fn) return;
    const n = fn(b, { lid: l.id, idx }); const w = el('div', 'blk reveal'); w.append(n);
    if (n.dataset && n.dataset.speak && !n.querySelector('.spk')) { const s = spkBtn(n); s.classList.add('abs'); w.append(s); }
    root.append(w);
  });
  const i = LESSONS.findIndex(x => x.id === id); const prev = LESSONS[i - 1], next = LESSONS[i + 1];
  const foot = el('div', 'box', `<div class="row" style="justify-content:space-between">
      ${prev && prev.track === l.track ? `<a class="btn ghost small" href="#/lesson/${prev.id}">⬅ ${esc(prev.title)}</a>` : '<span></span>'}
      <button class="btn alt" id="doneBtn">${ST.done[id] ? '✅ Completed' : '✔ Mark lesson complete (+25 XP)'}</button>
      ${next && next.track === l.track ? `<a class="btn small" href="#/lesson/${next.id}">${esc(next.title)} ➡</a>` : `<a class="btn small" href="#/${l.track === 'cert' ? 'exam' : 'track/cert'}">${l.track === 'cert' ? 'Practice exam ➡' : 'Go to certification ➡'}</a>`}</div>`);
  root.append(foot); mount(root); updateProgressBar();
  $('#doneBtn').onclick = e => { if (!ST.done[id]) { ST.done[id] = true; addXP(25); save(); confetti(80); e.target.textContent = '✅ Completed'; } };
  bar.hidden = !synth; setBtns();
}

// ---------- exam ----------
function allQuestions(domId) {
  const cert = C.certs[0], seen = new Set(), qs = [];
  const push = (b, from, ds) => { if (seen.has(b.q)) return; seen.add(b.q); qs.push({ q: b.q, opts: b.opts, ans: b.ans, why: b.why, from, ds }); };
  const lessonDomains = id => cert.domains.filter(d => d.lessons.includes(id)).map(d => d.id);
  const lessons = domId ? cert.domains.find(d => d.id === domId).lessons.map(byId) : C.cert.map(l => byId(l.id));
  lessons.forEach(l => l.blocks.forEach(b => { if (b.t === 'quiz') push(b, l.title, lessonDomains(l.id)); }));
  C.exam.forEach(b => { if (!domId || b.d === domId) push(b, 'Scenario', [b.d]); });
  return qs;
}
function viewExam(dom) {
  nav('exam'); const cert = C.certs[0];
  const dm = dom && dom !== 'mock' ? cert.domains.find(d => d.id === dom) : null;
  const pool = allQuestions(dm ? dm.id : null);
  const d = el('div', 'exam-card', `<h1>📝 ${dm ? 'Domain practice: ' + esc(dm.name) : 'Practice Exam'}</h1>
    <p>${dm ? `Questions from Domain ${dm.n} (${dm.weight}% of the exam).` : 'Mixed questions from all certification modules plus scenario questions.'} Your best full-pool score: <b>${ST.best}%</b>. Pool: ${pool.length} questions.</p>
    <div class="row">${dm ? '' : '<button class="btn" data-mock="1">⏱️ Mock exam (60 Q, 120 min)</button>'}<button class="btn alt" data-n="10">Quick (10)</button><button class="btn alt" data-n="25">Standard (25)</button><button class="btn ghost" data-n="${pool.length}">Everything (${pool.length})</button></div>
    <div class="note-box">The real exam passes at 720/1000, about 72%. Answer first, read the explanation after. Wrong answers are where you learn the most.</div>
    ${dm ? '' : '<p><b>Practise one domain:</b></p><div class="row">' + cert.domains.map(x => `<a class="btn small ghost" href="#/exam/${x.id}">${x.emoji} D${x.n} · ${x.weight}%</a>`).join('') + '</div>'}`);
  d.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.n) runExam(shuffle(pool).slice(0, +b.dataset.n), {});
    if (b.dataset.mock) runExam(mockSet(pool), { minutes: 120, mock: true });
  });
  mount(d);
}
function mockSet(pool) {   // 60 questions sampled to match the domain weights
  const cert = C.certs[0], pick = [], used = new Set();
  cert.domains.forEach(dm => {
    const want = Math.round(60 * dm.weight / 100);
    shuffle(pool.filter(q => q.ds.includes(dm.id))).filter(q => !used.has(q.q)).slice(0, want).forEach(q => { pick.push(q); used.add(q.q); });
  });
  shuffle(pool.filter(q => !used.has(q.q))).slice(0, Math.max(0, 60 - pick.length)).forEach(q => pick.push(q));
  return shuffle(pick).slice(0, 60);
}
function runExam(qs, opt) {
  let i = 0, score = 0; const log = []; const t0 = Date.now(); let timer = null;
  const root = el('div', 'exam-card'); mount(root);
  const left = () => Math.max(0, opt.minutes * 60 - Math.round((Date.now() - t0) / 1000));
  const clock = () => { const s = left(), t = $('#timer', root); if (t) t.textContent = '⏱️ ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); return s; };
  if (opt.minutes) timer = setInterval(() => { if (!document.body.contains(root)) return clearInterval(timer); if (clock() <= 0) { clearInterval(timer); finish(true); } }, 1000);
  const show = () => {
    if (i >= qs.length) return finish();
    const q = qs[i]; const idx = shuffle(q.opts.map((o, k) => k));
    root.innerHTML = `<div class="qhead"><span>Question ${i + 1} / ${qs.length}</span>${opt.minutes ? '<span id="timer"></span>' : ''}<span>✅ ${score}</span></div><div class="bar"><i style="width:${i / qs.length * 100}%"></i></div>
      <div class="box quiz"><span class="tag">${esc(q.from)}</span><p><b>${fmt(q.q)}</b></p><div class="opts"></div><div class="fb" hidden></div></div>`;
    if (opt.minutes) clock();
    const opts = $('.opts', root), fb = $('.fb', root);
    idx.forEach((k, pos) => {
      const bt = el('button', 'opt', `${'ABCD'[pos]}. ${fmt(q.opts[k])}`);
      bt.onclick = () => {
        const ok = k === q.ans; if (ok) score++; log.push({ q, ok });
        [...opts.children].forEach((x, p) => { x.disabled = true; if (idx[p] === q.ans) x.classList.add('ok'); }); if (!ok) bt.classList.add('bad');
        fb.hidden = false; fb.className = 'fb ' + (ok ? 'ok' : 'bad'); fb.innerHTML = (ok ? '🎉 Correct! ' : '🤔 Not quite. ') + fmt(q.why) + '<div class="row"><button class="btn small">' + (i + 1 === qs.length ? 'Finish' : 'Next ➜') + '</button></div>';
        $('button', fb).onclick = () => { i++; show(); };
      };
      opts.append(bt);
    });
  };
  const finish = (timedOut) => {
    clearInterval(timer);
    const answered = log.length, pct = Math.round(score / qs.length * 100), secs = Math.round((Date.now() - t0) / 1000);
    if (qs.length >= 25 && pct > ST.best) { ST.best = pct; save(); } addXP(score * 2); if (pct >= 72) confetti(100);
    const byDom = {}; log.forEach(x => (x.q.ds || []).forEach(d => { (byDom[d] = byDom[d] || [0, 0])[1]++; if (x.ok) byDom[d][0]++; }));
    const cert = C.certs[0];
    root.innerHTML = `<h1>${pct >= 80 ? '🏆' : pct >= 72 ? '👍' : '💪'} ${pct}% ${pct >= 72 ? '· above the ~72% pass line' : '· below the ~72% pass line'}</h1>
      <p>${timedOut ? '⏰ Time is up! ' : ''}You scored <b>${score}/${qs.length}</b> (${answered} answered) in ${Math.floor(secs / 60)}m ${secs % 60}s. ${pct >= 80 ? 'Excellent, you look exam-ready.' : pct >= 72 ? 'Close to the line, so keep practising the weak spots.' : 'Keep going! Re-read the modules for the topics you missed.'}</p>
      <h3>By domain</h3>${cert.domains.filter(d => byDom[d.id]).map(d => { const [a, b] = byDom[d.id]; return `<div class="pbar"><span class="l" style="width:150px">${d.emoji} D${d.n} ${a}/${b}</span><span class="t"><i style="width:${a / b * 100}%;background:${a / b >= .72 ? 'var(--green)' : 'var(--red)'}"></i></span><a class="btn small ghost" href="#/exam/${d.id}">Practise</a></div>`; }).join('')}
      <div class="row"><button class="btn" id="again">Try again</button><a class="btn ghost" href="#/certs">Back to study plan</a></div><h2>Review</h2>` +
      log.map(x => `<div class="rev ${x.ok ? '' : 'bad'}"><b>${x.ok ? '✅' : '❌'} ${fmt(x.q.q)}</b><br>Answer: ${fmt(x.q.opts[x.q.ans])}<br><small>${fmt(x.q.why)} (${esc(x.q.from)})</small></div>`).join('');
    $('#again').onclick = () => viewExam();
  };
  show();
}

// ---------- certifications hub, domains, study-plan builder ----------
function viewCerts() {
  nav('certs');
  const d = el('div', '', `<h1>🏅 Certifications and study plans</h1><p>Pick a certification to see exactly <b>which sections to prepare, how much each is worth, and the topics inside</b>. Then build a day-by-day plan for the time you have.</p>`);
  const g = el('div', 'grid2');
  C.certs.forEach(c => {
    const done = Object.keys(ST.topics || {}).filter(k => k.startsWith(c.id + ':')).length, tot = c.domains.reduce((a, x) => a + x.topics.length, 0);
    g.append(el('div', 'card', `<h3>${c.emoji} ${esc(c.name)}</h3><p><span class="tok" style="background:#ffd84d">${esc(c.code)}</span> ${c.facts.slice(0, 3).map(f => esc(f[0]) + ': <b>' + esc(f[1]) + '</b>').join(' · ')}</p><p>${esc(c.blurb)}</p>
      <div class="bar"><i style="width:${done / tot * 100}%"></i></div><small>${done}/${tot} topics checked off · ${c.domains.length} domains</small><p><a class="btn small" href="#/cert/${c.id}">Open syllabus and plan</a></p>`));
  });
  g.append(el('div', 'card', '<h3>➕ More certifications</h3><p>Only one certification is mapped so far. Each future one will appear here with its own domains, weights, topics and plan.</p><p><small>Developers: add another object to <code>COURSE.certs</code> in <code>js/content_certs.js</code>.</small></p>'));
  d.append(g); mount(d);
}

function lessonChips(ids) { return ids.map(id => { const l = byId(id); return l ? `<a class="btn small ghost" href="#/lesson/${id}">${l.emoji} ${esc(l.title)}</a>` : ''; }).join(' '); }

function viewCert(id) {
  const cert = C.certs.find(c => c.id === id); if (!cert) return viewCerts();
  nav('certs'); ST.topics = ST.topics || {};
  const d = el('div', '', `<div class="crumbs"><a href="#/certs">Certifications</a> › ${esc(cert.code)}</div><h1>${cert.emoji} ${esc(cert.name)}</h1><p>${esc(cert.blurb)}</p>
    <div class="how">${cert.facts.map(f => `<div><b>${esc(f[1])}</b>${esc(f[0])}</div>`).join('')}</div>
    <div class="note-box">${esc(cert.note)}</div>
    <h2>📊 Where the points are</h2><p>Spend your time in proportion to the weight. The biggest slice is <b>${cert.domains.slice().sort((a, b) => b.weight - a.weight)[0].name}</b>.</p><div class="weights"></div>
    <h2>📚 Sections to prepare</h2><p>Open a section, tick topics as you master them, jump to lessons, then test yourself.</p><div class="doms"></div>
    <h2>🗓️ Build your study plan</h2><div class="planbox"></div>
    <h2>🧭 Exam-day tips</h2>
    <div class="box pts"><span class="tag">✏️ STRATEGY</span><ul><li>60 questions in 120 minutes is about <b>2 minutes per question</b>. Don't get stuck: move on and come back.</li><li>Read the scenario fully, then the question, then eliminate clearly wrong options.</li><li>Prefer the <b>simplest architecture</b> that meets the requirement, and the answer that adds <b>validation, least privilege and human approval</b> for risky actions.</li><li>Watch for traps: unbounded loops, secrets in prompts, trusting tool output, caching with a changing prefix.</li><li>Run at least one timed <a href="#/exam">mock exam</a> before the real day.</li></ul></div>`);
  const W = $('.weights', d), colors = ['var(--orange)', 'var(--teal)', 'var(--blue)', 'var(--pink)', 'var(--purple)'];
  cert.domains.forEach((x, k) => { const r = el('div', 'pbar', `<span class="l" style="width:230px">${x.emoji} D${x.n} ${esc(x.name)}</span><span class="t"><i style="width:0;background:${colors[k]}" data-w="${x.weight * 3}"></i></span><span class="v">${x.weight}%</span>`); W.append(r); });
  setTimeout(() => W.querySelectorAll('i').forEach(i => i.style.width = i.dataset.w + '%'), 80);
  const D = $('.doms', d);
  cert.domains.forEach(x => {
    const doneN = x.topics.filter((t, i) => ST.topics[cert.id + ':' + x.id + ':' + i]).length;
    const det = el('details', 'box'); det.style.marginBottom = '18px'; if (x === cert.domains[0]) det.open = true;
    det.innerHTML = `<summary style="list-style:none;cursor:pointer"><h3 style="display:inline">${x.emoji} Domain ${x.n}: ${esc(x.name)}</h3> <span class="tok" style="background:#ffd84d">${x.weight}%</span> <small class="dp">${doneN}/${x.topics.length} topics</small></summary>
      <p>${esc(x.focus)}</p><div class="bar"><i style="width:${doneN / x.topics.length * 100}%"></i></div>
      <div class="tlist">${x.topics.map((t, i) => `<label class="topic"><input type="checkbox" data-k="${cert.id}:${x.id}:${i}" ${ST.topics[cert.id + ':' + x.id + ':' + i] ? 'checked' : ''}> <span>${esc(t)}</span></label>`).join('')}</div>
      <p><b>Lessons for this section:</b></p><div class="row">${lessonChips(x.lessons)}</div><div class="row"><a class="btn small" href="#/exam/${x.id}">📝 Practise this domain</a></div>`;
    det.addEventListener('change', e => {
      const cb = e.target.closest('input[type=checkbox]'); if (!cb) return;
      ST.topics[cb.dataset.k] = cb.checked || undefined; if (!cb.checked) delete ST.topics[cb.dataset.k]; save();
      const n = x.topics.filter((t, i) => ST.topics[cert.id + ':' + x.id + ':' + i]).length;
      $('.dp', det).textContent = n + '/' + x.topics.length + ' topics'; $('.bar i', det).style.width = (n / x.topics.length * 100) + '%';
    });
    D.append(det);
  });
  planUI(cert, $('.planbox', d));
  mount(d);
}

function buildPlan(cert, days, hrs) {
  const mockDays = days >= 7 ? 2 : days >= 3 ? 1 : 0, studyDays = days - mockDays;
  const studyHrs = mockDays ? studyDays * hrs : days * hrs * 0.75, items = [];
  const doms = cert.domains.map(x => ({ x, h: studyHrs * x.weight / 100, used: 0 }));
  let di = 0, dayLeft = hrs, cur = { segs: [] };
  const flush = () => { if (cur.segs.length) items.push(cur); cur = { segs: [] }; dayLeft = hrs; };
  while (di < doms.length) {
    const dm = doms[di], take = Math.min(dayLeft, dm.h - dm.used);
    if (take > 0.01) {
      const a = Math.round(dm.used / dm.h * dm.x.topics.length), b = Math.round((dm.used + take) / dm.h * dm.x.topics.length);
      cur.segs.push({ did: dm.x.id, h: take, topics: dm.x.topics.slice(a, b), first: dm.used === 0 });
      dm.used += take; dayLeft -= take;
    }
    if (dm.h - dm.used <= 0.01) di++;
    if (dayLeft <= 0.01) flush();
  }
  flush();
  if (mockDays === 0) items.push({ segs: [], note: '🧪 Practice (about ' + (days * hrs * 0.25).toFixed(1) + 'h total): take the Standard 25-question exam, review every miss.' });
  else {
    items.push({ segs: [], mock: true, note: '⏱️ Mock exam day: sit the timed 60-question mock exam in one go (about 2 hours), then review every wrong answer.' });
    if (mockDays === 2) items.push({ segs: [], review: true, note: '🔁 Review day: redo domain practice for your weakest domains and re-read those lessons. Finish with a Quick 25 exam.' });
  }
  items.forEach((it, i) => it.day = i + 1);
  return items;
}

function planUI(cert, box) {
  const cfg = ST.planCfg || { days: 14, hrs: 1.5 };
  box.innerHTML = `<p>Tell me how long you have. I split your hours across the domains <b>by exam weight</b>, add a mock exam, and give you one checklist per day.</p>
    <div class="row"><label>Days until exam: <input type="number" min="1" max="90" class="txt" id="pDays" style="width:90px" value="${cfg.days}"></label>
    <label>Hours per day: <input type="number" min="0.5" max="12" step="0.5" class="txt" id="pHrs" style="width:90px" value="${cfg.hrs}"></label>
    <button class="btn" id="pGo">Make my plan</button></div>
    <div class="row"><small>Quick pick:</small> ${[[2, 4, 'Crash: 2 days'], [7, 2, '1 week'], [14, 1.5, '2 weeks'], [30, 1, '1 month']].map(p => `<button class="btn small ghost" data-d="${p[0]}" data-h="${p[1]}">${p[2]}</button>`).join('')}</div>
    <div class="out"></div>`;
  const out = $('.out', box);
  const draw = () => {
    const pl = ST.plan; if (!pl || pl.cert !== cert.id) { out.innerHTML = ''; return; }
    const doneN = pl.items.filter(it => pl.done[it.day]).length, totalH = (pl.cfg.days * pl.cfg.hrs).toFixed(1);
    out.innerHTML = `<div class="note-box">Plan: <b>${pl.cfg.days} days × ${pl.cfg.hrs}h = ${totalH}h</b>. ${doneN}/${pl.items.length} days done. ${totalH < 10 ? 'Short on time: focus on the highest-weight domains first and rely on the practice questions.' : ''}</div><div class="bar"><i style="width:${doneN / pl.items.length * 100}%"></i></div>` +
      pl.items.map(it => `<div class="box day ${pl.done[it.day] ? 'dn' : ''}" style="margin:16px 0"><label class="topic"><input type="checkbox" data-day="${it.day}" ${pl.done[it.day] ? 'checked' : ''}> <b>Day ${it.day}</b></label>` +
        (it.note ? `<p>${it.note}</p>${it.mock ? '<a class="btn small" href="#/exam">Open mock exam</a>' : '<a class="btn small" href="#/exam">Open practice exam</a>'}` :
          it.segs.map(s => { const dm = cert.domains.find(x => x.id === s.did); return `<div class="seg"><b>${dm.emoji} D${dm.n} ${esc(dm.name)}</b> · ${s.h.toFixed(1)}h<ul>${s.topics.map(t => `<li>${esc(t)}</li>`).join('')}</ul>${s.first ? '<div class="row">' + lessonChips(dm.lessons) + '</div>' : ''}</div>`; }).join('')) + '</div>').join('');
  };
  const go = (days, hrs) => {
    days = Math.max(1, Math.min(90, Math.round(+days) || 7)); hrs = Math.max(0.5, Math.min(12, +hrs || 1));
    ST.planCfg = { days, hrs }; ST.plan = { cert: cert.id, cfg: { days, hrs }, items: buildPlan(cert, days, hrs), done: {} }; save();
    $('#pDays', box).value = days; $('#pHrs', box).value = hrs; draw();
  };
  $('#pGo', box).onclick = () => go($('#pDays', box).value, $('#pHrs', box).value);
  box.addEventListener('click', e => { const b = e.target.closest('button[data-d]'); if (b) go(b.dataset.d, b.dataset.h); });
  out.addEventListener('change', e => { const cb = e.target.closest('input[data-day]'); if (!cb) return; ST.plan.done[cb.dataset.day] = cb.checked || undefined; if (!cb.checked) delete ST.plan.done[cb.dataset.day]; save(); draw(); });
  draw();
}

// ---------- Q&A + glossary ----------
function viewQA() {
  nav('qa'); const faqs = [];
  LESSONS.forEach(l => l.blocks.forEach(b => { if (b.t === 'faq') faqs.push({ q: b.q, a: b.a, l }); }));
  const d = el('div', '', `<h1>❓ Q&amp;A and Glossary</h1><p>Search everything. Type a word like <i>token</i>, <i>memory</i>, or <i>safe</i>.</p><input class="search" placeholder="Search questions and words..." aria-label="Search"><h2>Questions (${faqs.length})</h2><div class="qs"></div><h2>Glossary (${C.glossary.length})</h2><div class="gl"></div>`);
  const qs = $('.qs', d), gl = $('.gl', d), inp = $('.search', d);
  const draw = () => {
    const f = inp.value.toLowerCase();
    qs.innerHTML = ''; faqs.filter(x => (x.q + x.a).toLowerCase().includes(f)).forEach(x => {
      const dt = el('details', 'box qa', `<summary><b>${fmt(x.q)}</b></summary><p>${fmt(x.a)}</p><small>From <a href="#/lesson/${x.l.id}">${esc(x.l.title)}</a></small>`); dt.style.marginBottom = '14px'; qs.append(dt);
    });
    if (!qs.children.length) qs.innerHTML = '<p>No matching questions. Try another word.</p>';
    gl.innerHTML = C.glossary.filter(g => (g[0] + g[1]).toLowerCase().includes(f)).map(g => `<div><b>${esc(g[0])}</b><br>${fmt(g[1])}</div>`).join('') || '<p>No matching words.</p>';
  };
  inp.oninput = draw; draw(); mount(d);
}

// ---------- router ----------
function route() {
  stopSpeak(); bar.hidden = true;
  const [, a, b] = (location.hash || '#/').split('/');
  if (a === 'track' && (b === 'beginner' || b === 'cert')) viewTrack(b);
  else if (a === 'lesson') viewLesson(b);
  else if (a === 'exam') viewExam(b);
  else if (a === 'certs') viewCerts();
  else if (a === 'cert') viewCert(b);
  else if (a === 'qa') viewQA();
  else viewHome();
}
$('#themeBtn').onclick = () => { ST.theme = ST.theme === 'dark' ? '' : 'dark'; save(); applyTheme(); };
function applyTheme() { if (ST.theme) document.documentElement.dataset.theme = ST.theme; else delete document.documentElement.dataset.theme; }
applyTheme(); updateXP(); initListenBar();
window.addEventListener('hashchange', route); route();
})();
