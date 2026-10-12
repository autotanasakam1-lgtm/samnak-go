const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const logic=require('../src/record-logic');
const ROOT=path.resolve(__dirname,'..');
function convert(input=path.join(ROOT,'calib/handicap-results.json')) {
  const context={};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(ROOT,'src/data.js'),'utf8')+';this.senseis=SENSEI',context);
  const names=new Map(context.senseis.map(s=>[s.id,s.name]));
  const records=[];
  if(fs.existsSync(input)) {
    const data=JSON.parse(fs.readFileSync(input,'utf8'));
    for(const [sid,entry] of Object.entries(data.sensei || {})) {
      if(!names.has(sid)) continue;
      for(const [index,g] of (entry.games || []).entries()) {
        const file=path.resolve(path.dirname(input),g.sgf || '');
        const allowed=path.resolve(path.dirname(input),'handicap-sgf')+path.sep;
        if(!file.startsWith(allowed)||path.extname(file)!=='.sgf') throw Error('Unsafe record path');
        const r=logic.parse(fs.readFileSync(file,'utf8'));
        records.push({...r,id:`${sid}-${index}`,sid,sname:names.get(sid),black:names.get(sid),white:'คอมคู่ทดสอบ',t:g.date || data.started || '',type:'bot',valid:g.valid!==false,undoCount:0,undos:[],restarted:false,adjudicated:true});
      }
    }
  }
  const sampleFile=path.join(ROOT,'records/samples.json');
  if(fs.existsSync(sampleFile)) records.push(...JSON.parse(fs.readFileSync(sampleFile,'utf8')));
  const summary=[];
  for(const sid of new Set(records.map(r=>r.sid))) for(const h of new Set(records.filter(r=>r.sid===sid).map(r=>r.handicap))) {
    const games=records.filter(r=>r.sid===sid&&r.handicap===h&&!r.sample&&r.valid!==false); const wins=games.filter(r=>r.winner===1).length;
    summary.push({sid,sname:names.get(sid)||'คู่ทดสอบ',handicap:h,games:games.length,wins,winPercent:games.length?Math.round(wins/games.length*100):0});
  }
  return {v:1,records,summary};
}
if(require.main===module) { const data=convert();fs.writeFileSync(path.join(ROOT,'records/bot-games.json'),JSON.stringify(data));console.log(`Built ${data.records.length} records`); }
module.exports={convert};
