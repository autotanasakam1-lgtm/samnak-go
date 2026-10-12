let recordAudit=null;
function recordSync() { if(G && recordAudit && !prac) RecordLogic.sync(recordAudit,G); }
function recordSave(restarted=false) {
  if(!recordAudit || prac)return; recordSync();
  const sc=G.score(dead),winner=restarted?0:over.type==='resign'?3-over.loser:sc.b===sc.w?0:sc.b>sc.w?1:2;
  const r={id:recordAudit.id,t:new Date().toISOString(),started:recordAudit.started,type:'human',sid:S?S.id:'friend',sname:S?S.name:'เพื่อน',black:S&&human===2?S.name:pn(),white:S&&human===1?S.name:'เพื่อน (ขาว)',n:G.n,komi:G.komi,handicap:HC,setup:HC?hcPoints(G.n,HC).map(i=>[i,1]):[],sequence:G.moves.slice(hcN()).map((i,k)=>[HC?(k%2?1:2):(k%2?2:1),i]),events:recordAudit.events,undos:recordAudit.undos,undoCount:recordAudit.undos.length,restarted,moveReached:mno(),winner,margin:restarted||over.type==='resign'?null:Math.abs(sc.b-sc.w),resign:!restarted&&over.type==='resign',leader:sc.b===sc.w?0:sc.b>sc.w?1:2,leadMargin:Math.abs(sc.b-sc.w),leadMethod:'area',mode:gmode};
  if(restarted && recordAudit.evaluation) Object.assign(r,recordAudit.evaluation);
  const all=store.get('go-records',[]); const rows=Array.isArray(all)?all:[]; const at=rows.findIndex(x=>x.id===r.id); if(at<0)rows.push(r);else rows[at]=r; store.set('go-records',rows);
  try { Rep.add({k:'record',...r}); } catch(e) {}
  return r;
}
async function recordRestart() {
  if(!G||prac||busy||over?.final)return;
  const my=token; busy=true;renderGame();
  if(isKata()) { try { const a=await engine().analyze(G,preVis()); if(my!==token)return; if(Number.isFinite(a.lead))recordAudit.evaluation={leader:a.lead===0?0:a.lead>0?1:2,leadMargin:Math.abs(a.lead),leadMethod:'engine'}; } catch(e) {} }
  if(my!==token)return; recordSave(true); await startGame(S,G.n,human,null,{hc:HC,mode:gmode});
}
// Preserve a paused game when a new game replaces it after a page reload.
function recordArchivePending() {
  const d=readGame(); if(!d)return;
  const old={G,S,HC,human,recordAudit,prac,dead,gmode};
  try {
    G=new Go(d.n,d.komi);S=d.s;HC=d.hc;human=d.col;prac=null;dead=new Set();
    for(const i of d.moves)i<0?G.pass():G.play(i);
    recordAudit=RecordLogic.begin(G,hcN(),d.audit);recordSync();recordSave(true);
  } finally { G=old.G;S=old.S;HC=old.HC;human=old.human;recordAudit=old.recordAudit;prac=old.prac;dead=old.dead;gmode=old.gmode; }
}
