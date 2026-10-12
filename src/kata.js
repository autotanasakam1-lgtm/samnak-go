// ตัวเชื่อม KataGo ในเบราว์เซอร์ (เอนจินจากโครงการ web-katrain สัญญาอนุญาต MIT, โครงข่าย g170-b6c96)
const Kata = {
  w: null, ready: null, seq: 0, pend: new Map(), backend: '', chain: Promise.resolve(),
  init() {
    if (this.ready) return this.ready;
    this.ready = new Promise((res, rej) => {
      try { this.w = new Worker('engine/katago-worker.js'); } catch (e) { return rej(e); }
      const to = setTimeout(() => { rej(new Error('timeout')); this.kill(); }, 20000);
      this.w.onerror = () => { clearTimeout(to); rej(new Error('worker')); this.kill(); };
      this.w.onmessage = e => {
        const m = e.data;
        if (m.type === 'katago:init_result') { clearTimeout(to); if (m.ok) { this.backend = m.backend; res(); } else rej(new Error(m.error)); }
        else if (m.type === 'katago:analyze_result') { const p = this.pend.get(m.id); if (p) { this.pend.delete(m.id); m.ok && m.analysis ? p.res(m.analysis) : p.rej(new Error(m.error || 'analysis failed')); } }
      };
      // โฮสต์ปกติใช้ไฟล์ .bin ตรง ๆ ; ที่ที่เสิร์ฟ .bin ไม่ได้ใช้สำเนา base64 ใน .json แทน
      fetch('engine/katago-small.bin', { method: 'HEAD' }).then(r => { if (!r.ok) throw 0; return new URL('engine/katago-small.bin', location.href).href; })
        .catch(() => fetch('engine/katago-small.json').then(r => r.json()).then(j => { const bin = atob(j.b64), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([u])); }))
        .then(url => { this.url = url; if (this.w) this.w.postMessage({ type: 'katago:init', modelUrl: url, backend: 'auto' }); }, e => { clearTimeout(to); rej(new Error('model')); });
    });
    const rp = this.ready; rp.catch(() => { if (this.ready === rp) this.ready = null; });
    return rp;
  },
  // เลิกใช้ worker ที่ตาย/ค้าง ปฏิเสธงานที่รออยู่ทั้งหมด เกมครั้งหน้าจะเริ่ม worker ใหม่
  kill() {
    const w = this.w; this.w = null; this.ready = null;
    try { w && w.terminate(); } catch (e) { }
    for (const p of this.pend.values()) p.rej(new Error('worker'));
    this.pend.clear();
  },
  // วิเคราะห์ตำแหน่งปัจจุบันของเกม g ; คืน {lead (มุมมองดำ), best (idx หรือ -1), policy, ownership, moves}
  analyze(g, visits = 16, ms = 8000) {
    const n = g.n, toB = grid => { const b = []; for (let y = 0; y < n; y++) { const r = []; for (let x = 0; x < n; x++) { const v = grid[y * n + x]; r.push(v === 1 ? 'black' : v === 2 ? 'white' : null); } b.push(r); } return b; };
    const req = { board: toB(g.grid), previousBoard: g.hist.length ? toB(g.hist[g.hist.length - 1].grid) : undefined,
      currentPlayer: g.turn === 1 ? 'black' : 'white', komi: g.komi,
      moveHistory: g.moves.map((m, k) => ({ x: m < 0 ? -1 : m % n, y: m < 0 ? -1 : (m / n) | 0, player: k % 2 ? 'white' : 'black' })) };
    const run = () => this.init().then(() => new Promise((res, rej) => {
      if (!this.w) return rej(new Error('worker'));
      const id = ++this.seq, w = this.w, to = setTimeout(() => { if (this.pend.has(id)) { this.pend.delete(id); rej(new Error('timeout')); if (this.w === w) this.kill(); } }, 15000);
      this.pend.set(id, { res: v => { clearTimeout(to); res(v); }, rej: e => { clearTimeout(to); rej(e); } });
      this.w.postMessage({ type: 'katago:analyze', id, modelUrl: this.url, backend: 'auto', rules: 'chinese', visits, maxTimeMs: ms, topK: 10, analysisPvLen: 3, ownershipMode: 'root', reuseTree: false, ...req });
    })).then(a => {
      const mv = (a.moves || []).slice().sort((p, q) => p.order - q.order)[0];
      return { lead: a.rootScoreLead, best: !mv || mv.x < 0 ? -1 : mv.y * n + mv.x, policy: a.policy, ownership: a.ownership };
    });
    const p = this.chain.then(run, run); this.chain = p.catch(() => { }); return p;
  },
  // เลือกตาเดินตามระดับของคู่ประลอง
  pick(g, a, s) {
    const n = g.n, N = n * n, pol = a.policy;
    if (a.best < 0 || (pol && pol[N] > 0.6)) return -1;
    if (s.mode === 'search') return a.best;
    const wild = Math.random() < s.blunder, T = wild ? 4 : s.temp;
    let max = 0; for (let i = 0; i < N; i++) if (pol[i] > max) max = pol[i];
    const cand = []; let sum = 0;
    for (let i = 0; i < N; i++) {
      if (!(pol[i] > 0) || g.grid[i] || i === g.ko || (!wild && pol[i] < max * 0.03)) continue;
      const f = moveFacts(g, i); if (!f || (f.eyeFill && !f.captured)) continue;
      const w = Math.pow(pol[i], 1 / T); cand.push([i, w]); sum += w;
    }
    if (!cand.length) return a.best;
    let r = Math.random() * sum; for (const [i, w] of cand) { r -= w; if (r <= 0) return i; }
    return cand[cand.length - 1][0];
  },
};

// เครื่องของสำนัก: KataGo รุ่นใหญ่บนพีซีของเจ้าของ ผ่านสะพานที่ url ใน server.json (ถ้าไม่มีไฟล์ แปลว่าปิดอยู่)
const Srv = {
  url: null, online: false, checked: false, at: 0, p: null, chain: Promise.resolve(),
  check() {
    if (this.p) return this.p;
    if (this.missing) return Promise.resolve(false);
    if (this.checked && Date.now() - this.at < 60000) return Promise.resolve(this.online);
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 6000);
    this.p = fetch('server.json', { cache: 'no-store', signal: ctl.signal }).then(r => { if (!r.ok) { if (r.status === 404) this.missing = true; throw 0; } return r.json(); })
      .then(j => { if (!j || typeof j.url !== 'string' || !j.url) throw 0; this.url = j.url.replace(/\/+$/, ''); return fetch(this.url + '/health', { cache: 'no-store', signal: ctl.signal }); })
      .then(r => { if (!r.ok) throw 0; return r.json(); }).then(j => { if (!j || !j.ok) throw 0; return true; })
      .catch(() => false)
      .then(ok => { clearTimeout(to); this.online = ok; this.checked = true; this.at = Date.now(); this.p = null; return ok; });
    return this.p;
  },
  analyze(g, visits = 60, par = false) {
    const n = g.n, N = n * n, names = g.moves.map(m => m < 0 ? 'pass' : g.name(m));
    const run = () => {
      if (!this.url) return Promise.reject(new Error('offline'));
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 20000);
      return fetch(this.url + '/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ n, komi: g.komi, moves: names, visits }), signal: ctl.signal })
        .then(r => r.json()).then(j => {
          if (!j || !j.ok) throw new Error((j && j.error) || 'analysis failed');
          let best = -1;
          if (j.best && String(j.best).toLowerCase() !== 'pass') { const b = String(j.best).toUpperCase(); for (let i = 0; i < N; i++) if (g.name(i).toUpperCase() === b) { best = i; break; } if (best < 0) throw new Error('bad move'); }
          return { lead: j.lead, best, policy: null, ownership: Array.isArray(j.ownership) && j.ownership.length === N ? j.ownership : null };
        }).finally(() => clearTimeout(to));
    };
    if (par) return run();
    const p = this.chain.then(run, run); this.chain = p.catch(() => { }); return p;
  },
};
