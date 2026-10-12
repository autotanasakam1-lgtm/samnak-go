const BLACK = 1, WHITE = 2;
const LET = 'ABCDEFGHJKLMNOPQRST';
class Go {
  constructor(n, komi = 6.5) {
    this.n = n; this.komi = komi; this.grid = new Int8Array(n * n);
    this.turn = BLACK; this.ko = -1; this.caps = [0, 0, 0]; this.passes = 0;
    this.hist = []; this.moves = []; this.last = -1; this.nb = [];
    for (let i = 0; i < n * n; i++) {
      const x = i % n, y = (i / n) | 0, a = [];
      if (x > 0) a.push(i - 1); if (x < n - 1) a.push(i + 1);
      if (y > 0) a.push(i - n); if (y < n - 1) a.push(i + n);
      this.nb.push(a);
    }
  }
  group(i, grid = this.grid) {
    const c = grid[i], stones = [i], seen = new Set([i]), libs = new Set();
    for (let k = 0; k < stones.length; k++) for (const j of this.nb[stones[k]]) {
      const v = grid[j];
      if (v === 0) libs.add(j);
      else if (v === c && !seen.has(j)) { seen.add(j); stones.push(j); }
    }
    return { stones, libs };
  }
  snap() { return { grid: this.grid.slice(), turn: this.turn, ko: this.ko, caps: this.caps.slice(), passes: this.passes, last: this.last }; }
  restore(s) { this.grid = s.grid; this.turn = s.turn; this.ko = s.ko; this.caps = s.caps; this.passes = s.passes; this.last = s.last; }
  play(i) {
    if (this.grid[i]) return { ok: false, reason: 'occupied' };
    if (i === this.ko) return { ok: false, reason: 'ko' };
    const c = this.turn, o = 3 - c, s = this.snap();
    this.grid[i] = c; let cap = [];
    for (const j of this.nb[i]) if (this.grid[j] === o) {
      const g = this.group(j);
      if (g.libs.size === 0) { for (const k of g.stones) this.grid[k] = 0; cap = cap.concat(g.stones); }
    }
    const me = this.group(i);
    if (me.libs.size === 0) { this.grid = s.grid; return { ok: false, reason: 'suicide' }; }
    this.hist.push(s); this.moves.push(i);
    this.ko = (cap.length === 1 && me.stones.length === 1 && me.libs.size === 1) ? cap[0] : -1;
    this.caps[c] += cap.length; this.turn = o; this.passes = 0; this.last = i;
    return { ok: true, captured: cap, libs: me.libs.size, size: me.stones.length };
  }
  pass() { this.hist.push(this.snap()); this.moves.push(-1); this.ko = -1; this.turn = 3 - this.turn; this.passes++; this.last = -1; }
  undo() { if (!this.hist.length) return false; this.restore(this.hist.pop()); this.moves.pop(); return true; }
  clone() {
    const g = new Go(this.n, this.komi);
    g.grid = this.grid.slice(); g.turn = this.turn; g.ko = this.ko; g.caps = this.caps.slice();
    g.passes = this.passes; g.last = this.last; g.moves = this.moves.slice(); return g;
  }
  // นับแบบพื้นที่: หมากบนกระดาน + จุดว่างที่ล้อมได้ ; dead = หมากตายที่เอาออกก่อนนับ
  score(dead) {
    const N = this.n * this.n, g = this.grid.slice(), terr = new Int8Array(N), seen = new Uint8Array(N);
    if (dead) for (const i of dead) g[i] = 0;
    let b = 0, w = 0;
    for (let i = 0; i < N; i++) {
      if (g[i] === BLACK) b++; else if (g[i] === WHITE) w++;
      else if (!seen[i]) {
        const q = [i]; seen[i] = 1; let mask = 0;
        for (let k = 0; k < q.length; k++) for (const j of this.nb[q[k]]) {
          if (g[j]) mask |= g[j]; else if (!seen[j]) { seen[j] = 1; q.push(j); }
        }
        if (mask === BLACK) { b += q.length; for (const k of q) terr[k] = BLACK; }
        else if (mask === WHITE) { w += q.length; for (const k of q) terr[k] = WHITE; }
      }
    }
    return { b, w: w + this.komi, terr };
  }
  name(i) { return LET[i % this.n] + (this.n - ((i / this.n) | 0)); }
}

// ข้อเท็จจริงของตาที่เดิน ใช้ป้อนให้ติวเตอร์ (ต่อไปจะรวมกับผลวิเคราะห์ของ KataGo)
function moveFacts(g, i) {
  const c = g.turn, o = 3 - c, n = g.n, t = g.clone();
  const wasAtari = new Set();
  for (const j of g.nb[i]) if (g.grid[j] === c && g.group(j).libs.size === 1) wasAtari.add(j);
  const eyeFill = g.nb[i].every(j => g.grid[j] === c);
  const x = i % n, y = (i / n) | 0, diagonals = [];
  for (const dx of [-1, 1]) for (const dy of [-1, 1]) if (x + dx >= 0 && x + dx < n && y + dy >= 0 && y + dy < n) diagonals.push((y + dy) * n + x + dx);
  const realEye = diagonals.filter(j => g.grid[j] === o).length <= (diagonals.length === 4 ? 1 : 0) && eyeFill && new Set(g.nb[i].map(j => Math.min(...g.group(j).stones))).size === 1;
  const r = t.play(i); if (!r.ok) return null;
  const f = { captured: r.captured.length, selfAtari: r.libs === 1 && r.captured.length === 0, size: r.size,
    ataris: [], ownAtari: [], saved: wasAtari.size > 0 && r.libs >= 2, eyeFill, realEye, moveNo: g.moves.length,
    line: Math.min(i % n, (i / n) | 0, n - 1 - i % n, n - 1 - ((i / n) | 0)) + 1 };
  const seen = new Set();
  for (const j of t.nb[i]) if (t.grid[j] === o && !seen.has(j)) {
    const gg = t.group(j); gg.stones.forEach(s => seen.add(s));
    if (gg.libs.size === 1) f.ataris.push({ at: gg.stones[0], size: gg.stones.length, lib: [...gg.libs][0] });
  }
  const mine = new Set(t.group(i).stones);
  for (let k = 0; k < n * n; k++) if (t.grid[k] === c && !mine.has(k)) {
    const gg = t.group(k); gg.stones.forEach(s => mine.add(s));
    if (gg.libs.size === 1) f.ownAtari.push({ at: gg.stones[0], size: gg.stones.length });
  }
  return f;
}

// คอมระดับมือใหม่: มองล่วงหน้า 1 ตา ให้คะแนนจากการกิน การหนี และรูปร่างง่าย ๆ
function aiMove(g, noise = 1.5) {
  const n = g.n, N = n * n, c = g.turn, o = 3 - c, sc = g.score(), seen = new Uint8Array(N), regionSize = new Int32Array(N);
  for (let i = 0; i < N; i++) if (!g.grid[i] && !seen[i]) {
    const q = [i]; seen[i] = 1;
    for (let k = 0; k < q.length; k++) for (const j of g.nb[q[k]]) if (!g.grid[j] && !seen[j]) { seen[j] = 1; q.push(j); }
    for (const k of q) regionSize[k] = q.length;
  }
  let best = -1, bestS = -1e9;
  for (let i = 0; i < N; i++) {
    if (g.grid[i] || i === g.ko) continue;
    const f = moveFacts(g, i); if (!f) continue;
    if (f.eyeFill && !f.captured) continue;
    if (sc.terr[i] === c && !f.captured && !f.saved) continue;
    let s = Math.random() * noise;
    if (f.captured) s += 5 + 10 * f.captured;
    if (f.selfAtari) s -= 12 + 2 * f.size;
    else for (const a of f.ataris) s += 3 + 2 * a.size;
    if (f.saved) s += 6 + 2 * f.size;
    if (sc.terr[i] === o && regionSize[i] <= N / 5 && !f.captured) s -= 6;
    s += f.line === 1 ? -3 : f.line === 2 ? -1 : f.line <= 4 ? 1.5 : 0.5;
    const x = i % n, y = (i / n) | 0;
    for (const j of g.nb[i]) s += g.grid[j] === o ? 1 : g.grid[j] === c ? 0.4 : 0;
    for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const X = x + dx, Y = y + dy;
      if (X >= 0 && Y >= 0 && X < n && Y < n && g.grid[Y * n + X]) s += 0.4;
    }
    if (s > bestS) { bestS = s; best = i; }
  }
  const late = Math.max(0, g.moves.length - N * 0.9) * 0.06;
  if (best < 0 || bestS < -1.5 + late) return -1;
  if (g.passes > 0 && bestS < 1.2) return -1;
  return best;
}
