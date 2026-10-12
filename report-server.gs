// สำนักหมากล้อม — รับผลการเล่นเข้า Google Sheet (วางใน Apps Script ของชีตนี้)
const MAX = 60000;
function doPost(e) {
  try {
    const raw = (e && e.postData && e.postData.contents) || '';
    if (!raw || raw.length > MAX) return out('size');
    const d = JSON.parse(raw);
    if (d.v !== 1 || !Array.isArray(d.events)) return out('bad');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const games = sheet(ss, 'games', ['เวลา', 'รหัสเครื่อง', 'ชื่อ', 'คู่ประลอง', 'ระดับคู่ประลอง', 'กระดาน', 'โหมด', 'หมากต่อ', 'ผล', 'แต้มต่าง', 'จำนวนตา', 'เสียเฉลี่ยต่อตา', 'ตาพลาดหนัก', 'ใช้บอทสำรอง', 'eid', 'sgf']);
    const other = sheet(ss, 'lesson_puzzle', ['เวลา', 'รหัสเครื่อง', 'ชื่อ', 'ชนิด', 'id', 'สำเร็จ', 'eid']);
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    const seen = new Set(ss.getSheetByName('seen') ? ss.getSheetByName('seen').getRange(1, 1, Math.max(1, ss.getSheetByName('seen').getLastRow()), 1).getValues().flat() : []);
    const seenSh = ss.getSheetByName('seen') || ss.insertSheet('seen');
    const name = str(d.name, 16), id = str(d.id, 40);
    d.events.slice(0, 50).forEach(ev => {
      const eid = str(ev.eid, 40); if (!eid || seen.has(eid)) return;
      const t = new Date(Number(ev.t) || Date.now());
      if (ev.k === 'game') games.appendRow([t, id, name, str(ev.opp, 6), str(ev.oppRank, 20), num(ev.n), str(ev.mode, 8), num(ev.hc), str(ev.res, 8), num(ev.margin), num(ev.moves), num(ev.avgLoss), num(ev.big), ev.degraded ? 1 : 0, eid, str(ev.sgf, 6000)]);
      else if (ev.k === 'lesson' || ev.k === 'puzzle') other.appendRow([t, id, name, ev.k, str(ev.id, 20), ev.ok === false ? 0 : 1, eid]);
      else return;
      seenSh.appendRow([eid]);
    });
    lock.releaseLock();
    return out('ok');
  } catch (err) { return out('err'); }
}
function doGet() { return out('ok'); }
function out(s) { return ContentService.createTextOutput(s); }
function str(v, n) { return String(v == null ? '' : v).replace(/^[=+\-@]/, "'$&").slice(0, n); }
function num(v) { const x = Number(v); return isFinite(x) ? x : ''; }
function sheet(ss, name, head) { let s = ss.getSheetByName(name); if (!s) { s = ss.insertSheet(name); s.appendRow(head); s.setFrozenRows(1); } return s; }
