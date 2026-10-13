const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }, del(k) { try { localStorage.removeItem(k); } catch (e) { } } };
let done = store.get('go-done', {});
const STARS = { 9: [2, 4, 6], 13: [3, 6, 9], 19: [3, 9, 15] };
const C = 30, M = 28;

// วาดกระดาน: o = {n, grid, last, hints[], marks[], rings[{i,color}], terr, dead:Set, labels:{i:txt}, fresh}
// เคอร์เซอร์คีย์บอร์ดอ่านจาก el._cur เมื่อ el._kb เป็นจริง
function drawBoard(el, o) {
  const n = o.n, S = M * 2 + C * (n - 1), P = k => M + k * C;
  el._n = n;
  let h = `<svg viewBox="0 0 ${S} ${S}" class="n${n}" role="img" aria-label="กระดานหมากล้อม ${n} x ${n}"><rect width="${S}" height="${S}" fill="url(#gWood)"/>`;
  for (let k = 0; k < n; k++) {
    h += `<path d="M${P(k)} ${M}V${P(n - 1)}M${M} ${P(k)}H${P(n - 1)}" stroke="#3a2a10" stroke-width="${k === 0 || k === n - 1 ? 1.6 : 1}" fill="none"/>`;
    h += `<g class="co" fill="#5b4520" font-size="10" text-anchor="middle"><text x="${P(k)}" y="${S - 7}">${LET[k]}</text><text x="11" y="${P(k) + 3.5}">${n - k}</text></g>`;
  }
  const st = STARS[n] || [];
  for (const a of st) for (const b of st) if (n !== 9 || (a === 4) === (b === 4)) h += `<circle cx="${P(a)}" cy="${P(b)}" r="3" fill="#3a2a10"/>`;
  for (let i = 0; i < n * n; i++) {
    const x = P(i % n), y = P((i / n) | 0), v = o.grid[i], dead = o.dead && o.dead.has(i);
    if (v) {
      h += `<circle cx="${x + 1}" cy="${y + 2}" r="13.6" fill="#000" opacity="${dead ? .08 : .25}"/><circle${o.fresh === i ? ' class="new"' : ''} cx="${x}" cy="${y}" r="13.8" fill="url(#g${v === 1 ? 'B' : 'W'})" opacity="${dead ? .4 : 1}"/>`;
      if (o.last === i) h += `<circle cx="${x}" cy="${y}" r="5.5" fill="none" stroke="${v === 1 ? '#fff' : '#111'}" stroke-width="1.8"/>`;
      const lb = o.labels && o.labels[i];
      if (lb) h += `<text x="${x}" y="${y + 4.5}" font-size="13" font-weight="500" text-anchor="middle" fill="${v === 1 ? '#fff' : '#111'}">${esc(lb)}</text>`;
    }
    const t = o.terr && o.terr[i];
    if (t && (!v || dead)) h += `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" fill="${t === 1 ? '#111' : '#fbfaf5'}" stroke="${t === 1 ? '#111' : '#6b5a36'}" stroke-width=".8"/>`;
  }
  if (o.area) { const a = o.area; h += `<rect class="harea" x="${P(a.x0) - 15}" y="${P(a.y0) - 15}" width="${(a.x1 - a.x0) * C + 30}" height="${(a.y1 - a.y0) * C + 30}" rx="10" fill="#1d4ed826" stroke="#1d4ed8" stroke-width="2.4" stroke-dasharray="6 4"/>`; }
  for (const i of o.marks || []) h += `<circle cx="${P(i % n)}" cy="${P((i / n) | 0)}" r="5.5" fill="#1d4ed8"/>`;
  for (const i of o.hints || []) h += `<circle cx="${P(i % n)}" cy="${P((i / n) | 0)}" r="11" fill="#1d4ed833" stroke="#1d4ed8" stroke-width="2.2" stroke-dasharray="4 3"/>`;
  for (const r of o.rings || []) h += `<circle cx="${P(r.i % n)}" cy="${P((r.i / n) | 0)}" r="16.5" fill="none" stroke="${r.color}" stroke-width="3"/>`;
  if (el._kb && el._cur >= 0 && el._cur < n * n) h += `<rect x="${P(el._cur % n) - 15}" y="${P(((el._cur / n) | 0)) - 15}" width="30" height="30" rx="4" fill="none" stroke="#c2185b" stroke-width="2.4"/>`;
  el.innerHTML = h + '</svg>';
}
// ผูกการแตะและคีย์บอร์ดเข้ากับกระดาน: fn(idx) เมื่อเลือกจุด, redraw() วาดใหม่
function bindBoard(el, fn, redraw) {
  el.tabIndex = 0; el.setAttribute('role', 'group');
  el.setAttribute('aria-label', 'กระดานหมากล้อม ใช้ปุ่มลูกศรเลื่อนจุด กด Enter หรือเว้นวรรคเพื่อวางหมาก');
  el.onclick = e => {
    const svg = el.firstElementChild, N = el._n; if (!svg || !N) return;
    const r = svg.getBoundingClientRect(), S = M * 2 + C * N - C;
    const x = Math.round(((e.clientX - r.left) / r.width * S - M) / C), y = Math.round(((e.clientY - r.top) / r.height * S - M) / C);
    if (el._kb) { el._kb = false; redraw(); }
    if (x >= 0 && y >= 0 && x < N && y < N) fn(y * N + x);
  };
  el.onfocus = () => { const N = el._n; if (!N) return; if (el.matches(':focus-visible')) { el._kb = true; if (!(el._cur >= 0)) el._cur = (N >> 1) * N + (N >> 1); redraw(); } };
  el.onblur = () => { if (el._kb) { el._kb = false; redraw(); } };
  el.onkeydown = e => {
    const N = el._n; if (!N) return;
    const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (!(el._cur >= 0)) el._cur = (N >> 1) * N + (N >> 1);
    if (d) {
      e.preventDefault(); el._kb = true;
      const x = Math.min(N - 1, Math.max(0, el._cur % N + d[0])), y = Math.min(N - 1, Math.max(0, ((el._cur / N) | 0) + d[1]));
      el._cur = y * N + x; redraw();
    } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el._kb = true; fn(el._cur); }
  };
  el._redraw = redraw;
}
function parseRows(rows) {
  const n = rows.length, g = new Go(n), ans = [], marks = [];
  rows.forEach((r, y) => [...r].forEach((ch, x) => { const i = y * n + x; if (ch === 'X') g.grid[i] = 1; else if (ch === 'O') g.grid[i] = 2; else if (ch === '*') ans.push(i); else if (ch === '+') marks.push(i); }));
  return { g, ans, marks };
}
const WHY = { occupied: 'จุดนี้มีหมากอยู่แล้ว', suicide: 'วางไม่ได้ หมากจะไม่มีลมหายใจ', ko: 'ยังกินกลับไม่ได้ ติดกติกาโคะ ต้องเดินที่อื่นก่อนหนึ่งตา' };

// ---------- ตัวเล่นบทเรียนและโจทย์ ----------
function Player(root, kind, onFinish, onSolve) {
  root.innerHTML = `<div class="stage"><div class="board"></div><aside class="panel"><span class="eyebrow"></span><h2></h2><div class="dots"></div><p class="text"></p><div class="choices"></div><p class="fb" aria-live="polite"></p><div class="btns"><button class="btn b-hint">ดูคำใบ้</button><button class="btn b-reset">เริ่มข้อนี้ใหม่</button><button class="btn primary b-next"></button></div><div class="btns share-row" hidden><button class="btn b-share" type="button">แชร์ผลไป LINE</button><button class="btn b-sharecopy" type="button">คัดลอกข้อความ</button></div></aside></div>`;
  const bd = $('.board', root), fbEl = $('.fb', root);
  let L, si, g, ans, marks, solved, hint, pos, busy, fresh, generation = 0;
  const step = () => L.steps[si];
  const fb = (t, c) => { fbEl.textContent = t; fbEl.className = 'fb ' + (c || ''); };
  function load() {
    generation++;
    const s = step(), p = parseRows(s.rows); g = p.g; ans = p.ans; marks = p.marks;
    if (s.pre) s.pre.forEach(([x, y]) => g.play(y * g.n + x));
    if (s.turn) g.turn = s.turn;
    if (s.answers) ans = s.answers.map(([x, y]) => y * g.n + x);
    solved = s.t === 'info'; hint = false; pos = 0; busy = false; fresh = -1; fb(''); render();
  }
  function render() {
    const s = step(), last = si === L.steps.length - 1;
    $('.eyebrow', root).textContent = kind === 'lesson' ? `ขั้น ${L.stage} · ${(s.turn || 1) === 1 ? 'คุณถือดำ' : 'คุณถือขาว'}` : L.teacher ? 'โจทย์จากครู · ดำเดิน' : `ระดับ ${L.level} · ดำเดิน`;
    $('h2', root).textContent = L.title;
    $('.dots', root).innerHTML = L.steps.length > 1 ? L.steps.map((_, k) => `<span class="${k <= si ? 'on' : ''}"></span>`).join('') : '';
    $('.text', root).textContent = s.text;
    const ch = $('.choices', root); ch.innerHTML = '';
    if (s.t === 'choice') s.choices.forEach(c => { const b = document.createElement('button'); b.className = 'btn'; b.textContent = c.label; b.disabled = solved; b.onclick = () => { if (c.right) { solved = true; fb(s.ok, 'good'); render(); } else fb('ยังไม่ใช่ ลองอ่านคำอธิบายอีกครั้ง', 'bad'); }; ch.appendChild(b); });
    const interactive = !['info', 'choice'].includes(s.t);
    $('.b-hint', root).hidden = !interactive || s.t === 'any'; $('.b-reset', root).hidden = !interactive;
    const nx = $('.b-next', root); nx.disabled = !solved; nx.textContent = !last ? 'ถัดไป' : kind === 'lesson' ? 'จบบทเรียน' : L.teacher ? 'เสร็จแล้ว' : 'ข้อต่อไป';
    const shr = $('.share-row', root); shr.hidden = !(solved && last && root.id !== 'sk-pz');
    if (solved && last && interactive && onSolve) onSolve(L);
    bd.classList.toggle('static', !interactive || solved);
    const hints = hint && !solved ? (s.t === 'seq' ? [s.seq[pos].at[1] * g.n + s.seq[pos].at[0]] : ans) : [];
    drawBoard(bd, { n: g.n, grid: g.grid, last: g.last, marks, hints, terr: s.terr ? g.score().terr : null, fresh });
  }
  bindBoard(bd, i => {
    const s = step(); if (solved || busy || ['info', 'choice'].includes(s.t)) return;
    if (s.t === 'illegal') {
      if (!ans.includes(i)) return fb('ลองแตะจุดที่โจทย์พูดถึง กดดูคำใบ้ได้', 'bad');
      const r = g.play(i); if (!r.ok) { solved = true; fb(s.ok, 'good'); } return render();
    }
    if (s.t === 'seq') {
      const m = s.seq[pos];
      if (i !== m.at[1] * g.n + m.at[0]) { fb(s.no, 'bad'); const keep = fbEl.textContent; load(); return fb(keep, 'bad'); }
      g.play(i); fresh = i; fb('');
      if (!m.reply) { solved = true; fb(s.ok, 'good'); return render(); }
      busy = true; render();
      const my = generation;
      return setTimeout(() => { if (my !== generation) return; const j = m.reply[1] * g.n + m.reply[0]; g.play(j); fresh = j; pos++; busy = false; render(); }, 420);
    }
    if (s.t === 'point' && !ans.includes(i)) return fb(g.grid[i] ? WHY.occupied : s.no || 'ยังไม่ใช่ ลองนับลมหายใจของหมากอีกครั้ง', 'bad');
    const r = g.play(i); if (!r.ok) return fb(WHY[r.reason], 'bad');
    fresh = i; solved = true; fb(s.ok, 'good'); render();
  }, render);
  const shareTxt = () => { const s = step(); return shareResultText(kind === 'lesson' ? 'lesson' : 'puzzle', { title: L.title, level: L.level, take: firstSent(s.ok || s.text, 90) }); };
  $('.b-share', root).onclick = e => shareOut(shareTxt(), e.currentTarget, root);
  $('.b-sharecopy', root).onclick = e => copyText(shareTxt(), e.currentTarget, root);
  $('.b-hint', root).onclick = () => { hint = true; render(); };
  $('.b-reset', root).onclick = load;
  $('.b-next', root).onclick = () => { if (si < L.steps.length - 1) { si++; load(); } else onFinish(L); };
  return { open(l) { L = l; si = 0; load(); } };
}

// ---------- สถิติและระดับของผู้เล่น ----------
let recs = store.get('go-rec', {});
const wins = id => (recs[id] && recs[id].w) || 0;
const evenWins = id => { const r = recs[id]; return !r ? 0 : r.we == null ? (r.w || 0) : r.we; };
const playerRank = () => { let r = null; SENSEI.forEach(s => { if (evenWins(s.id) >= 1) r = s; }); return r; };
const recId = () => { const s = SENSEI.find(s => s.eng !== 'server' && wins(s.id) < 2); return s ? s.id : null; };
const beltCss = s => s.bc2 ? `linear-gradient(90deg,${s.bc} 0 62%,${s.bc2} 62%)` : s.bc;
const belt = s => `<span class="belt"><i style="background:${beltCss(s)}"></i>${esc(s.belt)}</span>`;

// ---------- หน้าเรียน ----------
const lessonPlayer = Player($('#lesson-player'), 'lesson', L => { done[L.id] = 1; store.set('go-done', done); try { Rep.add({ k: 'lesson', id: L.id }); } catch (e) { } showPath(); });
function openLesson(id) {
  const L = LESSONS.find(l => l.id === id); if (!L) return;
  showTab('learn'); $('#path-view').hidden = true; $('#lesson-view').hidden = false; lessonPlayer.open(L); window.scrollTo(0, 0);
}
$('#lesson-back').onclick = showPath;

// ---------- หน้าโจทย์ ----------
let pzCur = 0;
const pzPlayer = Player($('#pz-player'), 'puzzle', L => { done[L.id] = 1; store.set('go-done', done); try { Rep.add({ k: 'puzzle', id: L.id, ok: true }); } catch (e) { } openPuzzle((pzCur + 1) % PUZZLES.length); });
function openPuzzle(k) {
  pzCur = k;
  $('#pz-list').innerHTML = PUZZLES.map((p, j) => `<button class="chip${done[p.id] ? ' done' : ''}" data-k="${j}" aria-pressed="${j === k}"><span>${esc(p.title)}</span><small>${p.level}</small></button>`).join('');
  pzPlayer.open(PUZZLES[k]);
}
$('#pz-list').onclick = e => { const b = e.target.closest('.chip'); if (b) openPuzzle(+b.dataset.k); };

// ---------- ตัวการ์ตูนคู่ประลอง ----------
let avSeq = 0;
function avatar(s, px) {
  const f = s.fur, k = s.kind, ink = '#1b1b1e', ln = '#00000045', id = 'avc' + (++avSeq);
  const tri = (a, b, c, d, e, g, col) => `<path d="M${a} ${b}L${c} ${d}L${e} ${g}Z" fill="${col}" stroke="${ln}" stroke-width="1" stroke-linejoin="round"/>`;
  let back = '', front = '', smile = true;
  switch (k) {
    case 'chick': back = `<path d="M26 14c0-7 4-8 5-3 1-6 6-5 5 3 2-4 6-2 4 4z" fill="${f}" stroke="${ln}"/>`; front = `<path d="M28 39h8l-4 6z" fill="#F08A2C" stroke="${ln}"/><circle cx="18" cy="40" r="3.2" fill="#F29C7A" opacity=".65"/><circle cx="46" cy="40" r="3.2" fill="#F29C7A" opacity=".65"/>`; smile = false; break;
    case 'rabbit': back = `<ellipse cx="23" cy="14" rx="5.5" ry="13" fill="${f}" stroke="${ln}"/><ellipse cx="41" cy="14" rx="5.5" ry="13" fill="${f}" stroke="${ln}"/><ellipse cx="23" cy="15" rx="2.4" ry="8.5" fill="#F2B8B5"/><ellipse cx="41" cy="15" rx="2.4" ry="8.5" fill="#F2B8B5"/>`; front = `<ellipse cx="32" cy="40" rx="2.6" ry="2" fill="#E78F9A"/><circle cx="18" cy="41" r="3" fill="#F2B8B5" opacity=".7"/><circle cx="46" cy="41" r="3" fill="#F2B8B5" opacity=".7"/>`; break;
    case 'turtle': back = `<ellipse cx="32" cy="18" rx="20" ry="14" fill="#4F7F4B" stroke="${ln}"/><path d="M14 20h36M25 6l-3 14M39 6l3 14" stroke="#2E5A34" stroke-width="1.6" fill="none"/>`; front = `<circle cx="29.5" cy="40" r="1.1" fill="${ln}"/><circle cx="34.5" cy="40" r="1.1" fill="${ln}"/>`; break;
    case 'fox': back = tri(13, 28, 16, 5, 31, 16, f) + tri(51, 28, 48, 5, 33, 16, f) + tri(18, 22, 19, 11, 27, 17, '#3B2418') + tri(46, 22, 45, 11, 37, 17, '#3B2418'); front = `<path d="M32 51c-9 0-14-5-15-11 6 3 10 3 15 0 5 3 9 3 15 0-1 6-6 11-15 11z" fill="#FFF7EA"/><ellipse cx="32" cy="41" rx="2.8" ry="2.1" fill="${ink}"/>`; break;
    case 'owl': back = tri(14, 24, 13, 5, 28, 14, f) + tri(50, 24, 51, 5, 36, 14, f); front = `<circle cx="24" cy="34" r="8" fill="#FBF5E6" stroke="${ln}"/><circle cx="40" cy="34" r="8" fill="#FBF5E6" stroke="${ln}"/><path d="M29 41h6l-3 6z" fill="#E8A33A" stroke="${ln}"/>`; smile = false; break;
    case 'tiger': back = `<circle cx="15" cy="18" r="6.5" fill="${f}" stroke="${ln}"/><circle cx="49" cy="18" r="6.5" fill="${f}" stroke="${ln}"/><circle cx="15" cy="18" r="3" fill="#3A2412"/><circle cx="49" cy="18" r="3" fill="#3A2412"/>`; front = `<path d="M32 13v8M25 14l2 7M39 14l-2 7M10 33l6 1.5M54 33l-6 1.5M11 40l5 .5M53 40l-5 .5" stroke="#3A2412" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="32" cy="46" rx="9" ry="6" fill="#FFF3DC"/><ellipse cx="32" cy="42.5" rx="2.6" ry="2" fill="#7A3B2A"/>`; smile = false; break;
    case 'cat': back = tri(13, 30, 14, 5, 30, 16, f) + tri(51, 30, 50, 5, 34, 16, f) + tri(17, 24, 17, 12, 26, 17, '#5A3B4C') + tri(47, 24, 47, 12, 38, 17, '#5A3B4C'); front = `<ellipse cx="32" cy="41" rx="2.4" ry="1.8" fill="#E78F9A"/><path d="M8 40l12 2M8 46l12-2M56 40l-12 2M56 46l-12-2" stroke="#C9C9D0" stroke-width="1.2" stroke-linecap="round"/>`; break;
    case 'crane': back = ''; front = `<path d="M22 17q10-9 20 0q-10 4-20 0z" fill="#C5382C"/><path d="M29.5 39l2.5 17 2.5-17z" fill="#E7B84A" stroke="${ln}"/><path d="M16 36q2-3 5-2M48 36q-2-3-5-2" stroke="${ln}" fill="none"/>`; smile = false; break;
    case 'dragon': back = tri(19, 20, 12, 3, 28, 13, '#F1E6C8') + tri(45, 20, 52, 3, 36, 13, '#F1E6C8'); front = `<circle cx="22" cy="43" r="2" fill="#ffffff55"/><circle cx="42" cy="43" r="2" fill="#ffffff55"/><circle cx="29.5" cy="40.5" r="1.3" fill="${ink}"/><circle cx="34.5" cy="40.5" r="1.3" fill="${ink}"/><path d="M27 47l1.5 4 1.5-4M34 47l1.5 4 1.5-4" fill="#fff" stroke="${ln}"/>`; smile = false; break;
    case 'dog': back = `<ellipse cx="13" cy="28" rx="7" ry="13" transform="rotate(14 13 28)" fill="#6B4A2F" stroke="${ln}"/><ellipse cx="51" cy="28" rx="7" ry="13" transform="rotate(-14 51 28)" fill="#6B4A2F" stroke="${ln}"/>`; front = `<ellipse cx="32" cy="44" rx="10" ry="7.5" fill="#F7E6CC"/><ellipse cx="32" cy="41" rx="3.2" ry="2.4" fill="${ink}"/>`; break;
    case 'panda': back = `<circle cx="16" cy="15" r="7.5" fill="#26262b" stroke="${ln}"/><circle cx="48" cy="15" r="7.5" fill="#26262b" stroke="${ln}"/>`; front = `<ellipse cx="24" cy="34" rx="6" ry="7.5" transform="rotate(20 24 34)" fill="#26262b"/><ellipse cx="40" cy="34" rx="6" ry="7.5" transform="rotate(-20 40 34)" fill="#26262b"/><ellipse cx="32" cy="41" rx="2.8" ry="2" fill="#26262b"/>`; break;
    case 'monkey': back = `<circle cx="11" cy="33" r="8" fill="${f}" stroke="${ln}"/><circle cx="53" cy="33" r="8" fill="${f}" stroke="${ln}"/><circle cx="11" cy="33" r="4.5" fill="#F2B8A0"/><circle cx="53" cy="33" r="4.5" fill="#F2B8A0"/>`; front = `<path d="M19 33Q32 22 45 33Q51 46 32 53Q13 46 19 33Z" fill="#F3D3B0"/><circle cx="30.5" cy="41" r="1" fill="${ln}"/><circle cx="33.5" cy="41" r="1" fill="${ln}"/>`; break;
    case 'elephant': back = `<ellipse cx="10" cy="34" rx="9" ry="14" fill="${f}" stroke="${ln}"/><ellipse cx="54" cy="34" rx="9" ry="14" fill="${f}" stroke="${ln}"/><ellipse cx="10" cy="35" rx="4.5" ry="9" fill="#E9B7B7"/><ellipse cx="54" cy="35" rx="4.5" ry="9" fill="#E9B7B7"/>`; front = `<path d="M26 41Q25 52 30 56Q36 59 38 53L37 41Z" fill="${f}" stroke="${ln}"/><path d="M28 47h8M28.5 51h7.5" stroke="${ln}" stroke-width="1" fill="none"/>`; smile = false; break;
    case 'frog': back = `<circle cx="21" cy="15" r="8.5" fill="${f}" stroke="${ln}"/><circle cx="43" cy="15" r="8.5" fill="${f}" stroke="${ln}"/><circle cx="21" cy="15" r="4.5" fill="#5FA94F"/><circle cx="43" cy="15" r="4.5" fill="#5FA94F"/>`; front = `<path d="M16 42Q32 54 48 42" stroke="${ink}" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="18" cy="42" r="3.2" fill="#F29C7A" opacity=".6"/><circle cx="46" cy="42" r="3.2" fill="#F29C7A" opacity=".6"/><circle cx="30" cy="39" r=".9" fill="${ln}"/><circle cx="34" cy="39" r=".9" fill="${ln}"/>`; smile = false; break;
    case 'bear': back = `<circle cx="15" cy="17" r="7.5" fill="${f}" stroke="${ln}"/><circle cx="49" cy="17" r="7.5" fill="${f}" stroke="${ln}"/><circle cx="15" cy="17" r="3.8" fill="#D9A877"/><circle cx="49" cy="17" r="3.8" fill="#D9A877"/>`; front = `<ellipse cx="32" cy="43" rx="9.5" ry="7" fill="#E8C9A0"/><ellipse cx="32" cy="40.5" rx="3" ry="2.2" fill="${ink}"/>`; break;
  }
  const eye = x => k === 'panda' ? `<circle cx="${x}" cy="34" r="2.8" fill="#fff"/><circle cx="${x + .5}" cy="34.4" r="1.3" fill="#111"/>` : k === 'cat'
    ? `<ellipse cx="${x}" cy="34" rx="4" ry="4.2" fill="#E9E58A"/><ellipse cx="${x}" cy="34" rx="1.3" ry="3.4" fill="#111"/>`
    : `<circle cx="${x}" cy="34" r="${k === 'owl' ? 3.8 : 3}" fill="${ink}"/><circle cx="${x + 1}" cy="33" r="1" fill="#fff"/>`;
  const mouth = smile ? `<path d="M28 ${k === 'cat' || k === 'fox' ? 45 : 44}q4 3 8 0" stroke="${ink}" stroke-width="1.6" fill="none" stroke-linecap="round"/>` : '';
  const ring = `<circle cx="32" cy="32" r="29.5" fill="none" stroke="${s.bc}" stroke-width="5"/><circle cx="32" cy="32" r="32" fill="none" stroke="#0000004d" stroke-width=".8"/><circle cx="32" cy="32" r="27" fill="none" stroke="#0000004d" stroke-width=".8"/>`
    + (s.bc2 ? `<circle cx="32" cy="32" r="29.5" fill="none" stroke="${s.bc2}" stroke-width="5" stroke-dasharray="28 157.2" stroke-dashoffset="-14"/>` : '');
  return `<svg class="av" width="${px}" height="${px}" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><defs><clipPath id="${id}"><circle cx="32" cy="32" r="28"/></clipPath></defs><circle cx="32" cy="32" r="29" style="fill:var(--wash)"/><g clip-path="url(#${id})">${back}<circle cx="32" cy="36" r="23" fill="${f}" stroke="${ln}" stroke-width="1"/>${front}${eye(24)}${eye(40)}${mouth}</g>${ring}</svg>`;
}

// ---------- ห้องประลอง ----------
let selMode = 'teach', sel = null, selSize = 9, selCol = 1, selHc = 0, friendSize = 9;
const hcMax = n => n === 19 ? 9 : n === 7 ? 0 : 5;
const bySid = id => SENSEI.find(s => s.id === id);
const lum = h => { const v = [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
const sizeBtns = (list, cur, attr) => list.map(n => `<button data-${attr}="${n}" aria-pressed="${n === cur}">${n} x ${n}${n === 7 ? ' (สั้นมาก)' : ''}</button>`).join('');
function renderLobby() {
  const rid = recId();
  if (!sel) { sel = rid || SENSEI[0].id; selSize = bySid(sel).n; }
  renderScene(); applyView();
  renderRoster(rid);
  renderDetail();
  clearTimeout(bTimer); bTimer = setTimeout(banterTick, 1200);
  $('#friend-size').innerHTML = sizeBtns([9, 13, 19], friendSize, 'fs');
  paintResume();
  Srv.check().then(() => { if (!$('#lobby').hidden) { renderRoster(recId()); renderDetail(); } });
}
const approx = s => /^\d+ (คิว|ดั้ง)/.test(s.rank) ? 'ประมาณ ' + s.rank : s.rank;
const srvChip = () => `<span class="srv${Srv.online ? ' on' : ''}">${Srv.online ? 'ออนไลน์' : Srv.checked ? 'ออฟไลน์' : 'กำลังตรวจ'}</span>`;
function renderRoster(rid) {
  $('#roster').innerHTML = SENSEI.map(s => { const r = recs[s.id] || { w: 0, l: 0 };
    return `<button class="scard" data-id="${s.id}" aria-pressed="${s.id === sel}">${avatar(s, 48)}<span class="nm">${esc(s.name)}${s.id === rid ? '<span class="tag">แนะนำ</span>' : ''}</span><span class="rk">${esc(s.rank)} ${belt(s)}</span><span class="rec">ชนะ ${r.w} แพ้ ${r.l}${r.tw || r.tl ? ` <small>(สอน ${r.tw || 0}/${r.tl || 0})</small>` : ''}${s.eng === 'server' ? ' ' + srvChip() : ''}</span></button>`; }).join('');
  paintScene(rid);
}

// ---------- ทำไมท่านนี้ถึงได้ระดับนี้ ----------
function proofHtml(s) {
  const how = s.eng === 'basic' ? 'เป็นโปรแกรมกฎพื้นฐาน เดินตามหลักง่าย ๆ (จับกิน หนีอาตาริ กินตา) แล้วสุ่มพลาดบ้างตามระดับ'
    : s.eng === 'server' ? 'ใช้ KataGo รุ่นใหญ่บนเครื่องของสำนัก ค้นหาอ่านล่วงหน้าหลายร้อยรอบต่อตา เปิดเฉพาะตอนเครื่องออนไลน์'
    : s.mode === 'search' ? `ใช้ KataGo ค้นหาอ่านล่วงหน้า (${s.visits || 16} รอบต่อตา) แล้วเลือกตาที่ดีที่สุด`
    : s.mode === 'policy' || (s.temp != null && s.temp <= 0.3 && !s.blunder) ? 'ใช้ KataGo เลือกตาตามสัญชาตญาณที่ฝึกมา เกือบเลือกตาที่ดีที่สุดเสมอ แต่ไม่ได้ค้นหาลึก จึงอาจพลาดเมื่อถูกโจมตีด้วยการอ่านยาว ๆ'
    : `ใช้ KataGo เลือกตาตามสัญชาตญาณ แล้วสุ่มให้พลาดบ้าง และมีโอกาสเดินตาพลาดหนักประมาณ ${Math.round((s.blunder || 0) * 100)}% ของตา`;
  const c = typeof CALIB !== 'undefined' ? CALIB[s.id] : null;
  const test = c ? `<p>ผลทดสอบ: เล่นกับบอทอ้างอิง KataGo ที่จำลองผู้เล่นหลายระดับ รวม <b>${c.n} เกม</b> ชนะ <b>${c.w}</b> เกม</p>
      <div class="pf-chips">${c.by.map(([r, w, n]) => `<span class="pf-chip${w * 2 >= n ? ' ok' : ''}">เจอระดับ ${esc(r.replace('k', ' คิว').replace('d', ' ดั้ง'))}: ชนะ ${w}/${n}</span>`).join('')}</div>
      ${c.hc ? `<p>ทดสอบแบบต่อหมาก: ท่านนี้รับหมากต่อจากบอทที่จำลองผู้เล่น ${c.anchor || '3 ดั้ง'}</p><div class="pf-chips">${c.hc.map(([h, w, n]) => `<span class="pf-chip${w * 2 >= n ? ' ok' : ''}">รับ ${h} เม็ด: ชนะ ${w}/${n}</span>`).join('')}</div><p class="small">${c.hcNote || ''}</p>` : ''}<p>จากผลนี้ ท่านนี้เล่นใกล้เคียงระดับ <b>ประมาณ ${esc(c.est.replace('k', ' คิว').replace('d', ' ดั้ง'))}</b> เมื่อเทียบกับบอทอ้างอิง</p>`
    : '<p>ยังไม่มีผลทดสอบเป็นตัวเลขของท่านนี้</p>';
  return `<details class="proof"><summary>ทำไมท่านนี้ถึงได้ระดับ ${esc(s.rank)}</summary>
    <h3>วิธีเล่นของท่าน</h3><p>${how}</p>
    <h3>ผ่านการทดสอบอะไรมาแล้ว</h3>${test}
    <h3>ควรรู้ไว้</h3><p class="small">ระดับนี้เป็นค่าประมาณจากการทดสอบกับบอท ยังไม่ได้ยืนยันกับผู้เล่นจริง และเกมที่ทดสอบน้อย จึงอาจคลาดเคลื่อนได้ ผู้เล่นที่อ่านหมากเก่งอาจชนะง่ายกว่าป้าย เราจะปรับป้ายเมื่อมีผลใหม่</p></details>`;
}
function renderDetail() {
  const s = bySid(sel), sizes = s.eng === 'basic' ? [7, 9, 13, 19] : [9, 13, 19], off = s.eng === 'server' && !Srv.online, hm = hcMax(selSize);
  if (selHc > hm) selHc = hm;
  const hcList = [0]; for (let k = 2; k <= hm; k++) hcList.push(k);
  const hcSeg = hm ? `<div><p class="lab">หมากต่อ</p><div class="seg" id="hc-seg" role="group" aria-label="หมากต่อ">${hcList.map(k => `<button data-hc="${k}" aria-pressed="${k === selHc}"${k ? ` aria-label="ต่อ ${k} เม็ด"` : ''}>${k || 'ไม่ต่อ'}</button>`).join('')}</div><p class="small">ฝ่ายที่อ่อนกว่าวางหมากดำไว้ก่อนเพื่อให้เกมสูสี</p></div>` : '';
  $('#detail').innerHTML = `<div class="dhead">${avatar(s, 96)}<div><h2>${esc(s.name)}</h2><span>${esc(approx(s))}</span>${belt(s)}${s.eng === 'server' ? srvChip() : ''}</div></div>
    ${proofHtml(s)}<dl class="facts"><dt>ประสบการณ์</dt><dd>${esc(s.exp)}</dd><dt>สไตล์การเดิน</dt><dd>${esc(s.style)}</dd><dt>เหมาะกับ</dt><dd>${esc(s.fit)}</dd><dt>เป้าหมายของคุณ</dt><dd>${esc(s.goal)}</dd><dt>กระดาน</dt><dd>แนะนำ ${s.n} x ${s.n}</dd></dl>
    <div><p class="lab">ขนาดกระดาน</p><div class="seg" id="size-seg" role="group" aria-label="ขนาดกระดาน">${sizeBtns(sizes, selSize, 'sz')}</div></div>
    ${hcSeg}<div><p class="lab">สีของคุณ</p><div class="seg" id="col-seg" role="group" aria-label="สีของคุณ"><button data-col="1" aria-pressed="${(selHc ? 1 : selCol) === 1}"${selHc ? ' disabled' : ''}>ดำ เดินก่อน</button><button data-col="2" aria-pressed="${(selHc ? 1 : selCol) === 2}"${selHc ? ' disabled' : ''}>ขาว</button></div>${selHc ? '<p class="small">เมื่อรับหมากต่อ คุณถือดำเสมอ แต้มชดเชยให้ขาว 0.5</p>' : ''}</div>
    <div><p class="lab">โหมดการเล่น</p><div class="seg" id="md-seg" role="group" aria-label="โหมดการเล่น"><button data-md="teach" aria-pressed="${selMode === 'teach'}">โหมดสอน</button><button data-md="real" aria-pressed="${selMode === 'real'}">โหมดประลองจริง</button></div><p class="small">${selMode === 'teach' ? 'มีคำใบ้สองขั้น ถอยตาได้ ติวเตอร์คอยบอก และถ้าพลาดใหญ่จะเสนอให้ลองตานั้นใหม่ ชัยชนะนับแยกต่างหาก' : 'ไม่มีคำใบ้ ไม่มีถอยตา ไม่มีติวเตอร์ เหมือนแข่งจริง ชัยชนะนับเป็น \u2018ชนะแล้ว\u2019 ของคู่ประลอง'}</p></div>
    <div class="btns"><button class="btn primary" id="start"${off ? ' disabled' : ''}>เริ่มประลอง</button></div>${off ? '<p class="warn">คู่ประลองตัวนี้ใช้เครื่องของสำนัก ตอนนี้เครื่องปิดอยู่ ลองใหม่ภายหลัง หรือเลือกปรมาจารย์มังกรแทน</p>' : ''}`;
  try { const hb = document.createElement('section'); hb.id = 'hall-box'; hb.className = 'hall'; hb.hidden = true; $('#detail').appendChild(hb); Rep.paintHall(s.id, s.name); } catch (e) { }
}
// ---------- ไม้บรรทัดระดับ ----------
// ตำแหน่ง: 30 คิว = 0, 1 คิว = 29, 1 ดั้ง = 30, 7 ดั้ง = 36, โซนอาชีพอยู่หลังรอยตัด
function rankPos(r) {
  let m = /(\d+)\s*คิว/.exec(r); if (m) return 30 - (/ต่ำกว่า/.test(r) ? 25 : +m[1]);
  m = /(\d+)\s*ดั้ง/.exec(r); if (m) return 29 + (+m[1]);
  return null;
}
function rulerSvg() {
  const X0 = 40, U = 17, PRO = 39.5, W = X0 * 2 + PRO * U + 20, AY = 128, ink = 'var(--ink)', mu = 'var(--muted)';
  const px = p => X0 + p * U;
  const ticks = [[0, '30 คิว'], [10, '20 คิว'], [20, '10 คิว'], [29, '1 คิว'], [30, '1 ดั้ง'], [36, '7 ดั้ง']];
  const sen = SENSEI.map(s => ({ s, p: s.eng === 'server' ? null : rankPos(s.rank) })).filter(o => o.p != null);
  const top = SENSEI.filter(s => s.eng === 'server');
  let g = `<line x1="${px(0)}" y1="${AY}" x2="${px(36)}" y2="${AY}" stroke="${mu}" stroke-width="2"/>
    <line x1="${px(37.2)}" y1="${AY}" x2="${px(PRO + 0.6)}" y2="${AY}" stroke="${mu}" stroke-width="2"/>
    <path d="M${px(36.4)} ${AY + 6}l6 -12M${px(36.8)} ${AY + 6}l6 -12" stroke="${mu}" stroke-width="1.5" fill="none"/>`;
  g += ticks.map(([p, t]) => `<line x1="${px(p)}" y1="${AY - 5}" x2="${px(p)}" y2="${AY + 5}" stroke="${mu}"/><text x="${px(p)}" y="${AY + 22}" text-anchor="${p === 29 ? 'end' : p === 30 ? 'start' : 'middle'}" font-size="11" fill="${mu}">${t}</text>`).join('');
  g += `<text x="${px(PRO)}" y="${AY + 22}" text-anchor="middle" font-size="11" fill="${mu}">โปร 9 ดั้ง</text><line x1="${px(PRO)}" y1="${AY - 5}" x2="${px(PRO)}" y2="${AY + 5}" stroke="${mu}"/>`;
  sen.forEach((o, i) => {
    const x = px(o.p), y = AY - 20 - (i % 4) * 22, fill = o.s.fur;
    g += `<line x1="${x}" y1="${y + 4}" x2="${x}" y2="${AY}" stroke="${mu}" stroke-dasharray="2 2"/><circle cx="${x}" cy="${AY}" r="6" fill="${fill}" stroke="${ink}" stroke-width="1.5"/><text x="${x}" y="${y}" text-anchor="middle" font-size="12" fill="${ink}">${esc(o.s.name)}</text>`;
  });
  top.forEach((s, i) => { const x = px(PRO), y = AY - 20 - 4 * 22; g += `<line x1="${x}" y1="${y + 4}" x2="${x}" y2="${AY}" stroke="${mu}" stroke-dasharray="2 2"/><circle cx="${x}" cy="${AY}" r="6" fill="${s.fur}" stroke="${ink}" stroke-width="1.5"/><text x="${x}" y="${y}" text-anchor="end" font-size="12" fill="${ink}">${esc(s.name)} (เหนือโปร)</text>`; });
  const me = youPos();
  if (me != null) { const x = px(me.p); g += `<path d="M${x} ${AY + 8}l-7 12h14z" fill="var(--accent)"/><text x="${x}" y="${AY + 46}" text-anchor="middle" font-size="12" font-weight="700" fill="var(--accent)">คุณ</text>`; }
  [].forEach((m, i) => {
    const x = px(PRO), y = AY + 58 + i * 20;
    g += `<path d="M${x} ${y - 7}l6 6l-6 6l-6 -6z" fill="var(--bad)" stroke="${ink}" stroke-width="1"/><text x="${x - 12}" y="${y + 4}" text-anchor="end" font-size="12" fill="${ink}">${esc(m.name)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${AY + 58 + MASTERS.length * 20 + 6}" width="${W}" role="img" aria-labelledby="rl-t rl-d" focusable="false"><title id="rl-t">ไม้บรรทัดระดับ</title><desc id="rl-d">แกนจาก 30 คิวถึงสมัครเล่น 7 ดั้ง แล้วต่อด้วยโซนมืออาชีพ 9 ดั้ง พร้อมตำแหน่งคู่ประลอง รายละเอียดอยู่ในรายการด้านล่าง</desc>${g}</svg>`;
}
// ระดับโดยประมาณของผู้เล่น: ใช้เฉพาะเมื่อโปรไฟล์มีระดับจริง (ตอนนี้แบบวัดความรู้ไม่เก็บระดับ จึงไม่แสดงเครื่องหมาย)
function youPos() { const r = typeof profile !== 'undefined' && profile && profile.skill; return r && typeof r.rank === 'string' && rankPos(r.rank) != null ? { p: rankPos(r.rank) } : null; }
function rulerBlock() {
  const li = SENSEI.map(s => `<li>${esc(s.name)}: ${esc(s.rank)}</li>`).join('') + [].map(m => `<li>${esc(m.name)}: ${m.id === 'ai' ? 'โปรแกรม (AlphaGo ได้ 9 ดั้งกิตติมศักดิ์จากสมาคมหมากล้อมจีน)' : 'มืออาชีพ 9 ดั้ง'}</li>`).join('');
  return `<h3>ไม้บรรทัดระดับ</h3><div class="ruler" tabindex="0" role="group" aria-label="ไม้บรรทัดระดับ เลื่อนซ้ายขวาได้">${rulerSvg()}</div>
    <details class="rl-alt"><summary>อ่านเป็นรายการ</summary><ul>${li}</ul></details>
    <p class="small rl-note">การแปลงคะแนนเป็นระดับเป็นค่าประมาณ ระบบคะแนนของสหพันธ์หมากล้อมยุโรป (EGF) กำหนดให้ห่างกันระดับละ 100 คะแนน และ 1 ดั้งอยู่ราว 2100 ระบบอื่นไม่เท่ากันทุกแห่ง ตำแหน่งของคู่ประลองมาจากป้ายระดับในแอป ซึ่งเป็นค่าประมาณ ยังไม่ได้ยืนยันกับผู้เล่นจริง ส่วนโปรทุกคนอยู่ในโซนเดียวกัน ไม่ได้เรียงตามฝีมือ <a href="https://www.europeangodatabase.eu/EGD/EGF_rating_system.php" target="_blank" rel="noopener">แหล่งที่มา: europeangodatabase.eu/EGD/EGF_rating_system.php</a></p>`;
}
function renderExplain() {
  $('#explain').innerHTML = `<p>ระดับนับเป็นคิวและดั้ง คิวนับถอยหลังจาก 30 ลงไปถึง 1 แล้วจึงเป็นดั้งที่นับขึ้น สมัครเล่นไปถึงราว 7 ดั้ง ส่วนอาชีพมี 1 ถึง 9 ดั้งของตัวเอง</p>
    <div class="ladder">${LADDER.map(([a, b, c]) => `<div style="background:${c};color:${lum(c) > 150 ? '#16211D' : '#fff'}"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('')}</div>
    <p>สายสีในแอปเป็นการเปรียบเทียบแบบศิลปะต่อสู้ เพื่อให้จำง่าย ไม่ใช่ระบบสายของหมากล้อมจริง</p>
    <p>ระดับของคู่ประลองวัดจากการแข่งกับ KataGo รุ่นจำลองฝีมือมนุษย์หลายสิบกระดานต่อตัว จึงเป็นค่าประมาณ ยังไม่ได้ยืนยันกับผู้เล่นจริง ถ้าคุณรู้สึกว่าตัวไหนเก่งหรืออ่อนกว่าป้าย บอกเราได้เลย</p>${rulerBlock()}`;
}
// ---------- ลานสำนัก (ฉากประลอง) ----------
const ZONES = [
  { id: 'bamboo', name: 'ศาลาไผ่ร่มเย็น', range: 'ต่ำกว่า 20 – 20 คิว', ids: ['s1', 's2'] },
  { id: 'tea', name: 'เรือนชาใบเมี่ยง', range: '16–10 คิว', ids: ['s3', 's4', 's5'] },
  { id: 'hall', name: 'หอกระเบื้องดำ', range: '7 คิว – 2 ดั้ง', ids: ['s6', 's7', 's8'] },
  { id: 'shrine', name: 'ศาลเจ้าเขาเมฆา', range: '4 ดั้งขึ้นไป', ids: ['s9', 's10'] }
];
// p: ท่า (walk เดินเล่น, tea ดื่มชา, board นั่งหน้ากระดาน) x: ตำแหน่งแนวนอน % b: ระยะจากพื้นฉาก d: ระยะเดิน t: วินาทีต่อรอบ
const POSE = {
  s1: { p: 'walk', x: 28, b: 14, d: 30, t: 9 }, s2: { p: 'tea', x: 72, b: 34 },
  s3: { p: 'walk', x: 18, b: 10, d: 14, t: 18 }, s4: { p: 'tea', x: 50, b: 46 }, s5: { p: 'board', x: 82, b: 10 },
  s6: { p: 'walk', x: 18, b: 10, d: 16, t: 8 }, s7: { p: 'tea', x: 50, b: 46 }, s8: { p: 'board', x: 82, b: 10 },
  s9: { p: 'tea', x: 30, b: 30 }, s10: { p: 'walk', x: 68, b: 14, d: 20, t: 11 }
};
const BANTER = {
  s1: ['ลมหายใจคืออะไรนะ เมื่อกี้ยังเห็นอยู่เลย', 'หมากของหนูหายไปไหน อ้าว โดนกินไปแล้ว', 'หมากหนึ่งเม็ดมีลมหายใจได้มากสุดสี่จุด คือจุดว่างที่ติดกัน', 'ลมหายใจเหลือหนึ่งเรียกว่าอาตาริ ต้องรีบหนีหรือรีบต่อ'],
  s2: ['เห็นอาตาริปุ๊บ กระโดดหนีปั๊บ ตามประสากระต่าย', 'เดินเร็วจนลืมคิด ขอย้อนตานึงได้ไหม', 'ก่อนไล่กิน นับลมหายใจของทั้งสองฝ่ายก่อนเสมอ', 'หมากที่ถูกอาตาริ ไม่ต้องหนีเสมอไป บางทีต่อออกมาได้'],
  s3: ['ช้า ๆ ได้พร้าเล่มงาม แต่ชาเย็นหมดแล้ว', 'ตานี้ขอคิดหน่อย... ขอเวลาอีกสามนาที', 'เปิดเกมให้เล่นมุมก่อน แล้วค่อยข้าง แล้วค่อยกลางกระดาน', 'อย่าวางเส้นที่หนึ่งเร็วเกินไป ตอนต้นเกมได้แต้มน้อยมาก'],
  s4: ['เห็นช่องให้ตัด หางก็กระดิกเอง ห้ามไม่อยู่', 'ตัดแล้วตัดอีก เส้นกระดานจะบางหมดแล้วนะ', 'จุดสำคัญของคู่ต่อสู้ ก็คือจุดสำคัญของเราด้วย', 'ก่อนไล่บันได ดูก่อนว่าทางข้างหน้าโล่ง ไม่มีหมากฝ่ายหนีขวางอยู่'],
  s5: ['ฮู้ ๆ คิดมาดีแล้ว ว่าตานี้ควรไปนอน', 'ตากลมก็จริง แต่ยังมองไม่เห็นหมากตัวเองที่กำลังจะตาย', 'มุมก่อน ข้างต่อ กลางสุดท้าย เพราะมุมใช้หมากน้อยแต่ได้ที่มาก', 'อย่าเดินตามคู่ต่อสู้ไปทุกตา ให้เดินตามแผนของตัวเอง'],
  s6: ['คำรามทีเดียว คู่ต่อสู้ใจสั่น ส่วนฉันก็ใจสั่นด้วย', 'โจมตีทุกตาจนลืมไปว่าหมากตัวเองยังไม่ต่อ', 'กลุ่มหมากต้องมีสองตา จึงจะอยู่ได้แน่นอน', 'ก่อนสู้ นับลมหายใจให้ครบ ใครน้อยกว่าคนนั้นเสียเปรียบ'],
  s7: ['...ไม่ได้ไม่สนใจนะ แค่ไม่แสดงออก', 'เคาะกระดานได้ แต่อย่าลูบหัวฉัน', 'ก่อนวางทุกตา ถามตัวเองว่า ตานี้ใหญ่ที่สุดแล้วหรือยัง', 'ไม่รู้จะเดินตรงไหน ลองดูว่าคู่ต่อสู้อยากเดินตรงไหนที่สุด'],
  s8: ['ยืนขาเดียวคิดมาสิบนาที ขาชาแล้วแต่ยังไม่ถึงตาเดิน', 'บินได้นะ แต่ชอบนั่งอ่านเกมมากกว่า', 'สองตาจริงที่แยกจากกัน คือหัวใจของการอยู่รอด', 'นำอยู่ให้เล่นเรียบง่าย ตามอยู่ค่อยเสี่ยง แต่ต้องนับแต้มให้เป็นก่อน'],
  s9: ['ไฟไหม้ศาลา เหรอ ช่างเถอะ ชายังอุ่นอยู่', 'เมื่อวานแพ้ วันนี้อาจแพ้ แต่ชาอร่อยเหมือนเดิม', 'หมากเล็กที่ช่วยไม่ได้ ทิ้งไปแล้วเอาตาใหญ่แทนได้', 'แพ้ไม่ใช่เรื่องใหญ่ ทบทวนกระดานแล้วจะเก่งขึ้นทุกครั้ง'],
  s10: ['ฉันอยู่บนเครื่องของสำนัก ถ้าฉันหลับ แปลว่าปลั๊กหลุด', 'คิดได้เป็นล้านทางแต่ยังชอบชาธรรมดา', 'จบเกมแล้วอย่าลืมทบทวน ดูว่าตาไหนเสียแต้มมากที่สุด', 'กระดานใหญ่ยังมีที่ว่างเยอะ อย่ารีบปิดเกมเร็วเกินไป']
};
const F = v => `style="fill:var(--c-${v})"`;
function bodySvg(s, pose, zi, dl) {
  const robe = `style="fill:var(--c-robe${zi})"`, dk = 'stroke="#00000055" stroke-width="1"';
  const sash = (x, y, w) => `<rect x="${x}" y="${y}" width="${w}" height="5" rx="1.5" fill="${s.bc}" ${dk}/>` + (s.bc2 ? `<rect x="${x + w * .62}" y="${y}" width="${w * .38}" height="5" fill="${s.bc2}"/>` : '');
  const open = w => `<svg class="bd" width="${w}" height="${w === 46 ? 42 : 46}" viewBox="0 0 ${w} ${w === 46 ? 42 : 46}" aria-hidden="true" focusable="false">`;
  if (pose === 'walk') return open(46) + `<ellipse cx="8" cy="25" rx="4.5" ry="9" ${robe} ${dk}/><ellipse cx="38" cy="25" rx="4.5" ry="9" ${robe} ${dk}/><path d="M9 42L13 8Q23 1 33 8L37 42Z" ${robe} ${dk}/>${sash(13, 22, 20)}<rect x="19" y="27" width="4" height="9" rx="1" fill="${s.bc}" ${dk}/></svg>`;
  let g = open(84) + `<path d="M18 42Q16 12 42 6Q68 12 66 42Z" ${robe} ${dk}/>${sash(26, 22, 32)}`;
  if (pose === 'tea') g += `<rect x="6" y="32" width="72" height="6" rx="2" ${F('wood')} ${dk}/><rect x="12" y="38" width="5" height="8" ${F('wood2')}/><rect x="67" y="38" width="5" height="8" ${F('wood2')}/>`
    + `<ellipse cx="24" cy="29" rx="6" ry="4" ${F('red')} ${dk}/><path d="M29 27l5-3" stroke="var(--c-red)" stroke-width="2" stroke-linecap="round"/>`
    + (s.id === 's7' ? '' : `<g class="steam" style="animation-delay:${dl}s"><path d="M55 20q-3-3 0-6t0-6M60 20q-3-3 0-6" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".85"/></g>`)
    + `<g class="cup" style="animation-delay:${dl}s"><rect x="52" y="24" width="11" height="8" rx="2" fill="#F5F1E8" ${dk}/><path d="M63 26q4 0 0 4" fill="none" stroke="#F5F1E8" stroke-width="1.6"/><ellipse cx="58" cy="22" rx="7" ry="4.5" ${robe} ${dk}/></g>`;
  else g += `<path d="M8 42L16 29H68L76 42Z" ${F('board')} ${dk}/><path d="M13 35H71M10 38.5H74M26 29L22 42M42 29V42M58 29L62 42" stroke="#0006" stroke-width=".7" fill="none"/>`
    + `<circle cx="33" cy="33" r="2.4" fill="#1b1b1e"/><circle cx="43" cy="37" r="2.4" fill="#fff" ${dk}/><circle cx="52" cy="32" r="2.4" fill="#1b1b1e"/><circle cx="37" cy="39" r="2.4" fill="#fff" ${dk}/><ellipse cx="28" cy="27" rx="6" ry="4" ${robe} ${dk}/><ellipse cx="56" cy="27" rx="6" ry="4" ${robe} ${dk}/>`;
  return g + '</svg>';
}
function zoneArt(id) {
  const st = (v) => `style="stroke:var(--c-${v})"`;
  let o = `<defs><linearGradient id="sk-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--c-skyA)"/><stop offset="1" style="stop-color:var(--c-skyB)"/></linearGradient></defs><rect x="-100" y="-200" width="600" height="380" fill="url(#sk-${id})"/>`;
  const lamp = (x, y) => `<circle cx="${x}" cy="${y + 8}" r="26" style="fill:var(--c-lant);opacity:var(--c-glow)"/><path d="M${x} ${y - 14}V${y}" ${st('wood2')} stroke-width="1.5"/><ellipse cx="${x}" cy="${y + 8}" rx="8" ry="10" ${F('lant')} stroke="#0004"/><path d="M${x - 5} ${y + 1}h10M${x - 6} ${y + 8}h12M${x - 5} ${y + 15}h10" stroke="#0004" stroke-width=".8"/>`;
  if (id === 'bamboo') {
    o += `<path d="M-100 170Q60 112 180 150T500 138V175H-100Z" ${F('hill')}/><path d="M-100 175Q100 138 260 162T500 152V180H-100Z" ${F('hill2')}/><rect x="-100" y="162" width="600" height="140" ${F('grass')}/><ellipse cx="200" cy="232" rx="175" ry="30" ${F('dirt')}/>`
      + `<rect x="94" y="150" width="212" height="10" rx="2" ${F('wood2')}/><rect x="104" y="88" width="9" height="62" ${F('wood')}/><rect x="287" y="88" width="9" height="62" ${F('wood')}/><rect x="98" y="86" width="204" height="7" ${F('wood2')}/>`
      + `<path d="M76 92L200 46L324 92Q200 80 76 92Z" ${F('roof')}/><path d="M76 92Q200 80 324 92V99Q200 88 76 99Z" ${F('roof2')}/>` + lamp(200, 104);
    [16, 38, 362, 384].forEach((x, i) => { o += `<rect x="${x}" y="-20" width="7" height="200" rx="3" ${F('leaf')}/>`; [24, 70, 116, 160].forEach(y => { o += `<rect x="${x - 1}" y="${y}" width="9" height="2.5" ${F('leaf2')}/>`; });
      o += `<ellipse cx="${x + (i < 2 ? 18 : -18)}" cy="${50 + i * 14}" rx="14" ry="3.5" transform="rotate(${i < 2 ? 22 : -22} ${x} ${50 + i * 14})" ${F('leaf2')}/><ellipse cx="${x + (i < 2 ? 16 : -16)}" cy="${108 - i * 8}" rx="13" ry="3.5" transform="rotate(${i < 2 ? -18 : 18} ${x} ${108 - i * 8})" ${F('leaf2')}/>`; });
  } else if (id === 'tea') {
    o += `<path d="M-100 160Q80 110 220 150T500 140V170H-100Z" ${F('hill')}/><rect x="-100" y="164" width="600" height="140" ${F('dirt')}/>`
      + `<rect x="20" y="72" width="360" height="98" ${F('wall')}/><path d="M-6 82L52 36H348L406 82Q200 70 -6 82Z" ${F('roof')}/><path d="M-6 82Q200 70 406 82V90Q200 78 -6 90Z" ${F('roof2')}/>`
      + `<rect x="20" y="88" width="8" height="82" ${F('wood')}/><rect x="372" y="88" width="8" height="82" ${F('wood')}/><rect x="190" y="88" width="8" height="82" ${F('wood')}/>`;
    [[40, 'cloud'], [300, 'cloud']].forEach(([x, c]) => { o += `<rect x="${x}" y="104" width="62" height="52" ${F(c)} opacity=".85"/><path d="M${x + 31} 104V156M${x} 130H${x + 62}" ${st('wood')} stroke-width="2"/>`; });
    o += `<rect x="110" y="88" width="70" height="40" ${F('red')} opacity=".95"/><path d="M127 88V128M144 88V128M162 88V128" stroke="#0004"/><rect x="210" y="88" width="70" height="40" ${F('red')} opacity=".95"/><path d="M227 88V128M244 88V128M262 88V128" stroke="#0004"/>`
      + lamp(70, 96) + lamp(330, 96)
      + [[80, 214], [135, 232], [190, 246], [250, 232], [310, 214]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="22" ry="6" ${F('stone')}/>`).join('')
      + `<circle cx="380" cy="168" r="20" ${F('leaf')}/><circle cx="362" cy="178" r="16" ${F('leaf2')}/><circle cx="14" cy="176" r="18" ${F('leaf')}/>`;
  } else if (id === 'hall') {
    o += `<rect x="-100" y="164" width="600" height="140" ${F('stone')}/><path d="M200 164L-60 270M200 164L60 270M200 164L200 270M200 164L340 270M200 164L460 270M-100 190H500M-100 222H500" stroke="#0003" stroke-width="1" fill="none"/>`
      + `<rect x="-10" y="70" width="420" height="96" ${F('tile2')}/><path d="M-12 84L38 28H362L412 84Z" ${F('tile')}/><path d="M60 28L40 84M100 28L90 84M140 28L130 84M180 28L172 84M220 28L228 84M260 28L270 84M300 28L310 84M340 28L360 84" stroke="#0006" stroke-width="1.4"/><path d="M-12 84H412V92H-12Z" ${F('roof2')}/>`
      + [40, 150, 250, 360].map(x => `<rect x="${x - 6}" y="92" width="12" height="76" ${F('red')}/>`).join('')
      + `<rect x="170" y="102" width="60" height="66" fill="#0009"/><path d="M200 102V168" stroke="#0007"/><rect x="164" y="94" width="72" height="9" rx="2" ${F('wood')}/>` + lamp(98, 100) + lamp(302, 100);
  } else {
    o += `<path d="M-60 170L60 62L130 126L226 36L330 128L384 86L470 170Z" ${F('mount')}/><path d="M-60 176L20 110L90 150L160 100L250 150L330 120L470 176Z" ${F('mount2')}/><path d="M226 36L204 62L220 58L232 68L246 56Z M60 62L46 78L58 74L66 82L74 74Z" ${F('snow')}/>`
      + `<ellipse cx="90" cy="60" rx="34" ry="8" ${F('cloud')} opacity=".8"/><ellipse cx="116" cy="54" rx="22" ry="7" ${F('cloud')} opacity=".8"/><ellipse cx="320" cy="48" rx="30" ry="7" ${F('cloud')} opacity=".8"/>`
      + `<rect x="-100" y="164" width="600" height="140" ${F('stone')}/><path d="M120 270L150 200H250L280 270Z" ${F('stone2')}/><path d="M138 232H262M130 252H270" stroke="#0004"/>`
      + `<rect x="132" y="76" width="9" height="96" ${F('red')}/><rect x="259" y="76" width="9" height="96" ${F('red')}/><path d="M114 72Q200 62 286 72L282 84Q200 74 118 84Z" ${F('red')}/><rect x="126" y="98" width="148" height="7" ${F('red')}/>`
      + `<rect x="352" y="140" width="8" height="34" ${F('wood2')}/><path d="M356 96L334 130H378ZM356 114L328 150H384Z" ${F('leaf')}/>`
      + `<rect x="46" y="146" width="12" height="26" ${F('stone2')}/><rect x="42" y="138" width="20" height="9" ${F('stone2')}/><rect x="48" y="130" width="8" height="8" style="fill:var(--c-lant)"/>`
      + `<circle cx="52" cy="134" r="22" style="fill:var(--c-lant);opacity:var(--c-glow)"/>`;
  }
  return `<svg class="bg" viewBox="0 0 400 270" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">${o}</svg>`;
}
function charBtn(s, zi, n) {
  const P = POSE[s.id], walk = P.p === 'walk', srv = s.eng === 'server';
  return `<button class="ch ps-${P.p}" data-id="${s.id}" aria-pressed="false" aria-label="${esc(s.name)} ${esc(s.rank)}" style="left:calc(${P.x}% - 55px);bottom:${P.b}px;z-index:${100 - P.b}${walk ? `;--d:${P.d}px;--t:${P.t}s` : ''}">
    <span class="tg"><span class="recbadge" hidden>แนะนำ</span><b>${esc(s.name)}</b><span class="rk"><i class="dot" style="background:${beltCss(s)}"></i>${esc(s.rank)}</span>${srv ? '<span class="tsrv"></span>' : ''}</span>
    ${avatar(s, 52)}${bodySvg(s, P.p, zi, (n * 1.7).toFixed(1))}</button>`;
}
function renderScene() {
  let n = 0;
  $('#courtyard').innerHTML = ZONES.map((z, i) => `<section class="zone" aria-labelledby="zn-${z.id}"><header class="zsign"><h2 id="zn-${z.id}">${esc(z.name)}</h2><span class="rng">${esc(z.range)}</span></header>
    <div class="scene">${zoneArt(z.id)}${z.ids.map(id => charBtn(bySid(id), i + 1, n++)).join('')}</div></section>`).join('');
}
function paintScene(rid) {
  if (rid === undefined) rid = recId();
  document.querySelectorAll('#courtyard .ch').forEach(b => { b.setAttribute('aria-pressed', String(b.dataset.id === sel)); b.querySelector('.recbadge').hidden = b.dataset.id !== rid; });
  const t = document.querySelector('#courtyard .tsrv');
  if (t) { t.className = 'tsrv' + (Srv.online ? ' on' : ''); t.textContent = Srv.online ? 'ออนไลน์' : Srv.checked ? 'ออฟไลน์' : 'กำลังตรวจ'; }
}
let lobbyView = store.get('go-lobbyview', 'scene') === 'list' ? 'list' : 'scene';
function applyView() {
  $('#lobby').classList.toggle('scene-mode', lobbyView === 'scene');
  $('#courtyard').hidden = lobbyView !== 'scene';
  $('#view-toggle').textContent = lobbyView === 'scene' ? 'ดูแบบรายชื่อ' : 'ดูแบบลานสำนัก';
}
$('#view-toggle').onclick = () => { lobbyView = lobbyView === 'scene' ? 'list' : 'scene'; store.set('go-lobbyview', lobbyView); applyView(); };
$('#courtyard').onclick = e => {
  const b = e.target.closest('.ch'); if (!b) return;
  sel = b.dataset.id; selSize = bySid(sel).n; paintScene(); renderDetail();
  if (innerWidth <= 820 || innerHeight <= 520) $('#detail').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion:reduce)').matches ? 'auto' : 'smooth' });
};
// คำพูดลอยเหนือหัว: ทีละคน ราว 4 วินาที
let bTimer = 0, bHide = 0, bLast = '', bLine = '', bubEl = null;
function banterTick() {
  clearTimeout(bTimer);
  const lob = $('#lobby'), pv = $('#v-play');
  if (lob && !lob.hidden && pv && !pv.hidden && !document.hidden && lobbyView === 'scene') banterSay();
  bTimer = setTimeout(banterTick, 5400);
}
function banterSay() {
  const all = [...document.querySelectorAll('#courtyard .ch')].filter(b => b.dataset.id !== bLast);
  if (!all.length) return;
  const b = all[Math.floor(Math.random() * all.length)], id = b.dataset.id, lines = BANTER[id].filter(l => l !== bLine);
  const line = lines[Math.floor(Math.random() * lines.length)], zone = b.closest('.scene');
  document.querySelectorAll('#courtyard .ch.talk').forEach(x => x.classList.remove('talk'));
  if (!bubEl) { bubEl = document.createElement('div'); bubEl.className = 'bub'; bubEl.setAttribute('aria-hidden', 'true'); }
  zone.appendChild(bubEl); bubEl.classList.remove('show'); bubEl.textContent = line; bubEl.style.left = '0px';
  const zr = zone.getBoundingClientRect(), br = b.getBoundingClientRect(), cx = br.left + br.width / 2 - zr.left, w = bubEl.offsetWidth;
  const left = Math.max(6, Math.min(cx - w / 2, zr.width - w - 6));
  bubEl.style.left = left + 'px'; bubEl.style.setProperty('--tx', Math.max(14, Math.min(cx - left, w - 14)) + 'px');
  bubEl.classList.add('show'); b.classList.add('talk'); bLast = id; bLine = line;
  clearTimeout(bHide); bHide = setTimeout(() => { bubEl.classList.remove('show'); b.classList.remove('talk'); }, 4200);
}
document.addEventListener('visibilitychange', () => { $('#courtyard').classList.toggle('paused', document.hidden); });
$('#roster').onclick = e => {
  const b = e.target.closest('.scard'); if (!b) return;
  sel = b.dataset.id; selSize = bySid(sel).n;
  document.querySelectorAll('#roster .scard').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  paintScene(); renderDetail();
};
$('#detail').onclick = e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.disabled) return;
  if (t.dataset.md) { selMode = t.dataset.md; renderDetail(); const nb = $(`#detail [data-md="${selMode}"]`); if (nb) nb.focus(); return; }
  if (t.dataset.sz || t.dataset.hc) {
    if (t.dataset.sz) selSize = +t.dataset.sz; else selHc = +t.dataset.hc;
    const a = t.dataset.sz ? 'sz' : 'hc', v = t.dataset[a]; renderDetail(); const nb = $(`#detail [data-${a}="${v}"]`); if (nb) nb.focus();
  }
  else if (t.dataset.col) { selCol = +t.dataset.col; t.parentNode.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === t))); }
  else if (t.id === 'start') { const s = bySid(sel); if (s.eng === 'server' && !Srv.online) return; startGame(s, selSize, selCol, null, { hc: selHc, mode: selMode }); }
};
$('#friend-size').onclick = e => { const t = e.target.closest('button'); if (!t) return; friendSize = +t.dataset.fs; t.parentNode.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === t))); };
$('#friend-start').onclick = () => startGame(null, friendSize, 1, null, {});

// ---------- หน้าเกม ----------
const GB = $('#play-board');
let hintBusy = false, gmode = 'teach', hintStage = 0, hintPt = -1, redoNo = 0, G, S = null, human = 1, token = 0, over = null, dead = new Set(), busy = false, rec = [], pre = null, fresh = -1, hintIdx = -1, review = null, degraded = false, kataOK = false, tutorMsg = '', retry = false, lastSgf = '', HC = 0, prac = null, pracSaved = null, lastRec = null;
const hcN = () => HC ? 2 * HC - 1 : 0, mno = () => G.moves.length - hcN(), undoBase = () => prac ? prac.moves.length : hcN();
function hcPoints(n, hc) {
  const e = n === 9 ? 2 : 3, lo = e, hi = n - 1 - e, mid = n >> 1, P = (x, y) => y * n + x;
  const cor = [P(hi, lo), P(lo, hi), P(hi, hi), P(lo, lo)], L = P(lo, mid), Rr = P(hi, mid), T = P(mid, lo), B = P(mid, hi), Cc = P(mid, mid);
  if (hc <= 4) return cor.slice(0, hc);
  return [5, 7, 9].includes(hc) ? cor.concat(hc === 5 ? [Cc] : hc === 7 ? [L, Rr, Cc] : [L, Rr, T, B, Cc]) : cor.concat(hc === 6 ? [L, Rr] : [L, Rr, T, B]);
}
function setupHandicap(g, hc) {
  const pts = hcPoints(g.n, hc);
  pts.forEach((p, k) => { g.play(p); if (k < pts.length - 1) g.pass(); });
  g.passes = 0; g.ko = -1;
}
const cname = c => c === 1 ? 'ดำ' : 'ขาว';
const delay = ms => new Promise(r => setTimeout(r, ms));
const gfb = t => { $('#play-fb').textContent = t; };
const tutor = t => { if ((prac && prac.lock) || gmode === 'real') return; $('#tutor-text').textContent = t; };
const usesAI = s => !!s && (s.eng === 'kata' || s.eng === 'server');
const isKata = () => usesAI(S) && kataOK && !degraded;
const engine = () => S.eng === 'server' ? Srv : Kata;
const preVis = () => S.eng === 'server' ? 60 : 16;
function srvDrop() {
  retry = true; $('#gnote').hidden = false;
  $('#gnote').textContent = `การเชื่อมต่อกับเครื่องของสำนักหลุด ${S.name}ยังไม่ได้ตอบ กดปุ่มลองเดินตานี้ใหม่เพื่อเรียกอีกครั้ง`;
  gfb(''); renderGame();
}
const botToMove = () => !!S && G.turn !== human;

async function startGame(s, n, col, res, opt = {}) {
  if(!res && !opt.prac && G && recordAudit && !prac && !over?.final && mno()>0) recordSave(true);
  const my = ++token;
  if (deep) deep.run++;
  prac = opt.prac || null;
  if (!prac) { pracSaved = null; deep = null; lastRec = null; }
  HC = s ? (res ? res.hc : prac ? prac.hc : opt.hc) || 0 : 0;
  S = s; human = s ? (HC ? 1 : col) : 1; G = new Go(n, res ? res.komi : prac ? prac.komi : HC ? 0.5 : n === 19 ? 7.5 : 6.5);
  if (prac) gmode = 'teach';
  else if (res) { const gm = store.get('go-gmode', null); gmode = gm && gm.mode === 'teach' && gm.sid === (s ? s.id : null) && gm.n === n && gm.col === human ? 'teach' : 'real'; }
  else { gmode = !s || opt.mode !== 'real' ? 'teach' : 'real'; store.set('go-gmode', { mode: gmode, sid: s ? s.id : null, n, col: human }); }
  over = null; dead = new Set(); busy = false; rec = []; pre = null; fresh = -1; hintIdx = -1; hintStage = 0; hintPt = -1; redoNo = 0; review = null; degraded = !!(res && res.degraded); kataOK = false; retry = false;
  $('.tutor').hidden = gmode === 'real'; $('#tutor-act').hidden = true;
  if (res) replayInto(res);
  else if (prac) { for (const m of prac.moves) m < 0 ? G.pass() : G.play(m); if (HC) G.passes = 0; fresh = G.last; }
  else { if (HC) setupHandicap(G, HC); clearGame(); }
  recordAudit = prac ? null : RecordLogic.begin(G,hcN(),res?.audit); recordSync();
  $('#pbanner').hidden = !prac;
  GB._cur = (n >> 1) * n + (n >> 1); GB._kb = false;
  $('#lobby').hidden = true; $('#game').hidden = false; $('#review').hidden = true; $('#gnote').hidden = true; window.scrollTo(0, 0);
  $('#ghead').innerHTML = (S ? `${avatar(S, 48)}<div class="who"><b>${esc(S.name)}</b><span class="small">${esc(S.rank)} vs ${esc(pn())} (ถือ${cname(human)})${HC ? ' · ต่อ ' + HC + ' เม็ด' : ''}</span>${prac ? '' : modeTag(gmode)}</div>`
    : `<div class="who"><b>เล่นกับเพื่อน</b><span class="small">ผลัดกันเดินบนเครื่องเดียวกัน</span></div>`)
    + `<button class="btn" id="g-back">เลือกคู่อื่น</button><button class="btn" id="g-restart">เริ่มเกมใหม่</button><div class="ask" id="leave-ask" hidden><p>ออกจากเกมนี้ใช่ไหม</p><div class="btns"><button class="btn primary" id="ask-later">เล่นต่อภายหลัง</button><button class="btn" id="ask-resign">ยอมแพ้</button><button class="btn" id="ask-cancel">ยกเลิก</button></div></div><div class="small" id="gline" style="flex-basis:100%"></div>`;
  tutor(prac ? 'ลองเดินใหม่จากตำแหน่งนี้ แล้วติวเตอร์จะบอกว่าดีกว่าตาเดิมในเกมจริงหรือไม่' : res ? 'ต่อเกมที่ค้างไว้ได้เลย' : usesAI(S) ? 'เซนเซจะบอกว่าแต่ละตาเดินได้ดีแค่ไหน กดขอคำใบ้ได้เมื่อไม่แน่ใจ'
    : n <= 9 ? 'เริ่มได้เลย ลองเปิดใกล้จุดกลางหรือจุดดาว แล้วดูลมหายใจของหมากทุกตา' : 'เริ่มได้เลย ช่วงเปิดเกมให้จับมุมก่อน แล้วขยายไปข้าง เส้นที่ 3 และ 4 คุ้มที่สุด');
  gfb('');
  if (S && S.eng === 'server') {
    busy = true; gfb('กำลังเชื่อมต่อเครื่องของสำนัก'); renderGame();
    const ok = await Srv.check(); if (my !== token) return;
    busy = false; gfb('');
    if (!ok) { toLobby(); return; }
    kataOK = true;
  } else if (S && S.eng === 'kata') {
    busy = true; gfb('กำลังเรียกเซนเซ ครั้งแรกใช้เวลาสักครู่'); renderGame();
    try { await Kata.init(); if (my !== token) return; kataOK = true; } catch (e) { if (my !== token) return; degraded = true; }
    if (my !== token) return;
    busy = false; gfb('');
    if (degraded) { $('#gnote').hidden = false; $('#gnote').textContent = `เครื่องนี้โหลดเอนจินระดับสูงไม่สำเร็จ เกมนี้จึงเล่นต่อด้วยคอมพื้นฐาน ${S.name}กำลังเล่นต่ำกว่าระดับ ${S.rank} ที่แสดงไว้ และถ้าชนะกระดานนี้จะไม่นับเป็นสถิติ`; }
  }
  renderGame();
  if (res && G.passes >= 2) return endScoring();
  if (botToMove()) botTurn(); else startPre();
}
const modeTag = m => `<span class="mtag ${m}">${m === 'real' ? 'ประลองจริง' : 'โหมดสอน'}</span>`;
function gameTitle() { return !over ? `ตาที่ ${mno() + 1} · ${cname(G.turn)}เดิน${S ? (G.turn === human ? ' (คุณ)' : '') : ''}` : ''; }
function renderGame() {
  const sc = over && over.type === 'score' && !over.pending ? G.score(dead) : null;
  if (review) {
    const rings = review.idx >= 0 ? [{ i: review.idx, color: '#dc2626' }] : []; if (review.best >= 0 && review.best !== review.idx) rings.push({ i: review.best, color: '#2563eb' });
    drawBoard(GB, { n: G.n, grid: review.before, rings });
  } else drawBoard(GB, { n: G.n, grid: G.grid, last: G.last, fresh, hints: hintIdx >= 0 ? [hintIdx] : [], area: hintStage === 1 && hintPt >= 0 ? hintArea(hintPt) : null, terr: sc && sc.terr, dead: sc ? dead : null });
  const myTurn = !over && !busy && !review && (!S || G.turn === human), canTap = myTurn || (!!over && over.type === 'score' && !over.pending && !over.final && !review);
  GB.classList.toggle('static', !canTap);
  $('#gline').innerHTML = `<span class="st ${G.turn === 1 ? 'b' : 'w'}" style="display:inline-block;vertical-align:middle;margin-right:6px"></span>${cname(G.turn)}เดิน · กินได้ ดำ ${G.caps[1]} ขาว ${G.caps[2]} · แต้มชดเชยให้ขาว ${G.komi}`;
  const t = $('#turn');
  if (review) t.textContent = review.label || `กำลังดูตำแหน่งก่อนตาที่ ${review.no}`;
  else if (over && over.res) t.textContent = 'จบเกม ' + over.res.text;
  else if (over && over.type === 'score') { const d = sc ? sc.b - sc.w : 0; t.textContent = over.pending ? 'กำลังนับพื้นที่' : `ผลนับเบื้องต้น ${d > 0 ? 'ดำ' : 'ขาว'}ชนะ ${Math.abs(d)} แต้ม`; }
  else if (busy && S) t.textContent = `${S.name}กำลังคิด`;
  else t.innerHTML = `<span class="st ${G.turn === 1 ? 'b' : 'w'}"></span>${esc(gameTitle())}`;
  $('#tally').innerHTML = sc
    ? `<tr><td>ดำ (หมาก + พื้นที่)</td><td>${sc.b}</td></tr><tr><td>ขาว (รวมแต้มชดเชยให้ขาว ${G.komi})</td><td>${sc.w}</td></tr>`
    : `<tr><td>ดำกินได้</td><td>${G.caps[1]} เม็ด</td></tr><tr><td>ขาวกินได้</td><td>${G.caps[2]} เม็ด</td></tr><tr><td>แต้มชดเชยให้ขาว</td><td>${G.komi}</td></tr>`;
  const fin = !!over && !!over.final;
  $('#b-pass').disabled = !myTurn; $('#b-resign').disabled = !!over || busy || !!review;
  const ub = $('#b-undo'); ub.hidden = gmode === 'real'; ub.disabled = G.moves.length <= undoBase() || busy || fin;
  const hb = $('#b-hint'); hb.hidden = !(S && gmode === 'teach' && !over); $('#b-retry').hidden = !retry; hb.disabled = !myTurn || hintBusy; hb.textContent = hintStage === 1 ? 'ดูจุดที่แน่นอน' : 'ขอคำใบ้';
  const fb = $('#b-final'); fb.hidden = !(over && over.type === 'score' && !over.final); fb.disabled = !!(over && over.pending);
  GB._redraw = renderGame;
  saveGame();
}
function ruleLines(f, name, warnOnly) {
  const out = [];
  if (f.selfAtari) out.push(`ระวัง หมากที่ ${name} เหลือลมหายใจเดียว คู่แข่งกินได้ในตาถัดไป ก่อนวางให้นับลมหายใจที่จะเหลือหลังวางเสมอ`);
  if (f.ownAtari.length) out.push(`กลุ่มของคุณที่ ${G.name(f.ownAtari[0].at)} ยังโดนอาตาริอยู่ ควรหนีหรือยอมทิ้งให้ชัดเจน`);
  if (f.realEye && !f.captured) out.push('ตานี้ถมตาของตัวเอง กลุ่มที่เหลือตาน้อยลงจะโดนกินง่ายขึ้น');
  if (warnOnly) return out;
  if (f.captured) out.unshift(`กินได้ ${f.captured} เม็ดที่ ${name} ทำได้ดี`);
  if (f.saved) out.push('หนีจากอาตาริได้ทัน กลุ่มนี้มีลมหายใจเพิ่มแล้ว');
  if (!f.selfAtari) { if (f.ataris.length > 1 && new Set(f.ataris.map(a => a.lib)).size > 1) out.push('อาตาริสองกลุ่มพร้อมกัน ถ้าคู่แข่งไม่มีทางกินหมากที่เพิ่งวาง ก็มักช่วยได้แค่กลุ่มเดียว'); else if (f.ataris.length > 1) out.push(`อาตาริ กลุ่มคู่แข่งเหลือลมหายใจเดียวที่ ${G.name(f.ataris[0].lib)} แต่ทั้งสองกลุ่มใช้ลมหายใจร่วมกัน ถ้าคู่แข่งวางตรงนั้นจะเชื่อมกันและหนีได้`); else if (f.ataris.length) out.push(`อาตาริ กลุ่มคู่แข่ง ${f.ataris[0].size} เม็ดที่ ${G.name(f.ataris[0].at)} เหลือลมหายใจเดียว`); }
  if (!out.length && f.line === 1 && f.moveNo < G.n * 2) out.push('เส้นริมสุดได้พื้นที่น้อยและโดนกินง่าย ช่วงต้นเกมลองเส้นที่ 3 หรือ 4');
  if (!out.length) out.push(f.moveNo < G.n ? 'ตานี้ไม่มีจุดอันตราย ช่วงเปิดเกมให้กระจายหมากไปยังมุมและข้างที่ยังว่าง' : 'ตานี้ไม่มีกลุ่มไหนเสี่ยงโดนกินทันที ลองมองหาจุดตัดของคู่แข่งหรือจุดที่ขยายพื้นที่ได้กว้าง');
  return out;
}
const tutorSay = (f, name) => tutor(ruleLines(f, name).slice(0, 1).join(' '));
const kyuS = () => !!S && /คิว/.test(S.rank) && S.eng !== 'server';
const PRAISE = ['ตานี้ดีมาก เดินได้ตรงจุด', 'เดินได้ดี รักษาแต้มไว้ครบ', 'จุดนี้เหมาะเลย', 'ตานี้เยี่ยม ไปต่อได้เลย'];
const SAME = ['ตรงกับที่เซนเซเลือกเลย เยี่ยมมาก', 'เซนเซเลือกจุดเดียวกับคุณ', 'เป็นตาที่เซนเซก็จะเดิน ยอดเยี่ยม'];
const lossWord = l => l < 4 ? 'พอใช้' : l < 10 ? 'พลาดเล็ก' : 'พลาดใหญ่';
function reasonOf(f) {
  if (!f) return '';
  if (f.selfAtari) return 'เพราะหมากเหลือลมหายใจเดียว';
  if (f.ownAtari.length) return 'เพราะกลุ่มของคุณยังโดนอาตาริ';
  if (f.realEye && !f.captured) return 'เพราะถมตาของตัวเอง';
  return '';
}
function kataTutor(t) {
  const better = t.best >= 0 && t.best !== t.idx, r = reasonOf(t.facts); let s;
  if (t.loss < 1.5) s = t.best === t.idx ? SAME[t.no % SAME.length] : PRAISE[t.no % PRAISE.length];
  else {
    s = kyuS() ? lossWord(t.loss) : `ตานี้เสียราว ${Math.round(t.loss)} แต้ม`;
    if (better) s += ` จุดที่ดีกว่าคือ ${G.name(t.best)}`;
    if (r) s += ' ' + r;
  }
  tutor(s);
}
function startPre() {
  if (!isKata() || over || G.turn !== human) return;
  pre = { at: G.moves.length, p: engine().analyze(G, preVis()).catch(() => null) };
}
async function settle(t, a, my) {
  let p = null; try { p = t.preP ? await t.preP : null; } catch (e) { }
  if (my !== token) return;
  if (p) t.best = p.best;
  if (a && p) { t.lead0 = p.lead; t.lead1 = a.lead; t.loss = Math.max(0, (p.lead - a.lead) * (human === 1 ? 1 : -1)); }
  if (t.loss != null) { kataTutor(t); if (gmode === 'teach' && !prac && t.loss >= 5) { redoNo = t.no; $('#tutor-act').hidden = false; } } else if (t.facts) tutorSay(t.facts, G.name(t.idx));
}
async function botTurn() {
  const my = token; busy = true; renderGame();
  let a = null;
  if (isKata()) {
    const opponent = S, ai = engine();
    const last = rec[rec.length - 1], pend = last && last.loss == null && last.no === mno() ? last : null;
    if (pend) tutor('เซนเซกำลังคิด...');
    try { a = await ai.analyze(G, opponent.visits || 16); } catch (e) { if (my !== token) return; a = null; if (opponent.eng === 'server') { busy = false; return srvDrop(); } degraded = true; }
    if (my !== token) return;
    if (degraded) { $('#gnote').hidden = false; $('#gnote').textContent = `การวิเคราะห์ขัดข้อง ${S.name}จึงเล่นต่อด้วยคอมพื้นฐาน กำลังเล่นต่ำกว่าระดับ ${S.rank} ที่แสดงไว้ และถ้าชนะกระดานนี้จะไม่นับเป็นสถิติ`; }
    if (pend) { await settle(pend, a, my); if (my !== token) return; }
  } else { await delay(400); if (my !== token || over) return; }
  const play = m => m >= 0 && G.play(m).ok;
  let mv = -1, ok = false;
  if (a) {
    mv = Kata.pick(G, a, S);
    if (mv >= 0) { ok = play(mv); if (!ok) { mv = a.best; ok = play(mv); if (!ok) { mv = aiMove(G, 1.5); ok = play(mv); } } }
  } else { mv = aiMove(G, S.eng === 'basic' ? S.noise : 1.5); ok = play(mv); }
  if (ok) { fresh = mv; gfb(`${S.name}เดินที่ ${G.name(mv)}`); }
  else { G.pass(); fresh = -1; gfb(`${S.name}ผ่าน ถ้าคุณไม่มีจุดที่อยากเดินแล้วให้กดผ่านเพื่อนับแต้ม`); }
  busy = false;
  if (G.passes >= 2) return endScoring();
  renderGame(); startPre();
}
function afterMove() {
  recordSync();
  if (G.passes >= 2) return endScoring();
  renderGame();
  if (botToMove()) botTurn();
}
function humanPlay(i) {
  if (review) return;
  if (over) {
    if (over.type === 'score' && !over.pending && !over.final && G.grid[i]) { const on = !dead.has(i); G.group(i).stones.forEach(s => on ? dead.add(s) : dead.delete(s)); renderGame(); }
    return;
  }
  if (busy || (S && G.turn !== human)) return;
  const f = moveFacts(G, i), before = G.grid.slice(), no = mno() + 1, preP = pre && pre.at === G.moves.length ? pre.p : null;
  const gb = prac && !prac.moved ? G.clone() : null;
  const r = G.play(i);
  if (!r.ok) { gfb(WHY[r.reason]); return; }
  if (prac) { if (gb) { prac.moved = true; prac.lock = true; pracJudge(i, gb, G.clone(), token); } else prac.lock = false; }
  fresh = i; hintIdx = -1; hintStage = 0; hintPt = -1; $('#tutor-act').hidden = true; gfb('');
  if (S) rec.push({ no, idx: i, before, facts: f, preP, loss: null, best: -1 });
  if (S && !isKata()) tutorSay(f, G.name(i));
  else if (!S) tutorSay(f, G.name(i));
  afterMove();
}
bindBoard(GB, humanPlay, renderGame);

async function endScoring() {
  const my = token; busy = false; retry = false;
  over = { type: 'score', pending: isKata(), final: false }; dead = new Set(); renderGame();
  if (over.pending) {
    try {
      const a = await engine().analyze(G, preVis()); if (my !== token) return;
      if (!a.ownership) throw new Error('no ownership');
      for (let i = 0; i < G.n * G.n; i++) { const c = G.grid[i], v = a.ownership[i]; if ((c === 1 && v < -.6) || (c === 2 && v > .6)) dead.add(i); }
    } catch (e) { if (my !== token) return; if (S.eng === 'server') { over.pending = true; return srvDrop(); } }
    if (my !== token) return;
    over.pending = false;
  }
  gfb('ถ้ามีหมากที่ตายแล้วค้างอยู่ในพื้นที่ของอีกฝ่าย แตะที่กลุ่มนั้นเพื่อเอาออก แล้วกดยืนยันผลการนับ');
  renderGame();
}

// ---------- ความเห็นหลังเกม: เซียนคนนี้เก่งระดับไหน ----------
function opinionBox() {
  const R = $('#review'); if (!R || !S || prac || !over || !over.res || over.res.won == null || $('#op-box')) return;
  const sid = S.id, won = over.res.won, key = 'go-op-' + (lastRec && lastRec.t || '');
  const b = document.createElement('div'); b.id = 'op-box'; b.className = 'op-box';
  b.innerHTML = `<p class="small"><b>คุณคิดว่า${esc(S.name)}เก่งระดับไหน</b> (ไม่บังคับ ตอบแล้วช่วยปรับระดับให้ตรงขึ้น)</p><div class="btns"><button class="btn" data-op="lo">อ่อนกว่าที่ป้ายบอก</button><button class="btn" data-op="eq">ตรงกับที่ป้ายบอก</button><button class="btn" data-op="hi">เก่งกว่าที่ป้ายบอก</button></div><div class="btns"><select class="field" id="op-lvl" aria-label="หรือเลือกระดับที่คิดว่าใช่">${lvlOpts('').replace('>ไม่ตอบ<', '>หรือเลือกระดับที่คิดว่าใช่<')}</select><button class="btn" data-op="lvl">ส่ง</button></div>`;
  R.appendChild(b);
  b.onclick = e => {
    const x = e.target.closest('[data-op]'); if (!x) return;
    let v = x.dataset.op, lv = '';
    if (v === 'lvl') { lv = $('#op-lvl', b).value; if (!lv) return; v = 'lvl'; }
    const pl = (profile && profile.lvl) || '', ver = profile && profile.skill && profile.skill.self >= 2;
    const wt = /^d/.test(pl) || ver ? 2 : (pl === 'new' || pl === 'beg' || !pl) ? 0.5 : 1;
    try { Rep.add({ k: 'opinion', opp: sid, op: v, lv, plvl: pl, wt, res: won ? 'W' : 'L', hc: HC, n: G.n }); } catch (er) {}
    b.innerHTML = '<p class="small">ขอบคุณสำหรับความเห็น</p>';
  };
}
function finish() {
  const o = over; o.final = true; let won = null, margin = 0, text;
  if (o.type === 'resign') {
    if (S) { won = false; margin = Infinity; text = 'คุณยอมแพ้'; } else text = `${cname(o.loser)}ยอมแพ้ ${cname(3 - o.loser)}ชนะ`;
  } else {
    const sc = G.score(dead), d = sc.b - sc.w; margin = Math.abs(d);
    if (S) { won = (d > 0 ? 1 : 2) === human; text = won ? `คุณชนะ ${margin} แต้ม` : `คุณแพ้ ${margin} แต้ม`; } else text = `${cname(d > 0 ? 1 : 2)}ชนะ ${margin} แต้ม`;
  }
  o.res = { won, margin, text }; let saved = true; if (!prac) recordSave();
  $('#tutor-act').hidden = true;
  if (S && !prac) {
    const r = recs[S.id] = recs[S.id] || { w: 0, l: 0 }, tm = gmode === 'teach';
    if (won) { if (!degraded) { if (tm) r.tw = (r.tw || 0) + 1; else { const e = r.we == null ? r.w : r.we; r.w++; r.we = e + (HC ? 0 : 1); } } } else if (tm) r.tl = (r.tl || 0) + 1; else r.l++;
    saved = store.set('go-rec', recs);
    const logged = logGame(o, won, margin);
    lastSgf = logged.sgf; saved = logged.saved && saved;
  }
  if (!prac && saved) clearGame();
  gfb(saved ? '' : 'บันทึกไม่สำเร็จ เก็บเกมไว้แล้ว'); renderGame(); renderReview(); try { opinionBox(); } catch (e) {}
  $('#review').scrollIntoView({ block: 'nearest' });
}

// ---------- สมุดบันทึกผล ----------
let matchLog = store.get('go-log', []);
function buildSgf(re) {
  const L = 'abcdefghijklmnopqrstuvwxyz', n = G.n, me = pn().replace(/[\]\\]/g, '\\$&');
  let t = `(;GM[1]FF[4]CA[UTF-8]SZ[${n}]KM[${G.komi}]${HC ? `HA[${HC}]` : ''}RU[Chinese]PB[${human === 1 ? me : S.name}]PW[${human === 2 ? me : S.name}]DT[${new Date().toISOString().slice(0, 10)}]RE[${re}]`;
  G.moves.forEach((m, k) => { t += `;${k % 2 ? 'W' : 'B'}[${m < 0 ? '' : L[m % n] + L[(m / n) | 0]}]`; });
  return t + ')';
}
function logGame(o, won, margin) {
  let re;
  if (o.type === 'resign') re = human === 1 ? 'W+R' : 'B+R';
  else { const d = G.score(dead); re = d.b > d.w ? `B+${margin}` : `W+${margin}`; }
  const ls = rec.filter(t => t.loss != null).map(t => t.loss), sgf = buildSgf(re);
  const r = { t: new Date().toISOString(), sid: S.id, sname: S.name, rank: S.rank, n: G.n, color: human, komi: G.komi, result: won ? 'W' : 'L',
    margin: o.type === 'resign' ? null : margin, resign: o.type === 'resign', moves: G.moves.length, handicap: HC, mode: gmode,
    recordId: recordAudit?.id, undoCount: recordAudit?.undos.length || 0, undos: recordAudit?.undos || [], restarted: false,
    avgLoss: ls.length ? Math.round(ls.reduce((a, b) => a + b, 0) / ls.length * 100) / 100 : null, big: ls.length ? ls.filter(x => x >= 5).length : null, degraded: !!degraded, sgf };
  matchLog.push(r); matchLog = matchLog.slice(-200); const saved = store.set('go-log', matchLog); lastRec = r;
  try { if (window.Rep || typeof Rep !== 'undefined') { Rep.add({ k: 'game', opp: r.sid, oppRank: r.rank, n: r.n, color: r.color, komi: r.komi, res: o.type === 'resign' ? (won ? 'W' : 'resign') : r.result, margin: r.margin, moves: r.moves, hc: r.handicap, mode: r.mode, avgLoss: r.avgLoss, big: r.big, degraded: r.degraded, undoCount: r.undoCount, undos: r.undos, restarted: r.restarted, sgf: String(sgf).slice(0, 6000) }); Rep.nudge(); } } catch (e) { }
  return { sgf, saved };
}
function clearManual() { document.querySelectorAll('textarea.manual, .manual-hint').forEach(e => e.remove()); }
function manualCopy(text, host) {
  clearManual();
  const hint = document.createElement('p'); hint.className = 'small manual-hint'; hint.textContent = 'คัดลอกอัตโนมัติไม่ได้ ข้อความด้านล่างถูกเลือกไว้แล้ว กดคัดลอกเอง (Ctrl+C หรือกดค้างแล้วเลือกคัดลอก) กด Esc เพื่อปิด';
  const ta = document.createElement('textarea'); ta.className = 'manual'; ta.readOnly = true; ta.value = text; ta.setAttribute('aria-label', 'ข้อความสำหรับคัดลอกเอง');
  ta.addEventListener('keydown', e => { if (e.key === 'Escape') clearManual(); });
  host.appendChild(hint); host.appendChild(ta); ta.focus(); ta.select();
}
function copyText(text, btn, host) {
  clearManual();
  if (btn.dataset.label == null) btn.dataset.label = btn.textContent;
  const fail = () => manualCopy(text, host);
  let p; try { p = navigator.clipboard.writeText(text); } catch (e) { return fail(); }
  p.then(() => { btn.textContent = 'คัดลอกแล้ว'; clearTimeout(btn._ct); btn._ct = setTimeout(() => { btn.textContent = btn.dataset.label; }, 1600); }, fail);
}
// ---------- แชร์ผลไป LINE ----------
const SITE = 'https://autotanasakam1-lgtm.github.io/samnak-go/';
const firstSent = (t, m) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > m ? t.slice(0, m - 1) + '…' : t; };
function shareResultText(kind, c) {
  const nm = pn(), L = [];
  if (kind === 'game') L.push(`${nm} เพิ่งประลองหมากล้อมกับ${c.opp} (${c.rank}) กระดาน ${c.n}x${c.n}`, `ผล: ${c.res}`);
  else if (kind === 'lesson') L.push(`${nm} เรียนบท "${c.title}" จบแล้ว`);
  else if (kind === 'puzzle') L.push(`${nm} แก้โจทย์ "${c.title}"${c.level ? ' (' + c.level + ')' : ''} ผ่านแล้ว`);
  else L.push(`${nm} ฝึกหมากล้อมอยู่ที่สำนักหมากล้อม`, c.stat);
  if (c.take) L.push('ข้อคิด: ' + c.take);
  L.push('มาลองเล่นด้วยกันที่สำนักหมากล้อม ' + SITE);
  return L.join('\n');
}
function openLine(text) {
  const a = document.createElement('a'); a.href = 'https://line.me/R/msg/text/?' + encodeURIComponent(text); a.target = '_blank'; a.rel = 'noopener noreferrer';
  document.body.appendChild(a); a.click(); a.remove();
}
function shareOut(text, btn, host) {
  if (typeof navigator.share === 'function') {
    let p; try { p = navigator.share({ text }); } catch (e) { return openLine(text); }
    if (p && p.catch) p.catch(e => { if (!(e && e.name === 'AbortError')) openLine(text); });
  } else openLine(text);
}
const isTeach = r => r.mode === 'teach';
const logTag = r => `<small class="mtag ${isTeach(r) ? 'teach' : 'real'}">${isTeach(r) ? 'สอน' : 'จริง'}</small>`;
const logRes = r => r.resign ? 'ยอมแพ้' : r.result === 'W' ? `ชนะ${r.handicap ? ' (ต่อ ' + r.handicap + ')' : ' ' + r.margin}${r.handicap ? ' ' + r.margin : ''}` : `แพ้ ${r.margin}`;
const logAvg = r => r.deep ? r.deep.avg : r.avgLoss;
const logRows = () => matchLog.slice().reverse();
function logSummary() {
  const by = {}; matchLog.forEach(r => { const b = by[r.sid] = by[r.sid] || { name: r.sname, w: 0, l: 0, tw: 0, tl: 0, m: 0, mc: 0 }; const k = r.result === 'W' ? 1 : 0; if (isTeach(r)) { k ? b.tw++ : b.tl++; } else { k ? b.w++ : b.l++; } if (r.margin != null) { b.m += r.result === 'W' ? r.margin : -r.margin; b.mc++; } });
  return Object.values(by);
}
function renderLog() {
  const box = $('#log-body'); if (!box) return;
  clearManual();
  if (!matchLog.length) { box.innerHTML = '<p class="small">ยังไม่มีเกมที่จบ เล่นกับคู่ประลองสักกระดาน ผลจะมาอยู่ที่นี่</p>'; return; }
  const rows = logRows().slice(0, 20);
  box.innerHTML = `<div class="col"><div class="col" style="gap:2px">${logSummary().map(b => `<p>${esc(b.name)}: ชนะ ${b.w} แพ้ ${b.l}${b.tw || b.tl ? ` <small>(โหมดสอน ชนะ ${b.tw} แพ้ ${b.tl})</small>` : ''}</p>`).join('')}</div>
    <div class="logscroll"><table class="logt"><thead><tr><th>วันที่</th><th>คู่ประลอง</th><th>กระดาน</th><th>ผล</th><th>แต้มเสียเฉลี่ยต่อตา</th><th></th></tr></thead><tbody>${rows.map((r, k) =>
      `<tr><td>${esc(r.t.slice(0, 10))}</td><td>${esc(r.sname)}</td><td>${r.n} x ${r.n}${r.handicap ? ' · ต่อ ' + r.handicap + ' เม็ด' : ''}</td><td>${esc(logRes(r))} ${logTag(r)}</td><td>${logAvg(r) == null ? '-' : logAvg(r).toFixed(1)}${r.deep ? ' <small class="rvd">ทบทวนแล้ว</small>' : ''}</td><td><button class="btn" data-sgf="${k}">คัดลอกบันทึกตาเดิน</button></td></tr>`).join('')}</tbody></table></div>
    <div class="btns"><button class="btn" id="log-copy">คัดลอกสรุปผล</button><button class="btn" id="log-clear">ล้างสมุดบันทึก</button></div></div>`;
}
$('#log-body').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  const host = $('#logbox');
  if (b.dataset.sgf != null) copyText(logRows()[+b.dataset.sgf].sgf, b, host);
  else if (b.id === 'log-copy') {
    const lines = logSummary().map(x => `${x.name}: ชนะ ${x.w} แพ้ ${x.l}${x.tw || x.tl ? ` (โหมดสอน ชนะ ${x.tw} แพ้ ${x.tl})` : ''}${x.mc ? ` แต้มต่างเฉลี่ย ${x.m / x.mc >= 0 ? '+' : ''}${(x.m / x.mc).toFixed(1)}` : ''}`);
    const games = logRows().slice(0, 20).map(r => `${r.t.slice(0, 10)} ${r.sname} ${r.n}x${r.n}${r.handicap ? ' ต่อ ' + r.handicap + ' เม็ด' : ''} ${logRes(r)}${isTeach(r) ? ' [โหมดสอน]' : ''}${logAvg(r) == null ? '' : ' เสียเฉลี่ย ' + logAvg(r).toFixed(1)}${r.deep ? ' (ทบทวนแล้ว)' : ''}`);
    copyText(['สรุปผลสำนักหมากล้อม', 'ผู้เล่น: ' + pn(), ...lines, '', 'เกมล่าสุด', ...games].join('\n'), b, host);
  } else if (b.id === 'log-clear') {
    b.outerHTML = '<span class="small">ล้างทั้งหมดและย้อนกลับไม่ได้</span> <button class="btn" id="log-clear-yes">ยืนยันล้าง</button><button class="btn" id="log-clear-no">ยกเลิก</button>';
  } else if (b.id === 'log-clear-yes') { matchLog = []; store.set('go-log', matchLog); renderLog(); const bc = $('#bk-code'); if (bc) bc.value = makeCode(); }
  else if (b.id === 'log-clear-no') renderLog();
};

// ---------- บทเรียนจากเกมนี้ ----------
const lessonBtn = id => { const L = LESSONS.find(l => l.id === id); return L ? `<button class="btn" data-lesson="${id}">เปิดบทเรียน ${esc(L.title)}</button>` : ''; };
function renderReview() {
  const R = $('#review'); if (!over || !over.final) { R.hidden = true; return; }
  R.hidden = false;
  const res = over.res;
  if (!S) { R.innerHTML = `<h2>จบเกม</h2><p>${esc(res.text)}</p><div class="btns"><button class="btn primary" data-act="again">เล่นอีกครั้ง</button><button class="btn" data-act="lobby">กลับห้องประลอง</button></div>`; return; }
  if (prac) { R.innerHTML = `<h2>จบการฝึก</h2><p><b>${esc(res.text)}</b></p><p class="small">โหมดฝึก ผลนี้ไม่ได้บันทึก</p><div class="btns"><button class="btn primary" data-act="p-again">ลองเดินใหม่จากจุดนี้อีกครั้ง</button><button class="btn" data-act="p-back">กลับไปดูบทเรียนจากเกม</button></div>`; return; }
  const n = G.n, lost = !res.won, idx = SENSEI.indexOf(S), prev = SENSEI[idx - 1], next = SENSEI[idx + 1] && SENSEI[idx + 1].eng !== 'server' ? SENSEI[idx + 1] : null, blocks = [], links = new Set();
  let momentsHtml = '', phaseTxt = '';
  if (isKata()) {
    const hPass = G.moves.filter((m, k) => m < 0 && (k % 2 ? 2 : 1) === human).length, scored = rec.filter(t => t.loss != null).length, steady = !(lost && res.margin > n * n * 0.08) && scored >= 3 && hPass <= rec.length / 2;
    const bad = rec.filter(t => t.loss != null && t.loss >= 2).sort((a, b) => b.loss - a.loss).slice(0, lost ? 3 : 1);
    if (bad.length) momentsHtml = `<div class="rv">${bad.map(t => `<div class="mk"><button class="btn" data-turn="${t.no}">ตาที่ ${t.no} · ${G.name(t.idx)} · ${kyuS() ? lossWord(t.loss) + ' <small>(เสียราว ' + Math.round(t.loss) + ' แต้ม)</small>' : 'เสียราว ' + Math.round(t.loss) + ' แต้ม'}${t.best >= 0 && t.best !== t.idx ? ' · ควรเดิน ' + G.name(t.best) : t.best < 0 && t.lead0 != null ? ' · เซนเซเลือกผ่าน' : ''}</button><button class="btn" data-pk="${hcN() + t.no - 1}" data-src="n">ลองเดินใหม่จากจุดนี้</button></div>`).join('')}</div><p class="small">แตะตาที่ต้องการเพื่อดูตำแหน่งบนกระดาน วงแดงคือตาที่คุณเดิน วงน้ำเงินคือจุดที่เซนเซแนะ</p>`;
    else blocks.push(steady ? (kyuS() ? '<p>ไม่มีตาไหนพลาดชัด ตลอดเกมคุณเดินได้นิ่งมาก</p>' : '<p>ไม่มีตาไหนเสียเกิน 2 แต้ม ตลอดเกมคุณเดินได้นิ่งมาก</p>') : (rec.length ? '<p>ไม่มีตาที่เสียแต้มชัดเจน แต่ผลแพ้ห่างหรือเดินน้อยเกินไป ลองเดินให้ครบกระดานและผ่านเมื่อไม่มีจุดที่น่าเดินจริง ๆ</p>' : '<p>เกมนี้คุณยังไม่ได้วางหมากเลย จึงยังประเมินฝีมือไม่ได้ ลองเดินให้ครบกระดานแล้วดูอีกครั้ง</p>'));
    const ph = [[], [], []], o1 = n * n / 7, o2 = n * n * 0.42;
    rec.forEach(t => { if (t.loss != null) ph[t.no <= o1 ? 0 : t.no <= o2 ? 1 : 2].push(t.loss); });
    let bi = -1, bv = 1.5; ph.forEach((a, k) => { if (a.length) { const m = a.reduce((x, y) => x + y, 0) / a.length; if (m > bv) { bv = m; bi = k; } } });
    if (bi >= 0 && (lost || bv >= 3)) phaseTxt = ['ช่วงเปิดเกมเสียแต้มเฉลี่ยมากที่สุด ให้จับมุมก่อน แล้วค่อยขยายไปข้าง และอย่าเพิ่งเข้าไปสู้รบในช่วงต้น',
      'ช่วงกลางเกมเสียแต้มเฉลี่ยมากที่สุด ก่อนตัดหรือบุกเข้าไปในพื้นที่คู่แข่ง ให้นับลมหายใจและเช็กกลุ่มอ่อนของตัวเองก่อน',
      'ช่วงท้ายเกมเสียแต้มเฉลี่ยมากที่สุด ให้เลือกจุดที่ใหญ่ที่สุดก่อน และตอบเฉพาะเมื่อคู่แข่งขู่จริง'][bi];
  }
  const sa = rec.filter(t => t.facts && t.facts.selfAtari).length, ef = rec.filter(t => t.facts && t.facts.realEye && !t.facts.captured).length, lostStones = G.caps[3 - human];
  if (sa >= 2) { blocks.push(`<h3>เหลือลมหายใจเดียว</h3><p>คุณวางหมากจนเหลือลมหายใจเดียว ${sa} ครั้ง ก่อนวางทุกตาให้นับลมหายใจของกลุ่มที่จะได้ก่อนเสมอ</p>`); links.add('l4'); }
  if (lostStones >= n) { blocks.push(`<h3>หมากถูกกินมาก</h3><p>${S.name}กินหมากคุณไป ${lostStones} เม็ด กลุ่มที่มีสองตาจะไม่โดนกิน ลองฝึกเรื่องสองตาและการดูว่ากลุ่มเป็นหรือตาย</p>`); links.add('l9'); links.add('l10'); }
  if (ef >= 1) { blocks.push(`<h3>ถมตาของตัวเอง</h3><p>คุณถมตาของตัวเอง ${ef} ครั้ง ตาในกลุ่มคือสิ่งที่ทำให้กลุ่มรอด อย่าถมถ้าไม่จำเป็น</p>`); links.add('l9'); }
  if (!momentsHtml) {
    const why = t => t.facts.selfAtari ? 'วางจนเหลือลมหายใจเดียว' : t.facts.ownAtari.length ? 'ปล่อยกลุ่มตัวเองให้โดนอาตาริ' : 'ถมตาของตัวเอง';
    const ms = rec.filter(t => t.facts && (t.facts.selfAtari || t.facts.ownAtari.length || (t.facts.realEye && !t.facts.captured))).slice(0, 3);
    if (ms.length) momentsHtml = `<div class="rv">${ms.map(t => `<div class="mk"><button class="btn" data-turn="${t.no}">ตาที่ ${t.no} · ${G.name(t.idx)} · ${why(t)}</button></div>`).join('')}</div><p class="small">แตะเพื่อดูตำแหน่งบนกระดาน</p>`;
  }
  const thr = n * n * 0.08; let close;
  if (lost) close = res.margin > thr
    ? (prev ? `ครั้งนี้แพ้ห่างพอสมควร ลองเล่นกับ${prev.name} (${prev.rank}) สักสองสามกระดานก่อน แล้วกลับมาท้า${S.name}ใหม่` : 'ครั้งนี้แพ้ห่างพอสมควร ลองทบทวนบทเรียนแล้วเล่นอีกครั้ง')
    : `แพ้ไปนิดเดียว เกมนี้สูสีมาก ประลองอีกครั้งได้เลย อีกหนึ่งหรือสองตาที่ดีขึ้นก็พลิกผลได้`;
  else { close = `ยินดีด้วย คุณชนะ${S.name}`; if (degraded) close += ' แต่กระดานนี้คู่ประลองเล่นต่ำกว่าระดับ จึงไม่นับเป็นสถิติ'; }
  const sug = S.eng === 'server' ? suggestHc(S.id, n) : 0, again = sug || (S.eng === 'server' ? 0 : HC);
  if (sug) { close += ` ลองให้ต่อ ${sug} เม็ดดู เกมจะสูสีขึ้น`; selHc = sug; }
  const sum = summaryHtml({ lost, res, phaseTxt, sa, ef, lostStones, links, momentsHtml, idx });
  R.innerHTML = `<h2>บทเรียนจากเกมนี้</h2><p><b>${esc(res.text)}</b> ${modeTag(gmode)}</p>${sum}<div class="tips">${blocks.join('')}<p>${esc(close)}</p></div>${deepBoxHtml()}
    <div class="btns"><button class="btn primary" data-act="again" data-md="${gmode}" data-hc="${again}">${again ? `ประลองอีกครั้ง ต่อ ${again} เม็ด` : 'ประลองอีกครั้ง'}</button>${sug ? '<button class="btn" data-act="again" data-md="${gmode}" data-hc="0">ประลองอีกครั้ง ไม่ต่อ</button>' : ''}<button class="btn" data-act="lobby">เลือกคู่ประลองอื่น</button><button class="btn" data-act="sgf">คัดลอกบันทึกตาเดิน</button>${[...links].map(lessonBtn).join('')}</div>`;
  deepBoxRefresh();
}
// ---------- สรุปหลังจบเกม ----------
// เส้นแสดงนำ/ตามจากมุมมองของผู้เล่น (บวก = นำ) ใช้ข้อมูลวิเคราะห์รายตาถ้ามี
function leadGraph() {
  const sg = human === 1 ? 1 : -1, pts = [];
  rec.forEach(t => { if (t.lead0 != null && t.lead1 != null) { if (!pts.length) pts.push(t.lead0 * sg); pts.push(t.lead1 * sg); } });
  if (pts.length < 3 || pts.some(v => !isFinite(v))) return '';
  const W = 300, H = 84, m = Math.max(5, ...pts.map(Math.abs)), X = k => 6 + k * (W - 12) / (pts.length - 1), Y = v => H / 2 - v / m * (H / 2 - 6);
  const d = pts.map((v, k) => (k ? 'L' : 'M') + X(k).toFixed(1) + ' ' + Y(v).toFixed(1)).join('');
  const end = pts[pts.length - 1], mx = Math.max(...pts), mn = Math.min(...pts);
  return `<div class="sgraph"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="กราฟแต้มนำ เริ่มที่ ${pts[0].toFixed(1)} สูงสุด ${mx.toFixed(1)} ต่ำสุด ${mn.toFixed(1)} จบที่ ${end.toFixed(1)} แต้ม บวกคือคุณนำ"><path d="M6 ${H / 2}H${W - 6}" stroke="var(--line)" stroke-dasharray="3 3" fill="none"/><path d="${d}" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="${X(pts.length - 1).toFixed(1)}" cy="${Y(end).toFixed(1)}" r="3.4" fill="var(--accent)"/></svg><p class="small">แต้มนำตลอดเกม (ประเมินโดยเซนเซ) ด้านบนเส้นประคือคุณนำ ด้านล่างคือตาม</p></div>`;
}
let lastTake = '';
const gameShare = () => shareResultText('game', { opp: S.name, rank: S.rank, n: G.n, res: over.res.text, take: lastTake });
function summaryHtml(o) {
  const { lost, res, phaseTxt, sa, ef, lostStones, links, momentsHtml, idx } = o, n = G.n, nx = SENSEI[idx + 1], pv = SENSEI[idx - 1];
  let pt, lk = null;
  if (phaseTxt) pt = phaseTxt;
  else if (sa >= 1) { pt = `ฝึกนับลมหายใจก่อนวาง คุณวางจนเหลือลมหายใจเดียว ${sa} ครั้ง`; lk = 'l4'; }
  else if (lostStones >= n) { pt = 'ฝึกทำให้กลุ่มมีสองตา เพื่อไม่ให้หมากถูกกินเป็นกลุ่ม'; lk = 'l9'; }
  else if (ef >= 1) { pt = 'อย่าถมตาของตัวเอง ตาในกลุ่มคือสิ่งที่ทำให้กลุ่มรอด'; lk = 'l9'; }
  else pt = lost ? 'ฝึกนับแต้มและเลือกจุดที่ใหญ่ที่สุดก่อนเดินทุกตา' : 'เกมนี้ไม่มีจุดอ่อนเด่นชัด ลองกระดานใหญ่ขึ้นหรือคู่ประลองที่แก่กว่าเพื่อฝึกให้หนักขึ้น';
  const lb = lk && LESSONS.find(l => l.id === lk);
  let adv, nb = '';
  if (!lost) {
    if (degraded) adv = `ชนะแล้ว แต่กระดานนี้คู่ประลองเล่นต่ำกว่าระดับ ลองเล่นกับ${S.name}อีกครั้งเมื่อเอนจินพร้อม`;
    else if (nx && !(nx.eng === 'server' && !Srv.online)) { adv = `ถึงเวลาท้า${nx.name} (${nx.rank}) แล้ว`; nb = `<button class="btn" data-nx="${nx.id}" data-md="${gmode}">ไปเลือก${esc(nx.name)}</button>`; }
    else if (nx) adv = `คู่ถัดไปคือ${nx.name} ใช้เครื่องของสำนักซึ่งตอนนี้ออฟไลน์ ลองเล่นกระดานใหญ่ขึ้นกับ${S.name}ไปก่อน`;
    else adv = 'คุณชนะคู่ประลองระดับสูงสุดแล้ว ลองให้หมากต่อน้อยลงหรือเล่นกระดานใหญ่ขึ้น';
    if (gmode === 'teach') adv += ' ชัยชนะในโหมดสอนนับแยก ลองโหมดประลองจริงเพื่อให้นับเป็น \u2018ชนะแล้ว\u2019';
  } else if (res.margin > n * n * 0.08 && pv) { adv = `ลองเล่นกับ${pv.name} (${pv.rank}) สักสองสามกระดานก่อน แล้วกลับมาท้า${S.name}ใหม่`; nb = `<button class="btn" data-nx="${pv.id}" data-md="${gmode}">ไปเลือก${esc(pv.name)}</button>`; }
  else adv = `เล่นกับ${S.name}อีกครั้ง เกมสูสีพอที่จะพลิกได้`;
  lastTake = pt;
  return `<section class="sumbox" aria-label="สรุปเกม">
    ${leadGraph()}
    ${momentsHtml ? `<h3>ช่วงสำคัญของเกม</h3>${momentsHtml}` : ''}
    <h3>สิ่งที่ควรฝึกก่อน</h3><p>${esc(pt)}</p>${lb ? `<div class="btns"><button class="btn" data-lesson="${lb.id}">เปิดบทเรียน ${esc(lb.title)}</button></div>` : ''}
    <h3>คู่ประลองถัดไป</h3><p>${esc(adv)}</p>${nb ? `<div class="btns">${nb}</div>` : ''}<div class="btns"><button class="btn" data-act="share">แชร์ผลไป LINE</button><button class="btn" data-act="sharecopy">คัดลอกข้อความ</button></div></section>`;
}
// ข้อเสนอหมากต่อสำหรับเครื่องของสำนัก: แพ้เกมเท่ากัน 2 กระดานติด เริ่มที่ 4 แพ้ซ้ำ +2 ชนะ -1
function suggestHc(sid, n) {
  let sug = 0, lr = 0;
  for (const r of matchLog.filter(x => x.sid === sid)) {
    const h = r.handicap || 0, lost = r.result !== 'W';
    if (h) { lr = 0; sug = lost ? h + 2 : h - 1 >= 2 ? h - 1 : 0; }
    else if (!lost) { lr = 0; sug = 0; } else { lr++; if (lr >= 2 && !sug) sug = 4; }
  }
  return Math.min(sug, hcMax(n));
}
$('#review').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.turn) { review = rec.find(t => t.no === +b.dataset.turn); renderGame(); GB.scrollIntoView({ block: 'nearest' }); const bk = $('#review'); if (!$('#rv-back')) bk.insertAdjacentHTML('afterbegin', '<button class="btn" id="rv-back">กลับไปดูตำแหน่งสุดท้าย</button>'); }
  else if (b.id === 'rv-back') { review = null; b.remove(); renderGame(); }
  else if (b.dataset.lesson) openLesson(b.dataset.lesson);
  else if (b.dataset.act === 'share') shareOut(gameShare(), b, $('#review'));
  else if (b.dataset.act === 'sharecopy') copyText(gameShare(), b, $('#review'));
  else if (b.dataset.act === 'sgf') copyText(lastSgf, b, $('#review'));
  else if (b.dataset.act === 'again') startGame(S, G.n, human, null, { hc: +b.dataset.hc || 0, mode: b.dataset.md || gmode });
  else if (b.dataset.nx) { sel = b.dataset.nx; selSize = bySid(sel).n; if (b.dataset.md) selMode = b.dataset.md; toLobby(); }
  else if (b.dataset.pk) startPractice(+b.dataset.pk, b.dataset.src);
  else if (b.dataset.act === 'p-back' || b.dataset.act === 'p-again') b.dataset.act === 'p-back' ? pracBack() : startPractice(-1);
  else if (b.dataset.act === 'deep') deepStart();
  else if (b.dataset.act === 'deep-cancel') deepCancel();
  else if (b.dataset.act === 'deep-close') deepClose();
  else if (b.dataset.act === 'deep-show') { deepShown = true; renderDeep(); }
  else if (b.dataset.dg != null) deepGo(+b.dataset.dg, true);
  else if (b.dataset.dstep) deepStep(+b.dataset.dstep);
  else if (b.dataset.act === 'lobby') toLobby();
};
function toLobby() { clearManual(); token++; if (deep) deep.run++; deep = null; deepShown = false; prac = null; pracSaved = null; $('#pbanner').hidden = true; busy = false; review = null; $('#game').hidden = true; $('#lobby').hidden = false; renderLobby(); window.scrollTo(0, 0); }
$('#ghead').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if(b.id === 'g-restart') { if(confirm('เริ่มใหม่และเก็บเกมนี้ไว้ในประวัติใช่ไหม')) recordRestart(); }
  else if (b.id === 'g-back') { if ((over && over.final) || prac || G.moves.length <= hcN()) return toLobby(); showAsk(false); }
  else if (b.id === 'ask-later') { saveGame(); toLobby(); }
  else if (b.id === 'ask-resign') { $('#leave-ask').hidden = true; if (!over || !over.final) { token++; busy = false; over = { type: 'resign', loser: S ? human : G.turn }; finish(); } }
  else if (b.id === 'ask-cancel') closeAsk();
};
let askFrom = 'g-back';
function showAsk(resignOnly) {
  askFrom = resignOnly ? 'b-resign' : 'g-back';
  $('#leave-ask p').textContent = resignOnly ? 'ยอมแพ้เกมนี้ใช่ไหม' : 'ออกจากเกมนี้ใช่ไหม';
  $('#ask-later').hidden = resignOnly; $('#leave-ask').hidden = false; (resignOnly ? $('#ask-cancel') : $('#ask-later')).focus();
}
function closeAsk() { $('#leave-ask').hidden = true; const f = document.getElementById(askFrom); if (f && !f.disabled) f.focus(); else $('#g-back').focus(); }
$('#ghead').addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#leave-ask').hidden) { e.preventDefault(); closeAsk(); } });

$('#b-pass').onclick = () => { if (busy) return; G.pass(); fresh = -1; hintIdx = -1; hintStage = 0; hintPt = -1; gfb(`${cname(3 - G.turn)}ผ่าน`); afterMove(); };
$('#b-undo').onclick = () => {
  if (gmode === 'real') return;
  token++; review = null; over = null; dead = new Set(); busy = false; $('#review').hidden = true; hintStage = 0; hintPt = -1; $('#tutor-act').hidden = true;
  G.undo(); if (S && G.turn !== human && G.moves.length > undoBase()) G.undo();
  if(recordAudit && !prac) RecordLogic.undo(recordAudit,G,undoBefore,undoSide); saveGame();
  if (prac) { prac.moved = false; prac.lock = false; }
  retry = false; $('#gnote').hidden = true; rec = rec.filter(t => t.no <= mno()); hintIdx = -1; fresh = -1; pre = null; gfb('ถอยแล้ว');
  tutor('ถอยกลับมาแล้ว ลองเดินใหม่ได้เลย'); renderGame(); startPre(); if (botToMove()) botTurn();
};
$('#p-back').onclick = () => pracBack();
$('#tutor-redo').onclick = () => { if (!redoNo || prac || gmode !== 'teach') return; const no = redoNo; redoNo = 0; $('#tutor-act').hidden = true; startPractice(hcN() + no - 1, 'n'); };
$('#b-retry').onclick = () => {
  if (!retry) return; retry = false; $('#gnote').hidden = true;
  if (over && over.type === 'score') endScoring(); else if (botToMove()) botTurn();
};
$('#b-resign').onclick = () => { if (over || busy || review) return; showAsk(true); };
$('#b-final').onclick = () => { if (over && over.type === 'score' && !over.pending) finish(); };
// กรอบบริเวณคำใบ้ขั้นแรก: 5x5 จุด เลื่อนให้จุดจริงไม่อยู่กลางกรอบเสมอ
function hintArea(p) {
  const n = G.n, x = p % n, y = (p / n) | 0, ox = (p % 3) - 1, oy = (((p / 3) | 0) % 3) - 1;
  const cl = (v, lo) => Math.max(0, Math.min(n - 1 - 4, v));
  const x0 = cl(x - 2 + ox), y0 = cl(y - 2 + oy);
  return { x0, y0, x1: Math.min(n - 1, x0 + 4), y1: Math.min(n - 1, y0 + 4) };
}
$('#b-hint').onclick = async () => {
  if (busy || over || G.turn !== human || gmode !== 'teach' || hintBusy) return;
  if (hintStage === 1) { hintStage = 2; hintIdx = hintPt; hintPt = -1; gfb(`จุดที่แนะนำคือ ${G.name(hintIdx)} ดูวงประสีน้ำเงินบนกระดาน`); return renderGame(); }
  const my = token, at = G.moves.length; let best = -2;
  if (isKata()) {
    if (!pre || pre.at !== at) startPre();
    hintBusy = true; gfb('เซนเซกำลังดูให้'); renderGame();
    const p = await pre.p; hintBusy = false;
    if (my !== token || over || G.moves.length !== at) return;
    if (p) best = p.best;
  }
  if (best === -2) { try { best = aiMove(G, 0); } catch (e) { best = -2; } }
  if (best === -2) { gfb('ขอคำใบ้ไม่สำเร็จในตอนนี้ ลองใหม่อีกครั้ง'); return renderGame(); }
  if (best < 0) { gfb('ตอนนี้ผ่านได้แล้ว ไม่มีจุดที่ต้องเดินเพิ่ม'); return renderGame(); }
  hintPt = best; hintStage = 1; hintIdx = -1; gfb('ดูกรอบประสีน้ำเงิน จุดที่น่าเดินอยู่ในบริเวณนี้ กดอีกครั้งเพื่อดูจุดที่แน่นอน'); renderGame();
};

// ---------- คลังเซียน ----------
function openMaster(id) {
  const m = MASTERS.find(x => x.id === id) || MASTERS[0];
  $('#mlist').innerHTML = MASTERS.map(x => `<button data-id="${x.id}" aria-pressed="${x === m}"><span>${esc(x.name)}</span><small>${esc(x.tag)}</small></button>`).join('');
  $('#mbody').innerHTML = `<div class="col"><span class="eyebrow">${esc(m.years)} · ${esc(m.tag)}</span><h2>${esc(m.name)}</h2><p>${esc(m.body)}</p><h3>แนวคิดหลัก</h3><ul>${m.ideas.map(i => `<li>${esc(i)}</li>`).join('')}</ul><h3>ข้อมูลที่ตรวจสอบแล้ว</h3><ul>${(m.facts || []).map(i => `<li>${esc(i)}</li>`).join('')}</ul><h3>สไตล์</h3><p>${esc(m.style || '')}</p><h3>ข้อคิดสำหรับผู้เรียน</h3><p>${esc(m.lesson || '')}</p><h3>ฝึกตามอย่างไร</h3><p>${esc(m.drill)}</p><p class="small msrc">แหล่งที่มา: ${(m.src || []).map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)} (${esc(u.replace(/^https?:\/\//, ''))})</a>`).join(' · ')}</p></div><div class="col">${m.stones ? '<div class="board static" id="mboard"></div>' : ''}<p class="cap">${esc(m.cap)}</p></div>`;
  if (m.stones) { const grid = new Int8Array(m.n * m.n), labels = {}; m.stones.forEach(([x, y, c, t]) => { grid[y * m.n + x] = c; if (t) labels[y * m.n + x] = t; }); drawBoard($('#mboard'), { n: m.n, grid, labels }); }
}
$('#mlist').onclick = e => { const b = e.target.closest('button'); if (b) openMaster(b.dataset.id); };

// ---------- แท็บ ----------
const TABS = ['learn', 'puzzles', 'play', 'masters', 'records'];
let lastTab = 'learn';
function showTab(t) {
  if(typeof Records !== 'undefined') Records.stop();
  if (![...TABS, 'me'].includes(t)) t = 'learn';
  [...TABS, 'me'].forEach(k => { $('#v-' + k).hidden = k !== t; });
  if (t !== 'me') lastTab = t; else renderProfile();
  document.querySelectorAll('#tabs button').forEach(b => b.dataset.tab === t ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'));
  if (t === 'learn' && $('#lesson-view').hidden) showPath();
  if (t === 'play' && !$('#lobby').hidden) renderLobby();
  if(t === 'records' && typeof Records !== 'undefined') Records.mount();
  try { history.replaceState(null, '', '#' + t); } catch (e) { }
}
$('#tabs').onclick = e => { const b = e.target.closest('button'); if (b) { if (b.dataset.tab === 'learn') { $('#lesson-view').hidden = true; } showTab(b.dataset.tab); window.scrollTo(0, 0); } };
window.addEventListener('hashchange', () => { const h = location.hash; if (h.indexOf('#t=') === 0) handleTeacher(h); else showTab(h.slice(1)); });
try { if (location.protocol === 'https:' && window.top === window.self && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => { }); } catch (e) { }
