// หน้าสรุปผลการทดสอบสำหรับเจ้าของเว็บ เปิดด้วยการต่อ ?ops ท้ายลิงก์ (อ่านข้อมูลรวมจากชีต ไม่มีชื่อ/ข้อมูลส่วนตัว)
(() => {
  let closed = false;
  const E = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function verdict(o) {
    if (!o || o.n < 5) return 'ข้อมูลยังน้อย (ต้องการอย่างน้อย 5 คน)';
    const t = o.lo + o.eq + o.hi; if (!t) return 'ยังไม่มีคะแนนโหวต';
    if (o.hi / t >= 0.5) return 'ผู้เล่นเห็นว่าเอไอเก่งกว่าป้าย: พิจารณาปรับป้ายระดับให้สูงขึ้น หรือทำเอไออ่อนลง';
    if (o.lo / t >= 0.5) return 'ผู้เล่นเห็นว่าเอไออ่อนกว่าป้าย: พิจารณาปรับป้ายระดับให้ต่ำลง หรือทำเอไอแรงขึ้น';
    return 'ส่วนใหญ่เห็นว่าตรงกับป้าย';
  }
  async function render() {
    let v = document.getElementById('ops-view');
    if (!/[?&]ops(=|&|$)/.test(location.search) || closed) { if (v) v.remove(); return; }
    if (!v) { v = document.createElement('div'); v.id = 'ops-view'; v.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg,#fff);color:var(--ink,#111);overflow:auto;padding:16px'; document.body.appendChild(v); }
    v.innerHTML = '<p>กำลังโหลดผลทดสอบ…</p>';
    let hall = {}, ops = {};
    try { hall = await Rep.hall(); ops = Rep.ops(); } catch (e) { v.innerHTML = '<p>โหลดข้อมูลไม่ได้ ลองใหม่อีกครั้ง</p><button class="btn" id="ops-x">ปิด</button>'; document.getElementById('ops-x').onclick = () => { closed = true; render(); }; return; }
    const rows = SENSEI.map(s => { const h = hall[s.id] || {}, o = ops[s.id] || null, g = (h.w || 0) + (h.l || 0);
      return { id: s.id, name: s.name, rank: s.rank, players: h.players || 0, games: g, winPct: g ? Math.round((h.w || 0) / g * 100) : null, votes: o ? { n: o.n, lo: o.lo, eq: o.eq, hi: o.hi, dan: o.dan, lv: o.lv } : null, verdict: verdict(o) }; });
    const sum = JSON.stringify(rows.map(r => ({ id: r.id, rank: r.rank, players: r.players, games: r.games, winPct: r.winPct, votes: r.votes })));
    v.innerHTML = `<h1>สรุปผลทดสอบ</h1><p class="small">ข้อมูลรวมจากผู้ที่ยินยอมส่งผลเท่านั้น (ไม่แสดงชื่อ) ข้อมูลอัปเดตทุกประมาณ 1 นาที</p>
      <div style="overflow:auto"><table style="border-collapse:collapse;width:100%;font-size:14px"><thead><tr><th align=left>คู่ประลอง</th><th>ป้ายระดับ</th><th>ผู้เล่น</th><th>เกมจริง</th><th>ผู้เล่นชนะ %</th><th>โหวต อ่อน/ตรง/เก่ง</th><th align=left>ข้อสังเกต</th></tr></thead><tbody>${rows.map(r => `<tr style="border-top:1px solid #8884"><td>${E(r.name)}</td><td align=center>${E(r.rank)}</td><td align=center>${r.players}</td><td align=center>${r.games}</td><td align=center>${r.winPct == null ? '-' : r.winPct}</td><td align=center>${r.votes ? r.votes.lo + '/' + r.votes.eq + '/' + r.votes.hi + ' (' + r.votes.n + ' คน)' : '-'}</td><td>${E(r.verdict)}</td></tr>`).join('')}</tbody></table></div>
      <p class="small">ถ้าผู้เล่นชนะเกินราว 70% หรือแพ้เกินราว 70% ของเกมจริง แสดงว่าระดับอาจคลาดเคลื่อน ควรดูควบคู่กับโหวต</p>
      <p><button class="btn" id="ops-copy">คัดลอกสรุปเป็นข้อความ (ส่งให้ Claude)</button> <button class="btn" id="ops-x">ปิด</button></p><p class="small" id="ops-m"></p>`;
    document.getElementById('ops-x').onclick = () => { closed = true; render(); };
    document.getElementById('ops-copy').onclick = async () => { const m = document.getElementById('ops-m'); try { await navigator.clipboard.writeText(sum); m.textContent = 'คัดลอกแล้ว วางส่งในแชตได้เลย'; } catch (e) { m.textContent = 'คัดลอกอัตโนมัติไม่ได้ ข้อความสรุป: ' + sum; } };
  }
  render();
})();
