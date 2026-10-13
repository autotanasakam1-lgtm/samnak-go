// ตรวจไฟล์เกม SGF: ตาเดินถูกกติกาทุกตา, จบด้วยผ่านสองครั้งหรือยอมแพ้, ผลที่อ้างสอดคล้องกับการนับแต้มจากกระดานจริง
// ใช้: node tools/verify-sgf.js file.sgf   หรือ require('./verify-sgf').verify(text)
const vm = require('vm'), fs = require('fs'), path = require('path');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../src/engine.js'), 'utf8') + ';this.Go=Go;', ctx);
const Go = ctx.Go;
function verify(text, opt = {}) {
  const bad = r => ({ ok: false, reason: r });
  if (typeof text !== 'string' || text.length > 200000) return bad('ขนาดไฟล์ไม่ถูกต้อง');
  const prop = k => { const m = text.match(new RegExp('(?:^|[^A-Z])' + k + '\\[([^\\]]*)\\]')); return m ? m[1] : null; };
  const n = +prop('SZ'); if (![5, 7, 9, 13, 19].includes(n)) return bad('ขนาดกระดานไม่ถูกต้อง');
  const komi = prop('KM') == null ? 6.5 : +prop('KM'); if (!isFinite(komi) || Math.abs(komi) > 30) return bad('คอมิไม่ถูกต้อง');
  const g = new Go(n, komi), L = 'abcdefghijklmnopqrstuvwxyz';
  const pt = s => s.length === 2 && L.indexOf(s[0]) >= 0 && L.indexOf(s[0]) < n && L.indexOf(s[1]) >= 0 && L.indexOf(s[1]) < n ? L.indexOf(s[1]) * n + L.indexOf(s[0]) : null;
  for (const m of text.matchAll(/AB((?:\[[a-z]{2}\])+)/g)) for (const q of m[1].matchAll(/\[([a-z]{2})\]/g)) { const i = pt(q[1]); if (i == null) return bad('จุดวางหมากแต้มต่อผิด'); g.grid[i] = 1; }
  const mv = [...text.matchAll(/;([BW])\[([a-z]{0,2})\]/g)];
  if (mv.length > n * n * 3) return bad('จำนวนตามากเกินไป');
  let tail = 0, k = 0, last = null;
  const first = mv.length ? mv[0][1] : 'B'; g.turn = first === 'B' ? 1 : 2;
  for (const m of mv) {
    const col = m[1] === 'B' ? 1 : 2; k++;
    if (last === col) return bad('ผู้เล่นเดินซ้ำสีเดิมที่ตา ' + k);
    last = col; g.turn = col;
    if (m[2] === '') { g.pass(); tail++; continue; }
    const i = pt(m[2]); if (i == null) return bad('พิกัดผิดที่ตา ' + k);
    const r = g.play(i); if (!r.ok) return bad('เดินผิดกติกาที่ตา ' + k); tail = 0;
  }
  const re = (prop('RE') || '').trim();
  if (!mv.length) return bad('ไม่มีตาเดิน');
  if (/\+R/i.test(re)) return { ok: true, moves: mv.length, resign: true, claimed: re };
  if (tail < 2) return bad('เกมไม่จบด้วยการผ่านสองครั้ง');
  const sc = g.score(), diff = Math.round((sc.b - sc.w) * 10) / 10, m = re.match(/^([BW])\+(\d+(?:\.\d+)?)$/);
  if (!m) return bad('ผลที่อ้างอ่านไม่ได้');
  const claimW = m[1], claimM = +m[2], realW = diff > 0 ? 'B' : 'W';
  // หมากตายที่ผู้เล่นเอาออกเองทำให้แต้มต่างจากการนับดิบได้ จึงตรวจเฉพาะว่าคนชนะตรงกันถ้าต่างกันมาก
  const tol = opt.tol == null ? Math.max(8, n * 1.5) : opt.tol;
  if ((claimW !== realW && Math.abs(diff) > tol) || (claimW === realW && Math.abs(Math.abs(diff) - claimM) > tol * 2)) return { ok: false, reason: 'ผลที่อ้างไม่ตรงกับกระดาน', claimed: re, computed: realW + '+' + Math.abs(diff) };
  return { ok: true, moves: mv.length, claimed: re, computed: realW + '+' + Math.abs(diff) };
}
module.exports = { verify };
if (require.main === module) { const f = process.argv[2]; if (!f) { console.log('ใช้: node tools/verify-sgf.js file.sgf'); process.exit(2); } const r = verify(fs.readFileSync(f, 'utf8')); console.log(JSON.stringify(r)); process.exit(r.ok ? 0 : 1); }
