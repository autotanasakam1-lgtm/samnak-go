// ---------- ทบทวนทั้งเกมด้วยรุ่นใหญ่ และโหมดฝึกเดินใหม่ ----------
let deep = null, deepShown = false;
const nmPt = x => x == null || x < 0 ? 'ผ่าน' : G.name(x);
const PHASE_NAMES = ['ช่วงเปิดเกม', 'ช่วงกลางเกม', 'ช่วงท้ายเกม'];
const leadText = v => v > 0.05 ? `คุณนำ ${v.toFixed(1)} แต้ม` : v < -0.05 ? `คุณตาม ${(-v).toFixed(1)} แต้ม` : 'เสมอกัน';

function deepBoxHtml() {
  if (!S || prac || G.moves.length <= hcN()) return '';
  if (deep && deep.state === 'done') return '<div class="deepbox" id="deepbox"><button class="btn primary" data-act="deep-show">ดูผลทบทวนทั้งเกม</button><p class="small">ทบทวนด้วยรุ่นใหญ่ไว้แล้ว</p></div>';
  const on = Srv.online;
  return `<div class="deepbox" id="deepbox"><button class="btn primary" data-act="deep"${on ? '' : ' disabled'}>ทบทวนทั้งเกมด้วยรุ่นใหญ่</button><p class="small">${on ? 'ใช้เครื่องของสำนัก แม่นกว่าการประเมินระหว่างเกม' : 'เครื่องของสำนักปิดอยู่'}</p></div>`;
}
function deepBoxRefresh() {
  Srv.check().then(() => { const b = $('#deepbox'); if (b && !deepShown) b.outerHTML = deepBoxHtml(); });
}

function initDeep() {
  const n = G.n, g = new Go(n, G.komi), mv = G.moves.slice(), grids = [g.grid.slice()], name = G.name.bind(G), komi = G.komi;
  mv.forEach(m => { m < 0 ? g.pass() : g.play(m); grids.push(g.grid.slice()); });
  const k0 = hcN();
  return { mv, k0, M: mv.length, grids, lead: {}, best: {}, done: 0, total: mv.length - k0 + 1, run: 0, state: 'idle', human, sign: human === 1 ? 1 : -1, cur: mv.length, n,
    at: k => ({ n, komi, moves: mv.slice(0, k), name }) };
}
function deepStart() {
  if (!S || prac || (deep && deep.state === 'run')) return;
  if (!deep) deep = initDeep();
  deepShown = true; deepRun();
}
async function deepRun() {
  const d = deep, my = ++d.run; d.state = 'run'; renderDeep();
  const todo = []; for (let k = d.k0; k <= d.M; k++) if (d.lead[k] == null) todo.push(k);
  d.done = d.total - todo.length; deepProgress();
  let nx = 0, bad = false;
  const worker = async () => {
    while (!bad && d.run === my && nx < todo.length) {
      const k = todo[nx++];
      try {
        const a = await Srv.analyze(d.at(k), 150, true);
        if (d.run !== my) return;
        if (typeof a.lead !== 'number' || !isFinite(a.lead)) throw new Error('bad lead');
        d.lead[k] = a.lead; d.best[k] = a.best; d.done++; deepProgress();
      } catch (e) { if (d.run === my) bad = true; return; }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  if (d.run !== my || deep !== d) return;
  if (bad || todo.some(k => d.lead[k] == null)) { d.state = 'fail'; renderDeep(); return; }
  deepFinish(d);
}
function deepCancel() { if (!deep) return; deep.run++; deep.state = 'idle'; deepShown = false; renderReview(); }
function deepClose() { deepShown = false; review = null; renderGame(); renderReview(); }
function deepProgress() {
  const d = deep, el = $('#dprog'); if (!el || !d) return;
  el.setAttribute('aria-valuenow', d.done); $('i', el).style.width = (d.done / d.total * 100).toFixed(1) + '%';
  const t = $('#dprog-t'); if (t) t.textContent = `วิเคราะห์แล้ว ${d.done} จาก ${d.total} ตำแหน่ง`;
}
function deepFinish(d) {
  d.items = []; const ph = [[], [], []], o1 = d.n * d.n / 7, o2 = d.n * d.n * 0.42;
  for (let k = d.k0; k < d.M; k++) {
    if ((k % 2 === 0 ? 1 : 2) !== d.human) continue;
    const loss = Math.max(0, (d.lead[k] - d.lead[k + 1]) * d.sign), no = k - d.k0 + 1;
    d.items.push({ k, no, loss }); ph[no <= o1 ? 0 : no <= o2 ? 1 : 2].push(loss);
  }
  const sum = a => a.reduce((x, y) => x + y, 0);
  d.avg = d.items.length ? sum(d.items.map(t => t.loss)) / d.items.length : 0;
  d.big = d.items.filter(t => t.loss >= 5).length;
  d.ph = ph.map(a => ({ c: a.length, avg: a.length ? sum(a) / a.length : 0 }));
  let bi = -1, bv = 0; d.ph.forEach((p, i) => { if (p.c && p.avg > bv) { bv = p.avg; bi = i; } });
  d.weak = bi; d.top = d.items.filter(t => t.loss >= 1).sort((a, b) => b.loss - a.loss).slice(0, 5);
  d.state = 'done';
  if (lastRec) { lastRec.deep = { avg: Math.round(d.avg * 100) / 100, big: d.big, weak: bi }; store.set('go-log', matchLog); }
  d.cur = d.M; review = null; renderGame(); renderDeep();
}

function renderDeep() {
  const R = $('#review'), d = deep; if (!d) return;
  R.hidden = false;
  if (d.state === 'run') {
    R.innerHTML = `<h2>ทบทวนทั้งเกมด้วยรุ่นใหญ่</h2><p class="small">ใช้เครื่องของสำนักวิเคราะห์ทุกตำแหน่งของเกมนี้ อาจใช้เวลาสักครู่</p><div class="prog" id="dprog" role="progressbar" aria-label="ความคืบหน้าการทบทวน" aria-valuemin="0" aria-valuemax="${d.total}" aria-valuenow="${d.done}"><i></i></div><p id="dprog-t" class="small" aria-live="off"></p><div class="btns"><button class="btn" data-act="deep-cancel">ยกเลิก</button></div>`;
    return deepProgress();
  }
  if (d.state === 'fail') {
    R.innerHTML = `<h2>ทบทวนทั้งเกมด้วยรุ่นใหญ่</h2><p class="warn">การเชื่อมต่อกับเครื่องของสำนักหลุด ทบทวนได้แล้ว ${d.done} จาก ${d.total} ตำแหน่ง ผลที่ได้เก็บไว้แล้ว กดลองต่อเพื่อวิเคราะห์ส่วนที่เหลือ</p><div class="btns"><button class="btn primary" data-act="deep">ลองต่อ</button><button class="btn" data-act="deep-close">กลับไปดูบทเรียนแบบย่อ</button></div>`;
    return;
  }
  const again = S.eng === 'server' ? suggestHc(S.id, G.n) : HC;
  R.innerHTML = `<h2>ทบทวนทั้งเกมด้วยรุ่นใหญ่</h2><p><b>${esc(over.res.text)}</b></p>
    <div class="tips"><p>เสียเฉลี่ย <b>${d.avg.toFixed(1)}</b> แต้มต่อตา · ตาที่เสียตั้งแต่ 5 แต้มขึ้นไป <b>${d.big}</b> ตา${d.weak >= 0 ? ` · อ่อนสุดที่${PHASE_NAMES[d.weak]}` : ''}</p>
    <h3>แต้มนำตลอดเกม</h3><p class="small">แกนตั้งคือแต้มนำของคุณ ค่าบวกคือคุณนำ แกนนอนคือลำดับตา แตะที่กราฟเพื่อดูตำแหน่งนั้นบนกระดาน</p>
    <div class="chartbox" id="dv-chart" tabindex="0" role="group" aria-label="กราฟแต้มนำของคุณตลอดเกม แตะเพื่อข้ามไปยังตานั้น หรือใช้ปุ่มลูกศรซ้ายขวา"></div>
    <div class="dnav"><button class="btn" id="dv-prev" data-dstep="-1">ตาก่อนหน้า</button><button class="btn" id="dv-next" data-dstep="1">ตาถัดไป</button></div>
    <p id="dv-info" aria-live="polite"></p>
    <h3>ตาที่เสียแต้มมากที่สุด</h3>${d.top.length ? `<div class="rv">${d.top.map(t => `<div class="mk"><button class="btn" data-dg="${t.k}">ตาที่ ${t.no} · ${nmPt(d.mv[t.k])} · เสีย ${t.loss.toFixed(1)} แต้ม${d.best[t.k] != null && d.best[t.k] !== d.mv[t.k] ? ' · ควรเดิน ' + nmPt(d.best[t.k]) : ''}</button><button class="btn" data-pk="${t.k}" data-src="d">ลองเดินใหม่จากจุดนี้</button></div>`).join('')}</div><p class="small">แตะตาที่ต้องการเพื่อดูตำแหน่งบนกระดาน วงแดงคือตาที่คุณเดิน วงน้ำเงินคือจุดที่รุ่นใหญ่แนะ</p>` : '<p>ไม่มีตาไหนเสียเกิน 1 แต้ม ตลอดเกมคุณเดินได้นิ่งมาก</p>'}
    <h3>เสียแต้มเฉลี่ยแต่ละช่วง</h3><ul class="plist">${d.ph.map((p, i) => `<li>${PHASE_NAMES[i]}: ${p.c ? `เสียเฉลี่ย ${p.avg.toFixed(1)} แต้มต่อตา (${p.c} ตา)` : 'ไม่มีตาในช่วงนี้'}${i === d.weak ? ' <b>อ่อนสุด</b>' : ''}</li>`).join('')}</ul>
    <p>${d.weak >= 0 ? `ช่วงที่ควรฝึกมากที่สุดคือ${PHASE_NAMES[d.weak]}` : 'ไม่มีช่วงไหนเสียแต้มเด่นชัด'}</p></div>
    <div class="btns"><button class="btn" data-act="deep-close">กลับไปดูบทเรียนแบบย่อ</button><button class="btn primary" data-act="again" data-hc="${again}">ประลองอีกครั้ง${again ? ` ต่อ ${again} เม็ด` : ''}</button><button class="btn" data-act="lobby">เลือกคู่ประลองอื่น</button><button class="btn" data-act="sgf">คัดลอกบันทึกตาเดิน</button></div>`;
  const box = $('#dv-chart');
  box.onclick = e => {
    const svg = box.firstElementChild; if (!svg) return;
    const r = svg.getBoundingClientRect(), W = d.cw || r.width, x = (e.clientX - r.left) / r.width * W;
    deepGo(d.k0 + Math.round((x - 40) / (W - 50) * (d.M - d.k0)), false);
  };
  box.onkeydown = e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); deepStep(e.key === 'ArrowLeft' ? -1 : 1); } };
  deepPaint();
}
function deepChart() {
  const d = deep, box = $('#dv-chart'); if (!d || !box) return;
  const W = Math.max(260, Math.round(box.clientWidth - 2)) , H = 210, l = 40, r = 10, t = 12, b = 28, pw = W - l - r, ph = H - t - b, cnt = Math.max(1, d.M - d.k0);
  d.cw = W;
  const ys = []; for (let k = d.k0; k <= d.M; k++) ys.push(d.lead[k] * d.sign);
  const mx = Math.max(5, Math.ceil(Math.max(...ys.map(Math.abs)) / 5) * 5);
  const X = i => l + i / cnt * pw, Y = v => t + (1 - (v + mx) / (2 * mx)) * ph, z = Y(0);
  const pts = ys.map((v, i) => [X(i), Y(v)]), line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  const area = line + `L${X(cnt).toFixed(1)} ${z.toFixed(1)}L${X(0).toFixed(1)} ${z.toFixed(1)}Z`;
  const fmt = v => v > 0 ? '+' + v : String(v);
  let g = `<defs><clipPath id="dc-up"><rect x="${l}" y="${t}" width="${pw}" height="${(z - t).toFixed(1)}"/></clipPath><clipPath id="dc-dn"><rect x="${l}" y="${z.toFixed(1)}" width="${pw}" height="${(t + ph - z).toFixed(1)}"/></clipPath></defs>`;
  for (const v of [-mx, -mx / 2, 0, mx / 2, mx]) g += `<line x1="${l}" x2="${l + pw}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" style="stroke:var(--line)" stroke-width="${v === 0 ? 0 : 1}"/><text x="${l - 6}" y="${(Y(v) + 4).toFixed(1)}" text-anchor="end" font-size="11" style="fill:var(--muted)">${fmt(Math.round(v * 10) / 10)}</text>`;
  const step = [5, 10, 20, 25, 50, 100, 200].find(s => cnt / s <= Math.max(2, pw / 56)) || 200;
  for (let m = 0; m <= cnt; m += step) g += `<line x1="${X(m).toFixed(1)}" x2="${X(m).toFixed(1)}" y1="${t + ph}" y2="${t + ph + 4}" style="stroke:var(--muted)"/><text x="${X(m).toFixed(1)}" y="${t + ph + 17}" text-anchor="middle" font-size="11" style="fill:var(--muted)">${m}</text>`;
  g += `<path d="${area}" clip-path="url(#dc-up)" style="fill:var(--good)" opacity=".28"/><path d="${area}" clip-path="url(#dc-dn)" style="fill:var(--bad)" opacity=".28"/>`;
  g += `<line x1="${l}" x2="${l + pw}" y1="${z.toFixed(1)}" y2="${z.toFixed(1)}" style="stroke:var(--ink)" stroke-width="1.2"/>`;
  g += `<path class="dline" d="${line}" fill="none" style="stroke:var(--ink)" stroke-width="1.8" stroke-linejoin="round"/>`;
  const c = Math.min(cnt, Math.max(0, d.cur - d.k0)), cp = pts[c];
  g += `<line class="dmark" x1="${cp[0].toFixed(1)}" x2="${cp[0].toFixed(1)}" y1="${t}" y2="${t + ph}" style="stroke:var(--accent)" stroke-width="1.6" stroke-dasharray="4 3"/><circle cx="${cp[0].toFixed(1)}" cy="${cp[1].toFixed(1)}" r="5" style="fill:var(--accent);stroke:var(--bg)" stroke-width="2"/>`;
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="กราฟแต้มนำของคุณ ตาที่ 0 ถึง ${cnt} ค่าสูงสุด ${mx} แต้ม">${g}</svg>`;
}
function deepPaint() {
  const d = deep; if (!d || d.state !== 'done') return;
  deepChart();
  const k = d.cur, v = d.lead[k] * d.sign, no = k - d.k0 + 1;
  let s;
  if (k >= d.M) s = `<b>ตำแหน่งสุดท้าย</b> หลังเดินครบ ${d.M - d.k0} ตา · ${leadText(v)}`;
  else {
    const mover = k % 2 === 0 ? 1 : 2, mine = mover === d.human, it = d.items.find(t => t.k === k);
    s = `<b>ก่อนตาที่ ${no}</b> · ${cname(mover)}เดิน${mine ? ' (คุณ)' : ''} ${nmPt(d.mv[k])} · ${leadText(v)}`;
    if (mine && it && it.loss >= 0.5) s += ` · ตานี้เสีย ${it.loss.toFixed(1)} แต้ม${d.best[k] != null && d.best[k] !== d.mv[k] ? ' ควรเดิน ' + nmPt(d.best[k]) : ''}`;
  }
  $('#dv-info').innerHTML = s;
  $('#dv-prev').disabled = k <= d.k0; $('#dv-next').disabled = k >= d.M;
}
function deepGo(k, scroll) {
  const d = deep; if (!d || d.state !== 'done') return;
  k = Math.max(d.k0, Math.min(d.M, k)); d.cur = k;
  const mover = k % 2 === 0 ? 1 : 2;
  review = { before: d.grids[k], idx: k < d.M ? d.mv[k] : -1, best: k < d.M && mover === d.human && d.best[k] != null ? d.best[k] : -1, no: k - d.k0 + 1, label: k >= d.M ? 'ตำแหน่งสุดท้ายของเกม' : `กำลังดูตำแหน่งก่อนตาที่ ${k - d.k0 + 1}` };
  renderGame(); deepPaint();
  if (scroll) GB.scrollIntoView({ block: 'nearest' });
}
const deepStep = dlt => { if (deep) deepGo(deep.cur + dlt, false); };
window.addEventListener('resize', () => { if (deep && deep.state === 'done' && deepShown && $('#dv-chart')) deepPaint(); });

// ---------- โหมดฝึก ----------
function startPractice(k, src) {
  if (!S) return;
  let p;
  if (k < 0) { if (!prac) return; p = { ...prac }; }
  else {
    if (prac) return;
    let info;
    if (src === 'd') { const d = deep; if (!d || d.state !== 'done') return; info = { played: d.mv[k], best: d.best[k] == null ? -1 : d.best[k], loss: Math.max(0, (d.lead[k] - d.lead[k + 1]) * d.sign) }; }
    else { const t = rec.find(x => x.no === k - hcN() + 1); if (!t) return; info = { played: t.idx, best: t.best, loss: t.loss }; }
    p = { moves: G.moves.slice(0, k), hc: HC, komi: G.komi, ...info };
    pracSaved = { gmode, G, S, human, over, dead, rec, HC, degraded, kataOK, lastSgf, lastRec, deep, deepShown };
  }
  p.moved = false; p.lock = false;
  startGame(S, G.n, human, null, { prac: p });
}
function pracBack() {
  const sv = pracSaved; if (!sv) return toLobby();
  token++; prac = null; pracSaved = null; $('#pbanner').hidden = true;
  gmode = sv.gmode || 'teach'; $('.tutor').hidden = gmode === 'real'; G = sv.G; S = sv.S; human = sv.human; over = sv.over; dead = sv.dead; rec = sv.rec; HC = sv.HC; degraded = sv.degraded; kataOK = sv.kataOK; lastSgf = sv.lastSgf; lastRec = sv.lastRec; deep = sv.deep; deepShown = sv.deepShown;
  busy = false; retry = false; review = null; pre = null; fresh = -1; hintIdx = -1; hintStage = 0; hintPt = -1; $('#tutor-act').hidden = true; $('#gnote').hidden = true; gfb('');
  tutor('กลับมาที่บทเรียนจากเกมจริงแล้ว');
  renderGame();
  if (deepShown && deep && deep.state === 'done') { renderDeep(); deepGo(deep.cur, false); } else { if (deep && deep.state !== 'done') deepShown = false; renderReview(); }
  if (over && over.final) $('#review').scrollIntoView({ block: 'nearest' });
  else if (!over) { if (botToMove()) botTurn(); else startPre(); }
}
// ติวเตอร์ตอบตาแรกของโหมดฝึก: ดีกว่าตาเดิมในเกมจริงหรือไม่
async function pracJudge(i, gb, ga, my) {
  const p = prac, say = t => { if (my === token && prac === p) $('#tutor-text').textContent = t; };
  const fallback = () => {
    if (p.best >= 0 && i === p.best) return `ตรงกับจุดที่แนะนำคือ ${G.name(i)} ดีกว่าตาเดิมในเกมจริง`;
    if (p.best >= 0) return `ไม่ใช่จุดที่แนะนำ (${G.name(p.best)}) ตอนนี้ยังบอกไม่ได้ว่าดีกว่าตาเดิมหรือไม่`;
    return 'ไม่มีจุดแนะนำให้เทียบ ลองเล่นต่อแล้วดูผลที่ปลายทาง';
  };
  if (i === p.played) return say('ตานี้เป็นจุดเดียวกับที่คุณเดินในเกมจริง ลองหาจุดอื่นดู');
  const eng = isKata() ? engine() : Srv.online ? Srv : null;
  if (!eng) return say(fallback());
  say('กำลังเทียบกับตาเดิมในเกมจริง...');
  try {
    const vis = eng === Srv ? 100 : 16, a0 = await eng.analyze(gb, vis), a1 = await eng.analyze(ga, vis);
    const sg = human === 1 ? 1 : -1, loss = Math.max(0, (a0.lead - a1.lead) * sg);
    if (p.loss == null) return say(`${i === p.best ? 'ตรงกับจุดที่แนะนำ' : 'ตานี้'}เสียราว ${loss.toFixed(1)} แต้ม${p.best >= 0 && i !== p.best ? ` จุดที่แนะนำคือ ${G.name(p.best)}` : ''}`);
    const dl = p.loss - loss, tail = `ตานี้เสียราว ${loss.toFixed(1)} แต้ม ส่วนตาเดิมในเกมจริงเสียราว ${p.loss.toFixed(1)} แต้ม`;
    if (dl >= 0.5) say('ดีกว่าตาเดิม ' + tail);
    else if (dl <= -0.5) say('ยังสู้ตาเดิมไม่ได้ ' + tail + (p.best >= 0 && i !== p.best ? ` จุดที่ดีกว่าคือ ${G.name(p.best)}` : ''));
    else say('ใกล้เคียงกับตาเดิม ' + tail);
  } catch (e) { say(fallback()); }
}
