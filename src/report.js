// ---------- ส่งผลการเล่นเข้าส่วนกลาง (ต้องกดยินยอมเอง ปิดได้ทุกเมื่อ) ----------
// ตั้งค่าที่อยู่รับข้อมูล (Google Apps Script Web App) ใน REPORT_URL ถ้าเว้นว่าง ฟีเจอร์นี้จะไม่แสดงและไม่เก็บอะไร
const REPORT_URL = '';
const Rep = (() => {
  const K = { on: 'go-rep-on', q: 'go-rep-q', id: 'go-rep-id', sent: 'go-rep-sent', ask: 'go-rep-ask' };
  const g = (k, d) => store.get(k, d), s = (k, v) => store.set(k, v);
  const uid = () => { let i = g(K.id, ''); if (!i) { i = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2)); s(K.id, i); } return i; };
  const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
  let busy = false;
  const enabled = () => !!REPORT_URL;
  const on = () => enabled() && g(K.on, false) === true;
  function add(ev) {
    if (!on()) return;
    const q = g(K.q, []); ev.t = Date.now(); ev.eid = uid().slice(0, 8) + '-' + ev.t.toString(36) + Math.random().toString(36).slice(2, 5);
    q.push(ev); s(K.q, q.slice(-200)); flush();
  }
  async function flush() {
    if (busy || !on()) return; const q = g(K.q, []); if (!q.length) { ui(); return; }
    if (!navigator.onLine) return;
    busy = true;
    try {
      const batch = q.slice(0, 20);
      const body = JSON.stringify({ v: 1, id: uid(), name: clip(typeof pn === 'function' ? pn() : '', 16), events: batch });
      if (body.length > 60000) { s(K.q, q.slice(batch.length)); busy = false; return; }
      const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
      await fetch(REPORT_URL, { method: 'POST', mode: 'no-cors', keepalive: false, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body, signal: ctl.signal });
      clearTimeout(to);
      const now = g(K.q, []); const ids = new Set(batch.map(e => e.eid)); s(K.q, now.filter(e => !ids.has(e.eid)));
      s(K.sent, (g(K.sent, 0) || 0) + batch.length); busy = false; ui();
      if (g(K.q, []).length) setTimeout(flush, 500);
    } catch (e) { busy = false; ui(); }
  }
  function set(v) { s(K.on, !!v); if (!v) { s(K.q, []); } else flush(); ui(); }
  function ui() {
    const box = document.getElementById('rep-box'); if (!box) return;
    box.hidden = !enabled(); if (!enabled()) return;
    const c = box.querySelector('input'); c.checked = on();
    box.querySelector('.rep-st').textContent = on() ? `ส่งแล้ว ${g(K.sent, 0)} รายการ · รอส่ง ${g(K.q, []).length} รายการ` : 'ปิดอยู่ ไม่มีการส่งข้อมูลใดๆ';
  }
  function mount() {
    const bk = document.getElementById('backup'); if (!bk || document.getElementById('rep-box')) return;
    const box = document.createElement('section'); box.id = 'rep-box'; box.className = 'panel col'; box.style.marginTop = '20px'; box.hidden = true;
    box.innerHTML = `<h2>ช่วยปรับปรุงสำนัก</h2><label class="rep-sw"><input type="checkbox" id="rep-on"> <span>แบ่งปันผลการเล่นให้ผู้ดูแลสำนัก</span></label>
      <p class="small">ส่งเฉพาะ: ชื่อที่คุณตั้ง รหัสสุ่มของเครื่องนี้ ผลแพ้ชนะ คู่ประลอง ขนาดกระดาน โหมด จำนวนตา แต้มที่ต่าง และบันทึกตาเดิน (SGF) ผลบทเรียนและโจทย์ ไม่เก็บอีเมล ตำแหน่ง หรือข้อมูลอื่น ใช้เพื่อปรับระดับและความแรงของ AI เท่านั้น ปิดได้ทุกเมื่อ เมื่อปิดจะไม่ส่งอีก (ข้อมูลที่ส่งไปแล้วขอให้ลบได้โดยแจ้งผู้ดูแลพร้อมชื่อของคุณ)</p><p class="small rep-st" role="status"></p>`;
    bk.parentNode.insertBefore(box, bk);
    box.querySelector('input').onchange = e => set(e.target.checked);
    ui();
  }
  function nudge() {
    if (!enabled() || on() || g(K.ask, 0)) return; s(K.ask, 1);
    const d = document.createElement('div'); d.className = 'rep-nudge'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'ขอความร่วมมือ');
    d.innerHTML = `<p>ช่วยปรับระดับ AI ให้ตรงขึ้นไหม? แบ่งปันผลแพ้ชนะแบบใช้ชื่อที่ตั้งไว้ ปิดได้ทุกเมื่อในหน้าโปรไฟล์</p><div class="btns"><button class="btn primary" type="button" data-a="y">ได้เลย</button><button class="btn" type="button" data-a="n">ไม่เอา</button></div>`;
    d.onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.a === 'y') set(true); d.remove(); };
    d.addEventListener('keydown', e => { if (e.key === 'Escape') d.remove(); });
    document.body.appendChild(d);
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) flush(); });
  window.addEventListener('online', flush);
  setTimeout(() => { mount(); flush(); }, 1500);
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('[data-tab="me"],#pchip')) setTimeout(mount, 50); });
  // ---------- สมุดบันทึกประลองของคู่ประลองแต่ละตัว (อ่านจากส่วนกลาง เฉพาะคนที่ยินยอมแบ่งปัน) ----------
  let hallCache = null, hallAt = 0;
  async function hall() {
    if (hallCache && Date.now() - hallAt < 60000) return hallCache;
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
    try { const r = await fetch(REPORT_URL + (REPORT_URL.includes('?') ? '&' : '?') + 'a=hall', { signal: ctl.signal }); const j = await r.json(); hallCache = j && j.hall ? j.hall : {}; hallAt = Date.now(); return hallCache; }
    finally { clearTimeout(to); }
  }
  const dstr = t => { try { return new Date(t).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }); } catch (e) { return ''; } };
  const esc2 = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  async function paintHall(sid, sname) {
    const box = document.getElementById('hall-box'); if (!box) return;
    if (!enabled()) { box.hidden = true; return; }
    box.hidden = false; box.innerHTML = '<h3>สมุดบันทึกประลอง</h3><p class="small">กำลังโหลด…</p>';
    let h; try { h = await hall(); } catch (e) { if (document.getElementById('hall-box') === box) box.innerHTML = '<h3>สมุดบันทึกประลอง</h3><p class="small">โหลดไม่ได้ในตอนนี้ ลองใหม่ภายหลัง</p>'; return; }
    if (document.getElementById('hall-box') !== box) return;
    const d = h[sid];
    if (!d || !d.recent || !d.recent.length) { box.innerHTML = '<h3>สมุดบันทึกประลอง</h3><p class="small">ยังไม่มีผู้ท้าชิงที่แบ่งปันผล เป็นคนแรกได้เลย</p>'; return; }
    const tot = d.w + d.l, rate = tot ? Math.round(d.w / tot * 100) : null;
    const rows = d.recent.map(r => { const won = r.res === 'W'; return `<li><span class="hn">${esc2(r.name || 'นักหมาก')}</span><span class="hr ${won ? 'win' : 'loss'}">${won ? 'ชนะ' : r.res === 'resign' ? 'ยอมแพ้' : 'แพ้'}${r.margin != null && r.margin !== '' ? ' ' + esc2(r.margin) + ' แต้ม' : ''}</span><span class="hm">${r.mode === 'teach' ? 'โหมดสอน' : 'ประลองจริง'} · ${esc2(r.n)}x${esc2(r.n)}${r.hc ? ' · ต่อ ' + esc2(r.hc) : ''} · ${dstr(r.t)}</span></li>`; }).join('');
    box.innerHTML = `<h3>สมุดบันทึกประลอง</h3><p class="small">ผู้ท้าชิง ${esc2(d.players)} คน${rate != null ? ` · ผู้เล่นชนะ ${esc2(d.w)} แพ้ ${esc2(d.l)} (ชนะ ${rate}% ในโหมดประลองจริง)` : ''}<br>แสดงเฉพาะผู้ที่กดยินยอมแบ่งปันผล</p><ul class="hall-list">${rows}</ul>`;
  }
  return { add, flush, nudge, mount, on, enabled, paintHall };
})();
