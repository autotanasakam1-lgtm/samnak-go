const Records=(()=>{
  let bots=null,loadError=false,timer=null,active=null,pos=0,frames=[];
  const root=()=>$('#v-records');
  function stop(){clearInterval(timer);timer=null;}
  function legacy(r,k){try { const p=RecordLogic.parse(r.sgf);return {...p,id:'old-'+k,t:r.t,type:'human',sid:r.sid,sname:bySid(r.sid)?.name||'คู่ประลอง',black:r.color===1?pn():bySid(r.sid)?.name||'คู่ประลอง',white:r.color===2?pn():bySid(r.sid)?.name||'คู่ประลอง',undoCount:null,undos:[],legacy:true}; }catch(e){return {id:'old-'+k,t:r.t,type:'human',sid:r.sid,sname:bySid(r.sid)?.name||'คู่ประลอง',black:pn(),white:bySid(r.sid)?.name||'คู่ประลอง',n:r.n,handicap:r.handicap||0,sequence:[],moves:r.moves,legacy:true,undoCount:null,winner:r.result==='W'?r.color:3-r.color,margin:r.margin,resign:r.resign};}}
  function all(){const saved=store.get('go-records',[]),own=Array.isArray(saved)?saved:[];const old=Array.isArray(matchLog)?matchLog.filter(r=>!r.recordId).map(legacy):[];return [...own,...old,...(bots?.records||[])].sort((a,b)=>String(b.t).localeCompare(String(a.t)));}
  const side=c=>c===1?'ดำ':c===2?'ขาว':'เสมอ';
  function result(r){if(r.valid===false)return 'ผลทดสอบยังไม่แน่นอน';if(r.restarted)return `เริ่มใหม่ก่อนจบ · ถึงตาที่ ${r.moveReached} · ${r.leader?side(r.leader)+'นำประมาณ '+r.leadMargin+' แต้ม':'แต้มเท่ากัน'} (${r.leadMethod==='engine'?'โปรแกรมประเมิน':'นับหมากและพื้นที่อย่างง่าย'})`;if(!r.winner)return 'เสมอหรือยังไม่มีผล';return `${r.winner===1?r.black:r.white}ชนะ${r.resign?' เพราะอีกฝ่ายยอมแพ้':r.margin!=null?' '+r.margin+' แต้ม':' ตามการตัดสินของโปรแกรม'}${r.adjudicated?' · โปรแกรมประเมินผลก่อนจบ':''}`;}
  function badge(r){return r.restarted?'เริ่มใหม่ (ยังเล่นไม่จบ)':r.undoCount==null?'เกมเก่า ไม่มีข้อมูลการถอย':r.undoCount?'ถอย '+r.undoCount+' ครั้ง':'ไม่ถอยเลย เล่นจนจบ';}
  let selSid='';
  const hcol=r=>r.black===r.sname?2:1;
  const won=r=>r.type!=='human'||r.restarted||r.winner==null||r.winner===0?null:r.winner===hcol(r);
  const mine=()=>all().filter(r=>r.type==='human'&&r.sid!=='friend'&&!r.sample);
  function stat(rows){const f=rows.filter(r=>won(r)!==null),w=f.filter(r=>won(r)===true),l=f.filter(r=>won(r)===false),ms=w.filter(r=>!r.resign).map(r=>r.margin).filter(x=>typeof x==='number');
    return {n:rows.length,w:w.length,l:l.length,pct:f.length?Math.round(w.length/f.length*100):0,best:ms.length?Math.max(...ms):null};}

  function opinions(){try{if(typeof Rep==='undefined'||!Rep.enabled())return;Rep.hall().then(()=>{const ops=Rep.ops();document.querySelectorAll('#rec-map [data-cs]').forEach(b=>{const o=ops[b.dataset.cs],body=b.parentNode.querySelector('.rec-body');if(!body||body.querySelector('.rec-op'))return;
    const p=document.createElement('p');p.className='small rec-op';
    if(!o||o.n<10){p.textContent=o?`ความเห็นผู้เล่น: ${o.n} คน (ยังไม่พอสรุป ต้องมีอย่างน้อย 10 คน)`:'ความเห็นผู้เล่น: ยังไม่มี';}
    else{const t=o.lo+o.eq+o.hi,m=[['อ่อนกว่าที่ป้ายบอก',o.lo],['ตรงกับที่ป้ายบอก',o.eq],['เก่งกว่าที่ป้ายบอก',o.hi]].sort((a,b)=>b[1]-a[1])[0];p.textContent=`ผู้เล่น ${o.n} คนให้ความเห็น ส่วนใหญ่บอกว่า${t?m[0][0]:'ยังไม่ชัด'} (คนระดับดั้ง ${o.dan} คน)`;}
    body.appendChild(p);});}).catch(()=>{});}catch(e){}}
  let shown=[];
  async function mount(){stop();root().innerHTML='<h1>ประวัติการเล่น</h1><p class="small">แผนที่ขั้นบันได: ระดับสูงสุดอยู่บนสุด · แต่ละท่านมีผลของคุณและอันดับชัยชนะดีที่สุด · แตะการ์ดเพื่อดูเกมทั้งหมดและเล่นย้อนหลัง</p><div id="rec-map" class="rec-map"></div><div id="record-summary"></div><div id="record-view" hidden></div>';
    if(!bots){try{const r=await fetch('records/bot-games.json');if(!r.ok)throw Error();bots=await r.json();loadError=false;}catch(e){loadError=true;}}
    if(root().hidden)return;
    $('#rec-map').onclick=e=>{const rp=e.target.closest('[data-replay]');if(rp){open(shown[+rp.dataset.replay]);return;}const c=e.target.closest('[data-cs]');if(!c)return;selSid=c.dataset.cs===selSid?'':c.dataset.cs;list();};
    list();
  }
  function list(){stop();$('#record-view').hidden=true;const m=mine(),medal=['🥇','🥈','🥉'];shown=[];
    const total=stat(m);
    $('#rec-map').innerHTML=`<div class="rec-sum"><b>${total.n}</b> เกม · ชนะ <b>${total.w}</b> · แพ้ <b>${total.l}</b> · อัตราชนะ <b>${total.pct}%</b></div>`+SENSEI.slice().reverse().map((s,k)=>{
      const rows=m.filter(r=>r.sid===s.id).sort((a,b)=>String(b.t).localeCompare(String(a.t))),st=stat(rows),bot=(bots?.summary||[]).find(x=>x.sid===s.id);
      const top=rows.filter(r=>won(r)===true&&!r.resign).sort((a,b)=>(b.margin||0)-(a.margin||0)).slice(0,3);
      const open_=selSid===s.id;
      let body=top.length?`<ol class="rec-top">${top.map((r,i)=>`<li>${medal[i]} ชนะ ${r.margin} แต้ม <small>${esc(new Date(r.t).toLocaleDateString('th-TH'))}</small></li>`).join('')}</ol>`:'<p class="small rec-none">ยังไม่เคยชนะท่านนี้</p>';
      if(open_){body+=rows.length?'<div class="rec-games">'+rows.map(r=>{shown.push(r);const w=won(r),chip=w==null?'<span class="rec-chip">ไม่จบ</span>':w?'<span class="rec-chip win">ชนะ</span>':'<span class="rec-chip loss">แพ้</span>';return `<div class="rec-row"><div class="rec-main"><b>${chip} ${esc(result(r))}</b><small>${r.n}×${r.n} · ต่อ ${r.handicap||0} · ${r.sequence?.length||r.moves||0} ตา · ${esc(new Date(r.t).toLocaleDateString('th-TH'))} · ${badge(r)}</small></div><button class="btn" data-replay="${shown.length-1}" type="button">ดู</button></div>`;}).join('')+'</div>':'';
        if(bot)body+=`<p class="small">เกมทดสอบคอม: ต่อ ${bot.handicap} เม็ด เล่น ${bot.games} ชนะ ${bot.wins} (${bot.winPercent}%)</p>`;}
      return `<div class="rec-node ${k%2?'r':'l'}${open_?' open':''}"><button class="rec-card" data-cs="${s.id}" type="button" aria-expanded="${open_}"><span class="rec-rk">${k+1}</span><span class="rec-av">${avatar(s,56)}</span><span class="rec-nm"><b>${esc(s.name)}</b><small>${esc(s.rank||'')}</small></span><span class="rec-wl"><i class="w">ชนะ ${st.w}</i><i class="l">แพ้ ${st.l}</i></span></button><div class="rec-body">${body}</div></div>`;}).join('')+sampleBlock();opinions();
  }
  function sampleBlock(){const hide=store.get('go-hide-record-samples',false),rs=all().filter(r=>(r.sample||r.type==='bot')&&!(hide&&r.sample));
    const sum=(bots?.summary||[]).map(x=>`<p class="small">${esc(x.sname)} · ต่อ ${x.handicap} เม็ด · เล่น ${x.games} เกม · ชนะ ${x.wins} เกม (${x.winPercent}%)</p>`).join('');
    return `<section class="panel rec-samples"><h2>เกมตัวอย่างและเกมทดสอบคอม</h2>${loadError?'<p class="small">โหลดเกมทดสอบไม่ได้ ลองเปิดหน้านี้ใหม่เมื่อเชื่อมต่อได้</p>':''}${sum}<div class="rec-games">${rs.length?rs.map(r=>{shown.push(r);return `<div class="rec-row"><div class="rec-main"><b>${esc(r.black)} พบ ${esc(r.white)}${r.sample?' · เกมตัวอย่าง':''}</b><span>${esc(result(r))}</span><small>${r.n}×${r.n} · ต่อ ${r.handicap||0} เม็ด · ${r.sequence?.length||r.moves||0} ตา · ${badge(r)}</small></div><button class="btn" data-replay="${shown.length-1}" type="button">ดูย้อนหลัง</button></div>`;}).join(''):'<p class="small">ไม่มีเกมให้แสดง</p>'}</div></section>`;}
  function open(r){stop();active=r;pos=0;frames=[];const g=new Go(r.n,r.komi||0);for(const [i,c]of r.setup||[])g.grid[i]=c;
    const snap=(label,no)=>frames.push({grid:g.grid.slice(),last:g.last,no,label});snap('เริ่มเกม',0);
    if(r.events?.length){for(const e of r.events){if(e.type==='move'){g.turn=e.c;e.i<0?g.pass():g.play(e.i);snap('',e.no);}else {for(let k=0;k<e.count;k++)g.undo();snap(`ถอยที่ตา ${e.at} โดยฝ่าย${side(e.side)} · เอากลับ ${e.count} ตา: ${e.removed.map(([c,i])=>side(c)+' '+(i<0?'ผ่าน':g.name(i))).join(', ')}`,e.to);}}}
    else for(const [c,i]of r.sequence||[]){g.turn=c;i<0?g.pass():g.play(i);snap('',g.moves.length);}
    $('#record-view').hidden=false;$('#record-view').innerHTML=`<h2>${esc(r.black)} พบ ${esc(r.white)}</h2><p>${esc(result(r))}</p><div class="stage"><div class="board static" id="record-board"></div><aside class="panel col"><p id="record-position" aria-live="polite"></p><label>เลื่อนไปยังตาที่ต้องการ<input id="record-slider" type="range" min="0" max="${frames.length-1}" value="0" style="width:100%"></label><div class="btns"><button class="btn" data-step="start">เริ่ม</button><button class="btn" data-step="prev">ก่อนหน้า</button><button class="btn" data-step="next">ถัดไป</button><button class="btn" data-step="end">สุดท้าย</button><button class="btn" id="record-auto">เล่นอัตโนมัติ</button></div><p id="record-count"></p><div id="record-undo" class="col"></div><button class="btn" id="record-close">กลับรายการ</button></aside></div>`;
    $('#record-slider').oninput=e=>{stop();pos=+e.target.value;paint();};$('#record-view').onclick=e=>{const b=e.target.closest('[data-step]');if(!b)return;stop();pos=b.dataset.step==='start'?0:b.dataset.step==='end'?frames.length-1:pos+(b.dataset.step==='next'?1:-1);paint();};
    $('#record-auto').onclick=()=>{if(timer){stop();paint();return;}if(pos===frames.length-1)pos=0;timer=setInterval(()=>{if(root().hidden||pos>=frames.length-1){stop();paint();return;}pos++;paint();},700);paint();};$('#record-close').onclick=()=>{$('#record-view').hidden=true;};
    $('#record-undo').innerHTML='<h3>เหตุการณ์ถอย</h3>'+(r.legacy?'<p>เกมเก่าไม่ได้เก็บข้อมูลนี้</p>':frames.map((f,k)=>f.label.startsWith('ถอย')?`<button class="btn" data-event="${k}">${esc(f.label)}</button>`:'').join('')||'<p>ไม่มีการถอย</p>');$('#record-undo').onclick=e=>{const b=e.target.closest('[data-event]');if(b){stop();pos=+b.dataset.event;paint();}};paint();$('#record-view').scrollIntoView({block:'start'});
  }
  function paint(){pos=Math.max(0,Math.min(frames.length-1,pos));const f=frames[pos];drawBoard($('#record-board'),{n:active.n,grid:f.grid,last:f.last});$('#record-position').textContent=`ตาที่ ${f.no} · ขั้นย้อนหลัง ${pos} / ${frames.length-1}${f.label?' · '+f.label:''}`;$('#record-slider').value=pos;$('#record-count').textContent=`หมากบนกระดาน: ดำ ${f.grid.filter(c=>c===1).length} เม็ด · ขาว ${f.grid.filter(c=>c===2).length} เม็ด`;$('#record-auto').textContent=timer?'หยุด':'เล่นอัตโนมัติ';}
  return {mount,stop};
})();
document.addEventListener('visibilitychange',()=>{if(document.hidden)Records.stop();});
