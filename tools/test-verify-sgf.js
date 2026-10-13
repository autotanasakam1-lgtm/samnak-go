const assert = require('assert'), { verify } = require('./verify-sgf');
// เกม 5x5 ถูกกติกา: ดำเดินกลาง ผ่านสองครั้ง
assert.ok(verify('(;GM[1]SZ[5]KM[0.5]RE[B+24.5];B[cc];W[];B[])').ok);
assert.ok(verify('(;SZ[9]KM[6.5]RE[W+R];B[ee];W[dd])').ok);
assert.ok(!verify('(;SZ[5]KM[0.5]RE[B+24.5];B[cc];W[cc];B[];W[])').ok, 'วางทับต้องไม่ผ่าน');
assert.ok(!verify('(;SZ[5]KM[0.5]RE[W+20.5];B[cc];W[];B[])').ok, 'ผลที่อ้างต้องตรงกระดาน');
assert.ok(!verify('(;SZ[5]KM[0.5]RE[B+1];B[cc];W[dd])').ok, 'ไม่จบเกม');
assert.ok(!verify('(;SZ[5]KM[0.5]RE[B+1];B[cc];B[dd];W[];B[])').ok, 'เดินซ้ำสี');
console.log('VERIFY-SGF OK');
