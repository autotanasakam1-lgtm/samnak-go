// ---------- โปรไฟล์ในเครื่องนี้ ----------
const ANIMALS = [
  { kind: 'dog', fur: '#D9A066', label: 'หมา' }, { kind: 'panda', fur: '#F4F4F0', label: 'แพนด้า' }, { kind: 'monkey', fur: '#8A5A3A', label: 'ลิง' },
  { kind: 'elephant', fur: '#A9B4C2', label: 'ช้าง' }, { kind: 'frog', fur: '#7CC46A', label: 'กบ' }, { kind: 'bear', fur: '#9A6B45', label: 'หมี' }
];
const cleanName = v => String(v || '').replace(/\s+/g, ' ').trim().slice(0, 16);
const LVLS = [['', 'ไม่ตอบ'], ['new', 'ไม่เคยเล่น'], ['beg', 'เริ่มต้น']].concat(Array.from({ length: 20 }, (_, i) => ['k' + (20 - i), (20 - i) + ' คิว']), Array.from({ length: 7 }, (_, i) => ['d' + (i + 1), (i + 1) + ' ดั้ง']), [['unsure', 'ไม่แน่ใจ']]);
const lvlOpts = cur => LVLS.map(l => `<option value="${l[0]}"${l[0] === (cur || '') ? ' selected' : ''}>${l[1]}</option>`).join('');
const lvlOk = v => LVLS.some(l => l[0] === v);
let profile = store.get('go-profile', null);
if (!(profile && typeof profile.name === 'string' && cleanName(profile.name) && ANIMALS.some(a => a.kind === profile.animal))) profile = null;
const pn = () => profile ? profile.name : 'นักหมาก';
const animalOf = k => ANIMALS.find(a => a.kind === k) || ANIMALS[0];
const pav = (px, kind) => { const a = animalOf(kind || (profile && profile.animal)); return avatar({ kind: a.kind, fur: a.fur, bc: '#274690' }, px); };
const animalBtns = pick => ANIMALS.map(a => `<button type="button" data-k="${a.kind}" aria-pressed="${a.kind === pick}" aria-label="${a.label}">${pav(40, a.kind)}<small>${a.label}</small></button>`).join('');
function pickAnimal(e) { const b = e.target.closest('button[data-k]'); if (!b) return; b.parentNode.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); }
function renderChip() { const b = $('#pchip'); b.innerHTML = pav(32) + `<span>${esc(pn())}</span>`; b.setAttribute('aria-label', 'โปรไฟล์ของ ' + pn()); }
$('#pchip').onclick = () => { showTab('me'); window.scrollTo(0, 0); };
let justJoined = false;

function showWelcome() {
  if ($('#welcome')) return;
  const w = document.createElement('div'); w.className = 'sheet-wrap'; w.id = 'welcome';
  w.innerHTML = `<form class="sheet" role="dialog" aria-modal="true" aria-labelledby="wl-h"><h2 id="wl-h">ยินดีต้อนรับสู่สำนักหมากล้อม</h2>
    <div><label for="player-name" class="lab">ตั้งชื่อนักหมากของคุณ</label><input id="player-name" class="field" maxlength="16" autocomplete="off"></div>
    <div class="animals" role="group" aria-label="เลือกหน้าตาของคุณ">${animalBtns(ANIMALS[0].kind)}</div>
    <div><label for="player-lvl" class="lab">ระดับหมากล้อมของคุณ (ไม่บังคับ)</label><select id="player-lvl" class="field">${lvlOpts('')}</select></div>
    <div class="btns"><button class="btn primary" type="submit">เข้าสำนัก</button><button class="btn" type="button" id="wl-skip">ไว้ทีหลัง</button></div>
    <p class="small">ชื่อและผลการเรียนเก็บไว้ในเครื่องนี้ ไม่ต้องสมัครสมาชิก</p></form>`;
  document.body.appendChild(w);
  $('.wrap').inert = true;
  const form = $('form', w);
  const close = skip => {
    const picked = $('.animals [aria-pressed="true"]', w), nm = skip ? '' : cleanName($('#player-name').value);
    profile = { name: nm || 'นักหมาก', animal: picked ? picked.dataset.k : ANIMALS[0].kind, created: Date.now(), lvl: skip ? '' : ($('#player-lvl', w).value || '') };
    store.set('go-profile', profile); justJoined = true;
    $('.wrap').inert = false; w.remove(); renderChip(); showPath();
    const ft = $('#pchip') || $('[role=tab]') || $('h1'); if (ft) { if (!ft.matches('button,a,[tabindex]')) ft.tabIndex = -1; ft.focus(); }
    setTimeout(() => openSkill(true), 0);
  };
  form.onsubmit = e => { e.preventDefault(); close(false); };
  $('.animals', w).onclick = pickAnimal;
  $('#wl-skip').onclick = () => close(true);
  w.addEventListener('keydown', e => { if (e.key === 'Escape') close(true); });
  $('#player-name').focus();
}

// ---------- สถิติ ----------
const nLessons = () => LESSONS.filter(l => done[l.id]).length;
const nPuzzles = () => PUZZLES.filter(p => done[p.id]).length;
const nBeaten = () => SENSEI.filter(s => wins(s.id) >= 1).length;
const tiles = () => `<div class="tiles"><div class="tile"><b>${nLessons()}</b><span>บทเรียนที่จบ</span></div><div class="tile"><b>${nPuzzles()}</b><span>โจทย์ที่ผ่าน</span></div><div class="tile"><b>${nBeaten()}/${SENSEI.length}</b><span>คู่ประลองที่ชนะแล้ว</span></div></div>`;
const dayNo = () => { const d = new Date(); return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5); };
const GTIPS = [
  'หมากล้อมเล่นด้วยหมากดำกับหมากขาว ฝ่ายดำเดินก่อน และผลัดกันวางทีละเม็ด',
  'หมากวางบนจุดตัดของเส้น ไม่ได้วางในช่องสี่เหลี่ยม',
  'ลมหายใจคือจุดว่างที่ติดกับหมากตามแนวเส้น หมากที่ไม่เหลือลมหายใจจะถูกจับออกจากกระดาน',
  'หมากที่ติดกันตามแนวเส้นตรงนับเป็นกลุ่มเดียวกัน ส่วนแนวเฉียงไม่นับว่าติดกัน',
  'อาตาริ คือหมากที่เหลือลมหายใจเพียงจุดเดียว ถ้าไม่หนีก็ถูกจับในตาถัดไป',
  'กลุ่มหมากที่มีตาจริงสองตา ฝ่ายตรงข้ามจับไม่ได้ เรียกว่าอยู่รอด',
  'กฎโค ห้ามวางหมากแล้วทำให้กระดานกลับไปเหมือนตาก่อนหน้า ต้องไปเดินจุดอื่นก่อนแล้วค่อยกลับมา',
  'ห้ามวางหมากในจุดที่ไม่มีลมหายใจ เว้นแต่การวางนั้นจับหมากฝ่ายตรงข้ามได้',
  'เกมจบเมื่อทั้งสองฝ่ายผ่านติดต่อกัน จากนั้นนับพื้นที่ที่ล้อมได้เพื่อตัดสินผู้ชนะ',
  'ฝ่ายดำเดินก่อนจึงได้เปรียบ จึงมีคอมิ คือแต้มชดเชยให้ฝ่ายขาว',
  'ระดับฝีมือต่างกัน ให้ฝ่ายอ่อนกว่าวางหมากดำไว้ล่วงหน้า เรียกว่าแต้มต่อ',
  'กระดานมาตรฐานคือ 19x19 ส่วน 9x9 และ 13x13 เหมาะกับการฝึกช่วงแรก',
  'ตำแหน่งที่มีจุดดำเล็ก ๆ บนกระดานเรียกว่าจุดดาว ช่วยให้มองตำแหน่งได้ง่ายและใช้วางหมากแต้มต่อ',
  'หลักทั่วไปในช่วงเปิดเกม คือเริ่มที่มุมก่อน แล้วขยายไปด้านข้าง และค่อยไปตรงกลาง',
  'มารยาท ควรทักทายคู่ต่อสู้ก่อนเริ่มเกม และหยิบหมากด้วยนิ้วชี้กับนิ้วกลาง วางเบา ๆ',
  'หมากล้อมมีประวัติยาวนานกว่าสองพันปี จีนเรียกเวยฉี ญี่ปุ่นเรียกอิโกะ เกาหลีเรียกบาดุก'
];
let gtipI = dayNo() % GTIPS.length;
const TIPS = SENSEI.flatMap(s => [2, 3].map(k => [s.id, BANTER[s.id][k]]));

function goPlay(id) {
  if (!$('#game').hidden) { showTab('play'); return; }
  sel = id; selSize = bySid(id).n; showTab('play'); window.scrollTo(0, 0);
  const d = $('#detail'); if (d && matchMedia('(max-width:820px)').matches) d.scrollIntoView({ block: 'start' });
}

// ---------- หน้าแรก (แท็บเรียน) ----------
function boardDeco() {
  let g = ''; for (let k = 0; k < 7; k++) { const p = 45 + k * 23.3; g += `M${p.toFixed(1)} 45V185M45 ${p.toFixed(1)}H185`; }
  return `<svg class="deco" viewBox="0 0 230 230" aria-hidden="true" focusable="false"><g transform="rotate(-12 115 115)"><rect x="20" y="20" width="190" height="190" rx="12" fill="#E3BC6E" opacity=".4"/><path d="${g}" stroke="currentColor" stroke-width="1.2" opacity=".3" fill="none"/></g>
    <circle cx="96" cy="96" r="14" fill="#1c1c1f"/><circle cx="142" cy="112" r="14" fill="#f4f2ec" stroke="#0005"/><circle cx="119" cy="146" r="14" fill="#1c1c1f"/></svg>`;
}
function showPath() {
  $('#lesson-view').hidden = true; $('#path-view').hidden = false;
  const tot = LESSONS.length, nd = nLessons(), next = LESSONS.find(l => !done[l.id]), rs = bySid(recId() || 's9'), top = playerRank();
  const arc = (r, f, col) => { const c = 2 * Math.PI * r; return `<circle cx="42" cy="42" r="${r}" fill="none" stroke="var(--line)" stroke-width="6"/><circle cx="42" cy="42" r="${r}" fill="none" stroke="${col}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - Math.max(0, Math.min(1, f)))).toFixed(1)}" transform="rotate(-90 42 42)"/>`; };
  const np = nPuzzles(), nb = nBeaten(), pt = PUZZLES.length || 1, sb = SENSEI.length || 1, pct = Math.round(100 * (nd + np + nb) / ((tot + pt + sb) || 1));
  const ring = `<svg class="ring" viewBox="0 0 84 84" role="img" aria-label="ความคืบหน้า บทเรียน ${nd} จาก ${tot} โจทย์ ${np} จาก ${pt} คู่ประลอง ${nb} จาก ${sb}"><circle cx="42" cy="42" r="41" fill="var(--surface)"/>${arc(36, nd / tot, 'var(--accent)')}${arc(27, np / pt, 'var(--good)')}${arc(18, nb / sb, 'var(--bad)')}<text x="42" y="47" text-anchor="middle" font-size="12" font-weight="500" style="font-family:var(--mono)">${pct}%</text></svg>`;
  const rsm = $('#game').hidden ? readGame() : null, sk0 = profile && profile.skill, skS = sk0 && sk0.self > 0 && nd === 0 && !rsm ? bySid(sk0.sid) : null;
  let hero;
  if (rsm) hero = `<div class="col" style="gap:6px"><span class="eyebrow">เกมที่ค้างอยู่</span><h2>เกมกับ${rsm.s ? esc(rsm.s.name) : 'เพื่อน'}</h2><p class="small">ตาที่ ${rsm.no}</p></div>${ring}<div class="go"><button class="btn primary" data-rs="go" type="button">ทำต่อ</button></div>`;
  else if (skS) hero = `<div class="col" style="gap:6px"><span class="eyebrow">แนะนำสำหรับคุณ</span><h2>ลอง 9x9 กับ${esc(skS.name)}</h2><p class="small">${esc(skS.rank)}</p></div>${ring}<div class="go"><button class="btn primary" data-play="${skS.id}" type="button">ทำต่อ</button></div>`;
  else if (next) hero = `<div class="col" style="gap:6px"><span class="eyebrow">${nd ? 'บทถัดไป' : 'เริ่มต้นที่นี่'}</span><h2>${esc(next.title)}</h2><p class="small">ขั้น ${next.stage} · ${esc((STAGES.find(s => s.n === next.stage) || {}).title || '')}</p></div>${ring}<div class="go"><button class="btn primary" data-continue="${next.id}" type="button">${nd ? 'ทำต่อ' : 'เริ่มเลย'}</button></div>`;
  else hero = `<div class="col" style="gap:6px"><span class="eyebrow">เรียนครบแล้ว</span><h2>ลองลงสนามจริงกับ${esc(rs.name)}</h2><p class="small">${esc(rs.rank)} กำลังรออยู่</p></div>${ring}<div class="go"><button class="btn primary" data-play="${rs.id}" type="button">ทำต่อ</button></div>`;
  const hr = new Date().getHours(), greet = hr >= 5 && hr < 12 ? 'อรุณสวัสดิ์' : hr >= 12 && hr < 17 ? 'สวัสดียามบ่าย' : hr >= 17 && hr < 21 ? 'สวัสดียามเย็น' : 'ค่ำแล้ว พักสมองด้วยหมากสักตา';
  const fresh0 = nd + np + nb === 0;
  const legend = `<ul class="legend small"><li><i style="background:var(--accent)"></i>บทเรียน</li><li><i style="background:var(--good)"></i>โจทย์</li><li><i style="background:var(--bad)"></i>คู่ประลอง</li></ul>`;
  const pk = dayNo() % PUZZLES.length, pz = PUZZLES[pk];
  const stages = STAGES.filter(s => LESSONS.some(l => l.stage === s.n));
  $('#home').innerHTML = `<div class="h-greet"><span class="h-av">${pav(72)}</span><div class="col"><span class="eyebrow">${greet}</span><h1>${esc(pn())}</h1>${justJoined ? `<p class="small">ยินดีที่ได้รู้จัก เริ่มจากบทแรกได้เลย</p>` : ''}</div></div>
    ${skBanner()}
    <div class="h-grid"><div class="h-col"><div class="hero">${boardDeco()}${hero}</div>${legend}${tiles()}<p class="small">${fresh0 ? 'ยังไม่มีผลการเรียน เริ่มบทแรกแล้วตัวเลขจะขึ้นที่นี่' : top ? 'ชนะถึง: ' + esc(top.name) : 'ยังไม่ชนะคู่ประลองคนไหน ลองสักตาไหม'}</p></div>
    <div class="h-col"><section class="hsec"><h2>เกร็ดโกะ</h2><div class="gtip"><p id="gtip-t" aria-live="polite">${esc(GTIPS[gtipI % GTIPS.length])}</p><button class="btn" type="button" data-tip="1">เกร็ดถัดไป</button></div></section>
    ${teacherCard()}
    <section class="hsec"><h2>โจทย์ประจำวัน</h2><div class="daily"><div class="board static thumb" id="daily-b"></div><div class="col"><b>${esc(pz.title)}</b><span class="small">ระดับ ${esc(pz.level)}${done[pz.id] ? ' · ผ่านแล้ว' : ''}</span><div><button class="btn" data-daily="${pk}">ลองโจทย์นี้</button></div></div></div></section>
    <section class="hsec"><h2>ประลองเร็ว</h2><div class="quick">${avatar(rs, 56)}<div class="col"><b>${esc(rs.name)}</b><span class="small">${esc(rs.rank)}</span><div><button class="btn" data-play="${rs.id}">ประลองเลย</button></div></div></div></section></div></div>
    <section class="hsec"><h2 class="path-h">เส้นทางเรียน</h2><ol class="path">${stages.map(s => `<li><div class="lv"><b>ขั้น ${s.n}</b>${esc(s.level)}</div><div><h2>${esc(s.title)}</h2><div class="lessons">${LESSONS.filter(l => l.stage === s.n).map(l => `<button class="lesson${done[l.id] ? ' done' : ''}" data-id="${l.id}"><span>${esc(l.title)}</span><small>${done[l.id] ? 'เรียนแล้ว' : l.steps.length + ' ข้อ'}</small></button>`).join('')}</div></div></li>`).join('')}</ol>
    <p class="soon">ขั้นถัดไปกำลังเขียนร่วมกับครูผู้สอน</p></section>`;
  const p = parseRows(pz.steps[0].rows); drawBoard($('#daily-b'), { n: p.g.n, grid: p.g.grid });
  paintTeacher(); paintResume();
}
$('#home').onclick = e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.continue) { justJoined = false; openLesson(b.dataset.continue); }
  else if (b.dataset.id) { justJoined = false; openLesson(b.dataset.id); }
  else if (b.dataset.tip) { gtipI = (gtipI + 1) % GTIPS.length; $('#gtip-t').textContent = GTIPS[gtipI]; }
  else if (b.dataset.play) goPlay(b.dataset.play);
  else if (b.dataset.daily) { showTab('puzzles'); openPuzzle(+b.dataset.daily); window.scrollTo(0, 0); }
};

// ---------- เกมค้าง ----------
const GKEY = 'go-game';
function saveGame() {
  if (!G || prac || (over && over.final)) return;
  if (G.moves.length <= hcN()) return clearGame();
  recordSync();
  store.set(GKEY, { audit:recordAudit, v: 2, degraded: !!degraded, hc: HC, sid: S ? S.id : null, n: G.n, col: human, komi: G.komi, moves: G.moves.slice(), rec: rec.map(t => ({ no: t.no, idx: t.idx, loss: t.loss == null ? null : t.loss, best: t.best })) });
}
const clearGame = () => store.del(GKEY);
function readGame() {
  const d = store.get(GKEY, null); if (!d || typeof d !== 'object') return null;
  const s = d.sid == null ? null : bySid(d.sid);
  if (d.sid != null && !s) return null;
  if (![7, 9, 13, 19].includes(d.n) || ![1, 2].includes(d.col) || !Array.isArray(d.moves) || !d.moves.length || d.moves.length > 1500 || typeof d.komi !== 'number') return null;
  const hc = Number.isInteger(d.hc) && d.hc >= 2 && d.hc <= 9 && s && d.moves.length >= 2 * d.hc - 1 ? d.hc : 0, base = hc ? 2 * hc - 1 : 0;
  if (d.hc && !hc) return null;
  const g = new Go(d.n, d.komi);
  for (const m of d.moves) { if (!Number.isInteger(m) || m < -1 || m >= d.n * d.n) return null; if (m < 0) g.pass(); else if (!g.play(m).ok) return null; }
  return { audit:d.audit, s, degraded: d.degraded === true, n: d.n, col: d.col, komi: d.komi, hc, no: d.moves.length - base + 1, moves: d.moves, rec: Array.isArray(d.rec) ? d.rec : [] };
}
function replayInto(res) {
  const sv = new Map(res.rec.filter(t => t && typeof t === 'object').map(t => [t.no, t]));
  const base = res.hc ? 2 * res.hc - 1 : 0;
  for (const m of res.moves) {
    if (G.moves.length < base) { m < 0 ? G.pass() : G.play(m); if (G.moves.length === base) G.passes = 0; continue; }
    if (m < 0) { G.pass(); continue; }
    const who = G.turn, before = G.grid.slice(), no = G.moves.length - base + 1, f = moveFacts(G, m);
    if (!G.play(m).ok) break;
    if (S && who === human) {
      const t = sv.get(no) || {}, loss = typeof t.loss === 'number' ? t.loss : null;
      if (usesAI(S) && loss == null) continue;
      rec.push({ no, idx: m, before, facts: f, preP: null, loss, best: typeof t.best === 'number' ? t.best : -1 });
    }
  }
  fresh = G.last;
}
function paintResume() {
  const d = $('#game').hidden ? readGame() : null;
  document.querySelectorAll('.rs-slot').forEach(el => {
    if (!d) { el.innerHTML = ''; return; }
    el.innerHTML = `<div class="resume-banner"><p>มีเกมค้างอยู่กับ <b>${d.s ? esc(d.s.name) : 'เพื่อน'}</b> ตาที่ ${d.no}</p><div class="btns"><button class="btn primary" data-rs="go">เล่นต่อ</button><button class="btn" data-rs="drop">ทิ้งเกมนี้</button></div></div>`;
  });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-rs]'); if (!b) return;
  const slot = b.closest('.rs-slot');
  if (b.dataset.rs === 'go') {
    const d = readGame(); if (!d) { clearGame(); return paintResume(); }
    showTab('play'); startGame(d.s, d.n, d.col, d);
  } else if (b.dataset.rs === 'drop') {
    slot.querySelector('.btns').innerHTML = '<span class="small">ทิ้งเกมนี้แล้วจะเอากลับไม่ได้</span> <button class="btn" data-rs="yes">ยืนยันทิ้ง</button><button class="btn" data-rs="no">ยกเลิก</button>';
  } else if (b.dataset.rs === 'yes') { const d=readGame(); if(d) { startGame(d.s,d.n,d.col,d).then(()=>{recordSave(true);clearGame();toLobby();paintResume();}); return; } clearGame(); paintResume(); }
  else if (b.dataset.rs === 'no') paintResume();
});
$('#to-log').onclick = () => { showTab('me'); const l = $('#logbox'); if (l) l.scrollIntoView({ block: 'start' }); };

// ---------- หน้าโปรไฟล์ ----------
const b64 = s => btoa(unescape(encodeURIComponent(s)));
const unb64 = s => decodeURIComponent(escape(atob(s)));
const makeCode = () => b64(JSON.stringify({ v: 1, profile, done, rec: recs, log: matchLog, teacher: tList(), records:store.get('go-records',[]) }));
function renderProfile() {
  const top = playerRank();
  $('#me-top').innerHTML = `<div class="me-head">${pav(88)}<div class="col" style="gap:2px"><h1>${esc(pn())}</h1><span class="small">ชนะถึงใครแล้ว</span><b>${top ? esc(top.name) : 'ยังไม่ชนะใคร'}</b></div></div>
    ${tiles()}
    <div class="btns"><button class="btn" type="button" data-psh="line">แชร์ผลไป LINE</button><button class="btn" type="button" data-psh="copy">คัดลอกข้อความ</button></div>
    ${skProfileBlock()}
    <section class="hsec"><h2>ผลกับคู่ประลอง</h2><ul class="recs">${SENSEI.map(s => { const r = recs[s.id] || { w: 0, l: 0 }; return `<li>${avatar(s, 32)}<span>${esc(s.name)}</span><span>ชนะ ${r.w} แพ้ ${r.l}</span></li>`; }).join('')}</ul></section>
    <form class="panel col" id="me-form"><h2>เปลี่ยนชื่อและหน้าตา</h2><div><label class="lab" for="me-name">ชื่อนักหมาก</label><input id="me-name" class="field" maxlength="16" autocomplete="off" value="${esc(pn())}"></div><div><label class="lab" for="me-lvl">ระดับหมากล้อมของคุณ (ไม่บังคับ)</label><select id="me-lvl" class="field">${lvlOpts(profile && profile.lvl)}</select></div>
    <div class="animals" role="group" aria-label="เลือกหน้าตาของคุณ">${animalBtns(profile ? profile.animal : ANIMALS[0].kind)}</div>
    <div class="btns"><button class="btn primary" type="submit">บันทึก</button></div><p class="small" id="me-msg" role="status"></p></form>`;
  renderLog();
  $('#bk-code').value = makeCode(); $('#rs-code').value = ''; $('#rs-msg').textContent = ''; $('#rs-msg').className = 'small';
  $('#rs-btns').innerHTML = '<button class="btn" id="rs-go" type="button">กู้คืนข้อมูล</button>';
}
$('#me-top').addEventListener('click', pickAnimal);
$('#me-top').addEventListener('click', e => {
  const b = e.target.closest('[data-psh]'); if (!b) return;
  const tip = TIPS[dayNo() % TIPS.length][1], top = playerRank();
  const txt = shareResultText('profile', { stat: `ผ่านบทเรียน ${nLessons()} บท โจทย์ ${nPuzzles()} ข้อ ชนะคู่ประลอง ${nBeaten()}/${SENSEI.length} คน${top ? ' (ชนะถึง' + top.name + ')' : ''}`, take: tip });
  b.dataset.psh === 'line' ? shareOut(txt, b, b.parentNode) : copyText(txt, b, b.parentNode);
});
$('#me-top').addEventListener('submit', e => {
  e.preventDefault();
  const nm = cleanName($('#me-name').value), pk = $('#me-top .animals [aria-pressed="true"]');
  profile = { name: nm || pn(), animal: pk ? pk.dataset.k : (profile ? profile.animal : ANIMALS[0].kind), created: profile ? profile.created : Date.now(), skill: profile && profile.skill, lvl: ($('#me-lvl') ? $('#me-lvl').value : (profile && profile.lvl)) || '' };
  const saved = store.set('go-profile', profile); renderChip(); renderProfile(); showPath();
  $('#me-msg').textContent = saved ? 'บันทึกแล้ว' : 'บันทึกไม่สำเร็จ';
});
$('#me-back').onclick = () => { showTab(lastTab); window.scrollTo(0, 0); };
$('#bk-copy').onclick = e => copyText($('#bk-code').value, e.target, $('#backup'));

function parseCode(text) {
  const t = String(text).replace(/\s+/g, '');
  if (!t || t.length > 3e6 || !/^[A-Za-z0-9+/=]+$/.test(t)) return null;
  let o; try { o = JSON.parse(unb64(t)); } catch (e) { return null; }
  if (!o || typeof o !== 'object' || o.v !== 1 || !o.done || typeof o.done !== 'object' || !o.rec || typeof o.rec !== 'object' || !Array.isArray(o.log) || o.log.length > 400) return null;
  const teacher = [], seen = new Set();
  if (o.teacher != null && (!Array.isArray(o.teacher) || o.teacher.length > 20)) return null;
  for (const x of o.teacher || []) { const r = tClean(x && x.p); if (!r.p) return null; const id = tHash(r.p); if (!seen.has(id)) { seen.add(id); teacher.push({ id, p: r.p }); } }
  const ids = new Set([...LESSONS, ...PUZZLES, ...teacher].map(x => x.id)), dn = {}, rc = {}, lg = [];
  for (const k of Object.keys(o.done)) if (ids.has(k) && o.done[k]) dn[k] = 1;
  const cnt = v => Number.isInteger(v) && v >= 0 && v < 1e6;
  for (const s of SENSEI) { const r = o.rec[s.id]; if (r) { if (!cnt(r.w) || !cnt(r.l) || (r.we != null && !cnt(r.we)) || (r.tw != null && !cnt(r.tw)) || (r.tl != null && !cnt(r.tl))) return null; rc[s.id] = r.we == null ? { w: r.w, l: r.l } : { w: r.w, l: r.l, we: r.we }; rc[s.id].tw = r.tw == null ? 0 : r.tw; rc[s.id].tl = r.tl == null ? 0 : r.tl; } }
  const str = (v, m) => typeof v === 'string' && v.length <= m;
  const numN = v => v == null || (typeof v === 'number' && isFinite(v));
  for (const r of o.log.slice(-200)) {
    if (!r || typeof r !== 'object' || (r.mode != null && !['teach', 'real'].includes(r.mode)) || !str(r.t, 40) || !bySid(r.sid) || !str(r.sname, 60) || !str(r.rank, 30) || ![7, 9, 13, 19].includes(r.n) || !['W', 'L'].includes(r.result) || !str(r.sgf, 30000) || !numN(r.margin) || !numN(r.avgLoss) || !numN(r.big) || !numN(r.komi)) return null;
    const hcv = Number.isInteger(r.handicap) && r.handicap >= 2 && r.handicap <= 9 ? r.handicap : 0;
    const dp = r.deep && typeof r.deep === 'object' && numN(r.deep.avg) && r.deep.avg != null && cnt(r.deep.big) && Number.isInteger(r.deep.weak) && r.deep.weak >= -1 && r.deep.weak <= 2 ? { avg: r.deep.avg, big: r.deep.big, weak: r.deep.weak } : null;
    lg.push({ recordId:r.recordId, mode: r.mode || 'real', handicap: hcv, deep: dp, t: r.t, sid: r.sid, sname: r.sname, rank: r.rank, n: r.n, color: r.color === 2 ? 2 : 1, komi: r.komi == null ? 6.5 : r.komi, result: r.result, margin: r.margin == null ? null : r.margin, resign: !!r.resign, moves: cnt(r.moves) ? r.moves : 0, avgLoss: r.avgLoss == null ? null : r.avgLoss, big: r.big == null ? null : r.big, degraded: !!r.degraded, sgf: r.sgf });
  }
  let pr = null;
  if (o.profile) { const nm = typeof o.profile.name === 'string' ? cleanName(o.profile.name) : ''; if (!nm || !ANIMALS.some(a => a.kind === o.profile.animal)) return null; pr = { name: nm, animal: o.profile.animal, created: typeof o.profile.created === 'number' ? o.profile.created : Date.now() }; if (lvlOk(o.profile.lvl)) pr.lvl = o.profile.lvl; const k = o.profile.skill; if (k && typeof k === 'object' && bySid(k.sid) && LESSONS.some(l => l.id === k.lesson) && [0, 1, 2, 3].includes(k.self)) pr.skill = { self: k.self, score: Math.max(0, Math.min(9, k.score | 0)), total: Math.max(0, Math.min(9, k.total | 0)), sid: k.sid, lesson: k.lesson, t: +k.t || 0 }; }
  const records=Array.isArray(o.records)?o.records.filter(r=>r && typeof r.id==='string' && [7,9,13,19].includes(r.n) && Array.isArray(r.sequence) && r.sequence.length<=1500):[];
  return { profile: pr, done: dn, rec: rc, log: lg, teacher, records };
}
let pendingRestore = null;
$('#backup').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const msg = $('#rs-msg');
  if (b.id === 'rs-go') {
    const r = parseCode($('#rs-code').value);
    if (!r) { msg.textContent = 'รหัสนี้ใช้ไม่ได้ ตรวจดูว่าคัดลอกมาครบทั้งหมด'; msg.className = 'small bad-t'; return; }
    pendingRestore = r; msg.className = 'small'; msg.textContent = 'ข้อมูลเดิมในเครื่องนี้จะถูกแทนที่ทั้งหมด';
    $('#rs-btns').innerHTML = '<button class="btn primary" id="rs-yes" type="button">ยืนยันกู้คืน</button><button class="btn" id="rs-no" type="button">ยกเลิก</button>';
  } else if (b.id === 'rs-no') { pendingRestore = null; msg.textContent = ''; $('#rs-btns').innerHTML = '<button class="btn" id="rs-go" type="button">กู้คืนข้อมูล</button>'; }
  else if (b.id === 'rs-yes' && pendingRestore) {
    const r = pendingRestore; pendingRestore = null;
    toLobby(); G = null; S = null; over = null; pre = null; rec = [];
    done = r.done; recs = r.rec; matchLog = r.log;
    const saved = [store.set('go-done', done), store.set('go-rec', recs), store.set('go-log', matchLog), store.set(TKEY, r.teacher), store.set('go-records', r.records || [])];
    if (r.profile) { profile = r.profile; saved.push(store.set('go-profile', profile)); }
    const ok = saved.every(Boolean);
    if (ok) clearGame(); renderChip(); renderProfile(); showPath(); openPuzzle(pzCur);
    msg.textContent = ok ? 'กู้คืนข้อมูลแล้ว' : 'กู้คืนไม่สำเร็จ'; msg.className = 'small ' + (ok ? 'good-t' : 'bad-t');
  }
});

// ---------- แบบวัดความรู้ครั้งแรก (เริ่มตรงนี้ดี) ----------
const SKRUN = 'go-skill-run';
const SK_Q = ['ไม่เคยเลย', 'รู้กติกานิดหน่อย', 'เล่นเป็นประจำ', 'เล่นแข่งขัน'];
const SK_QS = ['ยังไม่เคยจับหมากสักเม็ด', 'พอรู้ว่าล้อมแล้วกิน', 'ไล่ไล่เล่นกับเพื่อนอยู่บ่อย ๆ', 'ลงสนามแข่งมาแล้ว'];
let sk = store.get(SKRUN, null), skEl = null, skMissed = false, skObs = null;
const skValid = o => o && typeof o === 'object' && ['q1', 'pz', 'out'].includes(o.step);
if (!skValid(sk)) sk = null;
const skSave = () => { if (sk) store.set(SKRUN, sk); else store.del(SKRUN); };
const skPicks = () => { const L = PUZZLES.length, m = Math.min(5, L); return [...new Set(Array.from({ length: m }, (_, i) => Math.round(i * (L - 1) / Math.max(1, m - 1))))].map(i => PUZZLES[i].id); };
function skRecommend(self, score) {
  let k = score <= 0 || (score === 1 && self <= 1) ? 1 : score <= 1 ? 2 : score === 2 ? 3 : score === 3 ? 4 : score === 4 ? 5 : (self >= 3 ? 6 : 5);
  k = Math.min(k, self <= 1 ? 3 : self === 2 ? 5 : 6);
  const maxStage = Math.max(...LESSONS.map(l => l.stage)), want = Math.min(maxStage, score <= 1 ? 1 : 2);
  const les = LESSONS.find(l => l.stage >= want && !done[l.id]) || LESSONS.find(l => !done[l.id]) || LESSONS[LESSONS.length - 1];
  return { sid: 's' + k, lesson: les.id };
}
function skClose(keep) {
  if (!skEl) return;
  if (skObs) { skObs.disconnect(); skObs = null; }
  skEl.remove(); skEl = null; $('.wrap').inert = false;
  if (!keep) { sk = null; skSave(); }
  showPath();
  const ft = $('#pchip'); if (ft) ft.focus();
}
function openSkill(fresh) {
  if (fresh || !sk) sk = { step: 'q1', self: -1, picks: skPicks(), pi: 0, res: [] };
  skSave();
  if (!skEl) {
    skEl = document.createElement('div'); skEl.className = 'sheet-wrap'; skEl.id = 'skill';
    skEl.innerHTML = '<div class="sheet sk-sheet" role="dialog" aria-modal="true" aria-labelledby="sk-h" tabindex="-1"></div>';
    document.body.appendChild(skEl); $('.wrap').inert = true;
    skEl.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); skClose(true); } });
    skEl.addEventListener('click', e => { if (e.target.closest('.b-hint,.b-reset')) skMissed = true; });
  }
  skPaint();
}
function skPaint() {
  const box = $('.sk-sheet', skEl), skip = '<button class="btn" type="button" data-sk="skip">ข้ามไปก่อน</button>';
  if (skObs) { skObs.disconnect(); skObs = null; }
  let html = '';
  if (sk.step === 'q1') {
    html = `<div class="tipbox">${avatar(bySid('s2'), 52)}<p class="bubble" id="sk-h">เจ้าถิ่นอยากรู้จักคุณก่อน เคยเล่นหมากล้อมไหม?</p></div>
      <div class="sk-opts" role="group" aria-label="เคยเล่นหมากล้อมไหม">${SK_Q.map((q, i) => `<button class="btn sk-opt" type="button" data-sk="q" data-i="${i}"><b>${q}</b><small>${SK_QS[i]}</small></button>`).join('')}</div>
      <p class="small">ตอบแบบไหนก็ได้ ไม่มีถูกผิด ไม่มีใครตัดเกรด</p><div class="btns">${skip}</div>`;
  } else if (sk.step === 'pz') {
    const p = PUZZLES.find(x => x.id === sk.picks[sk.pi]);
    html = `<div class="sk-top"><h2 id="sk-h">โจทย์วอร์มอัพ ข้อ ${sk.pi + 1} จาก ${sk.picks.length}</h2><div class="sk-prog" aria-hidden="true">${sk.picks.map((_, i) => `<i class="${i < sk.pi ? 'on' : i === sk.pi ? 'cur' : ''}"></i>`).join('')}</div></div>
      <p class="small">แตะจุดที่คิดว่าใช่ ถ้ากดคำใบ้หรือพลาด ข้อนี้จะไม่นับแต้ม ไม่เป็นไรนะ</p><div id="sk-pz"></div>
      <div class="btns"><button class="btn" type="button" data-sk="pass">ไม่รู้ ข้ามข้อนี้</button>${skip}</div>`;
    box.innerHTML = html; skMissed = false;
    const root = $('#sk-pz', box);
    pzPlayerOpen(root, p);
    skObs = new MutationObserver(() => { const f = $('.fb', root); if (f && f.classList.contains('bad')) skMissed = true; });
    skObs.observe(root, { subtree: true, attributes: true, attributeFilter: ['class'], childList: true });
    skFocus(box, '.board'); return;
  } else {
    const r = sk.result, s = bySid(r.sid), les = LESSONS.find(l => l.id === r.lesson) || LESSONS[0], beginner = r.self === 0;
    html = `<div class="tipbox">${avatar(s, 56)}<div class="col" style="gap:4px"><span class="eyebrow">ผลเบา ๆ ของ${esc(pn())}</span><h2 id="sk-h">เริ่มตรงนี้ดี</h2></div></div>
      <div class="sk-rec"><div><span class="small">บทเรียนที่แนะนำ</span><b>${esc(les.title)}</b></div>${beginner ? '' : `<div><span class="small">คู่ซ้อม 9x9</span><b>${esc(s.name)}</b><span class="small">${esc(s.rank)}</span></div>`}</div>
      <p class="small">${beginner ? 'เริ่มจากบทแรก ค่อย ๆ ไปทีละก้าว' : `ทำโจทย์ได้ ${r.score} จาก ${r.total} ข้อ`} นี่เป็นแค่จุดเริ่มต้นที่แนะนำ ไม่ใช่การจัดระดับหรืออันดับของคุณ เล่นไปเรียนไปแล้วเปลี่ยนใจได้ตลอด</p>
      <div class="btns">${beginner ? '' : `<button class="btn primary" type="button" data-sk="play" data-sid="${s.id}">ลองเล่น 9x9 กับ${esc(s.name)}</button>`}<button class="btn${beginner ? ' primary' : ''}" type="button" data-sk="lesson" data-id="${les.id}">${beginner ? 'ไปบทที่ 1' : 'เรียน ' + esc(les.title)}</button><button class="btn" type="button" data-sk="done">ไว้ก่อน ดูหน้าแรก</button></div>`;
  }
  box.innerHTML = html; skFocus(box, 'button');
}
function pzPlayerOpen(root, p) { const pl = Player(root, 'puzzle', () => skAnswer(!skMissed)); pl.open(p); skMissed = false; }
function skFocus(box, sel) { const t = $(sel, box); if (t) { if (!t.matches('button,[tabindex]')) t.tabIndex = -1; t.focus({ preventScroll: true }); } }
function skAnswer(ok) {
  sk.res[sk.pi] = ok ? 1 : 0; sk.pi++;
  if (sk.pi >= sk.picks.length) skFinish(); else { skSave(); skPaint(); }
}
function skFinish() {
  const total = sk.picks.length, score = sk.res.reduce((a, b) => a + b, 0), self = sk.self;
  const rc = self === 0 ? { sid: 's1', lesson: LESSONS[0].id } : skRecommend(self, score);
  sk.result = { self, score: self === 0 ? 0 : score, total: self === 0 ? 0 : total, sid: rc.sid, lesson: rc.lesson, t: Date.now() };
  sk.step = 'out'; skSave(); skStore(sk.result); skPaint();
}
function skStore(r) { profile = Object.assign({}, profile || { name: 'นักหมาก', animal: ANIMALS[0].kind, created: Date.now() }, { skill: r }); store.set('go-profile', profile); }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-sk]'); if (!b || !skEl || !skEl.contains(b)) return;
  const a = b.dataset.sk;
  if (a === 'skip') skClose(true);
  else if (a === 'q') {
    sk.self = +b.dataset.i;
    if (sk.self === 0) skFinish(); else { sk.step = 'pz'; sk.pi = 0; sk.res = []; skSave(); skPaint(); }
  } else if (a === 'pass') skAnswer(false);
  else if (a === 'done') { sk = null; skSave(); skClose(); }
  else if (a === 'lesson') { const id = b.dataset.id; sk = null; skSave(); skClose(); justJoined = false; openLesson(id); }
  else if (a === 'play') { const s = bySid(b.dataset.sid); sk = null; skSave(); skClose(); showTab('play'); startGame(s, 9, 1, null, {}); }
});
function skBanner() {
  if (!sk || skEl) return '';
  return `<div class="resume-banner sk-banner"><p>${sk.step === 'q1' ? 'อยากให้เจ้าถิ่นแนะนำจุดเริ่มต้นไหม ใช้เวลาไม่ถึงสามนาที' : 'แบบวัดความรู้ที่ทำค้างไว้ ทำต่อได้เลย'}</p><div class="btns"><button class="btn" data-skb="go" type="button">${sk.step === 'q1' ? 'เริ่มเลย' : 'ทำต่อ'}</button><button class="btn" data-skb="drop" type="button">ไม่ต้องแล้ว</button></div></div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-skb]'); if (!b) return;
  if (b.dataset.skb === 'go') openSkill(false); else { sk = null; skSave(); showPath(); }
});
function skProfileBlock() {
  const r = profile && profile.skill, s = r && bySid(r.sid);
  return `<section class="hsec" id="sk-prof"><h2>แบบวัดความรู้</h2>${s ? `<p class="small">จุดเริ่มต้นที่แนะนำ: ${r.self === 0 ? 'บทที่ 1' : 'เล่น 9x9 กับ' + esc(s.name)} (ไม่ใช่ระดับของคุณ)</p>` : '<p class="small">ยังไม่เคยทำ</p>'}<div class="btns"><button class="btn" type="button" data-skb="redo">ทำแบบวัดความรู้ใหม่</button></div></section>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-skb="redo"]'); if (b) openSkill(true); });

// ---------- โจทย์จากครู (ไม่มีเซิร์ฟเวอร์: โจทย์อยู่ในลิงก์) ----------
const TKEY = 'go-teacher-puzzles', T_MAX_HASH = 3000, T_MAX_JSON = 2400;
const tTxt = (v, m) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f-\u009f‎‏‪-‮<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, m) : '';
const tB64e = o => b64(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function tB64d(c) {
  if (typeof c !== 'string' || !c || c.length > T_MAX_HASH || !/^[A-Za-z0-9_-]+$/.test(c)) return null;
  try { let t = c.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '='; const j = unb64(t); return j.length > T_MAX_JSON ? null : JSON.parse(j); } catch (e) { return null; }
}
// ตรวจและทำความสะอาดโจทย์ (ถือว่าข้อมูลไม่น่าไว้ใจ) คืน {p, err}
function tClean(o) {
  const bad = err => ({ p: null, err });
  if (!o || typeof o !== 'object' || Array.isArray(o) || o.v !== 1) return bad('ลิงก์นี้เป็นเวอร์ชันที่อ่านไม่ได้');
  const n = o.n === 13 ? 13 : o.n === 9 ? 9 : 0; if (!n) return bad('ขนาดกระดานต้องเป็น 9 หรือ 13');
  const N = n * n, ids = (a, max) => Array.isArray(a) && a.length <= max && a.every(v => Number.isInteger(v) && v >= 0 && v < N) ? [...new Set(a)].sort((x, y) => x - y) : null;
  const b = ids(o.b, N), w = ids(o.w, N), a = ids(o.a, 6);
  if (!b || !w || !a) return bad('ตำแหน่งหมากไม่ถูกต้อง');
  if (b.length + w.length < 1) return bad('ต้องมีหมากบนกระดานอย่างน้อยหนึ่งเม็ด');
  if (!a.length) return bad('ยังไม่ได้เลือกจุดคำตอบ');
  const occ = new Set([...b, ...w]); if (occ.size !== b.length + w.length) return bad('มีหมากซ้อนกันอยู่');
  if (a.some(i => occ.has(i))) return bad('จุดคำตอบต้องเป็นจุดว่าง');
  const g = new Go(n); b.forEach(i => { g.grid[i] = 1; }); w.forEach(i => { g.grid[i] = 2; });
  for (const i of occ) if (g.group(i).libs.size === 0) return bad('มีกลุ่มหมากที่ไม่เหลือลมหายใจเลย');
  for (const i of a) { const t = g.clone(); t.turn = 1; if (!t.play(i).ok) return bad('จุดคำตอบนี้ดำวางไม่ได้ตามกติกา (' + g.name(i) + ')'); }
  const t = tTxt(o.t, 40) || 'โจทย์จากครู';
  return { p: { v: 1, n, b, w, a, t, h: tTxt(o.h, 120), e: tTxt(o.e, 240) }, err: '' };
}
const tHash = p => { let h = 2166136261; const s = JSON.stringify(p); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return 't' + (h >>> 0).toString(36); };
function tList() {
  const raw = store.get(TKEY, []), out = [], seen = new Set();
  if (!Array.isArray(raw)) return out;
  for (const x of raw) { const r = tClean(x && x.p); if (!r.p) continue; const id = tHash(r.p); if (!seen.has(id)) { seen.add(id); out.push({ id, p: r.p }); } if (out.length >= 20) break; }
  return out;
}
function tSave(p) { const id = tHash(p), l = [{ id, p }, ...tList().filter(x => x.id !== id)].slice(0, 20); store.set(TKEY, l); return id; }
function tPuzzle(it) {
  const p = it.p, n = p.n, rows = [];
  for (let y = 0; y < n; y++) { let r = ''; for (let x = 0; x < n; x++) { const i = y * n + x; r += p.b.includes(i) ? 'X' : p.w.includes(i) ? 'O' : p.a.includes(i) ? '*' : '.'; } rows.push(r); }
  return { id: it.id, teacher: true, level: 'จากครู', title: p.t, steps: [{ t: 'point', rows, text: p.h || 'ดำเดิน หาตาที่ดีที่สุด', no: 'ยังไม่ใช่ ลองคิดใหม่ หรือกดดูคำใบ้ได้', ok: p.e || 'ถูกต้อง เก่งมาก' }] };
}
const tLink = p => ((location.protocol === 'http:' || location.protocol === 'https:') ? location.origin + location.pathname : SITE) + '#t=' + tB64e(p);
let tNote = '';
function tThumb(it) { const g = new Int8Array(it.p.n * it.p.n); it.p.b.forEach(i => { g[i] = 1; }); it.p.w.forEach(i => { g[i] = 2; }); return { n: it.p.n, grid: g }; }
function teacherCard() {
  const l = tList(), note = tNote ? `<p class="small t-note" role="status">${esc(tNote)}</p>` : '<p class="small t-note" role="status"></p>';
  if (!l.length) return `<section class="hsec" id="t-card"><h2>โจทย์จากครู</h2>${note}<p class="small">ยังไม่มีโจทย์จากครู เมื่อครูส่งลิงก์มา เปิดลิงก์นั้นแล้วโจทย์จะมาอยู่ตรงนี้</p></section>`;
  const [f, ...rest] = l, dn = it => done[it.id] ? ' · ผ่านแล้ว' : ' · ยังไม่ได้ลอง';
  return `<section class="hsec" id="t-card"><h2>โจทย์จากครู</h2>${note}<div class="daily"><div class="board static thumb" id="t-thumb"></div><div class="col"><span class="eyebrow">โจทย์จากครู</span><b>${esc(f.p.t)}</b><span class="small">${f.p.n} x ${f.p.n}${dn(f)}</span><div><button class="btn primary" data-tp="${f.id}">${done[f.id] ? 'ลองอีกรอบ' : 'ลองเลย'}</button></div></div></div>
    ${rest.length ? `<details class="t-more"><summary>โจทย์ก่อนหน้า (${rest.length})</summary><div class="chips">${rest.map(it => `<button class="chip${done[it.id] ? ' done' : ''}" data-tp="${it.id}"><span>${esc(it.p.t)}</span></button>`).join('')}</div></details>` : ''}</section>`;
}
function paintTeacher() { const l = tList(), el = $('#t-thumb'); if (el && l[0]) drawBoard(el, tThumb(l[0])); }
let tEl = null, tPrevFocus = null;
function tClose() { if (!tEl) return; tEl.remove(); tEl = null; $('.wrap').inert = false; showPath(); if (tPrevFocus && tPrevFocus.isConnected) tPrevFocus.focus(); }
function openTeacher(id) {
  const it = tList().find(x => x.id === id); if (!it || tEl || $('#skill')) return;
  tPrevFocus = document.activeElement;
  tEl = document.createElement('div'); tEl.className = 'sheet-wrap'; tEl.id = 'tpz';
  tEl.innerHTML = '<div class="sheet sk-sheet" role="dialog" aria-modal="true" aria-label="โจทย์จากครู" tabindex="-1"><div id="tpz-pl"></div><div class="btns"><button class="btn" type="button" data-tclose>ปิด</button></div></div>';
  document.body.appendChild(tEl); $('.wrap').inert = true;
  const mark = () => { if (!done[it.id]) { done[it.id] = 1; store.set('go-done', done); } };
  const pl = Player($('#tpz-pl', tEl), 'puzzle', () => { mark(); tClose(); }, mark);
  pl.open(tPuzzle(it));
  tEl.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); tClose(); } });
  tEl.addEventListener('click', e => { if (e.target.closest('[data-tclose]')) tClose(); });
  const bd = $('.board', tEl); if (bd) bd.focus({ preventScroll: true });
}
function handleTeacher(h) {
  const code = String(h || '').slice(3), r = tClean(tB64d(code));
  try { history.replaceState(null, '', '#learn'); } catch (e) { }
  showTab('learn');
  if (!r.p) { tNote = 'ลิงก์โจทย์นี้ใช้ไม่ได้ (' + (r.err || 'ข้อมูลไม่ครบหรือเสียหาย') + ') ลองขอลิงก์ใหม่จากครู'; showPath(); return; }
  const id = tSave(r.p); tNote = 'รับโจทย์ "' + r.p.t + '" จากครูแล้ว'; showPath();
  if (!$('#welcome') && !$('#skill')) openTeacher(id);
}
$('#home').addEventListener('click', e => { const b = e.target.closest('[data-tp]'); if (b) openTeacher(b.dataset.tp); });

// ---------- เครื่องมือ ครูตั้งโจทย์ (ในโปรไฟล์) ----------
const TT = { n: 9, grid: null, ans: new Set(), tool: 'b', link: '' };
function ttBoard() { return $('#tt-board'); }
function ttDraw() {
  const rings = [...TT.ans].map(i => ({ i, color: '#c2185b' }));
  drawBoard(ttBoard(), { n: TT.n, grid: TT.grid, rings, hints: [] });
  $('#tt-count').textContent = `ดำ ${TT.grid.filter(v => v === 1).length} เม็ด ขาว ${TT.grid.filter(v => v === 2).length} เม็ด จุดคำตอบ ${TT.ans.size} จุด`;
}
function ttReset(n) { TT.n = n; TT.grid = new Int8Array(n * n); TT.ans = new Set(); ttDraw(); $('#tt-out').hidden = true; }
function ttMsg(t, bad) { const m = $('#tt-msg'); m.textContent = t; m.className = 'small ' + (bad ? 'bad-t' : 'good-t'); }
function ttInit() {
  const body = $('#tt-body'); if (!body) return;
  body.innerHTML = `<p class="small">วางหมากเป็นโจทย์ให้ดำเดิน แล้วเลือกจุดคำตอบที่ถูก เสร็จแล้วกดสร้าง จะได้ลิงก์ส่งให้นักเรียนทาง LINE (โจทย์อยู่ในลิงก์ ไม่ต้องมีเซิร์ฟเวอร์)</p>
    <div class="btns" role="group" aria-label="ขนาดกระดาน"><button class="btn" type="button" data-ttn="9" aria-pressed="true">9 x 9</button><button class="btn" type="button" data-ttn="13" aria-pressed="false">13 x 13</button></div>
    <div class="btns" role="group" aria-label="เครื่องมือวางหมาก"><button class="btn" type="button" data-ttt="b" aria-pressed="true">หมากดำ</button><button class="btn" type="button" data-ttt="w" aria-pressed="false">หมากขาว</button><button class="btn" type="button" data-ttt="a" aria-pressed="false">จุดคำตอบ</button><button class="btn" type="button" data-ttt="x" aria-pressed="false">ลบ</button><button class="btn" type="button" data-ttt="clear">ล้างกระดาน</button></div>
    <div class="board" id="tt-board"></div><p class="small" id="tt-count" role="status"></p>
    <div><label class="lab" for="tt-title">ชื่อโจทย์ (ไม่เกิน 40 ตัวอักษร)</label><input id="tt-title" class="field" maxlength="40" autocomplete="off"></div>
    <div><label class="lab" for="tt-hint">คำใบ้ / โจทย์ที่ถามนักเรียน (ไม่เกิน 120)</label><input id="tt-hint" class="field" maxlength="120" autocomplete="off" placeholder="เช่น ดำเดิน กินหมากขาวให้ได้"></div>
    <div><label class="lab" for="tt-exp">คำอธิบายเฉลย (ไม่เกิน 240)</label><textarea id="tt-exp" class="field" maxlength="240" rows="3"></textarea></div>
    <div class="btns"><button class="btn primary" type="button" id="tt-make">สร้างลิงก์โจทย์</button></div><p class="small" id="tt-msg" role="status"></p>
    <div class="col" id="tt-out" hidden><label class="lab" for="tt-link">ลิงก์โจทย์ (ส่งให้นักเรียน)</label><textarea id="tt-link" class="codebox" readonly rows="3"></textarea>
    <div class="btns"><button class="btn" type="button" id="tt-copy">คัดลอกลิงก์</button><button class="btn" type="button" id="tt-line">แชร์ลิงก์ไป LINE</button><button class="btn" type="button" id="tt-try">ลองเล่นเอง</button></div></div>`;
  TT.grid = new Int8Array(81);
  bindBoard(ttBoard(), i => {
    if (TT.tool === 'a') { if (TT.grid[i]) return ttMsg('จุดคำตอบต้องเป็นจุดว่าง', true); TT.ans.has(i) ? TT.ans.delete(i) : TT.ans.add(i); }
    else if (TT.tool === 'x') { TT.grid[i] = 0; TT.ans.delete(i); }
    else { const c = TT.tool === 'b' ? 1 : 2; TT.grid[i] = TT.grid[i] === c ? 0 : c; TT.ans.delete(i); }
    $('#tt-msg').textContent = ''; ttDraw();
  }, ttDraw);
  ttDraw();
  body.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ttn) { const n = +b.dataset.ttn; body.querySelectorAll('[data-ttn]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); if (n !== TT.n) ttReset(n); }
    else if (b.dataset.ttt === 'clear') ttReset(TT.n);
    else if (b.dataset.ttt) { TT.tool = b.dataset.ttt; body.querySelectorAll('[data-ttt]').forEach(x => x.hasAttribute('aria-pressed') && x.setAttribute('aria-pressed', String(x === b))); }
    else if (b.id === 'tt-make') {
      const o = { v: 1, n: TT.n, b: [], w: [], a: [...TT.ans], t: $('#tt-title').value, h: $('#tt-hint').value, e: $('#tt-exp').value };
      TT.grid.forEach((v, i) => { if (v === 1) o.b.push(i); else if (v === 2) o.w.push(i); });
      const r = tClean(o); if (!r.p) { $('#tt-out').hidden = true; return ttMsg(r.err, true); }
      const link = tLink(r.p);
      if (link.length > T_MAX_HASH + 200) { $('#tt-out').hidden = true; return ttMsg('โจทย์ยาวเกินไปสำหรับลิงก์ ลองลดข้อความหรือจำนวนหมาก', true); }
      TT.link = link; TT.p = r.p; $('#tt-link').value = link; $('#tt-out').hidden = false; ttMsg('สร้างลิงก์แล้ว โจทย์ถูกต้องตามกติกา');
    }
    else if (b.id === 'tt-copy') copyText(TT.link, b, $('#tt-out'));
    else if (b.id === 'tt-line') shareOut(`ครูตั้งโจทย์หมากล้อมมาให้แล้ว: "${TT.p.t}"\nกดลิงก์เพื่อลองแก้โจทย์ได้เลย\n${TT.link}`, b, $('#tt-out'));
    else if (b.id === 'tt-try' && TT.p) { const id = tSave(TT.p); showPath(); openTeacher(id); }
  });
}

// ---------- เริ่มต้น ----------
const bootHash = location.hash;
renderChip(); showPath(); openPuzzle(0); renderExplain(); renderLobby(); openMaster('go'); ttInit();
if (bootHash.indexOf('#t=') === 0) { if (!profile) showWelcome(); handleTeacher(bootHash); } else { showTab(bootHash.slice(1)); if (!profile) showWelcome(); }
