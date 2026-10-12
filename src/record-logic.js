/* Shared, dependency-free record logic. SGF names/comments are deliberately not imported. */
(function(root) {
  function parse(text) {
    const nodes = []; let node = {}, depth = 0, i = 0;
    while (i < text.length) {
      const c = text[i++];
      if (c === '(') { if (++depth > 1) throw Error('Variations are not supported'); }
      else if (c === ')') depth--;
      else if (c === ';') { node = {}; nodes.push(node); }
      else if (/[A-Z]/.test(c)) {
        let key = c; while (/[A-Z]/.test(text[i] || ' ')) key += text[i++];
        while (/\s/.test(text[i] || 'x')) i++;
        while (text[i] === '[') {
          i++; let value = '';
          while (i < text.length && text[i] !== ']') { let v = text[i++]; if (v === '\\') { v = text[i++]; if (v === '\r' || v === '\n') continue; } value += v || ''; }
          if (text[i++] !== ']') throw Error('Unclosed value');
          (node[key] ||= []).push(value);
          while (/\s/.test(text[i] || 'x')) i++;
        }
      }
    }
    if (depth || !nodes.length) throw Error('Invalid game');
    const r = nodes[0], n = Number(r.SZ?.[0] || 19);
    if (![7,9,13,19].includes(n)) throw Error('Invalid size');
    const coord = v => { if (!v || v === 'tt' && n <= 19) return -1; if (!/^[a-s]{2}$/.test(v)) throw Error('Invalid coordinate'); const x=v.charCodeAt(0)-97,y=v.charCodeAt(1)-97; if(x>=n||y>=n) throw Error('Outside board'); return y*n+x; };
    const setup = [];
    for (const [key,c] of [['AB',1],['AW',2]]) for (const v of r[key] || []) { const ends=v.split(':'); if(ends.length===1) setup.push([coord(v),c]); else { const a=coord(ends[0]),b=coord(ends[1]); for(let y=Math.floor(a/n);y<=Math.floor(b/n);y++) for(let x=a%n;x<=b%n;x++) setup.push([y*n+x,c]); } }
    const moves=[]; for(const nd of nodes) for(const [key,c] of [['B',1],['W',2]]) if(nd[key]) moves.push([c,coord(nd[key][0])]);
    const re=r.RE?.[0] || '', winner=/^B\+/.test(re)?1:/^W\+/.test(re)?2:0;
    return {n,komi:Number(r.KM?.[0] || 0),handicap:Number(r.HA?.[0] || setup.filter(x=>x[1]===1).length),setup,sequence:moves,winner,margin:/^[BW]\+\d/.test(re)?Number(re.slice(2)):null,resign:/\+R(esign)?$/i.test(re),adjudicated:!!r.C?.some(c=>/adjudicat/i.test(c))};
  }
  function sync(a,g) { for(let k=a.cursor;k<g.moves.length;k++) a.events.push({type:'move',c:k%2?2:1,i:g.moves[k],no:k-a.base+1}); a.cursor=g.moves.length; }
  function begin(g,base=0,saved) { return saved && Array.isArray(saved.events) ? {...saved,cursor:g.moves.length} : {base,cursor:base,events:[],undos:[],started:new Date().toISOString(),id:Date.now().toString(36)+Math.random().toString(36).slice(2)}; }
  function undo(a,g,before,side) { const removed=before.slice(g.moves.length); if(!removed.length)return; const u={at:before.length-a.base,count:removed.length,side,removed:removed.map((i,k)=>[(g.moves.length+k)%2?2:1,i]),to:g.moves.length-a.base,event:a.events.length}; a.undos.push(u); a.events.push({type:'undo',...u}); a.cursor=g.moves.length; }
  const api={parse,sync,begin,undo}; if(typeof module==='object') module.exports=api; else root.RecordLogic=api;
})(typeof globalThis==='object'?globalThis:this);
