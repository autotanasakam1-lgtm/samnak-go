const vm = require('vm'), fs = require('fs');
const ctx = {}; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/engine.js', 'utf8') + fs.readFileSync(__dirname + '/data.js', 'utf8') + ';this.X={Go,aiMove,moveFacts,LESSONS,PUZZLES,MASTERS}', ctx);
const { Go, aiMove, LESSONS, PUZZLES } = ctx.X; let fail = 0;
const A = (c, m) => { if (!c) { fail++; console.log('FAIL', m); } };
function parse(rows) { const n = rows.length, g = new Go(n), ans = []; rows.forEach((r, y) => [...r].forEach((ch, x) => { const i = y * n + x; if (ch === 'X') g.grid[i] = 1; else if (ch === 'O') g.grid[i] = 2; else if (ch === '*') ans.push(i); })); return { g, ans }; }
for (const L of [...LESSONS, ...PUZZLES]) L.steps.forEach((s, k) => {
  const tag = L.id + '#' + k; A(s.rows.length === 9 && s.rows.every(r => r.length === 9), tag + ' shape');
  const mk = () => { const p = parse(s.rows); if (s.pre) s.pre.forEach(([x, y]) => A(p.g.play(y * 9 + x).ok, tag + ' pre')); if (s.turn) p.g.turn = s.turn; if (s.answers) p.ans = s.answers.map(([x, y]) => y * 9 + x); return p; };
  const p0 = mk();
  if (['point', 'illegal'].includes(s.t)) A(p0.ans.length > 0, tag + ' no answers');
  for (const a of p0.ans) { const { g } = mk(); const r = g.play(a);
    if (s.t === 'illegal') A(!r.ok, tag + ' should be illegal'); else {
      A(r.ok, tag + ' legal');
      if (s.check === 'capture') A(r.captured.length > 0, tag + ' capture');
      if (s.check === 'libs3') A(r.libs === 3, tag + ' libs3 got ' + r.libs);
      if (s.check === 'atari' || s.check === 'double') { const at = g.nb[a].filter(j => g.grid[j] === g.turn && g.group(j).libs.size === 1).length; A(at >= (s.check === 'double' ? 2 : 1), tag + ' atari ' + at); } } }
  if (s.t === 'seq') { const { g } = mk(); let cap = 0; for (const m of s.seq) { const r = g.play(m.at[1] * 9 + m.at[0]); A(r.ok, tag + ' seq'); cap += r.captured.length; if (m.reply) { const i = m.reply[1] * 9 + m.reply[0]; const q = g.play(i); A(q.ok, tag + ' reply'); A(g.group(i).libs.size <= 2, tag + ' ladder libs'); } } A(cap === s.captures, tag + ' seq captures ' + cap); }
  if (s.t === 'choice') A(s.choices.filter(c => c.right).length === 1, tag + ' choice');
});
{ const { g } = parse(LESSONS[6].steps[0].rows); const s = g.score(); A(s.b === 45 && s.w === 42.5, 'score ' + s.b + ' ' + s.w); }
for (const n of [9, 13, 19]) { const t = Date.now(); const g = new Go(n); let k = 0; while (g.passes < 2 && k < n * n * 4) { const m = aiMove(g, k % 2 ? 1.5 : 8); m < 0 ? g.pass() : A(g.play(m).ok, 'ai illegal'); k++; } A(g.passes === 2, 'ai game did not end ' + n); const s = g.score(); console.log(n, 'moves', k, 'score', s.b, s.w, (Date.now() - t) + 'ms'); }
{ const g = new Go(9); g.play(0); g.pass(); A(g.undo() && g.undo() && g.grid[0] === 0 && g.turn === 1, 'undo'); }
console.log(fail ? fail + ' failures' : 'ALL OK');
