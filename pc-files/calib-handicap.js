// Offline calibration only. No downloads, git operations, or automatic publication.
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const readline = require('readline'), { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.join('=') || 'true']; }));
if (args.help) {
  console.log('node pc-files/calib-handicap.js [--anchor=rank_3d] [--anchor-temp=0.85] [--engine-dir=D:\\samnak-go\\engine] [--sensei=s1,s2] [--pilot=32] [--confirm=100] [--max-games=2] [--preset=current|candidate]');
  process.exit(0);
}
const ENGINE = path.resolve(args['engine-dir'] || 'D:\\samnak-go\\engine');
const N = 19, NN = N * N, KOMI = 0.5;
const positive = (k, d) => { const n = Number(args[k] || d); if (!Number.isInteger(n) || n < 1) throw Error('Invalid --' + k); return n; };
const PILOT = positive('pilot', 32), CONFIRM = positive('confirm', 100);
const LIMIT = args['max-games'] ? positive('max-games', 2) : Infinity;
const profile = args.anchor || 'rank_3d', temperature = Number(args['anchor-temp'] || 0.85);
if (!/^rank_(?:[1-9]|1[0-9]|20)k$|^rank_[1-9]d$/.test(profile) || !(temperature > 0 && Number.isFinite(temperature))) throw Error('Invalid anchor settings');
const context = {}; vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/engine.js'), 'utf8') + '\nthis.E={Go,aiMove,moveFacts,LET};', context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/data.js'), 'utf8') + '\nthis.S=SENSEI;', context);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/kata.js'), 'utf8') + '\nthis.K=Kata;', context);
const { Go, aiMove, LET } = context.E;
const candidate = {
  s1: { noise: 8 }, s2: { noise: 1 },
  s3: { temp: 1.7, blunder: 0.20, visits: 16 }, s4: { temp: 1.25, blunder: 0.10, visits: 16 },
  s5: { temp: 0.85, blunder: 0.03, visits: 16 }, s6: { mode: 'search', visits: 8, temp: 1, blunder: 0 },
  s7: { mode: 'search', visits: 32, temp: 1, blunder: 0 }, s8: { mode: 'search', visits: 96, temp: 1, blunder: 0 },
  s9: { mode: 'search', visits: 256, temp: 1, blunder: 0 }
};
const preset = args.preset || 'current';
if (!['current', 'candidate'].includes(preset)) throw Error('Invalid preset');
const selected = (args.sensei || 's1,s2,s3,s4,s5,s6,s7,s8,s9').split(',');
if (selected.some(id => !context.S.some(s => s.id === id && s.eng !== 'server'))) throw Error('Unknown sensei');
const senseis = context.S.filter(s => selected.includes(s.id)).map(s => ({ ...s, ...(preset === 'candidate' ? candidate[s.id] : {}) }));
const OUT = path.join(ROOT, 'calib'), FILE = path.join(OUT, 'handicap-results.json');
const exe = path.join(ENGINE, 'katago', 'katago.exe');
const cfg = ['analysis_example.cfg', 'analysis.cfg'].map(f => path.join(ENGINE, 'katago', f)).find(f => fs.existsSync(f));
const small = path.join(ROOT, 'engine', 'katago-small.bin'), big = path.join(ENGINE, 'b18.bin.gz'), human = path.join(ENGINE, 'b18c384nbt-humanv0.bin.gz');
for (const f of [exe, cfg, small, big, human]) if (!f || !fs.existsSync(f)) throw Error('Missing engine/config/model: ' + f);
const crypto = require('crypto');
const hash = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const settings = { version: 1, board: N, komi: KOMI, rules: 'chinese', profile, temperature, pilot: PILOT, confirm: CONFIRM, preset,
  modelHashes: [small, big, human].map(hash), configHash: hash(cfg), engineHash: hash(exe), sourceHashes: ['engine', 'data', 'kata'].map(f => hash(path.join(ROOT, 'src', f + '.js'))) };
fs.mkdirSync(OUT, { recursive: true });
const R = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE, 'utf8')) : { settings, started: new Date().toISOString(), sensei: {} };
if (JSON.stringify(R.settings) !== JSON.stringify(settings)) throw Error('Resume settings differ. Archive handicap-results.json and SGFs before a new experiment.');
const save = () => { R.updated = new Date().toISOString(); fs.writeFileSync(FILE + '.tmp', JSON.stringify(R, null, 2)); fs.renameSync(FILE + '.tmp', FILE); };
function wilson(w, n) {
  if (!n) return null;
  const z = 1.959963984540054, p = w / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d, e = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [c - e, c + e];
}
// Process/JSON-line protocol reused from calib.js, with timeout and exit cleanup.
function engine(name, models) {
  const p = spawn(exe, ['analysis', '-config', cfg, ...models, '-override-config', 'reportAnalysisWinratesAs=BLACK,numAnalysisThreads=1,numSearchThreadsPerAnalysisThread=2,logToStderr=true,logFile='], { cwd: path.dirname(exe) });
  const pending = new Map(); let seq = 0, err = '', failure;
  const fail = e => { failure = e; for (const f of pending.values()) { clearTimeout(f.timer); f.reject(e); } pending.clear(); };
  p.stderr.on('data', d => { err = (err + d).slice(-2000); });
  p.on('error', fail); p.on('exit', code => fail(Error(name + ' exited ' + code + ': ' + err)));
  p.stdin.on('error', fail);
  readline.createInterface({ input: p.stdout }).on('line', line => {
    let r; try { r = JSON.parse(line); } catch { return; }
    const f = pending.get(r.id); if (!f || r.isDuringSearch) return;
    if (r.warning && !r.rootInfo && !r.error) return;
    pending.delete(r.id); clearTimeout(f.timer); r.error ? f.reject(Error(r.error)) : f.resolve(r);
  });
  return { q: o => new Promise((resolve, reject) => {
    if (failure) return reject(failure);
    const id = name + (++seq), timer = setTimeout(() => { pending.delete(id); reject(Error(name + ' timeout')); }, 180000);
    pending.set(id, { resolve, reject, timer });
    p.stdin.write(JSON.stringify({ id, rules: 'chinese', komi: KOMI, boardXSize: N, boardYSize: N, ...o }) + '\n');
  }), kill: () => { fail(Error('shutdown')); p.kill(); } };
}
const K6 = engine('b6', ['-model', small]), KH = engine('human', ['-model', big, '-human-model', human]);
let stopping = false;
process.on('SIGINT', () => { stopping = true; console.log('Stopping after this game; a second interrupt exits.'); process.once('SIGINT', () => { K6.kill(); KH.kill(); process.exit(130); }); });
const coord = i => i < 0 ? 'pass' : LET[i % N] + (N - Math.floor(i / N));
const index = s => s.toLowerCase() === 'pass' ? -1 : (N - Number(s.slice(1))) * N + LET.indexOf(s[0]);
const sgfCoord = i => i < 0 ? '' : String.fromCharCode(97 + i % N, 97 + Math.floor(i / N));
const esc = s => String(s).replace(/\\/g, '\\\\').replace(/\]/g, '\\]');
function handicap(h) {
  const c = [[3,15],[15,3],[3,3],[15,15]], mid = [[3,9],[15,9],[9,3],[9,15]];
  const points = h <= 4 ? c.slice(0, h) : h === 5 ? [...c,[9,9]] : h === 6 ? [...c,...mid.slice(0,2)] : h === 7 ? [...c,...mid.slice(0,2),[9,9]] : h === 8 ? [...c,...mid] : [...c,...mid,[9,9]];
  return points.map(([x,y]) => y * N + x);
}
async function game(S, h, phase, number) {
  const g = new Go(N, KOMI), stones = handicap(h), moves = [];
  stones.forEach(i => { g.grid[i] = 1; }); g.turn = 2;
  const position = () => ({ initialStones: stones.map(i => ['B',coord(i)]), initialPlayer: 'W', moves });
  let reason = 'two-passes';
  while (g.passes < 2 && moves.length < 800) {
    const black = g.turn === 1; let m;
    if (black && S.eng === 'basic') m = aiMove(g, S.noise);
    else if (black) {
      const r = await K6.q({ ...position(), maxVisits: S.visits || 16, includePolicy: true });
      const b = (r.moveInfos || []).slice().sort((a,b) => a.order - b.order)[0];
      if (!r.policy || !b) throw Error('Missing sensei analysis');
      m = context.K.pick(g, { best: index(b.move), policy: r.policy }, S);
      if (m >= 0 && !context.E.moveFacts(g,m)) m = index(b.move);
      if (m >= 0 && !context.E.moveFacts(g,m)) m = aiMove(g,1.5);
    } else {
      const r = await KH.q({ ...position(), maxVisits: 1, includePolicy: true, overrideSettings: { humanSLProfile: profile } });
      const pol = r.humanPolicy; if (!pol || pol.length !== NN + 1) throw Error('Missing humanPolicy');
      if (pol[NN] > 0.5 && moves.length > 60) m = -1;
      else {
        const max = Math.max(...pol.slice(0,NN)), choices = []; let sum = 0;
        for (let i=0;i<NN;i++) if (pol[i] > 0 && pol[i] >= max * 0.002 && !g.grid[i] && i !== g.ko) {
          const f = context.E.moveFacts(g,i); if (!f || f.eyeFill && !f.captured) continue;
          const w = Math.pow(pol[i],1/temperature); choices.push([i,w]); sum += w;
        }
        m = -1; let draw = Math.random()*sum;
        for (const [i,w] of choices) { draw -= w; if (draw <= 0) { m=i; break; } }
      }
    }
    if (m < 0) g.pass(); else if (!g.play(m).ok) throw Error('Illegal selected move: ' + coord(m));
    moves.push([black ? 'B' : 'W',coord(m)]);
  }
  if (g.passes < 2) reason = 'move-cap';
  // Adjudication, not a literal final score: compare two search budgets.
  const low = await KH.q({ ...position(), maxVisits: 256 });
  const high = await KH.q({ ...position(), maxVisits: 1024 });
  const a = low.rootInfo.scoreLead, b = high.rootInfo.scoreLead;
  if (!Number.isFinite(a) || !Number.isFinite(b)) throw Error('Missing scoreLead');
  const valid = reason === 'two-passes' && Math.sign(a) === Math.sign(b) && Math.abs(b) >= 2;
  const sgf = path.join('handicap-sgf', `${S.id}-${phase}-h${h}-${number}.sgf`);
  fs.mkdirSync(path.join(OUT,'handicap-sgf'), { recursive: true });
  const result = valid ? `${b > 0 ? 'B' : 'W'}+${Math.abs(b).toFixed(1)}` : 'Void';
  const text = `(;GM[1]FF[4]CA[UTF-8]SZ[19]KM[0.5]RU[Chinese]HA[${h}]PL[W]PB[${esc(S.name)}]PW[${profile}]RE[${result}]C[Engine adjudication; phase=${phase}; reason=${reason}; leads=${a},${b}; valid=${valid}]AB${stones.map(i=>'['+sgfCoord(i)+']').join('')}${moves.map(([c,s])=>`;${c}[${sgfCoord(index(s))}]`).join('')})`;
  fs.writeFileSync(path.join(OUT,sgf),text);
  return { h, phase, number, valid, win: valid ? b > 0 : null, lead256: a, lead1024: b, reason, moves: moves.length, sgf, date: new Date().toISOString() };
}
function stats(games,h,phase) {
  const all = games.filter(g => g.h === h && g.phase === phase), ok = all.filter(g=>g.valid), wins = ok.filter(g=>g.win).length;
  return { h, phase, attempted: all.length, valid: ok.length, invalid: all.length-ok.length, wins, rate: ok.length ? wins/ok.length : null, wilson95: wilson(wins,ok.length) };
}
(async () => {
  let played = 0;
  try {
    for (const S of senseis) {
      const o = R.sensei[S.id] ||= { parameters: S, games: [] };
      const fill = async (h,phase,target) => {
        while (stats(o.games,h,phase).valid < target) {
          if (stopping || played >= LIMIT) return false;
          const st = stats(o.games,h,phase);
          if (st.attempted >= target * 2) throw Error(`${S.id} h${h}: too many unresolved games; inspect SGFs`);
          const res = await game(S,h,phase,st.attempted+1); o.games.push(res); played++; save();
          console.log(S.id,h,phase,JSON.stringify(stats(o.games,h,phase)));
        }
        return true;
      };
      for (let h=2;h<=9;h++) if (!await fill(h,'pilot',PILOT)) return;
      if (!o.confirmLevels) {
        const pilot = Array.from({length:8},(_,i)=>stats(o.games,i+2,'pilot'));
        const nearest = pilot.slice().sort((a,b)=>Math.abs(a.rate-.5)-Math.abs(b.rate-.5)||a.h-b.h)[0].h;
        o.confirmLevels = [...new Set([Math.max(2,nearest-1),nearest,Math.min(9,nearest+1)])]; save();
      }
      for (const h of o.confirmLevels) if (!await fill(h,'confirm',CONFIRM)) return;
      o.summary = o.confirmLevels.map(h=>stats(o.games,h,'confirm'));
      o.nearestHandicap = o.summary.slice().sort((a,b)=>Math.abs(a.rate-.5)-Math.abs(b.rate-.5)||a.h-b.h)[0].h;
      o.status = o.summary.some(s=>s.wilson95[0] <= .5 && s.wilson95[1] >= .5) ? '50% compatible; inspect bracket and monotonicity' : 'no confirmed 50% level; extend range or sample';
      o.done = true; save();
    }
  } catch (e) { R.lastError = { date: new Date().toISOString(), message: e.stack }; save(); console.error(e); process.exitCode=1; }
  finally { K6.kill(); KH.kill(); }
})();
