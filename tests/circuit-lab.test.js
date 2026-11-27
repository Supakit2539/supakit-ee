// ทดสอบ circuit-lab.html ด้วย Playwright (Node)
// ใช้: node tests/circuit-lab.test.js   (ต้องติดตั้ง playwright; ถ้าติดตั้งแบบ global ให้ตั้ง NODE_PATH=$(npm root -g))
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort());
  await page.goto('file://' + path.resolve(__dirname, '..', 'circuit-lab.html'));

  const r = await page.evaluate(() => {
    const s = window.__sim, o = {};
    const I = n => s.RES.comp[s.find(n).id].Ir;
    s.load('series');   o.series = I('B1');
    s.load('parallel'); o.parallel = I('B1');
    s.load('mixed');    o.mixed = I('B1');
    s.load('led');      o.led = I('D1');

    s.load('dol');
    const start = s.find('START'), m = s.find('M1');
    start._pr = true; s.poke(); start._pr = false; s.poke();
    o.dolCoil = s.find('K1')._on;
    o.dolInrush = s.RES.comp[m.id].ph[0];
    s.run(6);
    o.dolI = s.RES.comp[m.id].ph;
    s.find('F2').on = false; s.poke();
    o.dolHum = m._hum;

    for (const mode of ['lad', 'txt']){
      s.load('plcpump');
      const plc = s.find('PLC1'), tk = s.find('TK1');
      plc.prog.mode = mode; delete plc._cp;
      s.run(0.2);
      const b = s.find('START'); b._pr = true; s.poke(); s.run(0.2); b._pr = false; s.poke();
      const ev = []; let q = plc._img.Q[0];
      for (let t = 0; t < 60; t += 0.05){ s.step(0.05); if (plc._img.Q[0] !== q){ q = plc._img.Q[0]; ev.push([q, tk.lvl]); } }
      o['pump_' + mode] = ev;
      o['hmi_' + mode] = !!s.find('HMI1')._link;
    }
    s.load('arduino'); s.run(1.2);
    o.ardA0 = +/A0 = (\d+)/.exec(s.find('U1')._vm.serial)[1];
    o.ardLed = I('D1');
    s.find('RV1').pos = 10; s.poke(); s.run(0.6);
    o.ardLedDim = I('D1');

    s.load('esp32'); s.run(0.5);
    const btn = s.find('S1'); btn._pr = true; s.poke(); s.run(0.2); btn._pr = false; s.poke(); s.run(0.2);
    o.espLed = !!s.find('D1')._on; o.espSerial = s.find('U1')._vm.serial;

    s.load('pico'); s.run(0.5);
    o.picoRed = !!s.find('D1')._on; o.picoRedI = I('D1');
    s.run(3.2); o.picoGreen = !!s.find('D3')._on && !s.find('D1')._on;
    s.load('ardsense'); s.run(1.1);
    o.senseLine = s.find('U1')._vm.serial.split('\n')[0];
    s.find('US1').dist = 10; s.find('PIR1')._t = 3; s.poke(); s.run(1.0);
    o.senseBz = !!s.find('BZ1')._snd; o.sensePir = /PIR=1/.test(s.find('U1')._vm.serial);

    s.load('espgarden'); s.run(1.5); o.servoDry = s.find('SV1')._ang;
    s.find('SM1').moist = 70; s.poke(); s.run(1.5); o.servoWet = s.find('SV1')._ang;

    s.load('plcsense'); s.run(0.3);
    const pl = s.find('PLC1');
    o.ai0 = pl._img.AI[0]; o.q0off = pl._img.Q[0];
    s.find('PX1').det = true; s.poke(); s.run(0.1); o.q0on = pl._img.Q[0];
    s.find('SQ1').act = true; s.poke(); s.run(0.1); o.q0lim = pl._img.Q[0];
    s.find('TT1').pct = 90; s.poke(); s.run(0.1); o.q2 = pl._img.Q[2];

    const RC = n => s.RES.comp[s.find(n).id];
    s.load('semi'); s.run(0.1);
    o.reg = RC('U1').vout; o.vz = RC('V1').Vr; o.ledOff = RC('D1').Ir;
    s.find('S1').on = true; s.poke(); s.run(0.1);
    o.ledOn = RC('D1').Ir; o.qState = s.find('Q1')._bj;

    s.load('timer555'); s.run(0.2);
    let tr = 0, lq = s.find('U1')._q;
    for (let t = 0; t < 4; t += 0.05){ s.step(0.05); if (s.find('U1')._q !== lq){ tr++; lq = s.find('U1')._q; } }
    o.t555 = tr;

    s.load('counter'); s.run(1.5);
    o.seg = 'abcdefg'.split('').filter((_, k) => s.find('DS1')._js[k]).join('');

    s.load('motor'); s.run(0.3); o.motorOff = RC('M1').Ir;
    const mb = s.find('S1'); mb._pr = true; s.poke(); s.run(0.2); mb._pr = false; s.poke(); s.run(0.5);
    o.motorOn = RC('M1').Ir; s.run(4); o.motorRun = RC('M1').Ir;

    const src = () => s.RES.src[s.S.comps.find(c => c.t === 'src3' || c.t === 'src1').id];
    s.load('stardelta'); s.run(0.5);
    const sb = s.find('START'); sb._pr = true; s.poke(); s.run(0.3); sb._pr = false; s.poke();
    o.sdInrush = src().I; s.run(2.5);
    const m6 = s.find('M1'); o.sdStar = [m6._cn, s.find('K2')._on, +src().I.toFixed(2)];
    s.run(4); o.sdDelta = [m6._cn, !!s.find('K3')._on, !!s.find('K2')._on, +src().I.toFixed(2)];
    s.find('F2').on = false; s.poke(); o.sdHum = m6._hum; s.run(15);
    o.sdProt = !!s.find('F4')._trip || !s.find('F1').on || !s.find('F3').on;
    s.load('stardelta'); s.run(0.3); const sb2 = s.find('START'); sb2._pr = true; s.poke(); s.run(0.3); sb2._pr = false; s.poke(); s.run(1);
    s.find('S0').act = true; s.poke(); s.run(0.2); o.estop = !!s.find('K1')._on;

    s.load('rcdtest'); s.run(0.3); o.rcd0 = s.find('RCD1').on;
    s.find('แตะสายไฟ').on = true; s.poke(); s.run(0.1); o.rcd1 = [s.find('RCD1').on, s.find('RCD1')._trip, RC('คน').Ir];

    s.load('pfc'); s.run(3);
    const pf = () => { const x = RC('PM1'); return [Math.abs(x.P)/Math.hypot(x.P, x.Q), x.I]; };
    o.pf0 = pf(); s.find('S1').on = true; s.poke(); s.run(0.2); o.pf1 = pf();

    s.load('stair'); s.run(0.1); const lit = () => RC('H1').Ir > 0.1; o.stair = [lit()];
    s.find('S1').pos = 'B'; s.poke(); o.stair.push(lit()); s.find('S2').pos = 'X'; s.poke(); o.stair.push(lit()); s.find('S3').pos = 'B'; s.poke(); o.stair.push(lit());

    s.load('factory'); s.run(0.5);
    o.facIdle = s.find('M1')._sp || 0;
    const fs = s.find('START'); fs._pr = true; s.poke(); s.run(0.3); fs._pr = false; s.poke(); s.run(60);
    o.facCnt = Object.assign({}, s.FXS.cnt); o.facConv = s.find('M1')._sp;
    const fp = s.find('STOP'); fp._pr = true; s.poke(); s.run(0.3); fp._pr = false; s.poke(); s.run(8);
    o.facStop = s.find('M1')._sp; o.facGl = !!document.querySelector('#fx').getContext('webgl');

    const press = (n, t) => { const c = s.find(n); c._pr = true; s.poke(); s.run(t || 0.3); c._pr = false; s.poke(); };
    s.load('seqconv'); s.run(0.5); press('START'); s.run(1); o.seq1 = [!!s.find('M2')._run, !!s.find('M1')._run];
    s.run(4); o.seq2 = [!!s.find('M2')._run, !!s.find('M1')._run]; s.run(40); o.seqCnt = Object.assign({}, s.FXS.cnt);
    press('STOP'); s.run(1); o.seq3 = [!!s.find('K2')._on, !!s.find('K1')._on]; s.run(5); o.seq4 = [!!s.find('K2')._on, !!s.find('K1')._on];

    s.load('gate'); s.run(0.5); const gp = () => s.FXS.rt[1].p;
    o.gate0 = [gp(), s.find('SQ2').act]; press('OPEN'); s.run(9); o.gate1 = [gp(), !!s.find('K1')._on, s.find('SQ1').act];
    press('CLOSE'); s.run(2); press('STOP'); s.run(1); const mid = gp(); s.run(2); o.gate2 = [mid, gp(), !!s.find('K2')._on];
    press('CLOSE'); s.run(9); o.gate3 = [gp(), !!s.find('K2')._on, s.find('SQ2').act];

    s.load('plcpump'); o.tankScene = s.S.fac.items.map(i => i.k).join();
    // จัดวางเอง: ฉากว่าง + สายพาน + ตัวปล่อย + ถัง ผูกกับมอเตอร์ M1 ของตัวอย่าง factory
    s.load('factory'); s.S.fac = {btn:['START','STOP'], items:[
      {id:1, k:'conv', x:1.5, z:0, r:0, len:3, spd:0.5, m:'M1'}, {id:2, k:'emit', x:0.3, z:0, r:0, every:2, metal:0}, {id:3, k:'bin', x:3.55, z:0, r:0, want:'any'}]};
    s.FXS.boxes.length = 0; s.run(0.3); press('START'); s.run(30); o.custom = Object.assign({}, s.FXS.cnt); o.customSaved = JSON.parse(JSON.stringify(s.S.fac.items.length));

    s.load('pickplace'); s.run(0.5); press('START'); s.run(60); o.pick = Object.assign({}, s.FXS.cnt);
    // ตัวกั้นชิ้นงาน: คอยล์ Y1 ไม่มีไฟ → กั้น, มีไฟ → เปิดทาง
    s.load('factory'); s.S.fac = {btn:['START','STOP'], items:[
      {id:1, k:'conv', x:2, z:0, r:0, len:4, spd:0.5, m:'M1'}, {id:2, k:'emit', x:0.3, z:0, r:0, every:2, metal:0}, {id:3, k:'stop', x:3, z:0, r:0, y:'K1'}, {id:4, k:'bin', x:4.55, z:0, r:0, want:'any'}]};
    s.S.fac.items[2].y = 'Y1'; s.run(0.3); press('START'); s.run(20); o.stopHeld = [s.FXS.cnt.other, s.FXS.boxes.length];
    s.S.fac.items[2].y = 'K1'; s.run(15); o.stopOpen = s.FXS.cnt.other;
    s.load('dol'); o.dolScene = s.S.fac.items.map(i => i.k).join(); press('START'); s.run(4); o.fanTurns = s.FXS.rt[1].ang > 10;
    s.load('pico'); s.run(1); o.traffic = [s.flit('D1'), s.flit('D3')]; s.run(3.2); o.traffic2 = [s.flit('D1'), s.flit('D3')];

    s.load('lift'); s.run(0.5); o.liftSq = [s.find('SQ1').act, s.find('SQ2').act]; press('START');
    let liftTop = 0, liftMaxY = 0;
    for (let t = 0; t < 120; t += 0.05){ s.step(0.05); if (s.FXS.rt[3].p >= 0.995) liftTop++; for (const bx of s.FXS.boxes) liftMaxY = Math.max(liftMaxY, bx.y); }
    o.lift = Object.assign({}, s.FXS.cnt); o.liftTop = liftTop; o.liftMaxY = liftMaxY;
    // หลายระดับ: กล่องตกจากสายพานสูง 1.6 m ลงสายพานลาดเอียงด้านล่าง (0.6 → 1.2 m) แล้วลงถัง
    s.load('factory'); s.S.fac = {btn:['START','STOP'], items:[
      {id:1, k:'conv', x:1.5, z:0, r:0, len:3, spd:0.5, m:'M1', h:1.6, h2:1.6}, {id:2, k:'emit', x:0.3, z:0, r:0, every:2, metal:0, h:1.6},
      {id:3, k:'conv', x:4.4, z:0, r:0, len:3, spd:0.5, m:'M1', h:0.6, h2:1.2}, {id:4, k:'bin', x:6.45, z:0, r:0, want:'any'}]};
    s.run(0.3); press('START'); s.run(40); o.cascade = Object.assign({}, s.FXS.cnt);

    // ออสซิลโลสโคป
    s.load('osc'); s.run(0.5);
    let cap = s.scope('OSC1'); const sch = k => cap.ch[k];
    o.osc = [sch(0).max - sch(0).min, sch(0).rms, sch(0).f, sch(1).max, sch(1).min, sch(1).f, sch(1).duty, cap.trig];
    const sc = s.find('OSC1'); sc.cpl2 = 'AC'; cap = s.scope('OSC1'); o.oscAC = Math.abs(cap.ch[1].avg); sc.cpl2 = 'DC';
    s.scopeAutoset('OSC1'); o.oscAuto = [sc.vdiv1, sc.vdiv2, sc.tdiv, sc.trig];
    s.find('U1').C = 100; s.poke(); sc.tdiv = 0.5; sc._hist = []; s.run(6); cap = s.scope('OSC1');
    o.oscRoll = [cap.roll, cap.ch[1].f, cap.ch[0].max - cap.ch[0].min];
    // FFT: CH1 ไซน์ 50 Hz, CH2 คลื่นสี่เหลี่ยม NE555 (ฮาร์มอนิกตามอนุกรมฟูเรียร์)
    s.load('osc'); s.run(0.5); const fsc = s.find('OSC1'); fsc.disp = 'fft'; fsc.fftch = '1';
    let F = s.scope('OSC1').fft; o.fft1 = [F.fund.f, F.fund.v, F.peaks.length, F.thd];
    fsc.fftch = '2'; F = s.scope('OSC1').fft; const hv = h => (F.peaks.find(p => p.h === h) || {v:0}).v;
    o.fft2 = [F.fund.f, F.fund.v, hv(3), hv(5), F.dc, F.span];
    // XY: วงจร RC → ผลต่างเฟส −atan(ωRC) ≈ −46°
    s.load('oscxy'); s.run(0.3); const xc = s.scope('OSC1'); o.xy = [xc.phase, xc.xy ? xc.xy[0].length : 0];
    // Math CH1−CH2 = แรงดันคร่อม R ≈ 8.64 Vrms (Vpp ≈ 24.4 V) ทั้งโหมดเร็ว/FFT/เลื่อน
    { const c = s.S.comps.find(x => x.n === 'OSC1'); c.disp = 'yt'; c.math = 'sub'; const m = s.scope('OSC1').ch[2];
      c.disp = 'fft'; c.fftch = 'M'; const fp = s.scope('OSC1').fft.peaks[0]; c.disp = 'yt'; c.tdiv = 0.5; c._hist = []; s.run(1.5); const rm = s.scope('OSC1').ch[2];
      o.math = [m.max - m.min, m.rms, m.f, fp.f, fp.v, rm.max - rm.min]; }
    // เคอร์เซอร์: เวลา 2→6 div ที่ 5 ms/div = 20 ms (50 Hz); แรงดัน CH2 (5 V/div, ตำแหน่ง −3) A=2, B=−2 div → 25 V, 5 V
    { s.load('osc'); s.run(0.3); const c = s.S.comps.find(x => x.t === 'scope'); c.cur = 'time'; c.ta = 2; c.tb = 6; s.scope(c.n); const t = s.scopeCursor(c.n);
      c.cur = 'volt'; c.cch = '2'; c.va = 2; c.vb = -2; const v = s.scopeCursor(c.n); o.cur = [t.dt, t.inv, v.vA, v.vB, v.dv]; }
    // ลิฟต์โดยสาร 3 ชั้น (แลดเดอร์และข้อความ): เรียกชั้น 3 แล้วเรียกชั้น 2 ระหว่างทาง → จอดชั้น 2 (ประตูเปิด) → ไปชั้น 3; เรียกชั้น 1 → ลงจอดชั้น 1
    for (const md of ['lad', 'txt']){ s.load('elevator'); const plc = s.find('PLC1'); plc.prog.mode = md; delete plc._cp;
      const it = s.S.fac.items.find(i => i.k === 'elev'), P = () => s.FXS.rt[it.id].p, press = n => { const c = s.find(n); c._pr = true; s.poke(); s.run(0.2); c._pr = false; s.poke(); };
      const H1 = () => s.RES.comp[s.find('H1').id].Ir > 0.01;
      s.run(0.5); const e = [s.find('SQ1').act]; press('F3'); s.run(2.5); press('F2'); s.run(1.5);
      e.push(P(), s.find('SQ2').act, H1(), !s.find('KU')._on); s.run(8); e.push(P(), s.find('SQ3').act);
      press('F1'); s.run(12); e.push(P(), s.find('SQ1').act, !s.find('KD')._on);
      o['elev_' + md] = e; }
    // เซนเซอร์อุตสาหกรรม (indsense) ทั้งแลดเดอร์และข้อความ: หลอด H1–H4 = ปั๊ม, เตือน, ฮีตเตอร์, พร้อมป้อน
    for (const md of ['lad', 'txt']){ s.load('indsense'); const plc = s.find('PLC1'); plc.prog.mode = md; delete plc._cp; s.run(0.5);
      const L = () => ['H1','H2','H3','H4'].map(n => s.RES.comp[s.find(n).id].Ir > 0.02 ? 1 : 0).join(''), set = (n, k, v) => { s.find(n)[k] = v; s.solveNow(); s.run(0.3); return L(); };
      const e = [L()];
      e.push(set('BF1', 'pv', 0)); s.run(3.5); e.push(L()); set('BF1', 'pv', 3);                     // ไม่มีน้ำไหล → เตือนหลัง 3 s
      e.push(set('BP1', 'pv', 3), set('BP1', 'pv', 2), set('BP1', 'pv', 1.3));                        // ตัด 2.8 bar, ค้าง (ดิฟ), ต่อ 1.4 bar
      e.push(set('LC1', 'det', true)); set('LC1', 'det', false);                                        // บังม่านแสง → หยุดทุกอย่าง + เตือน
      e.push(set('GD1', 'lel', 30)); set('GD1', 'lel', 0);
      e.push(set('UB1', 'dist', 50)); set('UB1', 'dist', 150);
      e.push(set('BT1', 'pv', 70), set('CX1', 'det', true));
      o['ind_' + md] = e; }
    // สื่อสาร RS-485 / LoRa / RS-232
    { s.load('rs485'); s.run(3); const u2 = s.find('U2'), D = () => s.RES.comp[s.find('D1').id].Ir;
      const e = [u2._vm.err, /รับ P=60\n$/.test(u2._vm.serial), D()];
      s.find('RV1').pos = 20; s.solveNow(); s.run(2); e.push(/รับ P=20\n$/.test(u2._vm.serial), D());
      u2.code = u2.code.replace('rs485.begin(9600)', 'rs485.begin(4800)'); mcuBoot(u2); s.run(2); e.push(/รับ/.test(u2._vm.serial));          // บอดไม่ตรง → อ่านไม่ออก
      o.c485 = e; }
    { s.load('lora'); s.run(5); const u2 = s.find('U2'), rf = s.find('RF2');
      const e = [/ได้รับ: TEMP=\d+;N=3\n$/.test(u2._vm.serial), rf._link.ok, Math.round(rf._link.rssi)];
      rf.loc = 9000; const n0 = u2._vm.serial.length; s.run(4); e.push(u2._vm.serial.length === n0, rf._link.ok);
      s.find('RF1').sf = 12; rf.sf = 12; s.run(4); e.push(u2._vm.serial.length > n0, rf._link.ok);
      o.clora = e; }
    { s.load('rs232'); s.run(2.5); const pc = s.find('PC1'), u1 = s.find('U1'), L = () => u1._vm.pins[13] ? u1._vm.pins[13].v : 0;
      const e = [/Arduino พร้อม/.test(pc._log)]; termSend(pc, 'on'); s.run(0.5); e.push(L(), /LED ติด\n$/.test(pc._log));
      termSend(pc, 'OFF'); s.run(0.5); e.push(L()); pc.baud = 2400; termSend(pc, 'ON'); s.run(0.5); e.push(L());
      o.c232 = e; }
    // Modbus RTU: PLC มาสเตอร์ ↔ Arduino สเลฟ (แลดเดอร์และข้อความ)
    for (const md of ['lad', 'txt']){ s.load('modbus'); const plc = s.find('PLC1'); plc.prog.mode = md; delete plc._cp; s.run(2);
      const u = s.find('U1'), L = n => s.RES.comp[s.find(n).id].Ir, im = plc._img;
      const e = [im.D[0], im.D[8], L('H1') > 0.04, L('D37') > 0.005, L('D34')];
      s.find('RV1').pos = 30; s.solveNow(); s.run(1.5); e.push(im.D[0], L('H1') < 0.001, L('D37') < 0.001, L('D34') < e[4]);
      const S1 = s.find('S1'); S1._pr = true; s.poke(); s.run(1); e.push(L('D40') > 0.005); S1._pr = false; s.poke();
      u.code = u.code.replace('modbus.begin(1, 9600)', 'modbus.begin(1, 4800)'); mcuBoot(u); s.run(0.5); const ok0 = plc._mb.ok; s.run(1.5);
      e.push(plc._mb.ok === ok0, u._vm.mb.err > 0, /timeout/.test(plc._mb.lastErr));
      o['mb_' + md] = e.map(v => typeof v === 'number' ? +v.toFixed(4) : v); }
    { const im = newImage(); const c = compile('D3 := (AI0 + 10) * 2 - D1 / 4\nQ0 := D3 >= 60'); im.AI[0] = 25; im.D[1] = 40; runText(c.code, im, 0.1); o.mbexpr = [c.err.length, im.D[3], im.Q[0]]; }
    { const f = mbFrame([1, 3, 0, 0, 0, 1]); o.crc = mbHex(f); }
    // HMI ↔ PLC ผ่าน Modbus RTU (PLC = สเลฟ): ปุ่ม START/STOP บน HMI, ไฟอ่านกลับ, ค่า D บนจอ, ID ผิด → timeout
    for (const md of ['lad', 'txt']){ s.load('hmimodbus'); const plc = s.find('PLC1'), h = s.find('HMI1'); plc.prog.mode = md; delete plc._cp;
      h.l4 = 'D5 ค่า'; plc._img = plc._img || newImage(); s.run(1); plc._img.D[5] = 1234; s.run(1);
      const e = [h._mb.ok > 3, h._mbv.I2, h._mbv.D5];
      h._press = 0; s.run(0.4); h._press = null; s.run(0.6); e.push(plc._img.M[2], h._mbv.M2);
      h._press = 1; s.run(0.4); h._press = null; s.run(0.6); e.push(plc._img.M[2], h._mbv.M2);
      h.sid = 2; s.run(1.5); e.push(/timeout/.test(h._mb.lastErr), warnList().some(w => /Modbus ไม่ได้รับคำตอบ/.test(w[1])));
      o['hmb_' + md] = e; }
    { const p = {_img:newImage()}; const R = mbServe([1, 1, 0, 40, 0, 1], plcMbTables(p)), R2 = mbServe([1, 6, 0, 3, 0x01, 0xF4], plcMbTables(p)); o.mbex = [R.ex, R.r[1], R2.ex, p._img.D[3]]; }
    // PLC 2 พอร์ต: #1 มาสเตอร์ → Arduino, #2 สเลฟ ← HMI (ID 2, 19200) พร้อมกัน
    for (const md of ['lad', 'txt']){ s.load('plc2port'); const plc = s.find('PLC1'), h = s.find('HMI1'); plc.prog.mode = md; delete plc._cp; s.run(2);
      const L = n => s.RES.comp[s.find(n).id].Ir;
      const e = [plc._img.D[0], plc._mb.ok > 5, plc._p2._mbs.rx > 5, h._mbv.D0, h._mbv.Q0];
      h._press = 0; s.run(1); e.push(plc._img.M[17], L('D40') > 0.005); h._press = null; s.run(1); e.push(L('D40') < 0.001);
      s.find('RV1').pos = 30; s.solveNow(); s.run(1.5); e.push(h._mbv.D0, h._mbv.Q0);
      plc.mb2Baud = 9600; s.run(1.5); e.push(/timeout/.test(h._mb.lastErr), plc._mb.lastErr === '');
      o['p2_' + md] = e; }
    // Modbus TCP ผ่าน Ethernet: PLC1 ไคลเอนต์ ↔ PLC2 เซิร์ฟเวอร์, HMI → PLC1, ซับเน็ตผิด, IP ซ้ำ, ถอดสวิตช์
    for (const md of ['lad', 'txt']){ s.load('modbustcp'); const p1 = s.find('PLC1'), p2 = s.find('PLC2'), h = s.find('HMI1'), S1 = s.find('S1');
      p1.prog.mode = md; delete p1._cp; const L = n => s.RES.comp[s.find(n).id].Ir > 0.02 ? 1 : 0;
      S1.on = false; s.solveNow(); s.run(2); const e = [L('H1'), p1._img.D[0] > 10 && Math.abs(p1._img.D[0] - p2._img.D[0]) < 20, h._mbv.D0 > 10];
      S1.on = true; s.solveNow(); s.run(1); e.push(L('H1'), h._mbv.M0);
      h._press = 0; s.run(1); e.push(p2._img.M[5], L('H2')); h._press = null; s.run(1); e.push(L('H2'));
      h.ip = '192.168.2.50'; s.run(1.5); e.push(/ซับเน็ต/.test(h._mb.lastErr)); h.ip = '192.168.1.50';
      p2.ip = '192.168.1.10'; s.solveNow(); e.push(warnList().some(w => /IP conflict/.test(w[1]))); p2.ip = '192.168.1.20';
      s.S.comps = s.S.comps.filter(c => c.t !== 'ethsw'); s.solveNow(); s.run(1.5); e.push(/ไม่มีลิงก์/.test(p1._p3._mb.lastErr));
      o['tcp_' + md] = e; }
    { const a = tcpAdu(7, mbBytes(mbFrame([1, 3, 0, 0, 0, 4]))); o.mbap = hexB(a); }
    // แรงดันบัส RS-485: ว่าง (ไบแอส 680 Ω) ≈ 0.21 V, ขณะส่ง ≈ 2.8 V, แต่ละเส้นเทียบ GND ≈ 2.5 V
    { s.load('rs485'); s.run(1); const m = s.find('MD2'), V = () => { const p = s.RES.comp[m.id].pv; return [p[6].d - p[5].d, p[6].d - p[7].d]; }; let idle = null, tx = null;
      for (let i = 0; i < 30; i++){ s.step(0.05); const v = V(); if (s.find('MD1')._drv) tx = v; else idle = v; }
      o.busV = [idle, tx].map(v => v && v.map(x => +x.toFixed(2))); }
    // ESP32 Wi-Fi + Modbus TCP: ต่อ AP ได้ IP, pot → D10, ปุ่ม → M5, อ่าน Q0 → LED, ออกนอกระยะ → หลุด แล้วต่อใหม่เอง, รหัสผิด
    for (const md of ['txt', 'lad']){ s.load('esp32wifi'); const u = s.find('U1'), plc = s.find('PLC1'), L = n => s.RES.comp[s.find(n).id].Ir > 0.02 ? 1 : 0;
      plc.prog.mode = md; delete plc._cp; s.run(4);
      const e = [u._vm.err, /ได้ IP 192\.168\.1\.\d+  RSSI -55/.test(u._vm.serial), Math.abs(plc._img.D[10] - 1228) < 5, L('H1')];
      s.find('RV1').pos = 90; s.solveNow(); s.run(1.5); e.push(plc._img.D[10] > 3000, L('H1'), u._vm.pins[2].v);
      s.find('RV1').pos = 30; s.solveNow(); const S1 = s.find('S1'); S1._pr = true; s.poke(); s.run(1.2); e.push(plc._img.M[5], L('H1')); S1._pr = false; s.poke(); s.run(1.2); e.push(L('H1'));
      u.wdist = 500; s.run(2); e.push(u._vm.wifi.st, /ยังไม่ได้ต่อ Wi-Fi/.test(u._vm.serial.slice(-80))); u.wdist = 15; s.run(6); e.push(u._vm.wifi.st, u._vm.mbtcp.on);
      if (md === 'txt'){ s.find('AP1').pass = 'wrong'; mcuBoot(u); s.run(3); e.push(u._vm.wifi.st, u._vm.wifi.why); }
      o['wifi_' + md] = e; }
    // สโคปจับเฟรม UART บนบัส RS-485: ต่อโพรบ A/B → ถอดรหัส "P=60⏎", A และ B กลับขั้วกัน, Auto Set → 1 ms/div
    { const ob = EX.rs485.f(); ob.raw = true;
      ob.comps.push(Object.assign(mkComp('scope', 30, 18, {n:'OSCB', tdiv:0.001, vdiv1:2, vdiv2:2, pos1:0, pos2:-3, tmode:'norm'}), {id:ob.nid++}));
      ob.wires.push({x1:29, y1:20, x2:29, y2:12}, {x1:30, y1:20, x2:30, y2:14}, {x1:32, y1:20, x2:32, y2:22}, {x1:32, y1:22, x2:55, y2:22}, {x1:55, y1:22, x2:55, y2:9}, {x1:55, y1:9, x2:52, y2:9});
      s.load(ob); s.run(1.2); let cap = null; for (let i = 0; i < 12 && !(cap && cap.uart); i++){ s.step(0.05); cap = s.scope('OSCB'); }
      const sc = s.find('OSCB'); const e = cap && cap.uart ? [cap.uart.text, cap.uart.hex, +(1/cap.uart.baud*1e6).toFixed(0), cap.ch[0].max > 3.5 && cap.ch[0].min < 1.5, cap.ch[1].max > 3.5 && cap.ch[1].min < 1.5] : [null];
      // A กับ B ตรงข้ามกันทุกคอลัมน์
      if (cap && cap.uart){ let opp = 0; for (let i = 0; i < SC_COLS; i++) if ((cap.ch[0].vc[i] > 2.5) !== (cap.ch[1].vc[i] > 2.5)) opp++; e.push(opp > SC_COLS*0.95); }
      sc.tdiv = 0.01; scopeAutoset(sc); e.push(sc.tdiv); o.sbus = e; }
    // สัญญาณจริงของอุปกรณ์ที่สโคปวัดได้: เซอร์โว, DHT22, HC-SR04, RS-232 (±V), LoRa TXD
    { const attach = (pins, opt) => { const sc = Object.assign(mkComp('scope', 120, -42, Object.assign({n:'OSCT'}, opt)), {id:s.S.nid++}); s.S.comps.push(sc);
        const sp = pinsOf(sc); pins.forEach((q, k) => { if (!q) return; const y = -40 - 2*(k + 1), t = sp[k]; s.S.wires.push({x1:q[0], y1:q[1], x2:q[0], y2:y}, {x1:q[0], y1:y, x2:t[0], y2:y}, {x1:t[0], y1:y, x2:t[0], y2:t[1]}); });
        s.solveNow(); return sc; };
      const pinOf = (n, lab) => pinsOf(s.find(n)).find(q => q[2] === lab);
      const grab = sec => { let cap = null; for (let i = 0; i < sec/0.05 && !(cap && cap.uart); i++){ s.step(0.05); cap = s.scope('OSCT'); } return cap; };
      const e = {};
      s.load('espgarden'); s.run(1); { const sv = s.S.comps.find(c => c.t === 'servo'); attach([pinsOf(sv).find(q => q[2] === 'SIG'), null, pinsOf(sv).find(q => q[2] === 'GND')], {tdiv:0.005, vdiv1:1}); }
      s.run(0.3); let cap = s.scope('OSCT'); e.servo = [cap.ch[0].f, cap.ch[0].duty, +cap.ch[0].max.toFixed(1)];
      s.load('ardsense'); s.run(0.5); { const dht = s.S.comps.find(c => c.t === 'dht'), sr = s.S.comps.find(c => c.t === 'sr04');
        attach([pinsOf(dht)[1], null, pinsOf(dht)[2]], {tdiv:0.001, vdiv1:2, tmode:'norm'}); cap = grab(3); e.dht = cap && cap.uart ? [cap.uart.hex, +cap.ch[0].max.toFixed(1), +cap.ch[0].min.toFixed(1)] : null;
        s.load('ardsense'); s.run(0.5); const sr2 = s.S.comps.find(c => c.t === 'sr04'); attach([pinsOf(sr2)[2], null, pinsOf(sr2)[3]], {tdiv:0.002, vdiv1:2, tmode:'norm'}); cap = grab(3);
        let hi = 0; if (cap && cap.uart) for (let i = 0; i < SC_COLS; i++) if (cap.ch[0].vc[i] > 2.5) hi++; e.echo = cap && cap.uart ? [cap.uart.proto, Math.round(hi/SC_COLS*cap.T*1e6/100)*100] : null; }
      s.load('rs232'); s.run(0.5); attach([pinOf('MD1', 'T1OUT'), null, pinOf('MD1', '⏚')], {tdiv:0.005, vdiv1:5}); cap = grab(3); e.r232 = cap && cap.uart ? [+cap.ch[0].max.toFixed(1), +cap.ch[0].min.toFixed(1)] : null;
      s.load('lora'); s.run(1); attach([pinOf('RF2', 'TXD'), null, pinOf('RF2', 'GND')], {tdiv:0.01, vdiv1:2, tmode:'norm'}); cap = grab(4); e.lora = cap && cap.uart ? [cap.uart.from, +cap.ch[0].max.toFixed(1), +cap.ch[0].min.toFixed(1)] : null;
      o.sigs = e; }
    // โพรบ ×1/×10: ตัวแบ่ง 1 MΩ/1 MΩ จาก 10 V → ×1 (1 MΩ ขนาน) 3.33 V, ×10 (10 MΩ ขนาน) 4.76 V
    // Single: รอทริก (จอว่าง) → กด S1 → จับขั้นบันไดที่ 1 ช่องแล้ว STOP; Normal ในโหมดเลื่อนค้างพัลส์ไว้
    { s.load('oscprobe'); s.run(0.2); const c = s.find('OSC1'), S1 = s.find('S1'); let cp = s.scope('OSC1'); const w0 = [cp.blank, c.run];
      S1._pr = true; s.poke(); s.run(0.2); cp = s.scope('OSC1');
      o.probe = [w0[0], w0[1], cp.trig, c.run, cp.ch[0].vc[200], cp.ch[1].vc[30], cp.ch[1].vc[200]];
      S1._pr = false; s.poke(); c.tmode = 'norm'; c.tdiv = 0.2; c._hist = []; s.scopeArm('OSC1'); s.run(1);
      S1._pr = true; s.poke(); s.run(0.5); S1._pr = false; s.poke(); s.run(2.5); cp = s.scope('OSC1');
      o.norm = [cp.trig, cp.ch[1].mx[30], cp.ch[1].mx[90], cp.ch[1].mx[400]];
      s.load('osc'); s.find('T1').V2 = 230; s.find('T1').S = 2000; s.solveNow(); const wa = warnList().some(x => x[1].includes('เกินพิกัดโพรบ ×1'));
      s.find('OSC1').px1 = 10; s.solveNow(); o.prwarn = [wa, warnList().some(x => x[1].includes('เกินพิกัดโพรบ'))]; }
    s.load('arduino'); s.run(1.2); o.pwmSw = scopeSwitchers().map(x => [x.f, Math.round(x.duty*100)/100]);

    o.mcuErr = ['arduino','esp32','pico','ardsense','espgarden','counter','motor'].map(k => (s.load(k), s.run(0.3), s.find('U1')._vm.err)).filter(Boolean);
    return o;
  });

  const checks = [];
  const near = (name, v, want, tol) => checks.push([name, Math.abs(v - want) <= tol, v]);
  near('series 0.25 A', r.series, 0.25, 0.002);
  near('parallel 1.5 A', r.parallel, 1.5, 0.01);
  near('mixed 54.5 mA', r.mixed, 0.0545, 0.0005);
  near('led 21 mA', r.led, 0.021, 0.0005);
  checks.push(['dol: K1 ดูด', r.dolCoil === true, r.dolCoil]);
  near('dol: กระแสสตาร์ท ≈ 6 × In (15.3 A)', r.dolInrush, 15.3, 0.2);
  for (let k = 0; k < 3; k++) near('dol: กระแสเฟส ' + (k + 1) + ' หลังเร่งเครื่อง 2.55 A', r.dolI[k], 2.55, 0.02);
  checks.push(['dol: ขาดเฟส → _hum', r.dolHum === true, r.dolHum]);
  for (const mode of ['lad', 'txt']){
    const ev = r['pump_' + mode];
    checks.push([`plcpump (${mode}): ปั๊มเริ่มต่ำกว่า 30% และหยุดที่ 90%`,
      ev.length >= 2 && ev[0][0] === 1 && ev[0][1] < 30 && ev[0][1] > 28 && ev[1][0] === 0 && ev[1][1] >= 90 && ev[1][1] < 91, JSON.stringify(ev)]);
    checks.push([`plcpump (${mode}): HMI เชื่อมต่อ PLC`, r['hmi_' + mode], r['hmi_' + mode]]);
  }
  near('arduino: pot 70% → A0 ≈ 716', r.ardA0, 716, 2);
  checks.push(['arduino: LED หรี่ลงเมื่อหมุน pot ลง', r.ardLed > 0.008 && r.ardLedDim > 0 && r.ardLedDim < r.ardLed, r.ardLed.toFixed(4) + ' → ' + r.ardLedDim.toFixed(4)]);
  checks.push(['esp32: กดปุ่ม 1 ครั้ง → LED ติด, นับ 1 ครั้ง', r.espLed && (r.espSerial.match(/กดครั้งที่/g) || []).length === 1, JSON.stringify(r.espSerial)]);
  checks.push(['pico: ไฟแดงติดก่อน (≈3.5 mA) แล้วเปลี่ยนเป็นเขียว', r.picoRed && Math.abs(r.picoRedI - 0.0035) < 0.0003 && r.picoGreen, r.picoRedI]);
  checks.push(['โค้ดตัวอย่างไมโครคอนโทรลเลอร์ทั้งหมดคอมไพล์และรันได้', r.mcuErr.length === 0, r.mcuErr.join(' | ')]);
  checks.push(['ardsense: อ่าน DHT22 / LDR / อัลตราโซนิก', r.senseLine === 'T=25C H=60% แสง=936 ระยะ=100cm PIR=0', r.senseLine]);
  checks.push(['ardsense: วัตถุใกล้ → บัซเซอร์ดัง, PIR ตรวจพบ', r.senseBz && r.sensePir, r.senseBz + ' ' + r.sensePir]);
  checks.push(['espgarden: ดินแห้ง → เซอร์โว 90°, ดินชื้น → 0°', Math.abs(r.servoDry - 90) < 1 && Math.abs(r.servoWet) < 1, r.servoDry + ' → ' + r.servoWet]);
  near('plcsense: ทรานสมิตเตอร์ 40% → AI0 ≈ 40', r.ai0, 40, 0.5);
  checks.push(['plcsense: พร็อกซิมิตี้ → Q0, ลิมิตสวิตช์ตัด, AI0 > 75 → Q2', r.q0off === 0 && r.q0on === 1 && r.q0lim === 0 && r.q2 === 1, [r.q0off, r.q0on, r.q0lim, r.q2].join(',')]);
  near('semi: 7805 จ่าย 5.00 V', r.reg, 5, 0.01);
  near('semi: ซีเนอร์คุม ≈ 5.11 V', r.vz, 5.11, 0.02);
  checks.push(['semi: S1 เปิด → NPN อิ่มตัว, LED ≈ 8.5 mA; S1 ปิด → LED ดับ', r.ledOff < 1e-6 && Math.abs(r.ledOn - 0.00846) < 0.0002 && r.qState === 'sat', r.ledOff + ' / ' + r.ledOn + ' / ' + r.qState]);
  checks.push(['timer555: สลับสถานะ ≈ 1 Hz (8 ครั้งใน 4 s)', r.t555 >= 7 && r.t555 <= 9, r.t555]);
  checks.push(['counter: ผ่านไป 1.5 s แสดงเลข 1 (ส่วน b, c)', r.seg === 'bc', r.seg]);
  checks.push(['motor: กดปุ่ม → MOSFET นำ, กระแสสตาร์ทสูงแล้วลดลงเมื่อหมุน (แรงเคลื่อนย้อนกลับ)', r.motorOff < 1e-6 && r.motorOn > 2*r.motorRun && r.motorRun < 0.15, r.motorOff + ' → ' + r.motorOn.toFixed(3) + ' → ' + r.motorRun.toFixed(3)]);
  near('stardelta: กระแสสตาร์ทแบบสตาร์ ≈ 1/3 ของ DOL (≈ 34 A)', r.sdInrush, 34.4, 1);
  checks.push(['stardelta: ช่วงแรกต่อสตาร์ (K2) กระแส ≈ 4.8 A', r.sdStar[0] === 'Y' && r.sdStar[1] && Math.abs(r.sdStar[2] - 4.81) < 0.1, JSON.stringify(r.sdStar)]);
  checks.push(['stardelta: ครบ 5 s เปลี่ยนเป็นเดลต้า (K3) กระแส ≈ In 14.3 A', r.sdDelta[0] === 'Δ' && r.sdDelta[1] && !r.sdDelta[2] && Math.abs(r.sdDelta[3] - 14.3) < 0.2, JSON.stringify(r.sdDelta)]);
  checks.push(['stardelta: เฟสขาด → คราง แล้วอุปกรณ์ป้องกันตัด', r.sdHum && r.sdProt, r.sdHum + ' ' + r.sdProt]);
  checks.push(['stardelta: กด E-Stop → K1 หลุด', r.estop === false, r.estop]);
  checks.push(['rcdtest: คนแตะสายไฟ → RCD ตัด (ไฟรั่ว) กระแสผ่านตัว ≈ 0', r.rcd0 && r.rcd1[0] === false && r.rcd1[1] === 'rcd' && r.rcd1[2] < 1e-3, JSON.stringify(r.rcd1)]);
  checks.push(['pfc: ต่อคาปาซิเตอร์ PF 0.65 → > 0.95 กระแสลดลง', Math.abs(r.pf0[0] - 0.65) < 0.01 && r.pf1[0] > 0.95 && r.pf1[1] < r.pf0[1], r.pf0.map(x => x.toFixed(3)) + ' → ' + r.pf1.map(x => x.toFixed(3))]);
  checks.push(['stair: สลับสวิตช์ตัวใดก็ได้ → ไฟสลับติด/ดับ', JSON.stringify(r.stair) === '[true,false,true,false]', JSON.stringify(r.stair)]);
  checks.push(['factory: ก่อนกด START สายพานหยุด, กดแล้ววิ่ง, กด STOP แล้วหยุด', r.facIdle === 0 && r.facConv === 1 && r.facStop < 0.05, [r.facIdle, r.facConv, r.facStop].join(' → ')]);
  checks.push(['factory: PLC คัดกล่องโลหะด้วยกระบอกลมครบ ไม่มีคัดผิด/หลุด (60 s)', r.facCnt.metal >= 5 && r.facCnt.other >= 5 && r.facCnt.miss === 0 && r.facCnt.wrong === 0, JSON.stringify(r.facCnt)]);
  checks.push(['seqconv: สายพานปลายทางเริ่มก่อน ต้นทางตามหลัง 3 s', JSON.stringify([r.seq1, r.seq2]) === '[[true,false],[true,true]]', JSON.stringify([r.seq1, r.seq2])]);
  checks.push(['seqconv: กด STOP ต้นทางหยุดทันที ปลายทางหยุดหลัง 4 s', JSON.stringify([r.seq3, r.seq4]) === '[[true,false],[false,false]]', JSON.stringify([r.seq3, r.seq4])]);
  checks.push(['seqconv: กล่องข้ามสายพานลงถังครบ ไม่ตกพื้น', r.seqCnt.metal + r.seqCnt.other >= 8 && r.seqCnt.floor === 0, JSON.stringify(r.seqCnt)]);
  checks.push(['gate: กด OPEN → เปิดสุด ลิมิต SQ1 ตัด K1', r.gate0[0] === 0 && r.gate0[1] === true && r.gate1[0] >= 0.995 && !r.gate1[1] && r.gate1[2] === true, JSON.stringify(r.gate1)]);
  checks.push(['gate: กด STOP กลางทาง → ประตูหยุดนิ่ง', r.gate2[0] > 0.1 && r.gate2[0] < 0.9 && Math.abs(r.gate2[0] - r.gate2[1]) < 0.01 && !r.gate2[2], JSON.stringify(r.gate2)]);
  checks.push(['gate: กด CLOSE → ปิดสนิท ลิมิต SQ2 ตัด K2', r.gate3[0] <= 0.005 && !r.gate3[1] && r.gate3[2] === true, JSON.stringify(r.gate3)]);
  checks.push(['plcpump: มีฉากสถานีสูบน้ำ 3D', r.tankScene === 'tank,pump,cab,station', r.tankScene]);
  checks.push(['จัดวางฉากเอง (สายพาน + ตัวปล่อย + ถัง) ทำงานกับมอเตอร์บนแผง', r.custom.other >= 8 && r.custom.floor === 0, JSON.stringify(r.custom)]);
  checks.push(['pickplace: แขนหยิบวางย้ายกล่องลงถังครบ ไม่ตกพื้น (60 s)', r.pick.metal + r.pick.other >= 10 && r.pick.floor === 0, JSON.stringify(r.pick)]);
  checks.push(['ตัวกั้นชิ้นงาน: ไม่มีไฟ → กล่องต่อคิวรอ, มีไฟ → กล่องไหลลงถัง', r.stopHeld[0] === 0 && r.stopHeld[1] >= 4 && r.stopOpen >= 5, JSON.stringify([r.stopHeld, r.stopOpen])]);
  checks.push(['dol: ฉากพัดลมหมุนตามมอเตอร์บนแผง', r.dolScene === 'fan,cab,station,beacon' && r.fanTurns, r.dolScene]);
  checks.push(['pico: ไฟจราจร 3D ตาม LED บนแผง (แดง → เขียว)', JSON.stringify([r.traffic, r.traffic2]) === '[[true,false],[false,true]]', JSON.stringify([r.traffic, r.traffic2])]);
  checks.push(['lift: เริ่มที่ชั้นล่าง (SQ1) แล้วยกกล่องขึ้นถึงชั้นบน 2 m', r.liftSq[0] === true && r.liftSq[1] === false && r.liftTop > 50 && Math.abs(r.liftMaxY - 2.15) < 0.02, [r.liftTop, r.liftMaxY].join(' / ')]);
  checks.push(['lift: กล่องผ่านลิฟต์ → สายพานชั้นบน → ทางลาด → ถัง ครบ ไม่ตกพื้น (120 s)', r.lift.metal + r.lift.other >= 6 && r.lift.floor === 0, JSON.stringify(r.lift)]);
  checks.push(['หลายระดับ: กล่องตกจากสายพานสูงลงสายพานลาดเอียงด้านล่างแล้วลงถัง', r.cascade.other >= 10 && r.cascade.floor === 0, JSON.stringify(r.cascade)]);
  checks.push(['osc: CH1 ไซน์ 12 Vrms (Vpp ≈ 33.8 V) 50 Hz ทริกได้', Math.abs(r.osc[0] - 33.8) < 0.3 && Math.abs(r.osc[1] - 11.97) < 0.1 && r.osc[2] === 50 && r.osc[7], r.osc.slice(0, 3).map(x => +x.toFixed(2)).join(' / ')]);
  checks.push(['osc: CH2 พัลส์ NE555 0–8.85 V ≈ 687 Hz ดิวตี้ ≈ 52%', Math.abs(r.osc[3] - 8.85) < 0.05 && Math.abs(r.osc[4]) < 0.01 && Math.abs(r.osc[5] - 687) < 1 && Math.abs(r.osc[6] - 0.524) < 0.005, r.osc.slice(3, 7).map(x => +x.toFixed(3)).join(' / ')]);
  checks.push(['osc: AC coupling ตัด DC ออก (ค่าเฉลี่ย ≈ 0)', r.oscAC < 0.05, r.oscAC]);
  checks.push(['osc: Auto Set เลือก 10 V/div, 5 V/div, 5 ms/div ทริก CH1', JSON.stringify(r.oscAuto) === '[10,5,0.005,"1"]', JSON.stringify(r.oscAuto)]);
  checks.push(['osc: โหมดเลื่อน (roll) วัดพัลส์ช้า ≈ 0.69 Hz และแถบไซน์ 33.8 Vpp', r.oscRoll[0] && Math.abs(r.oscRoll[1] - 0.69) < 0.03 && Math.abs(r.oscRoll[2] - 33.8) < 0.3, JSON.stringify(r.oscRoll)]);
  checks.push(['osc: ตรวจพบ PWM ของ Arduino 490 Hz', r.pwmSw.length === 1 && r.pwmSw[0][0] === 490, JSON.stringify(r.pwmSw)]);
  checks.push(['FFT: ไซน์ 50 Hz → ยอดเดียว 50 Hz ≈ 11.97 Vrms, THD ≈ 0', Math.abs(r.fft1[0] - 50) < 0.2 && Math.abs(r.fft1[1] - 11.97) < 0.1 && r.fft1[2] === 1 && r.fft1[3] < 0.01, JSON.stringify(r.fft1)]);
  // คลื่นสี่เหลี่ยม 0–8.85 V ดิวตี้ 0.524: Vn(rms) = 2A/(nπ)·|sin(nπd)|/√2 → H1 3.97, H3 1.29, H5 0.74; DC = A·d = 4.64
  checks.push(['FFT: พัลส์ NE555 → หลัก 687 Hz 3.97 V, H3 1.29 V, H5 0.74 V, DC 4.64 V', Math.abs(r.fft2[0] - 687) < 1 && Math.abs(r.fft2[1] - 3.97) < 0.04 && Math.abs(r.fft2[2] - 1.29) < 0.03 && Math.abs(r.fft2[3] - 0.74) < 0.03 && Math.abs(r.fft2[4] - 4.64) < 0.05 && r.fft2[5] === 10000, JSON.stringify(r.fft2.map(x => +x.toFixed(3)))]);
  checks.push(['XY: วงจร RC ผลต่างเฟส ≈ −46°', Math.abs(r.xy[0] + 46.0) < 0.3 && r.xy[1] > 1000, JSON.stringify(r.xy)]);
  checks.push(['Math CH1−CH2: แรงดันคร่อม R Vpp ≈ 24.4 V, 8.64 Vrms 50 Hz (FFT และโหมดเลื่อนตรงกัน)', Math.abs(r.math[0] - 24.42) < 0.2 && Math.abs(r.math[1] - 8.63) < 0.08 && r.math[2] === 50 && Math.abs(r.math[3] - 50) < 0.2 && Math.abs(r.math[4] - 8.63) < 0.08 && Math.abs(r.math[5] - 24.42) < 0.2, JSON.stringify(r.math.map(x => +x.toFixed(3)))]);
  checks.push(['เคอร์เซอร์: Δt = 20 ms (1/Δt = 50 Hz), แรงดัน A 25 V B 5 V ΔV −20 V', Math.abs(r.cur[0] - 0.02) < 1e-9 && Math.abs(r.cur[1] - 50) < 1e-6 && r.cur[2] === 25 && r.cur[3] === 5 && r.cur[4] === -20, JSON.stringify(r.cur)]);
  checks.push(['โพรบ: ×1 อ่าน 3.33 V (โหลด 1 MΩ), ×10 อ่าน 4.76 V; Single รอทริกแล้วจับขั้นบันได + STOP', r.probe[0] === true && r.probe[1] === true && r.probe[2] && r.probe[3] === false && Math.abs(r.probe[4] - 3.33) < 0.02 && Math.abs(r.probe[5]) < 0.05 && Math.abs(r.probe[6] - 4.75) < 0.03, JSON.stringify(r.probe)]);
  checks.push(['ทริก Normal (โหมดเลื่อน): ค้างพัลส์ 0.5 s ที่ 1 ช่องจากซ้าย', r.norm[0] && r.norm[1] < 0.05 && Math.abs(r.norm[2] - 4.75) < 0.03 && r.norm[3] < 0.05, JSON.stringify(r.norm)]);
  checks.push(['โพรบ: วัด 322 Vpk ด้วย ×1 เตือนเกินพิกัด, ×10 ไม่เตือน', r.prwarn[0] && !r.prwarn[1], JSON.stringify(r.prwarn)]);
  // ลาก/หมุนอุปกรณ์ด้วยเมาส์จริง: สายไฟตามไป วงจรยังต่ออยู่ · Alt+ลาก = ถอดสาย · ขั้วชนกันตรง ๆ ได้สายเชื่อมอัตโนมัติ
  await page.setViewportSize({width:1400, height:900});
  await page.evaluate(() => window.__sim.load('series')); await page.waitForTimeout(200);
  const g2c = (gx, gy) => page.evaluate(([gx, gy]) => { const cv = document.querySelector('canvas'), q = cv.getBoundingClientRect();
    const a = s2g({clientX:q.left, clientY:q.top}), b = s2g({clientX:q.left + 100, clientY:q.top + 100});
    return [q.left + (gx - a[0])*100/(b[0] - a[0]), q.top + (gy - a[1])*100/(b[1] - a[1])]; }, [gx, gy]);
  const IA = () => page.evaluate(() => { window.__sim.solveNow(); return window.__sim.RES.comp[window.__sim.find('A1').id].Ir; });
  const dragTo = async (a, b, alt) => { const [x, y] = await g2c(...a), [x2, y2] = await g2c(...b); if (alt) await page.keyboard.down('Alt');
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x2, y2, {steps:5}); await page.mouse.up(); if (alt) await page.keyboard.up('Alt'); };
  const mv = [];
  await dragTo([5, 2], [5, 4]); mv.push(await IA());
  { const [x, y] = await g2c(9, 2); await page.mouse.click(x, y); await page.keyboard.press('r'); } mv.push(await IA());
  await dragTo([9, 2], [9, 8], true); mv.push(await IA());
  await page.keyboard.press('Control+z'); mv.push(await IA());
  mv.push(await page.evaluate(() => { const s = window.__sim;
    s.load({comps:[{id:1, t:'bat', x:2, y:3, r:1, V:10, n:'B1'}, {id:2, t:'res', x:3, y:2, R:10, n:'R1'}, {id:3, t:'res', x:3, y:4, R:10, n:'R2'}], wires:[{x1:4, y1:2, x2:4, y2:4}], nid:4});
    const c = s.find('R1'), F = followInit(c); c.x = 5; c.y = 0; followApply(c, F); s.solveNow(); return s.RES.comp[2].Ir; }));
  mv.push(await page.evaluate(() => { view.z = 0.4; setPinTol({pointerType:'mouse'}); const h = hitPin(2.35, 2); view.z = 1; return !!h && h.x === 2; }));
  checks.push(['ย้าย/หมุนอุปกรณ์ สายไฟตามไป (0.25 A คงเดิม), Alt+ลาก ถอดสาย, ย้อนกลับได้, ขั้วชนกันได้สายเชื่อม, ซูมออกยังจับขั้วได้',
    Math.abs(mv[0] - 0.25) < 0.002 && Math.abs(mv[1] - 0.25) < 0.002 && mv[2] < 1e-3 && Math.abs(mv[3] - 0.25) < 0.002 && Math.abs(mv[4] - 0.5) < 0.002 && mv[5] === true, JSON.stringify(mv.map(v => typeof v === 'number' ? +v.toFixed(4) : v))]);
  // ลากสายผ่านมุม/จุดต่อของสายอื่นกลางเส้น → ไม่ต่อกัน; ปลายสายตกกลางสายอื่น → ต่อ (T)
  // วงจร: B1 10 V → R1 100 Ω ปิดวงจรเอง และสายแนวตั้งของ B2 มีจุดหักที่ y = 6 — สายใหม่แนวนอน y = 6 ผ่านทั้งสองจุดหัก
  await page.evaluate(() => { window.__sim.load({comps:[{id:1, t:'bat', x:4, y:3, r:1, V:10, n:'B1'}, {id:2, t:'res', x:4, y:9, r:1, R:100, Pr:5, n:'R1'}, {id:3, t:'bat', x:8, y:3, r:1, V:5, n:'B2'}, {id:4, t:'res', x:8, y:9, r:1, R:100, Pr:5, n:'R2'}],
    wires:[{x1:4, y1:4, x2:4, y2:6}, {x1:4, y1:6, x2:4, y2:8}, {x1:8, y1:4, x2:8, y2:6}, {x1:8, y1:6, x2:8, y2:8}, {x1:4, y1:10, x2:4, y2:12}, {x1:4, y1:12, x2:3, y2:12}, {x1:3, y1:12, x2:3, y2:2}, {x1:3, y1:2, x2:4, y2:2},
      {x1:8, y1:10, x2:8, y2:12}, {x1:8, y1:12, x2:9, y2:12}, {x1:9, y1:12, x2:9, y2:2}, {x1:9, y1:2, x2:8, y2:2}], nid:5}); });
  await page.waitForTimeout(100);
  const IR = () => page.evaluate(() => { window.__sim.solveNow(); const R = window.__sim.RES.comp; return [R[2].Ir, R[4].Ir]; });
  const cr = [await IR()];
  await page.keyboard.press('w'); await dragTo([2, 6], [10, 6]); cr.push(await IR());
  cr.push(await page.evaluate(() => window.__sim.S.wires.filter(w => w.y1 === 6 && w.y2 === 6).length));
  await dragTo([6, 1], [6, 6]); cr.push(await page.evaluate(() => window.__sim.S.wires.filter(w => w.y1 === 6 && w.y2 === 6).length));
  await page.keyboard.press('Escape');
  checks.push(['ลากสายผ่านจุดหักของสายอื่นไม่ต่อกัน (กระแส R1/R2 เท่าเดิม), ปลายสายตกกลางสาย → แยกเป็นจุดต่อ T',
    Math.abs(cr[0][0] - 0.1) < 0.002 && Math.abs(cr[0][1] - 0.05) < 0.002 && Math.abs(cr[1][0] - 0.1) < 0.002 && Math.abs(cr[1][1] - 0.05) < 0.002 && cr[2] === 1 && cr[3] === 2, JSON.stringify(cr)]);
  for (const md of ['lad', 'txt']){ const e = r['elev_' + md];
    checks.push([`ลิฟต์ 3 ชั้น (${md === 'lad' ? 'แลดเดอร์' : 'ข้อความ'}): ขึ้นไปชั้น 3 แวะชั้น 2 ที่เรียกระหว่างทาง (ประตูเปิด) แล้วลงชั้น 1`,
      e[0] && Math.abs(e[1] - 1.5) < 0.07 && e[2] && e[3] && e[4] && Math.abs(e[5] - 3) < 0.07 && e[6] && Math.abs(e[7]) < 0.07 && e[8] && e[9], JSON.stringify(e.map(v => typeof v === 'number' ? +v.toFixed(2) : v))]); }
  for (const md of ['lad', 'txt']) checks.push([`เซนเซอร์อุตสาหกรรม (${md === 'lad' ? 'แลดเดอร์' : 'ข้อความ'}): โฟลว์/ความดัน (ดิฟเฟอเรนเชียล)/ม่านแสง/แก๊ส/อัลตราโซนิก/เทอร์โมสตัท/คาปาซิทีฟ`,
    JSON.stringify(r['ind_' + md]) === JSON.stringify(['1011','1011','1111','0011','0011','1011','0100','0101','1010','1001','1000']), JSON.stringify(r['ind_' + md])]);
  checks.push(['RS-485 (MAX485): มาสเตอร์ส่ง P=60 → สเลฟรับ, หมุน pot 20% → LED หรี่ลง, บอดไม่ตรง → อ่านไม่ออก',
    r.c485[0] === null && r.c485[1] && r.c485[3] && r.c485[4] < r.c485[2] && !r.c485[5], JSON.stringify(r.c485)]);
  checks.push(['LoRa (E32): 1.5 km รับได้ (RSSI ≈ −110 dBm), 9 km ที่ SF9 ขาด, เปลี่ยนเป็น SF12 → รับได้อีกครั้ง',
    JSON.stringify(r.clora) === JSON.stringify([true, true, -110, true, false, true, true]), JSON.stringify(r.clora)]);
  checks.push(['RS-232 (MAX3232): บอร์ดทักทายเทอร์มินัล, สั่ง ON/OFF ได้, บอดเทอร์มินัลไม่ตรง → คำสั่งไม่ผ่าน',
    JSON.stringify(r.c232) === JSON.stringify([true, 1, true, 0, 0]), JSON.stringify(r.c232)]);
  for (const md of ['lad', 'txt']){ const e = r['mb_' + md];
    checks.push([`Modbus RTU (${md === 'lad' ? 'แลดเดอร์' : 'ข้อความ'}): PLC อ่าน pot 75% → D0 = 767, H1 + coil 0 ติด, D8 → PWM; pot 30% → D0 = 307 ดับ + LED หรี่; ปุ่ม → coil 1; บอดสเลฟไม่ตรง → CRC ผิด/timeout`,
      e[0] === 767 && e[1] === 767 && e[2] && e[3] && e[5] === 307 && e[6] && e[7] && e[8] && e[9] && e[10] && e[11] && e[12], JSON.stringify(e)]); }
  checks.push(['PLC: D3 := (AI0 + 10)*2 − D1/4 = 60, Q0 := D3 >= 60 · CRC Modbus ของ 01 03 00 00 00 01 = 84 0A',
    JSON.stringify(r.mbexpr) === '[0,60,1]' && r.crc === '01 03 00 00 00 01 84 0A', JSON.stringify([r.mbexpr, r.crc])]);
  for (const md of ['lad', 'txt']) checks.push([`HMI ↔ PLC Modbus RTU (${md === 'lad' ? 'แลดเดอร์' : 'ข้อความ'}): อ่านไฟ/ค่า D5 = 1234, START → M2 = 1, STOP → M2 = 0, ID ผิด → timeout + เตือน`,
    JSON.stringify(r['hmb_' + md]) === JSON.stringify([true, 1, 1234, 1, 1, 0, 0, true, true]), JSON.stringify(r['hmb_' + md])]);
  checks.push(['PLC สเลฟ: อ่านคอยล์ 40 → ข้อยกเว้น 02 (0x81), เขียน holding 3 = 500 → D3', JSON.stringify(r.mbex) === '[2,129,0,500]', JSON.stringify(r.mbex)]);
  for (const md of ['lad', 'txt']) checks.push([`PLC 2 พอร์ต (${md === 'lad' ? 'แลดเดอร์' : 'ข้อความ'}): #1 มาสเตอร์อ่าน Arduino + #2 สเลฟให้ HMI พร้อมกัน, ปุ่ม HMI → LED Arduino, บอดพอร์ต #2 ผิด → HMI timeout แต่ #1 ยังปกติ`,
    JSON.stringify(r['p2_' + md]) === JSON.stringify([767, true, true, 767, 1, 1, true, true, 307, 0, true, true]), JSON.stringify(r['p2_' + md])]);
  for (const md of ['lad', 'txt']) checks.push([`Modbus TCP (${md === 'lad' ? 'แลดเดอร์' : 'ข้อความ'}): S1 ที่ PLC2 → H1 ที่ PLC1, ตัวนับ D0 ถึง HMI, ปุ่ม HMI → PLC1 → PLC2 ไฟ H2, ซับเน็ตผิด/IP ซ้ำ/ไม่มีลิงก์ แจ้งเตือน`,
    JSON.stringify(r['tcp_' + md]) === JSON.stringify([0, true, true, 1, 1, 1, 1, 0, true, true, true]), JSON.stringify(r['tcp_' + md])]);
  checks.push(['Modbus TCP: MBAP ของ TID 7 อ่าน holding 0–3 = 00 07 00 00 00 06 01 03 00 00 00 04', r.mbap === '00 07 00 00 00 06 01 03 00 00 00 04', r.mbap]);
  checks.push(['บัส RS-485 วัดแรงดันได้: ว่าง A−B ≈ 0.21 V (ไบแอส 680 Ω), A−GND ≈ 2.6 V; ขณะส่ง A−B ≈ 2.8 V',
    r.busV[0] && r.busV[1] && Math.abs(r.busV[0][0] - 0.21) < 0.05 && Math.abs(r.busV[0][1] - 2.6) < 0.2 && r.busV[1][0] > 2, JSON.stringify(r.busV)]);
  checks.push(['ESP32 Wi-Fi + Modbus TCP: ได้ IP/RSSI −55, pot 30% → D10 ≈ 1228, 90% → H1 + LED บอร์ด, ปุ่ม → M5, ไกล 500 m → หลุด, กลับ 15 m → ต่อใหม่, รหัสผิด → WL_CONNECT_FAILED',
    JSON.stringify(r.wifi_txt) === JSON.stringify([null, true, true, 0, true, 1, 1, 1, 1, 0, 6, true, 3, true, 4, 'รหัสผ่าน Wi-Fi ไม่ถูกต้อง']), JSON.stringify(r.wifi_txt)]);
  checks.push(['ESP32 Wi-Fi + Modbus TCP (PLC แบบแลดเดอร์): ผลเหมือนกัน', JSON.stringify(r.wifi_lad) === JSON.stringify(r.wifi_txt.slice(0, 14)), JSON.stringify(r.wifi_lad)]);
  checks.push(['สโคปจับเฟรม UART บนบัส RS-485: ถอดรหัส "P=60⏎" (50 3D 36 30 0A), บิต 104 µs, A/B สลับกัน, Auto Set → 1 ms/div',
    JSON.stringify(r.sbus) === JSON.stringify(['P=60⏎', '50 3D 36 30 0A', 104, true, true, true, 0.001]), JSON.stringify(r.sbus)]);
  checks.push(['สโคปวัดสัญญาณจริง: เซอร์โว 50 Hz ดิวตี้ 7.5% 3.3 V · DHT22 02 58 00 FA 54 (0–5 V) · ECHO HC-SR04 ≈ 5800 µs (100 cm) · RS-232 ±5.1 V · LoRa TXD 0–3.3 V',
    JSON.stringify(r.sigs) === JSON.stringify({servo:[50, 0.075, 3.3], dht:['02 58 00 FA 54', 4.9, 0], echo:['HC-SR04 ECHO', 5800], r232:[5.1, -5.1], lora:['RF2', 3.3, 0]}), JSON.stringify(r.sigs)]);
  const tr = await page.evaluate(() => { const s = __sim, o = {}, R = n => s.RES.comp[s.find(n).id];
    s.load('rectifier'); s.run(1); let cap = s.scope('OSC1');
    o.rect = [s.RES.trans, R('V1').v.d, cap.ch[1].max - cap.ch[1].min, cap.ch[1].f, s.find('D1')._on];
    s.find('S1').on = false; s.run(0.5); cap = s.scope('OSC1'); o.nocap = [R('V1').v.d, cap.ch[0].max, cap.ch[0].min];
    s.load('halfwave'); s.run(0.5); cap = s.scope('OSC1'); o.half = [cap.ch[1].max, cap.ch[1].min, R('RL').v.d];
    s.find('S1').on = true; s.run(1); cap = s.scope('OSC1'); o.half2 = [cap.ch[1].max, cap.ch[1].min];
    s.load('rccharge'); s.run(1); const c1 = s.find('C1'); s.find('S1').pos = 'A'; s.run(4.7); o.rc1 = c1._vc; s.run(20); s.find('S1').pos = 'B'; s.run(4.7); o.rc3 = c1._vc;
    return o; });
  const nr = (a, b, e) => Math.abs(a - b) <= e;
  checks.push(['เรียงกระแสเต็มคลื่น (จำลองตามเวลา): C 1000 µF → V1 ≈ 14.36 V DC, ริปเปิล ≈ 1.27 Vpp ที่ 100 Hz, LED ติด',
    tr.rect[0] && nr(tr.rect[1], 14.36, 0.1) && nr(tr.rect[2], 1.27, 0.1) && nr(tr.rect[3], 100, 2) && tr.rect[4], JSON.stringify(tr.rect)]);
  checks.push(['เรียงกระแสเต็มคลื่น ไม่มี C: เฉลี่ย ≈ 9.0 V, ไฟกระเพื่อม 0–15 V',
    nr(tr.nocap[0], 9.03, 0.15) && nr(tr.nocap[1], 15.1, 0.3) && tr.nocap[2] < 0.3, JSON.stringify(tr.nocap)]);
  checks.push(['เรียงกระแสครึ่งคลื่น: 0–16.3 V เฉลี่ย ≈ 5.06 V; ใส่ C 470 µF → 15.6–16.3 V',
    nr(tr.half[0], 16.27, 0.2) && tr.half[1] < 0.3 && nr(tr.half[2], 5.06, 0.15) && nr(tr.half2[0], 16.27, 0.2) && nr(tr.half2[1], 15.63, 0.2), JSON.stringify([tr.half, tr.half2])]);
  checks.push(['RC ชาร์จ/ดิสชาร์จ (τ = 4.7 s): ชาร์จ τ → ≈ 5.66 V, คายประจุ τ → ≈ 3.22 V',
    nr(tr.rc1, 5.66, 0.1) && nr(tr.rc3, 3.22, 0.1), JSON.stringify([tr.rc1, tr.rc3])]);
  const lg = await page.evaluate(() => { const s = __sim, o = {}, R = n => s.RES.comp[s.find(n).id];
    s.load('logic'); s.run(0.2); o.tt = [];
    for (const [a, b] of [[0,0],[0,1],[1,0],[1,1]]){ s.find('S1').on = !!a; s.find('S2').on = !!b; s.poke(); s.run(0.1);
      o.tt.push(['U1','U2','U3','U4'].map(n => s.find(n)._q | 0).join('') + '/' + ['D1','D2','D3','D4'].map(n => s.find(n)._on ? 1 : 0).join('')); }
    s.load('flipflop'); s.run(1); let ck = s.find('U1')._q | 0, q = s.find('U2')._q | 0, rise = 0, tog = 0;
    for (let k = 0; k < 120; k++){ s.run(0.05); const c2 = s.find('U1')._q | 0, q2 = s.find('U2')._q | 0; if (c2 && !ck) rise++; if (q2 !== q) tog++; ck = c2; q = q2; }
    o.ff = [s.RES.trans, rise, tog];
    s.load('opamp'); s.run(0.3); const tr0 = s.RES.trans; let cap = s.scope('OSC1'); o.op = [tr0, cap.ch[1].max, cap.ch[1].min, cap.ch[1].f];
    s.find('Vs').V = 1.5; s.poke(); s.run(0.3); cap = s.scope('OSC1'); o.clip = [cap.ch[1].max, cap.ch[1].min, s.find('U1')._os];
    s.load('opamposc'); s.run(1.5); let st = s.find('U1')._os === 'hi', sw = [];
    for (let k = 0; k < 120; k++){ s.run(0.05); const n2 = s.find("U1")._os === "hi"; if (n2 && !st) sw.push(k*0.05); st = n2; }   // ขอบขึ้นของขาออก
    cap = s.scope('OSC1'); o.osc = [sw.length, sw.length > 1 ? (sw[sw.length - 1] - sw[0])/(sw.length - 1) : 0, cap.ch[0].max, cap.ch[0].min];
    // DC: ขยายไม่กลับเฟส ×11 และชมิตต์ทริกเกอร์ (ไม่มีตัวเก็บประจุ → solver ปกติ)
    const base = (C, W) => { C('bat',2,6,{r:1,n:'B1',V:12}); W([2,5],[2,1],[15,1]); W([2,7],[2,13],[22,13]);
      C('opamp',14,6,{n:'U1',A:100000,gbw:1,ro:75,hd:1.5,ld:0.02,iq:0.5,vmin:3,vmax:32,isc:40,oc:false}); W([14,4],[15,4],[15,1]); W([14,8],[14,13]); };
    s.load(build((C, W) => { base(C, W); C('pot',8,9,{n:'RV1',R:10000,pos:95}); W([7,8],[7,1]); W([9,8],[9,13]); W([8,8],[8,7],[12,7]);
      W([12,5],[11,5],[11,2],[12,2]); C('res',13,2,{n:'Rf',R:100000}); W([14,2],[17,2],[17,6]); W([16,6],[17,6],[20,6]);
      W([11,5],[10,5],[10,10]); C('res',10,11,{r:1,n:'R1',R:10000}); W([10,12],[10,13]);
      C('vm',20,9,{r:1,n:'V1'}); W([20,6],[20,8]); W([20,10],[20,13]); }));
    s.run(0.1); o.ni = [s.RES.trans, R('V1').v.d];
    s.load(build((C, W) => { base(C, W); C('pot',8,9,{n:'RV1',R:10000,pos:30}); W([7,8],[7,1]); W([9,8],[9,13]); W([8,8],[8,5],[12,5]);
      C('res',10,3,{r:1,n:'Ra',R:10000}); W([10,2],[10,1]); W([10,4],[10,7],[12,7]);
      C('res',11,10,{r:1,n:'Rb',R:10000}); W([11,9],[11,7]); W([11,11],[11,13]);
      C('res',17,9,{n:'Rh',R:100000}); W([16,9],[11,9]); W([18,9],[18,6]); W([16,6],[22,6]);
      C('vm',22,9,{r:1,n:'V1'}); W([22,6],[22,8]); W([22,10],[22,13]); }));
    o.sch = []; for (const pos of [30, 52, 56, 52, 45]){ s.find('RV1').pos = pos; s.poke(); s.run(0.1); o.sch.push(Math.round(R('V1').v.d)); }
    return o; });
  checks.push(['ลอจิกเกต (74HC): AND/OR/XOR/NOT ตามตารางความจริง และ LED ตรงกับขาออก',
    JSON.stringify(lg.tt) === JSON.stringify(['0001/0001','0111/0111','0110/0110','1100/1100']), JSON.stringify(lg.tt)]);
  checks.push(['74HC14 ออสซิลเลเตอร์ RC + D ฟลิปฟล็อป: Q สลับทุกขอบขาขึ้นของ CLK (หาร 2), ≈ 1 Hz',
    lg.ff[0] && lg.ff[1] >= 5 && lg.ff[1] <= 7 && lg.ff[2] === lg.ff[1], JSON.stringify(lg.ff)]);
  checks.push(['ออปแอมป์ขยายกลับเฟส ×10: 0.5 V RMS → ±7.07 V 1 kHz; 1.5 V RMS → ตัดยอด ±9.9 V',
    lg.op[0] && nr(lg.op[1], 7.07, 0.1) && nr(lg.op[2], -7.07, 0.1) && nr(lg.op[3], 1000, 20) && nr(lg.clip[0], 9.92, 0.1) && nr(lg.clip[1], -9.92, 0.1), JSON.stringify([lg.op, lg.clip])]);
  checks.push(['ออปแอมป์ออสซิลเลเตอร์ (ชมิตต์ + RC): คาบ ≈ 2.2RC ≈ 1.03 s, ตัวเก็บประจุแกว่ง ±3.5 V',
    lg.osc[0] >= 4 && nr(lg.osc[1], 1.03, 0.12) && nr(lg.osc[2], 3.54, 0.15) && nr(lg.osc[3], -3.54, 0.15), JSON.stringify(lg.osc)]);
  checks.push(['ออปแอมป์ (solver DC): ขยายไม่กลับเฟส ×11 (0.6 V → 6.6 V) · ชมิตต์ทริกเกอร์มีฮิสเทอรีซิส 52% ค้างค่าเดิม',
    !lg.ni[0] && nr(lg.ni[1], 6.6, 0.05) && JSON.stringify(lg.sch) === '[0,0,10,10,0]', JSON.stringify([lg.ni, lg.sch])]);
  const ic = await page.evaluate(() => { const s = __sim, o = {}, R = n => s.RES.comp[s.find(n).id];
    s.load('chaser'); s.run(0.3); const seq = []; let okLed = true;
    for (let k = 0; k < 60; k++){ s.run(0.1); const n = s.find('U2')._cnt | 0; seq.push(n);
      for (let i = 0; i < 10; i++) if (!!s.find('D' + (i + 1))._on !== (i === n)) okLed = false; }
    o.chase = [Math.max(...seq), seq.some((v, i) => i && v === 0 && seq[i - 1] === 9), okLed, warnList().length];
    s.load('cnt7seg'); s.run(0.3); const SEG = [0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7C, 0x07, 0x7F, 0x67]; let okSeg = true, wrap = false, prev = -1;
    for (let k = 0; k < 24; k++){ s.run(0.5); const n = s.find('U2')._cnt | 0, js = s.find('DS1')._js || [];
      for (let i = 0; i < 7; i++) if (!!js[i] !== !!((SEG[n] >> i) & 1)) okSeg = false; if (prev === 9 && n === 0) wrap = true; prev = n; }
    o.c7 = [okSeg, wrap, warnList().length];
    s.load('shift595'); s.run(0.2); o.sh = [];
    for (let k = 0; k < 6; k++){ s.run(0.5); o.sh.push((s.find('U2')._lt | 0) + '/' + [7,6,5,4,3,2,1,0].map(i => s.find('D' + (i + 1))._on ? 1 : 0).join('')); }
    s.load('lm317'); s.run(0.2); o.lm = [R('V1').v.d]; s.find('RV1').pos = 60; s.poke(); s.run(0.2); o.lm.push(R('V1').v.d);
    s.find('RV1').pos = 100; s.poke(); s.run(0.3); o.lm.push(R('V1').v.d, s.find('U1')._rs); s.find('B1').V = 0; s.poke(); s.run(0.3); o.lm.push(R('V1').v.d);
    s.load('tempalarm'); s.run(0.2); o.ta = [R('V1').v.d, !!s.find('D1')._on]; s.find('U1').temp = 35; s.poke(); s.run(0.2); o.ta.push(R('V1').v.d, !!s.find('D1')._on);
    return o; });
  checks.push(['CD4017 ไฟวิ่ง: นับ 0→9 แล้ววนกลับ, LED ติดทีละดวงตรงกับค่านับ, ไม่มีคำเตือน',
    ic.chase[0] === 9 && ic.chase[1] && ic.chase[2] && ic.chase[3] === 0, JSON.stringify(ic.chase)]);
  checks.push(['CD4518 → CD4511 → 7 ส่วน: ทุกค่านับแสดงส่วน a–g ถูกต้อง (6/9 ไม่มีหาง) และ 9 → 0',
    ic.c7[0] && ic.c7[1] && ic.c7[2] === 0, JSON.stringify(ic.c7)]);
  checks.push(['Arduino shiftOut → 74HC595: ตัวจับ = 1, 2, 3… และ LED Q7…Q0 ตรงกับเลขฐานสอง',
    JSON.stringify(ic.sh) === JSON.stringify(['1/00000001','2/00000010','3/00000011','4/00000100','5/00000101','6/00000110']), JSON.stringify(ic.sh)]);
  checks.push(['LM317: R2 = 730 Ω → 5.08 V, 1530 Ω → 9.26 V, 2330 Ω → dropout 13.0 V (15 − 2), ไม่มีไฟเข้า → 0 V',
    nr(ic.lm[0], 5.08, 0.03) && nr(ic.lm[1], 9.26, 0.05) && nr(ic.lm[2], 13.0, 0.05) && ic.lm[3] === 'do' && Math.abs(ic.lm[4]) < 0.05, JSON.stringify(ic.lm)]);
  checks.push(['LM35 + คอมพาราเตอร์: 25 °C → 0.25 V LED ดับ, 35 °C → 0.35 V LED ติด',
    nr(ic.ta[0], 0.25, 0.005) && !ic.ta[1] && nr(ic.ta[2], 0.35, 0.005) && ic.ta[3], JSON.stringify(ic.ta)]);
  const sp = await page.evaluate(() => { const s = __sim, o = {};
    // RC low-pass: −3 dB = 1/(2πRC) = 159.2 Hz, เฟส −45°
    s.load(build((C,W) => { C('fgen',3,6,{n:'FG1',f:100,vpp:2,zo:0.05}); W([4,7],[4,9]); W([2,7],[2,3],[6,3]); C('res',7,3,{n:'R1',R:1000}); W([8,3],[10,3],[10,5]); C('cap',10,6,{r:1,n:'C1',C:1}); W([10,7],[10,9],[4,9]); C('gnd',4,9,{}); }));
    let a = s.spRun({kind:'ac', src:'FG1', from:10, to:1e5, ppd:200, probes:['V(C1)']}); const i3 = a.mag[0].findIndex(v => 20*Math.log10(v) < -3);
    o.rc = [a.xs[i3], a.ph[0][i3]];
    let t = s.spRun({kind:'tran', tstop:0.05, tstep:1e-5, probes:['V(C1)']}); o.rct = [t.meas[0].pp, t.meas[0].f];
    // คลื่นสี่เหลี่ยม: H3/H1 = 1/3, THD = 48.3%
    s.find('FG1').wave = 'square'; s.find('FG1').f = 1000; t = s.spRun({kind:'four', tstop:0.01, tstep:2e-6, probes:['V(R1)'], f0:1000, nh:9}); const F4 = t.four[0];
    o.sq = [F4.H[3].amp/F4.H[1].amp, F4.H[2].amp/F4.H[1].amp, F4.thd];
    // ไดโอด 1N4007: Vf ที่ ≈ 42 mA, สัมประสิทธิ์อุณหภูมิติดลบ
    s.load(build((C,W) => { C('bat',2,5,{r:1,n:'B1',V:5}); C('res',5,3,{n:'R1',R:100}); C('diode',8,5,{r:1,n:'D1',Vf:0.7,N:1.8,Rs:0.034,Cj:15,TT:4300,BV:1000}); W([2,4],[2,3],[4,3]); W([6,3],[8,3],[8,4]); W([8,6],[8,7],[2,7],[2,6]); }));
    const d = s.spRun({kind:'dc', param:'temp', from:27, to:127, pts:2, probes:['V(D1)', 'I(D1)']}); o.dio = [d.ys[0][0], d.ys[1][0], (d.ys[0][1] - d.ys[0][0])/100];
    // วงจรขยายอีมิตเตอร์ร่วม
    s.load('ceamp'); o.net = s.spNetlist(); const op = s.spRun({kind:'op'}); const q = op.net.comp.get(s.find('Q1')); o.ce = [op.op.ok, q.ic, q.vbc < 0];
    a = s.spRun({kind:'ac', src:'FG1', from:10, to:1e7, ppd:20, probes:['V(RL)']}); o.ceg = Math.max(...a.mag[0].map(v => 20*Math.log10(v)));
    t = s.spRun({kind:'four', tstop:0.01, tstep:2e-6, probes:['V(RL)'], f0:1000, nh:5}); o.cethd = t.four[0].thd;
    // ออปแอมป์ ×−10: −3 dB ≈ GBW/11, ชั่วคราว ±7.07 V, ตัดยอด ±9.92 V
    s.load('opamp'); a = s.spRun({kind:'ac', src:'Vs', from:100, to:1e7, ppd:100, probes:['V(RL)']}); const m = a.mag[0].map(v => 20*Math.log10(v)); o.oa = [m[0], a.xs[m.findIndex(v => v < m[0] - 3)], a.ph[0][0]];
    t = s.spRun({kind:'tran', tstop:0.005, tstep:2e-6, probes:['V(RL)']}); o.oat = [t.meas[0].max, t.meas[0].min];
    // เรียงกระแส (ไดโอดแบบ Shockley + หม้อแปลงมีความเหนี่ยวนำแม่เหล็ก)
    s.load('rectifier'); t = s.spRun({kind:'tran', tstop:0.3, tstep:5e-5, probes:['V(V1)']}); o.rect = [t.meas[0].avg, t.meas[0].pp, t.meas[0].f, t.msg.length];
    o.ex = []; for (const k of Object.keys(s.EX)){ try { s.load(k); if (!s.spRun({kind:'op'}).op.ok) o.ex.push(k); } catch (e){ o.ex.push(k + ':' + e.message); } }
    return o; });
  checks.push(['SPICE AC: RC low-pass −3 dB ≈ 159 Hz เฟส −45° · ชั่วคราว 100 Hz → 1.69 Vpp',
    nr(sp.rc[0], 159.2, 1.5) && nr(sp.rc[1], -45, 1.5) && nr(sp.rct[0], 1.693, 0.01) && nr(sp.rct[1], 100, 0.5), JSON.stringify([sp.rc, sp.rct])]);
  checks.push(['SPICE ฟูเรียร์: คลื่นสี่เหลี่ยม H3/H1 = 1/3, ไม่มีฮาร์มอนิกคู่, THD (ถึง H9) ≈ 42.9%',
    nr(sp.sq[0], 0.3333, 0.01) && sp.sq[1] < 0.01 && nr(sp.sq[2], 42.9, 1.5), JSON.stringify(sp.sq)]);
  checks.push(['SPICE ไดโอด Shockley: 1N4007 ≈ 0.77 V ที่ 42 mA, อุณหภูมิเพิ่ม → Vf ลด (−1 ถึง −2.5 mV/°C)',
    nr(sp.dio[0], 0.768, 0.02) && nr(sp.dio[1], 0.0423, 0.002) && sp.dio[2] < -1e-3 && sp.dio[2] > -2.5e-3, JSON.stringify(sp.dio)]);
  checks.push(['SPICE BJT: วงจรขยายอีมิตเตอร์ร่วม Ic ≈ 2.6 mA ย่านแอคทีฟ, อัตราขยาย ≈ 44 dB, THD > 3% (ความไม่เชิงเส้นจริงของ BJT)',
    sp.ce[0] && nr(sp.ce[1], 2.6e-3, 0.2e-3) && sp.ce[2] && nr(sp.ceg, 44, 2) && sp.cethd > 3, JSON.stringify([sp.ce, sp.ceg, sp.cethd])]);
  checks.push(['SPICE ออปแอมป์: 20 dB เฟส 180°, −3 dB ≈ GBW/11 ≈ 90 kHz, ชั่วคราว ±7.07 V',
    nr(sp.oa[0], 20, 0.05) && nr(sp.oa[1], 90900, 4000) && nr(Math.abs(sp.oa[2]), 180, 1) && nr(sp.oat[0], 7.07, 0.03) && nr(sp.oat[1], -7.07, 0.03), JSON.stringify([sp.oa, sp.oat])]);
  checks.push(['SPICE ชั่วคราว: เรียงกระแสเต็มคลื่น ≈ 14.4 V ริปเปิล ≈ 1.24 Vpp ที่ 100 Hz',
    nr(sp.rect[0], 14.4, 0.25) && nr(sp.rect[1], 1.24, 0.15) && nr(sp.rect[2], 100, 1) && sp.rect[3] === 0, JSON.stringify(sp.rect)]);
  checks.push(['SPICE: netlist มี .model + แหล่ง SIN และทุกตัวอย่างหาจุดทำงาน DC ได้',
    /\.model .*NPN/.test(sp.net) && /SIN\(/.test(sp.net) && sp.ex.length === 0, JSON.stringify(sp.ex)]);
  const sc2 = await page.evaluate(() => { const s = __sim, o = {};
    s.load('ceamp'); s.run(1); let cap = s.scope('OSC1'); o.ce = [cap.ch[0].max - cap.ch[0].min, cap.ch[1].max - cap.ch[1].min];
    s.load('opamposc'); s.run(3); const h = s.find('OSC1')._hist.filter(e => e.t > 1.5); let mx = 0; for (let i = 1; i < h.length; i++) mx = Math.max(mx, Math.abs(h[i].d[0] - h[i - 1].d[0]));
    o.roll = [h.length, mx];
    s.load(build((C,W) => { C('fgen',3,6,{n:'FG1',wave:'square',f:1000,vpp:4,zo:50}); W([4,7],[4,10]); W([2,7],[2,3],[6,3]); C('res',7,3,{n:'R1',R:1000}); W([8,3],[10,3],[10,6]); C('res',10,7,{r:1,n:'R2',R:1000}); W([10,8],[10,10],[4,10]);
      C('scope',16,6,{n:'OSC1',vdiv1:1,vdiv2:1,tdiv:0.0005,trig:'1'}); W([15,8],[15,9],[12,9],[12,2],[2,2],[2,3]); W([16,8],[16,10],[13,10],[13,6],[10,6]); W([18,8],[18,11],[4,11],[4,10]); }));
    s.run(0.5); cap = s.scope('OSC1'); o.sq = [s.RES.trans, cap.ch[0].max, cap.ch[0].min, cap.ch[1].max, cap.ch[0].duty];
    return o; });
  checks.push(['สโคป 2 แชนเนล: วงจรขยาย BJT (จำลองสด) CH1 20 mVpp → CH2 ≈ 3.1 Vpp (สัญญาณเล็ก rπ = β·Vt/Ic ตรงกับ SPICE 3.17 Vpp)',
    nr(sc2.ce[0], 0.019, 0.002) && nr(sc2.ce[1], 3.15, 0.15), JSON.stringify(sc2.ce)]);
  checks.push(['สโคปโหมดเลื่อน (ตามเวลา): บันทึกละเอียดทุกคอลัมน์ ไม่เป็นขั้นบันได (ตัวเก็บประจุเปลี่ยน < 0.15 V ต่อจุด)',
    sc2.roll[0] > 300 && sc2.roll[1] < 0.15, JSON.stringify(sc2.roll)]);
  checks.push(['เครื่องกำเนิดสัญญาณคลื่นสี่เหลี่ยม → จำลองตามเวลา: CH1 ±1.95 V, CH2 (ตัวแบ่ง) ±0.98 V, ดิวตี้ 50%',
    sc2.sq[0] && nr(sc2.sq[1], 1.95, 0.03) && nr(sc2.sq[2], -1.95, 0.03) && nr(sc2.sq[3], 0.975, 0.02) && nr(sc2.sq[4], 0.5, 0.03), JSON.stringify(sc2.sq)]);
  const flt = await page.evaluate(() => { const s = __sim;
    const mk = toCircuit => { s.load('cnt7seg'); const d = JSON.parse(JSON.stringify(s.S));
      d.comps.push({id:900, t:'scope', x:30, y:4, n:'OSC1', vdiv1:5, vdiv2:5, pos1:1, pos2:-2, tdiv:2, trig:'1', on2:true, run:true, earth:true, px1:10, px2:10, cpl1:'DC', cpl2:'DC', disp:'yt', math:'off', cur:'off', tmode:'auto', slope:'up', tlev:0.01});
      d.wires.push({x1:29,y1:6,x2:29,y2:10}, {x1:29,y1:10,x2:21,y2:10}, {x1:30,y1:6,x2:30,y2:13}, {x1:30,y1:13,x2:18,y2:13});
      if (toCircuit) d.wires.push({x1:32,y1:6,x2:32,y2:17}, {x1:32,y1:17,x2:27,y2:17}); else { d.comps.push({id:901, t:'gnd', x:34, y:8, n:''}); d.wires.push({x1:32,y1:6,x2:34,y2:6}, {x1:34,y1:6,x2:34,y2:8}); }
      d.nid = 1000; s.load(d); s.run(12); const c = s.scope('OSC1');
      return [scopeFloat(s.find('OSC1')).join(','), warnList().some(w => /กราวด์โพรบ \(⏚\) ไม่ได้ต่อ/.test(w[1])), c.ch[0].max - c.ch[0].min]; };
    const ex = Object.keys(s.EX).filter(k => { s.load(k); return s.S.comps.some(c => c.t === 'scope' && scopeFloat(c).some(Boolean)); });
    return {f:mk(false), g:mk(true), ex}; });
  checks.push(['สโคป: ⏚ ต่อสัญลักษณ์กราวด์แยกจากวงจรแบตเตอรี่ → ตรวจพบวงจรลอย + เตือน; ต่อ ⏚ เข้า GND วงจร → 0–9 V ถูกต้อง, ไม่มีตัวอย่างใดเตือนผิด',
    flt.f[0] === 'true,true' && flt.f[1] && flt.g[0] === 'false,false' && !flt.g[1] && nr(flt.g[2], 9, 0.1) && flt.ex.length === 0, JSON.stringify(flt)]);
  { const { devices } = require('playwright'); const mctx = await browser.newContext({...devices['iPhone 13']}); const mp = await mctx.newPage(); const merr = [];
    mp.on('pageerror', e => merr.push(e.message)); await mp.goto('file://' + require('path').resolve(__dirname, '../circuit-lab.html')); await mp.waitForTimeout(400);
    await mp.evaluate(() => __sim.load('series'));
    const lay = await mp.evaluate(() => { const r = id => document.querySelector(id).getBoundingClientRect();
      return {hdr:r('header').height, cvW:r('#cv').width, vw:innerWidth, over:document.documentElement.scrollWidth > innerWidth + 1, palHidden:r('#pal').right <= 0}; });
    await mp.tap('#bPal'); await mp.waitForTimeout(300); const palOpen = await mp.evaluate(() => document.querySelector('#pal').getBoundingClientRect().left >= -1);
    await mp.tap('[data-dclose="pal"]'); await mp.waitForTimeout(300);
    const cdp = await mctx.newCDPSession(mp), z0 = await mp.evaluate(() => view.z);
    const TT = (type, pts) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints:pts.map((q, i) => ({x:q[0], y:q[1], id:i}))});
    await TT('touchStart', [[150,400],[250,400]]); for (let k = 1; k <= 8; k++) await TT('touchMove', [[150 - k*8,400],[250 + k*8,400]]); await TT('touchEnd', []);
    const z1 = await mp.evaluate(() => view.z), I = await mp.evaluate(() => __sim.RES.comp[__sim.find('H1').id].Ir);
    checks.push(['มือถือ (iPhone): ส่วนหัวแถวเดียว ≤ 60 px, แผงวงจรเต็มกว้าง, ไม่เลื่อนแนวนอน, แถบอุปกรณ์เป็นลิ้นชักเปิด/ปิดได้, ซูมสองนิ้วได้ วงจรเดิม',
      lay.hdr <= 60 && lay.cvW >= lay.vw - 2 && !lay.over && lay.palHidden && palOpen && z1 > z0*1.5 && nr(I, 0.25, 0.01) && merr.length === 0, JSON.stringify({lay, palOpen, z0, z1, I, merr})]);
    // เมนู ⋯ / ลิ้นชักเต็มจอ / แถวสัญลักษณ์ / ไม่เปิดหน้าต่างเองบนมือถือ
    const m2 = {};
    await mp.evaluate(() => __sim.load('pidtank')); await mp.waitForTimeout(200);
    m2.auto = await mp.evaluate(() => [document.querySelector('#trwin').hidden, document.querySelector('header').scrollWidth <= innerWidth, [...document.querySelectorAll('header > *')].filter(e => getComputedStyle(e).display !== 'none').length]);
    await mp.tap('#bMore'); m2.sheet = await mp.evaluate(() => !document.querySelector('#more').hidden && document.querySelectorAll('#mbody [data-mp]').length);
    await mp.tap('[data-mp="bLad"]'); await mp.waitForTimeout(250);
    m2.lad = await mp.evaluate(() => { const r = document.querySelector('#lad').getBoundingClientRect(); return [document.querySelector('#more').hidden, Math.round(r.bottom) >= innerHeight - 1, r.top < 80]; });
    await mp.evaluate(() => { ladOpen = false; ladStruct(); __sim.load('arduino'); const c = __sim.S.comps.find(x => x.t === 'uno'); ladPid = c.id; ladOpen = true; ladStruct(); });
    m2.off3d = await mp.evaluate(() => fx.mode);
    await mp.evaluate(() => { const t = document.querySelector('#mcode'); t.focus(); t.setSelectionRange(0, 0); });
    await mp.tap('#kbar [data-kb="()"]'); await mp.tap('#kbar [data-kb=";"]');
    m2.kb = await mp.evaluate(() => document.querySelector('#mcode').value.slice(0, 3));
    await mp.evaluate(() => { ladOpen = false; ladStruct(); });
    m2.ph3d = await mp.evaluate(() => { __sim.load('gate'); const a = fx.mode; __sim.load('rs232'); S.fac = facPreset('gate'); setView('split'); fxHud(true);
      const btn = !!document.querySelector('#fhud [data-f="dropfac"]'); txtZ = 0.5; let sz = 0; const f = ctx.fillText; ctx.fillText = function(){ sz = parseFloat(ctx.font.split(' ')[1]); }; text('X', 0, 0, 9, '#000'); ctx.fillText = f; return [a, btn, sz]; });
    await mp.tap('#fhud [data-f="dropfac"]'); m2.drop = await mp.evaluate(() => [fx.mode, !!S.fac]);
    await mp.evaluate(() => { __sim.load('factory'); setView('split'); fx.hmin = null; fxHud(true); }); await mp.waitForTimeout(300);
    m2.hud = await mp.evaluate(() => { const c = document.querySelector('#fhud .fcard'); return [c.classList.contains('min'), Math.round(c.getBoundingClientRect().height)]; });
    await mp.tap('#fhud [data-press="START"]'); await mp.waitForTimeout(500);
    m2.hud.push(await mp.evaluate(() => { __sim.run(2); return Math.abs(frt(S.fac.items.find(i => i.k === 'conv')).v) > 0.02; }));
    { await mp.evaluate(() => setView('full')); await mp.waitForTimeout(300); const d0 = await mp.evaluate(() => [fx.dist, fx.yaw]);
      await TT('touchStart', [[150,500],[250,500]]); for (let k = 1; k <= 8; k++) await TT('touchMove', [[150 - k*10,500],[250 + k*10,500]]); await TT('touchEnd', []);
      const d1 = await mp.evaluate(() => [fx.dist, fx.yaw]); await mp.tap('#fzoom [data-z="out"]'); const d2 = await mp.evaluate(() => fx.dist);
      m2.z3d = [d1[0] < d0[0]*0.6, d1[1] === d0[1], d2 > d1[0]*1.2]; await mp.evaluate(() => setView('split')); }
    await mp.tap('#fhud [data-f="hmin"]'); m2.hud.push(await mp.evaluate(() => !document.querySelector('#fhud .fcard').classList.contains('min'))); await mp.evaluate(() => setView('off'));
    checks.push(['มือถือ: ส่วนหัวเหลือ 4 ปุ่มไม่ล้นจอ, เมนู ⋯ แผ่นล่างสั่งเปิดตัวเขียนโปรแกรมเต็มจอ, ไม่เปิดเทรนด์เอง, ตัวอย่างไม่มีฉากปิด 3D, แถวสัญลักษณ์แทรก ( ) และ ; · ตัวอย่างมีฉากไม่แบ่งจอเอง, ฉากที่ไม่ผูกอุปกรณ์มีปุ่มลบ, ตัวอักษรบนแผงขยายเมื่อซูมออก · แผง 3D ย่อเป็นแถบ แตะ START ครั้งเดียวสายพานวิ่ง · ฉาก 3D ถ่างสองนิ้วซูมเข้า (ไม่หมุน) ปุ่ม − ซูมออก',
      m2.auto[0] && m2.auto[1] && m2.auto[2] === 4 && m2.sheet >= 14 && m2.lad.every(Boolean) && m2.off3d === 'off' && m2.kb === '(;)' && m2.ph3d[0] === 'off' && m2.ph3d[1] && m2.ph3d[2] === 16.2 && m2.drop[0] === 'off' && !m2.drop[1] && m2.hud[0] && m2.hud[1] < 60 && m2.hud[2] && m2.hud[3] && m2.z3d.every(Boolean), JSON.stringify(m2)]);
    await mctx.close(); }
  const ed = await page.evaluate(async () => { const s = __sim, o = {};
    // เลือกหลายชิ้น + คัดลอก/วาง + ย้อนกลับ/ทำซ้ำ + ย้ายทั้งชุด
    s.load('series'); boxSelect(-50, -50, 50, 50); o.sel = [sel.k, sel.cs.length, sel.ws.length]; copySel(); pasteClip(0, 8); s.run(0.2);
    o.paste = [s.S.comps.length, new Set(s.S.comps.map(c => c.n)).size, s.RES.comp[s.find('H3').id].Ir];
    undo(); o.undo = s.S.comps.length; redo(); o.redo = s.S.comps.length;
    boxSelect(-50, -50, 50, 6); const d = mmoveInit(0, 0); mmoveApply(d, 3, 0); mmoveEnd(d); s.run(0.2); o.move = s.RES.comp[s.find('H1').id].Ir;
    // โค้ดแชร์ไป-กลับ + ส่งออกภาพ
    const code = await encCircuit(ser()); o.share = [code.slice(0, 4), (await decCircuit(code)) === ser(), code.length < ser().length];
    o.png = (circuitPNG() || '').startsWith('data:image/png');
    // ป้ายชื่อสาย + มิเตอร์จิ้มวัด
    s.load(build((C, W) => { C('bat',2,5,{r:1,n:'B1',V:9}); W([2,4],[2,3],[3,3]); C('lbl',3,3,{net:'VCC'}); W([2,6],[2,7],[3,7]); C('lbl',3,7,{net:'GND'});
      C('res',12,5,{r:1,n:'R1',R:1000,Pr:0.25}); W([12,4],[12,3],[13,3]); C('lbl',13,3,{net:'vcc'}); W([12,6],[12,7],[13,7]); C('lbl',13,7,{net:'GND'}); }));
    s.run(0.2); o.lbl = [s.RES.comp[s.find('R1').id].Ir, s.spRun({kind:'op'}).rows.find(x => x.nm === 'R1').i];
    probeTap(12, 4); probeTap(12, 6); o.probe = probeVal().dc;
    // ความเสียหาย: 9 V คร่อม 100 Ω 0.25 W (0.81 W) → ไหม้ · อิเล็กโทรไลต์กลับขั้ว → ระเบิด
    s.find('R1').R = 100; s.poke(); s.run(3); o.burn = [!!s.find('R1')._blown, s.RES.comp[s.find('R1').id].Ir < 1e-6];
    s.load(build((C, W) => { C('bat',2,5,{r:1,n:'B1',V:12}); W([2,4],[2,3],[6,3],[6,4]); C('cap',6,5,{r:3,n:'C1',C:100,Vr:25,pol:true}); W([6,6],[6,7],[2,7],[2,6]); })); s.run(1.5); o.cap = !!s.find('C1')._blown;
    // จอ LCD I2C
    s.load('lcdi2c'); s.run(2.5); const L = s.find('LCD1'); o.lcd = L._lcd.buf.slice(); s.find('U2').temp = 40; s.poke(); s.run(1); o.lcd40 = L._lcd.buf[0];
    // แบบฝึกหัด: วงจรเริ่มต้นไม่ผ่าน, เฉลยผ่าน
    o.ex = EXER.map(e => { exStart(e.id); s.run(0.3); const a = exCheck()[0]; exStart(e.id, true); s.run(0.5); const b = exCheck()[0]; return (a ? 'X' : '-') + (b ? 'P' : 'F'); }).join(''); EXCUR = null; exCard();
    // Monte Carlo
    s.load(build((C, W) => { C('fgen',3,6,{n:'FG1',f:100,vpp:2,zo:0.05}); W([4,7],[4,9]); W([2,7],[2,3],[6,3]); C('res',7,3,{n:'R1',R:1000}); W([8,3],[10,3],[10,5]); C('cap',10,6,{r:1,n:'C1',C:1}); W([10,7],[10,9],[4,9]); C('gnd',4,9,{}); }));
    AN.mc = {n:40, tolR:5, tolC:10, seed:7}; const opt = {kind:'ac', src:'FG1', from:10, to:1e5, ppd:40, probes:['V(C1)']}, r = s.spRun(opt); mcRun(opt, r);
    const f3 = [mcMetric(r, 0), ...r.mc.map(m => mcMetric(r, 0, m))].map(a => a[1][1]), mu = f3.reduce((a, b) => a + b, 0)/f3.length, sd = Math.sqrt(f3.reduce((a, b) => a + (b - mu)**2, 0)/(f3.length - 1));
    o.mc = [r.mc.length, mu, sd, s.find('R1').R, s.find('C1').C]; AN.mc.n = 0;
    return o; });
  checks.push(['แก้ไข: ลากกรอบเลือก 4 อุปกรณ์ 8 สาย → คัดลอก/วาง (ชื่อไม่ซ้ำ, วงจรที่วาง 0.25 A) → ย้อนกลับ/ทำซ้ำ → ย้ายทั้งชุดกระแสเดิม',
    JSON.stringify(ed.sel) === '["m",4,8]' && ed.paste[0] === 8 && ed.paste[1] === 8 && nr(ed.paste[2], 0.25, 0.005) && ed.undo === 4 && ed.redo === 8 && nr(ed.move, 0.25, 0.005), JSON.stringify(ed.sel.concat(ed.paste, ed.undo, ed.redo, ed.move))]);
  checks.push(['ไฟล์: โค้ดแชร์บีบอัด (CL1.) ถอดกลับตรงทุกตัวอักษรและสั้นกว่าเดิม · ส่งออกภาพวงจร PNG', ed.share[0] === 'CL1.' && ed.share[1] && ed.share[2] && ed.png, JSON.stringify([ed.share, ed.png])]);
  checks.push(['ป้ายชื่อสาย VCC/GND ต่อวงจรโดยไม่ลากสาย → 9 mA (จำลองสดและ SPICE) · มิเตอร์จิ้มวัด 9.00 V', nr(ed.lbl[0], 0.009, 0.0002) && ed.lbl[1] === '9.00 mA' && nr(ed.probe, 9, 0.01), JSON.stringify([ed.lbl, ed.probe])]);
  checks.push(['ความเสียหายจริง: ตัวต้านทาน 0.25 W ได้ 0.81 W → ไหม้ วงจรขาด · ตัวเก็บประจุอิเล็กโทรไลต์กลับขั้ว → ระเบิด', ed.burn[0] && ed.burn[1] && ed.cap, JSON.stringify([ed.burn, ed.cap])]);
  checks.push(['จอ LCD I2C + LM35: แสดง "TEMP 27.9 C" (28 °C ผ่าน ADC 10 บิต) และ "ADC  57" · 40 °C → 40.1 C', ed.lcd[0].startsWith('TEMP 27.9 C') && ed.lcd[1].startsWith('ADC  57') && ed.lcd40.startsWith('TEMP 40.1 C'), JSON.stringify([ed.lcd, ed.lcd40])]);
  checks.push(['แบบฝึกหัด 6 ข้อ: วงจรเริ่มต้นไม่ผ่าน และเฉลยผ่านทุกข้อ', ed.ex === '-P-P-P-P-P-P', ed.ex]);
  checks.push(['Monte Carlo (R ±5%, C ±10%, 41 รอบ): RC −3 dB เฉลี่ย ≈ 159 Hz, σ ≈ 4–8 Hz, ค่าอุปกรณ์คืนค่าเดิม',
    ed.mc[0] === 40 && nr(ed.mc[1], 159.5, 4) && ed.mc[2] > 4 && ed.mc[2] < 8 && ed.mc[3] === 1000 && ed.mc[4] === 1, JSON.stringify(ed.mc)]);
  const disp = await page.evaluate(() => { const s = __sim, o = {};
    s.load('mixed'); s.run(0.3); const r1 = s.find('R1'), save = Object.assign({}, DISP);
    Object.assign(DISP, {val:true, v:true, i:true, p:true}); showVal = true; o.all = measText(r1, s.RES.comp[r1.id], dispFor(r1)).map(m => m[0]);
    showVal = false; o.off = measText(r1, s.RES.comp[r1.id], dispFor(r1)).length; r1.vshow = 'v'; o.own = measText(r1, s.RES.comp[r1.id], dispFor(r1)).map(m => m[0]);
    o.saved = JSON.parse(ser()).comps.find(c => c.n === 'R1').vshow; Object.assign(DISP, save); showVal = true;
    s.load('semi'); s.run(0.5); const u = s.S.comps.find(c => c.t === 'reg'); o.pins = pinsOf(u).map(p => +nodeVAt(p[0], p[1]).d.toFixed(2)); return o; });
  checks.push(['ป้ายค่าบนสัญลักษณ์: R1 แสดง 5.45 V / 54.5 mA / 297 mW, ปิดรวมแล้วตั้งเฉพาะตัว (บันทึกได้) · แรงดันขา 7805 = 12/0/5 V',
    JSON.stringify(disp.all) === '["5.45 V","54.5 mA","297 mW"]' && disp.off === 0 && JSON.stringify(disp.own) === '["5.45 V"]' && disp.saved === 'v' && JSON.stringify(disp.pins) === '[12,0,5]', JSON.stringify(disp)]);
  const vfd = await page.evaluate(() => { const s = __sim, o = {};
    // VFD + มอเตอร์: ทางลาดความถี่, AVI → ความถี่, กระแสพิกัดไม่มีกระแสสตาร์ทสูง
    s.load(build((C, W) => { C('src3',4,2,{n:'G1'}); C('vfd',6,7,{n:'VFD1',acc:5,dec:5}); W([3,3],[3,5]); W([4,3],[4,5]); W([5,3],[5,5]);
      C('motor3',9,12,{n:'M1',P:1.1}); W([8,5],[8,4],[12,4],[12,9],[8,9],[8,11]); W([9,5],[9,3],[13,3],[13,10],[9,10],[9,11]); W([10,5],[10,2],[14,2],[14,11],[10,11]);
      C('sw',4,11,{r:1,n:'S1',on:false}); W([3,9],[3,10],[4,10]); W([5,9],[5,12],[4,12]); C('pot',6,11,{n:'RV1',pos:60}); W([6,9],[6,10]); W([7,9],[7,10]); }));
    const v = s.find('VFD1'), m = s.find('M1'); s.run(1); s.find('S1').on = true; s.poke(); let pk = 0;
    for (let k = 0; k < 40; k++){ s.run(0.25); pk = Math.max(pk, s.RES.comp[v.id].Iout); } const R = s.RES.comp[v.id];
    o.run = [+v._f.toFixed(2), +m._sp.toFixed(3), +R.Iout.toFixed(2), +pk.toFixed(2), m._dir];
    s.find('S1').on = false; s.poke(); s.run(3); o.dec = +v._f.toFixed(1);
    // PID ระดับน้ำ (แลดเดอร์/ข้อความ)
    o.pid = ['lad', 'txt'].map(md => { s.load('pidtank'); const P = s.find('PLC1'); P.prog.mode = md; delete P._cp; s.run(1); s.find('S1').on = true; s.poke(); s.run(100);
      const a = [+s.find('TK1').lvl.toFixed(1), +Math.abs(s.find('VFD1')._f).toFixed(1), +s.RES.comp[s.find('VFD1').id].P.toFixed(0)]; s.find('TK1').out = 4.5; s.run(60);
      return a.concat([+s.find('TK1').lvl.toFixed(1), +Math.abs(s.find('VFD1')._f).toFixed(1), s.trend().t.length > 1500]); });
    // Modbus RTU: PLC มาสเตอร์ → VFD
    s.load('pidtank'); const P = s.find('PLC1'), V = s.find('VFD1'); V.run = 'mb'; V.fsrc = 'mb';
    Object.assign(P, {mbOn:true, mbMode:'master', mbList:'1 06 1 1 D12\n1 06 0 1 D11\n1 03 2 2 D13'}); P.prog.mode = 'txt';
    P.prog.txt += 'D11 := 1 IF M0\nD11 := 0 IF NOT M0\nD12 := D10 * 5\n'; delete P._cp; s.find('S1').on = true; s.poke(); s.run(60);
    o.mb = [+s.find('TK1').lvl.toFixed(0), P._img.D[13] === Math.round(Math.abs(V._f)*100), (P._mb || {}).err];
    // ตัวนับ + MOV นิพจน์ + AQ0
    const c = compile('C0 := CTU(I0, I1, 3)\nAQ0 := (CV0 + 1) * 10\nD5 := 2 IF C0'), img = newImage();
    for (const x of [1,0,1,0,1,0]){ img.I[0] = x; runText(c.code, img, 0.1); } o.ctu = [img.C[0].cv, img.C[0].q, img.AQ[0], img.D[5]]; img.I[1] = 1; runText(c.code, img, 0.1); o.ctu.push(img.C[0].cv);
    const lad = [{cmt:'', rows:[{cells:[nc('NO','I0'),null,null,null,null,null,null], out:{k:'CTU', a:'C1', p:2}}], links:[]}, {cmt:'', rows:[{cells:[nc('NO','C1'),null,null,null,null,null,null], out:{k:'MOV', a:'D3', p:'(AI0+10)*2'}}], links:[]}];
    const im2 = newImage(); im2.AI[0] = 5; for (const x of [1,0,1]){ im2.I[0] = x; runLadder(lad, im2, 0.1); } o.lad = [validateLad(lad).length, im2.C[1].cv, im2.D[3]];
    // ฟอลต์: มอเตอร์ 7.5 kW บน VFD 1.5 kW
    s.load('pidtank'); s.find('M1').P = 7.5; s.find('S1').on = true; s.poke(); s.run(30); o.flt = s.find('VFD1')._flt;
    return o; });
  checks.push(['VFD: AVI 6.98 V → 34.9 Hz ทางลาด 10 Hz/s, มอเตอร์ 1.1 kW กระแส 2.55 A ไม่มีกระแสสตาร์ทสูง (< 1.3 × In), ปลด FWD → ลดความถี่',
    nr(vfd.run[0], 34.88, 0.1) && nr(vfd.run[1], 0.698, 0.01) && nr(vfd.run[2], 2.55, 0.05) && vfd.run[3] < 3.3 && vfd.run[4] === 1 && nr(vfd.dec, 4.9, 0.3), JSON.stringify([vfd.run, vfd.dec])]);
  checks.push(['pidtank (แลดเดอร์/ข้อความ): PID คุมระดับ 60% ≈ 25 Hz ปั๊มกินไฟ < 250 W (กฎกำลังสาม), ใช้น้ำมากขึ้น → ≈ 37.6 Hz ระดับยังคง 60%, บันทึกเทรนด์',
    vfd.pid.every(a => nr(a[0], 60, 1) && nr(a[1], 25, 1) && a[2] < 250 && nr(a[3], 60, 1) && nr(a[4], 37.5, 1) && a[5]), JSON.stringify(vfd.pid)]);
  checks.push(['VFD ผ่าน Modbus RTU: PLC เขียนคำสั่ง/ความถี่ อ่านความถี่ขาออกกลับ, ระดับ 60% · CTU นับ 3 → C0, RST ล้าง, AQ0 = 40% · แลดเดอร์ CTU + MOV (AI0+10)*2 = 30 · มอเตอร์ใหญ่เกิน → ฟอลต์ oC',
    vfd.mb[0] === 60 && vfd.mb[1] && vfd.mb[2] === 0 && JSON.stringify(vfd.ctu) === '[3,1,40,2,0]' && JSON.stringify(vfd.lad) === '[0,2,30]' && vfd.flt === 'oC', JSON.stringify([vfd.mb, vfd.ctu, vfd.lad, vfd.flt])]);
  const exr = await page.evaluate(() => { const s = __sim, o = {};
    // ค่าวัดกับระบบอันดับหนึ่ง y = 1 − e^(−t/τ), τ = 1 s: rise 10–90% = τ ln 9 = 2.197 s, settling 2% = τ ln 50 = 3.912 s, IAE = τ
    const t = [], y = []; for (let k = 0; k <= 2000; k++){ t.push(k*0.005); y.push(1 - Math.exp(-k*0.005)); } const m = s.expMetrics(t, y, null, 1, 0); o.fo = [m.rise, m.ts, m.os, m.iae];
    // กวาด Kp ของ PID ใน pidtank: Kp สูงขึ้น overshoot ลดลง, ทุกรอบเข้าเป้า 60%, วงจรคืนสภาพเดิม
    s.load('pidtank'); const lv = s.find('TK1').lvl, pl = s.find('PLC1').pidList, R = s.expRunSync();
    o.runs = R.runs.map(r => [r.v, +r.m.yf.toFixed(1), +r.m.os.toFixed(1), +r.m.ts.toFixed(0), +r.m.en.toFixed(1)]);
    o.restore = s.find('TK1').lvl === lv && s.find('PLC1').pidList === pl && !s.S.comps.some(c => c.t === 'plc' && /PID/.test(c.pidList) && / 8 8 /.test(c.pidList));
    o.csv = s.expCSV(R).split('\n').length; const h = s.reportHTML(); o.rep = [(h.match(/<img/g) || []).length, h.includes('ทดลองแบบชุด'), h.includes('รัง 1'), h.includes('M0 AI0 D1 D10')];
    // เหตุการณ์กลางรอบ + กวาดฟิลด์ของอุปกรณ์ (อัตราใช้น้ำ) ด้วยรูปแบบ เริ่ม:ก้าว:จบ
    const R2 = s.expRunSync({par:'TK1.out', vals:'2:1:4', dur:90, sig:'VFD1.f', sig2:'', tgt:'', tm:0, ev:'S1.on = 1\n@1 PLC1.D1 = 50'});
    o.f = R2.runs.map(r => +r.m.yf.toFixed(1)); o.lv2 = s.find('TK1').out;
    return o; });
  checks.push(['ค่าวัดการตอบสนองขั้น (ระบบอันดับหนึ่ง τ = 1 s): rise 2.20 s, settling 2% 3.91 s, overshoot 0, IAE 1.00',
    nr(exr.fo[0], 2.197, 0.01) && nr(exr.fo[1], 3.912, 0.01) && exr.fo[2] === 0 && nr(exr.fo[3], 1, 0.01), JSON.stringify(exr.fo)]);
  checks.push(['ทดลองชุด pidtank: Kp 1/2/4/8 → overshoot ลดลงตามลำดับ settling เร็วขึ้น ทุกรอบเข้า 60%, คืนวงจรเดิม, CSV + รายงาน (ภาพวงจร/ผลทดลอง, แลดเดอร์, PID)',
    exr.runs.length === 4 && exr.runs.every(r => nr(r[1], 60, 2.5) && r[4] > 5) && exr.runs[0][2] > exr.runs[1][2] && exr.runs[1][2] > exr.runs[2][2] && exr.runs[2][2] > exr.runs[3][2] && exr.runs[3][3] < exr.runs[0][3]
    && exr.restore && exr.csv > 9000 && exr.rep[0] >= 2 && exr.rep.slice(1).every(Boolean), JSON.stringify([exr.runs, exr.restore, exr.csv, exr.rep])]);
  checks.push(['ทดลองชุดกวาดฟิลด์อุปกรณ์ TK1.out = 2:1:4 พร้อมเหตุการณ์ @1 PLC1.D1 = 50 → ความถี่ VFD ≈ 16.7/25/33.3 Hz (ใช้น้ำมาก ปั๊มเร็วขึ้น) และค่าเดิมคืน',
    exr.f.length === 3 && nr(exr.f[0], 16.7, 1) && nr(exr.f[1], 25, 1) && nr(exr.f[2], 33.3, 1) && exr.lv2 === 3, JSON.stringify([exr.f, exr.lv2])]);
  { await page.setViewportSize({width:1400, height:900});
    await page.evaluate(() => { __sim.load('arduino'); const c = __sim.S.comps.find(x => x.t === 'uno'); ladPid = c.id; ladOpen = true; ladStruct(); });
    await page.waitForTimeout(200); await page.click('#mcode'); await page.keyboard.press('Control+End'); await page.keyboard.press('Enter');
    const items = () => page.evaluate(() => { const p = document.querySelector('#acpop'); return p && !p.hidden ? [...p.querySelectorAll('.it code')].map(x => x.textContent) : null; });
    const r = {}; await page.keyboard.type('d'); r.d = (await items() || []).slice(0, 2);
    await page.keyboard.type('igitalW'); await page.keyboard.press('Enter');
    r.sel = await page.evaluate(() => { const t = document.querySelector('#mcode'); return t.value.slice(t.selectionStart, t.selectionEnd); });
    await page.keyboard.type('9'); await page.keyboard.press('Tab'); await page.keyboard.type('LOW');
    await page.keyboard.press('Escape'); await page.keyboard.press('End'); await page.keyboard.press('Enter'); await page.keyboard.type('Servo sv;'); await page.keyboard.press('Enter'); await page.keyboard.type('sv.');
    r.mem = await items(); await page.keyboard.press('Escape');
    r.code = await page.evaluate(() => { const t = document.querySelector('#mcode').value.split('\n'); return t.slice(-3, -1).join('|'); });
    r.inStr = await page.evaluate(() => { const t = document.querySelector('#mcode'); t.value += '\nSerial.println("di'; t.setSelectionRange(t.value.length, t.value.length); return !!acCtx(t); });
    await page.evaluate(() => { ladOpen = false; ladStruct(); });
    checks.push(['ตัวเขียนโค้ด Arduino: พิมพ์ d → ป๊อปอัป digitalWrite/digitalRead, Enter ใส่ digitalWrite(13, HIGH); เลือกขา, Tab ไปอาร์กิวเมนต์ถัดไป, "sv." → เมธอด Servo, ไม่เด้งในสตริง',
      JSON.stringify(r.d) === '["digitalWrite","digitalRead"]' && r.sel === '13' && r.code === 'digitalWrite(9, LOW);|Servo sv;' && r.mem && r.mem.includes('attach') && r.mem.includes('write') && r.inStr === false, JSON.stringify(r)]); }
  const lint = await page.evaluate(() => { const s = __sim, o = {};
    o.clean = []; for (const k in EX){ let d; try { d = EX[k].f(); } catch (e){ continue; } for (const c of d.comps || []) if (c.code){ if (cToJs(c.code).split('\n').length !== c.code.split('\n').length) o.clean.push(k + ':lines'); if (s.codeLint(c.code, c).length) o.clean.push(k); } }
    const bad = 'Servo sv;\nconst int LED = 9, BTN = 2;\nvoid setup() {\n  pinmode(LED, OUTPUT);\n  Serial.begin(9600)\n  sv.atach(3);\n}\nvoid loop() {\n  if (v = 1) digitalWrite(LED, HIHG);\n  Serial.println("ok");\n}';
    o.bad = s.codeLint(bad, {t:'uno'}).map(q => q.line + q.sev);
    o.syn = s.codeLint('void setup(){}\nvoid loop(){\n  int x = 5 +* 3;\n}', {t:'uno'}).map(q => q.line + ':' + /ไวยากรณ์/.test(q.msg));
    o.br = s.codeLint('void setup(){\n  if (x > 1 {\n  }\n}\nvoid loop(){}', {t:'uno'}).map(q => q.line);
    o.str = s.codeLint('void setup(){\n  Serial.println("abc);\n}\nvoid loop(){}', {t:'uno'}).map(q => q.line + q.msg.slice(0, 7));
    o.nosetup = s.codeLint('void loop(){}', {t:'uno'}).length;
    o.tok = s.edTokens('void loop(){ digitalWrite(13, HIGH); // c\n}').filter(t => t[0]).map(t => t[0] + ':' + t[1].trim()).join(' ');
    // หน้าจอ: ชั้นระบายสีตรงกับ textarea และแสดงจุดแดง/รายการปัญหา
    s.load('arduino'); const c = s.S.comps.find(x => x.t === 'uno'); c.code = bad; ladPid = c.id; ladOpen = true; ladStruct();
    const ta = document.querySelector('#mcode'), pre = document.querySelector('#chl'); o.ui = [document.querySelectorAll('#cgut .e').length, document.querySelectorAll('#ladmsg .prob a').length, pre.querySelectorAll('.sq').length >= 4];
    const pos = ta.value.indexOf('HIHG'), cp = acCaret(ta, pos), li = ta.value.slice(0, pos).split('\n').length - 1, col = pos - ta.value.lastIndexOf('\n', pos - 1) - 1;
    const tw = document.createTreeWalker(pre.children[li], NodeFilter.SHOW_TEXT); let n, acc = 0, rr = null;
    while ((n = tw.nextNode())){ if (n.parentElement.closest('.lens')) continue; if (acc + n.textContent.length >= col){ const r = document.createRange(); r.setStart(n, col - acc); r.setEnd(n, col - acc); rr = r.getBoundingClientRect(); break; } acc += n.textContent.length; }
    const pR = pre.getBoundingClientRect(); o.align = [Math.abs(cp.x - (rr.left - pR.left)) < 2, Math.abs(cp.y - (rr.top - pR.top)) < 2];
    ladOpen = false; ladStruct(); return o; });
  checks.push(['ตัวตรวจโค้ด: ตัวอย่างทุกตัวไม่มีคำเตือนผิด + เลขบรรทัด cToJs คงเดิม · จับ pinmode/ขาด ;/atach/HIHG/= ในเงื่อนไข, ไวยากรณ์ +* บรรทัด 3, วงเล็บไม่ปิด, สตริงไม่ปิด, ไม่มี setup',
    lint.clean.length === 0 && JSON.stringify(lint.bad) === '["4e","5e","6e","9e","9w"]' && JSON.stringify(lint.syn) === '["3:true"]' && JSON.stringify(lint.br) === '[2]'
    && lint.str.length === 1 && lint.str[0].startsWith('2') && lint.nosetup === 1, JSON.stringify(lint)]);
  checks.push(['ระบายสีโค้ด: โทเคน ชนิด/ฟังก์ชัน/ตัวเลข/ค่าคงที่/คอมเมนต์ · ชั้นสีตรงกับเคอร์เซอร์ textarea · จุดแดงที่เลขบรรทัด, ขีดเส้นหยัก, รายการปัญหาคลิกได้',
    lint.tok === 'ht:void hf:digitalWrite hn:13 hc:HIGH hm:// c' && lint.ui[0] === 4 && lint.ui[1] === 5 && lint.ui[2] && lint.align.every(Boolean), JSON.stringify([lint.tok, lint.ui, lint.align])]);
  // แอปบนโทรศัพท์ (PWA): เสิร์ฟผ่าน http ชั่วคราว → manifest + ไอคอน + service worker → ตัดเน็ตแล้วยังเปิดได้
  { const http = require('http'), fs = require('fs'), path = require('path'), ROOT = path.resolve(__dirname, '..');
    const TY = {'.html':'text/html; charset=utf-8', '.js':'text/javascript', '.webmanifest':'application/manifest+json', '.png':'image/png'};
    const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()){ r.writeHead(404); r.end(); return; }
      r.writeHead(200, {'content-type': TY[path.extname(f)] || 'application/octet-stream'}); fs.createReadStream(f).pipe(r); });
    await new Promise(z => srv.listen(0, '127.0.0.1', z));
    const pctx = await browser.newContext(), pp = await pctx.newPage(), perr = []; pp.on('pageerror', e => perr.push(e.message));
    try {
      // เปิดหน้า root ก่อน (index.html) — ต้องไม่ทับสำเนาของแอปในแคช
      await pp.goto(`http://127.0.0.1:${srv.address().port}/`); await pp.waitForTimeout(400);
      await pp.goto(`http://127.0.0.1:${srv.address().port}/circuit-lab.html`); await pp.waitForTimeout(1200);
      const pr = await pp.evaluate(async () => { const reg = await navigator.serviceWorker.ready; const mf = await (await fetch(document.querySelector('link[rel=manifest]').href)).json();
        return [!!reg.active, mf.short_name, mf.display, (await Promise.all(mf.icons.map(i => fetch(i.src).then(x => x.status)))).every(x => x === 200), mf.icons.some(i => i.purpose === 'maskable')]; });
      await pp.reload(); await pp.waitForTimeout(800); await pctx.setOffline(true); await pp.reload(); await pp.waitForTimeout(1200);
      pr.push(await pp.evaluate(() => typeof __sim === 'object' && __sim.S.comps.length > 0));
      checks.push(['แอปบนโทรศัพท์ (PWA): manifest "Circuit Lab" standalone, ไอคอน 192/512/maskable, service worker ทำงาน, ตัดเน็ตแล้วเปิดแอปได้', pr[0] && pr[1] === 'Circuit Lab' && pr[2] === 'standalone' && pr[3] && pr[4] && pr[5] && !perr.length, JSON.stringify([pr, perr])]);
    } finally { await pctx.close(); srv.close(); } }
  checks.push(['ไม่มี error ในหน้าเว็บ', errors.length === 0, errors.join(' | ')]);

  let fail = 0;
  for (const [name, ok, v] of checks){ if (!ok) fail++; console.log((ok ? 'ผ่าน  ' : 'ไม่ผ่าน ') + name + '  → ' + (typeof v === 'number' ? +v.toFixed(5) : v)); }
  await browser.close();
  process.exit(fail ? 1 : 0);
})();
