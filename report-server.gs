// สำนักหมากล้อม — รับผลการเล่นเข้า Google Sheet (วางใน Apps Script ของชีตนี้)
const MAX = 60000;
function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (!raw || raw.length > MAX) return out('size');
    const d = JSON.parse(raw);
    if (d.v !== 1 || !Array.isArray(d.events)) return out('bad');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const games = sheet(ss, 'games', ['เวลา', 'รหัสเครื่อง', 'ชื่อ', 'คู่ประลอง', 'ระดับคู่ประลอง', 'กระดาน', 'โหมด', 'หมากต่อ', 'ผล', 'แต้มต่าง', 'จำนวนตา', 'เสียเฉลี่ยต่อตา', 'ตาพลาดหนัก', 'ใช้บอทสำรอง', 'eid', 'sgf', 'จำนวนครั้งที่ถอย', 'รายการถอย', 'เริ่มใหม่']);
    const other = sheet(ss, 'lesson_puzzle', ['เวลา', 'รหัสเครื่อง', 'ชื่อ', 'ชนิด', 'id', 'สำเร็จ', 'eid']);
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    const seen = new Set(ss.getSheetByName('seen') ? ss.getSheetByName('seen').getRange(1, 1, Math.max(1, ss.getSheetByName('seen').getLastRow()), 1).getValues().flat() : []);
    const seenSh = ss.getSheetByName('seen') || ss.insertSheet('seen');
    const name = str(d.name, 16), id = str(d.id, 40);
    d.events.slice(0, 50).forEach(ev => {
      const eid = str(ev.eid, 40); if (!eid || seen.has(eid)) return;
      const t = new Date(Number(ev.t) || Date.now());
      if (ev.k === 'game') games.appendRow([t, id, name, str(ev.opp, 6), str(ev.oppRank, 20), num(ev.n), str(ev.mode, 8), num(ev.hc), str(ev.res, 8), num(ev.margin), num(ev.moves), num(ev.avgLoss), num(ev.big), ev.degraded ? 1 : 0, eid, str(ev.sgf, 6000), num(ev.undoCount), str(JSON.stringify(ev.undos || []), 45000), ev.restarted ? 1 : 0]);
      else if(ev.k === 'record') sheet(ss,'records',['เวลา','รหัสเครื่อง','ชื่อ','บันทึก']).appendRow([t,id,name,str(JSON.stringify(ev),45000)]);
      else if (ev.k === 'lesson' || ev.k === 'puzzle') other.appendRow([t, id, name, ev.k, str(ev.id, 20), ev.ok === false ? 0 : 1, eid]);
      else return;
      seenSh.appendRow([eid]);
    });
    lock.releaseLock();
    return out('ok');
  } catch (err) { return out('err'); }
}
function doGet(e) {
  if (!e || !e.parameter || e.parameter.a !== 'hall') return out('ok');
  const cache = CacheService.getScriptCache(), hit = cache.get('hall');
  if (hit) return json(hit);
  const ss = SpreadsheetApp.getActiveSpreadsheet(), sh = ss.getSheetByName('games');
  const hall = {};
  if (sh && sh.getLastRow() > 1) {
    const n = Math.min(sh.getLastRow() - 1, 800), rows = sh.getRange(sh.getLastRow() - n + 1, 1, n, 15).getValues();
    rows.forEach(r => {
      const sid = String(r[3]); if (!sid) return;
      const h = hall[sid] = hall[sid] || { w: 0, l: 0, ids: {}, recent: [], wins: [], conq: {} };
      const res = String(r[8]); const win = res === 'W';
      const real = String(r[6]) === 'match';
      if (real) { win ? h.w++ : h.l++; }
      h.ids[String(r[1])] = 1;
      const tag = String(r[1]).replace(/[^A-Za-z0-9]/g, '').slice(0, 4);
      const name = String(r[2]).slice(0, 16), t = new Date(r[0]).getTime(), hc = Number(r[7]) || 0;
      h.recent.push({ t: t, name: name, tag: tag, res: res, margin: r[9] === '' ? null : r[9], mode: String(r[6]), n: r[5], hc: r[7] });
      // ผู้พิชิต: ชนะเกมประลองจริงแบบเสมอ (ไม่ต่อหมาก) เท่านั้น
      if (real && win && hc === 0) {
        if (r[9] !== '' && r[9] != null) h.wins.push({ name: name, tag: tag, margin: Number(r[9]), t: t, n: r[5] });
        const k = String(r[1]); if (!h.conq[k] || h.conq[k].t > t) h.conq[k] = { name: name, tag: tag, t: t, n: r[5] };
      }
    });
    Object.keys(hall).forEach(k => {
      const h = hall[k]; h.players = Object.keys(h.ids).length; delete h.ids;
      h.recent = h.recent.slice(-12).reverse();
      h.top = h.wins.sort((a, b) => b.margin - a.margin).slice(0, 10); delete h.wins;
      h.conq = Object.keys(h.conq).map(i => h.conq[i]).sort((a, b) => a.t - b.t).slice(0, 20);
    });
  }
  const s = JSON.stringify({ updated: Date.now(), hall: hall });
  cache.put('hall', s, 60);
  return json(s);
}
function json(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON); }
function out(s) { return ContentService.createTextOutput(s); }
function str(v, n) { return String(v == null ? '' : v).replace(/^[=+\-@]/, "'$&").slice(0, n); }
function num(v) { const x = Number(v); return isFinite(x) ? x : ''; }
function sheet(ss, name, head) { let s = ss.getSheetByName(name); if (!s) { s = ss.insertSheet(name); s.appendRow(head); s.setFrozenRows(1); } return s; }
