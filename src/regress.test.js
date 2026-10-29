const fs = require('fs'), vm = require('vm'), assert = require('assert');
const read = f => fs.readFileSync(__dirname + '/' + f, 'utf8');
function harness() {
  const nodes = new Map(), timers = [], data = new Map();
  function node(key) {
    if (!nodes.has(key)) nodes.set(key, { hidden: true, value: '', dataset: {}, classList: { toggle() {}, add() {}, remove() {} }, querySelector: s => node(key + ' ' + s), querySelectorAll: () => [], setAttribute() {}, addEventListener(t, f) { this[t] = f; }, focus() {}, scrollIntoView() {}, appendChild() {}, remove() {} });
    return nodes.get(key);
  }
  const c = { console, Date, URL, location: { hash: '', href: 'https://example.test/go/' }, document: { querySelector: node, querySelectorAll: () => [], createElement: () => node('created'), addEventListener() {} }, window: { scrollTo() {}, addEventListener() {} }, localStorage: { getItem: k => data.get(k) || null, setItem(k,v) { if (c.fail === k) throw Error('quota'); data.set(k,v); }, removeItem: k => data.delete(k) }, setTimeout: f => (timers.push(f), timers.length), clearTimeout() {}, setInterval() {}, clearInterval() {}, matchMedia: () => ({ matches: false }), btoa: s => Buffer.from(s,'binary').toString('base64'), atob: s => Buffer.from(s,'base64').toString('binary'), Kata: { init: async () => {}, analyze: async () => null }, Srv: {}, navigator: {} };
  vm.createContext(c);
  vm.runInContext(read('engine.js') + read('data.js') + read('record-logic.js') + read('app.js') + read('record-hooks.js') + '\nlet deep=null, deepShown=false;\n' + read('home.js').split('// ---------- เริ่มต้น ----------')[0], c);
  const run = s => vm.runInContext(s,c);
  run('renderGame=()=>saveGame(); renderReview=()=>{}; renderLobby=()=>{}; renderChip=()=>{}; renderProfile=()=>{}; showPath=()=>{}; openPuzzle=()=>{}; startPre=()=>{};');
  return { c, run, node, timers, data };
}
async function test(name, f) { await f(); console.log('OK',name); }
(async () => {
await test('1 recovery survives failed result writes', () => {
 const h=harness(); h.run("G=new Go(9); G.play(0); S=SENSEI[0]; over={type:'resign'}; saveGame();"); h.c.fail='go-log'; h.run('finish()'); assert(h.data.has('go-game')); assert(h.node('#play-fb').textContent.includes('ไม่สำเร็จ')); assert.equal(h.run("store.set('go-log',[])"),false);
 h.c.fail=null; assert.equal(h.run("store.set('probe',[])"),true);
 const a=harness(); a.run("G=new Go(9); G.play(0); S=SENSEI[0]; over={type:'resign'}; saveGame(); finish();"); assert(!a.data.has('go-game'));
});
await test('2 teaching backup round trip and legacy defaults', () => {
 const h=harness(); h.run("recs.s1={w:2,l:1,we:1,tw:3,tl:4}; G=new Go(9); S=bySid('s1'); logGame({type:'resign'},false,0);"); assert.equal(h.run('parseCode(makeCode()).rec.s1.tw'),3); assert.equal(h.run('parseCode(makeCode()).log[0].mode'),'teach');
 assert.equal(h.run("parseCode(b64(JSON.stringify({v:1,done:{},rec:{s1:{w:1,l:0}},log:[]}))).rec.s1.tw"),0);
 assert.equal(h.run("recs.s1.tw=-1; parseCode(makeCode())"),null);
});
await test('3 validated teacher puzzles and completions round trip', () => {
 const h=harness(); h.run("const p=tClean({v:1,n:9,b:[0],w:[],a:[1],t:'test'}).p; const id=tSave(p); done[id]=1;"); assert.equal(h.run('parseCode(makeCode()).teacher.length'),1); assert.equal(h.run('parseCode(makeCode()).done[id]'),1);
 assert.equal(h.run("parseCode(b64(JSON.stringify({v:1,done:{bogus:1},rec:{},log:[]}))).teacher.length"),0);
 assert.equal(h.run("parseCode(b64(JSON.stringify({v:1,done:{},rec:{},log:[],teacher:[{p:{}}]})))"),null);
});
await test('4 restore invalidates live game and reports write failure', () => {
 const h=harness(); h.run("G=new Go(9); G.play(0); saveGame(); pendingRestore=parseCode(makeCode());"); const t=h.run('token'); h.node('#backup').click({target:{closest:()=>({id:'rs-yes'})}}); assert(h.run('token')>t); assert.equal(h.run('G'),null); assert(h.node('#game').hidden); h.run('saveGame()'); assert(!h.data.has('go-game'));
 h.c.fail='go-log'; h.run('pendingRestore=parseCode(makeCode())'); h.node('#backup').click({target:{closest:()=>({id:'rs-yes'})}}); assert(h.node('#rs-msg').textContent.includes('ไม่สำเร็จ'));
});
await test('5 stale Kata initialization and analysis cannot mutate newer games', async () => {
 for (const reject of [true,false]) {
 const h=harness(); let resolve,fail; h.c.Kata.init=()=>new Promise((r,j)=>{resolve=r;fail=j;}); const p=h.run("startGame({id:'k',eng:'kata',name:'k',rank:'k'},9,1)"); h.run('token++; degraded=false; kataOK=false; S=SENSEI[0]'); reject?fail(Error('late')):resolve(); await p; assert.equal(h.run('degraded'),false); assert.equal(h.run('kataOK'),false);
 }
 const h=harness(); let fail; h.c.Kata.analyze=()=>new Promise((r,j)=>{fail=j;}); h.run("G=new Go(9); S={eng:'kata'}; kataOK=true"); const p=h.run('botTurn()'); h.run('token++; S=SENSEI[0]'); fail(Error('late')); await p; assert.equal(h.run('degraded'),false);
});
await test('6 degraded save and resume excludes wins', async () => {
 const h=harness(); h.run("G=new Go(9); G.play(0); S=bySid('s1'); degraded=true; saveGame();"); assert.equal(h.run('readGame().degraded'),true); h.run("const resumed=readGame(); const opponent={...S,eng:'kata'}"); await h.run('startGame(opponent,9,1,resumed)'); assert.equal(h.run('kataOK'),true); assert.equal(h.run('degraded'),true);
 h.run("G.score=()=>({b:100,w:0}); over={type:'score'}; finish()"); assert.equal(h.run('recs.s1.tw || 0'),0);
 h.run("store.set(GKEY,{n:9,col:1,komi:6.5,moves:[0]})"); assert.equal(h.run('readGame().degraded'),false);
});
await test('7 cache cleanup is application and scope specific', async () => {
 const handlers={}, deleted=[]; const prefix='samnak-%2Fgo%2F-'; const c={URL,self:{registration:{scope:'https://example.test/go/'},location:{origin:'https://example.test'},addEventListener:(t,f)=>handlers[t]=f,clients:{claim:async()=>{}}},caches:{keys:async()=>[prefix+'shell-v0',prefix+'shell-v14-stage3',prefix+'assets-v14-stage3','unrelated-app-cache','samnak-%2Fother%2F-shell-v0','samnak-shell-v0'],delete:async n=>deleted.push(n)}}; vm.createContext(c); vm.runInContext(read('sw.js'),c); let p; handlers.activate({waitUntil:v=>p=v}); await p; assert.deepEqual(deleted,[prefix+'shell-v0']);
});
await test('8 stale ladder replies after reset and replacement', () => {
 const h=harness(); h.run("const root=document.querySelector('root'); const player=Player(root,'puzzle',()=>{}); player.open(PUZZLES.find(p=>p.id==='p13'))");
 const bd=h.node('root .board'); bd._cur=29; bd.onkeydown({key:'Enter',preventDefault(){}}); const cb=h.timers.pop(); h.node('root .b-reset').onclick(); const reset=bd.innerHTML; cb(); assert.equal(bd.innerHTML,reset);
 bd._cur=29; bd.onkeydown({key:'Enter',preventDefault(){}}); const cb2=h.timers.pop(); h.run('player.open(PUZZLES[0])'); const next=bd.innerHTML; cb2(); assert.equal(bd.innerHTML,next);
});
await test('9 canonical eye groups and diagonal false eyes', () => {
 const h=harness(); h.run('G=new Go(9); [10,11,12,19,21,28,29,30].forEach(i=>G.grid[i]=1)'); assert(h.run('moveFacts(G,20).realEye')); assert(h.run('moveFacts(G,20).eyeFill'));
 h.run('G.grid[10]=2; G.grid[30]=2'); assert.equal(h.run('moveFacts(G,20).realEye'),false); assert(h.run('moveFacts(G,20).eyeFill'));
});
console.log('ALL REGRESSIONS OK');
})().catch(e=>{console.error(e);process.exitCode=1;});
