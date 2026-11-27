# แผงทดลองวงจรไฟฟ้า (Circuit Lab)

เว็บแอปหน้าเดียวสำหรับสอนและจำลองวงจรไฟฟ้า: DC, AC 1 เฟส/3 เฟส, ตู้ควบคุมรีเลย์,
PLC (แลดเดอร์ + ข้อความ), HMI ผ่าน RS-485, ระบบปั๊มน้ำ–ถังน้ำ ไมโครคอนโทรลเลอร์ (Arduino Uno, ESP32, Raspberry Pi Pico) เซนเซอร์ (บอร์ดและอุตสาหกรรม) อุปกรณ์อิเล็กทรอนิกส์ ออสซิลโลสโคป และมุมมองโรงงาน 3D ที่ควบคุมด้วยวงจร/PLC บนแผง
ผู้ใช้คนไทย: ข้อความใน UI เป็นภาษาไทยทั้งหมด

> ย้ายมาจาก repo `Supakit2539/claude-rc` (ประวัติ commit เดิมอยู่ที่นั่น) · `index.html` เป็นเพียงหน้าส่งต่อไป `circuit-lab.html` (หน้าแรกของ GitHub Pages)

## ไฟล์
- `circuit-lab.html` — ทั้งแอปอยู่ในไฟล์เดียว (HTML + CSS + JS, ไม่มี build step, ไม่มี dependency)
  ฟอนต์จาก Google Fonts: IBM Plex Sans Thai, IBM Plex Mono
- เปิดดูได้โดยตรงในเบราว์เซอร์ (file://)
- `tests/circuit-lab.test.js` — ชุดทดสอบ Playwright
- แอปบนโทรศัพท์ (PWA): `circuit-lab.webmanifest`, `circuit-lab-sw.js` (service worker: HTML เครือข่ายก่อน/ไฟล์อื่นสำเนาในเครื่องก่อน รวมฟอนต์ Google, แคช `circuit-lab-vN` — เพิ่มเลขเมื่อเปลี่ยนรายการ CORE),
  `icons/circuit-lab-{192,512,maskable-512,apple-180}.png` · `pwaInit()` ใส่ลิงก์ manifest/ไอคอนและลงทะเบียน SW เฉพาะเมื่อเปิดผ่าน http(s) ที่ไม่ใช่ claude.ai (`pwaHost`);
  ปุ่มติดตั้ง (`beforeinstallprompt` → `pwaInstall`, iOS แสดงวิธี "เพิ่มไปยังหน้าจอโฮม") ในเมนูไฟล์ `#finstall` และ ⋯ เมนู · standalone ใช้ safe-area ที่ส่วนหัว
  ปุ่มไอคอน 📲 ที่ส่วนหัว `#bInst` (โทรศัพท์แสดงเป็นไอคอนอย่างเดียว) + แถบชวนติดตั้ง `#instbar` บนโทรศัพท์ (ขึ้นหลัง 2.5 s, ✕ = เลื่อนไป 7 วันใน localStorage `circuit-lab-instbar`) — `pwaRefresh()` แสดงทั้งหมดเมื่อ `pwaCanInstall()`

## โครงสร้างโค้ด (ตามลำดับในไฟล์ `<script>`)
1. **ค่าคงที่และชนิดอุปกรณ์** — `T` คือรีจิสทรีของอุปกรณ์ทุกชนิด (`nm` ชื่อไทย, `pre` คำนำหน้าชื่ออัตโนมัติ, `d` ค่าเริ่มต้น)
   - อุปกรณ์ 2 ขั้ว: ไม่มี `pins`; มี `L` (ครึ่งความยาว, ค่าเริ่มต้น 1 ช่อง) หมุนได้ด้วย `r` (0–3); ขั้วแรก = + / แอโนด / L
   - บล็อก: มี `pins` (ออฟเซ็ตแบบกริด + ชื่อขั้ว) และ `box`, หมุนไม่ได้
   - `pinsOf(c)` คืนพิกัดกริดของขั้ว
   - ห้ามตั้งชื่อฟิลด์ว่า `t` (ชนิดอุปกรณ์) — เวลาตั้งของไทเมอร์ใช้ `td`
   - **รุ่น/ชนิดย่อย**: `MODELS[ชนิด] = [{id, nm, sh, p, spec}]` — `applyModel(c, id)` คัดลอก `p` ลงอุปกรณ์และเก็บ `c.model`;
     `modelOf(c)` คืนรุ่นปัจจุบัน; แก้ฟิลด์ที่อยู่ใน `p` แล้ว `c.model = ''` (กำหนดเอง) · แถบซ้ายแสดงรุ่นย่อยแบบพับได้ + ช่องค้นหา (`renderPalette`)
     ค่าในแค็ตตาล็อกเป็นสเปกทั่วไปของอุปกรณ์จริง (ไม่อ้างยี่ห้อ) เช่น MCB B/C/D, ฟิวส์ gG/aM/F/T, มอเตอร์ IE3, สาย THW ตาม mm², 1N4007, 2N2222, IRLZ44N
   - งานไฟฟ้ากำลัง/อุตสาหกรรม: `rcd` (ตัดเมื่อ |I_L + I_N| > IΔn, RCBO มีกระแสเกิน), `human` (ร่างกาย ~1 kΩ), `ol` (โอเวอร์โหลด Class 10, NC 95–96),
     `motor6` (6 ขั้ว U1–U2/V1–V2/W1–W2 สำหรับสตาร์-เดลต้า), `cable` (R = ρL/A, ตารางกระแส `CABLE`), `capbank` (kvar ต่อเดลต้า), `pmeter` (V, I, P, Q, PF, kWh),
     สวิตช์ `swint` (4 ทาง), `estop` (NC ล็อก), `sel3` (3 ตำแหน่ง)
   - มอเตอร์เหนี่ยวนำใช้ `motY()`: กระแส = Ist × In และ pf ≈ 0.35 ตอนสตาร์ท ลดลงตาม `_sp²`; เร่งถึงความเร็วพิกัดใน 1.5 s (`continuous`);
     ความเร็วเปลี่ยนเกิน 2% ต้องแก้วงจรใหม่ (`spDirty`) · `motor3.conn` = Y/D · มอเตอร์ DC มีแรงเคลื่อนย้อนกลับ (กระแสลดเมื่อหมุน)
   - MCB ตัดทันทีตามเส้นโค้ง B/C/D = 5/10/20 × In; ฟิวส์ใช้ `inst` (× In) และ `tc` (ความร้อน); ไทเมอร์ `mode` = TON/TOF; คอยล์ `dc` = คอยล์ไฟตรง (R = V²/P)
   - MOSFET นำบางส่วนเมื่อ Vth < Vgs < `Vfull` (`c._mg` 0–1); BJT ใช้ `Vbe`; 78xx ใช้ `drop`; มีการเตือนเมื่อเกินพิกัด (`Pr`, `Vr`, `In`, `Imax`, `Pmax`, ขนาดสาย)
   - อุปกรณ์รุ่นหลังเพิ่มเข้า `T` ทีละตัวหลังประกาศหลัก (ไมโครคอนโทรลเลอร์, `pot`, เซนเซอร์)
   - เซนเซอร์ 2 ขั้ว: `ldr` (`ldrR`), `ntc` (`ntcR`), `limit`, `buzzer`; โมดูล (บล็อก): `pir`, `sr04`, `dht`, `soil`, `servo`, `prox`, `photo`, `tx420`
     `SENS[t] = [ขาไฟเลี้ยง, ขากราวด์]` ใช้ตรวจไฟเลี้ยง (`c._pw`); ค่าสิ่งแวดล้อม (lux, temp, dist, moist, det ฯลฯ) เป็นฟิลด์ที่บันทึกได้
     โมดูลดิจิทัลต่อขา OUT ไปขาไฟเลี้ยง/กราวด์ด้วย 100 Ω; แอนะล็อกเป็นวงจรแบ่งแรงดัน; `prox`/`photo` PNP/NPN สวิตช์ OUT ไป +V/0V
     `tx420` เป็นแหล่งกระแส 4–20 mA (`txI`) เมื่อแรงดันลูป ≥ 10 V (สถานะพีชคณิต `c._on`)
   - เซนเซอร์อุตสาหกรรมดิจิทัล 3 สาย (`DIG3`): `prox`, `photo`, `capx` คาปาซิทีฟ, `magsw` แม่เหล็กกระบอกลม, `ultra` อัลตราโซนิก (`dist` ≤ `sp`), `curtain` ม่านแสง (OSSD ON เมื่อไม่ถูกบัง),
     `gasdet` (`lel` ≥ `sp`) — ใช้ stamp เดียวกัน (OUT → +V หรือ 0V ตาม `kind`), สถานะจาก `dig3Act(c)` × ไฟเลี้ยง ≥ 10 V (`c._pw`)
   - สวิตช์กระบวนการ 2 ขั้ว (`PSW`): `presw`, `flowsw`, `tstat` — `pv` ถึง `sp` → `c._st` ทำงาน, คืนเมื่อ ≤ `sp − hys` (`pswAct`), หน้าสัมผัส `mode` NO/NC (`pswClosed`)
   - `MODELS` มีรุ่นจริงของ prox (M8–M30), photo (diffuse/BGS/retro/through-beam), capx, magsw, ultra, curtain (Type 2/4), gasdet, presw, flowsw, tstat, tx420 (PT100/TC-K/ความดัน/ระดับ/การไหล/โหลดเซลล์/%RH), limit
     (ตัวอย่างที่สร้างด้วย `build` ไม่เรียก `applyModel` — ใส่ค่าสเปกเองถ้าต้องการ)
   - อิเล็กทรอนิกส์: 2 ขั้ว `diode`, `zener`, `dcm`; บล็อก `npn`, `pnp`, `nmos`, `reg` (78xx), `opto`, `ne555`, `seg7`, `rgb`, `spdt`
     รอยต่อ PN แบบ piecewise ใน `JUNC[t](c)` = `[ขาแอโนด, ขาแคโทด, Vf, R]` ต่อรอยต่อ ใช้ตัวแปรกระแส 1 ตัว (`NV`), สถานะใน `c._js[i]`
     (diode 1, zener 2 = ตรง + ซีเนอร์, seg7 8, rgb 3, opto 1) · ทรานซิสเตอร์ BJT: สถานะ `c._bj` = off/act/sat, ตัวแปร 2 ตัว (Ib, Ic);
     AC (เฟเซอร์) ใช้แบบจำลองสัญญาณเล็ก rπ = β·Vt/Ic (`c._ic` จากผล DC, `c._icu` ค่าที่ใช้ — ต่างเกิน 2% → วนแก้ใหม่) + Ic = β·Ib จึงเห็นอัตราขยายบนสโคป
     MOSFET: สวิตช์ตาม Vgs ≥ Vth (`c._mon`) · 78xx: แหล่งแรงดัน `c._vs` = min(V, Vin − 2) ดึงกระแสจากขา IN · NE555: สลับ OUT ใน `discrete` ตาม `timing555()`, ถ้าคาบ < 0.1 s ใช้ค่าเฉลี่ย
     ทุกตัวจำลองเฉพาะไฟ DC
   - **ลอจิก/ออปแอมป์** (บล็อก 4×4 ช่อง, `nolab` = วาดป้ายขาเอง, ชุด `NLT`): `gate` (A B Y VCC GND; `fn` AND/OR/NOT/NAND/NOR/XOR/XNOR ตาม `GFN`, `fam` HC/4000/LS ตาม `LFAM`, `st` ชมิตต์),
     `dff` (D CLK Q Q̄ VCC GND; ขอบขาขึ้น, `c._ck`), `opamp` (IN− IN+ OUT V+ V−; `A`, `gbw` MHz, `ro`, `hd`/`ld` สวิงห่างราง, `vmin`/`vmax`, `iq`, `isc` mA, `oc` = คอมพาราเตอร์ open collector)
     ฟังก์ชันร่วมของทั้ง solver ปกติและ `trRun`: `nlStamp(c, n, add, rhs, md)` (md = {ac, w} หรือ {h}), `nlUpdate(c, V, h, edge)` (สถานะ `_pw`, `_ib` บิตอินพุตพร้อมฮิสเทอรีซิส `lthr`, `_q`;
     ออปแอมป์ `_os` lin/hi/lo, `_sk` ทิศกระแสขาออก → รางที่จ่าย, `_x` สถานะขั้ว GBW), `nlRes` · ขาออกเกต = Norton ไป VCC/GND ผ่าน `roH`/`roL`; อินพุต CMOS 1 GΩ, TTL pull-up 20 kΩ
     ออปแอมป์: E = กลางไฟเลี้ยง + A·(V+ − V−) ผ่าน `ro` (AC: A/(1 + jf/fp), transient: ขั้วเดียวแบบ implicit, ตอนอิ่มตัวตั้ง `_x` ที่ราง กัน wind-up)
     ป้อนกลับบวก: `opUnstable` แก้ซ้ำด้วยการรบกวน e0 = 1 → dE/de0 < 0 = สมดุลไม่เสถียร → ดีดไปรางตรงข้ามกับ `_last` (ชมิตต์ทริกเกอร์/ออสซิลเลเตอร์ทำงานได้ทั้ง DC และตามเวลา)
     เมื่อโหมดตามเวลาทำงาน (`trOn`) solver ปกติไม่แตะสถานะเหล่านี้ · FORCE ของสโคปไม่ทำให้ D-FF จับขอบ · `nodeLinked` ใช้เตือนอินพุตลอย
   - **ไอซีลอจิกหลายขา** (`DIG[t] = {vcc, gnd, ins, outs, roH?, run(c, b, r)}` → บิตขาออก, −1 = Hi-Z; อยู่ใน `NLT` จึงใช้ `nlStamp`/`nlUpdate`/`nlRes` ร่วม,
     ขอบขาขึ้น `r` จาก `c._pb`, ขาออกใน `c._ob`): `cd4017` (CLK EN RST → Q0–Q9 CO, `_cnt`), `hc595` (SER SRCLK RCLK OE̅ MR̅ → Q0–Q7 Q7S, `_sr`/`_lt`),
     `cnt4` (CD4518 BCD / CD4520 ฐานสอง ตาม `mode`, CLK EN RST → Q0–Q3), `cd4511` (ขาออก a–g ด้านบน — วาง seg7 ไว้เหนือไอซีต่อตรงได้; A–D LT̅ BI̅ LE ด้านล่าง, `_lt`, เลข 6/9 ไม่มีหาง)
     ไมโครคอนโทรลเลอร์ `digitalWrite` แก้วงจรทันทีเมื่อมีไอซีจับขอบ (DIG/dff) เพื่อไม่พลาดขอบนาฬิกา · `shiftOut(data, clock, MSBFIRST|LSBFIRST, ค่า)`
   - ไอซีแอนะล็อก: `lm317` (IN ADJ OUT, NV 1, สถานะ `_rs` = reg: V(OUT) − V(ADJ) = `Vref` / do: V(IN) − V(OUT) = `drop` / off; กระแส ADJ 50 µA; รุ่น LM317T/LM317L/AMS1117-ADJ),
     `lm35` (+VS OUT GND; Norton `off + sl·temp` ผ่าน 100 Ω เมื่อไฟเลี้ยง ≥ `vmin`; รุ่น LM35DZ/TMP36)
   - โมดูลสื่อสาร (บล็อก, อยู่ใน `SENS` เพื่อตรวจไฟเลี้ยง `c._pw`): `rs485` (RO RE DE DI / VCC B A GND; รุ่น MAX485/MAX487/MAX3485 ต่างกันที่ `vmin`, `maxbd`),
     `rs232` (MAX3232: T1IN→T1OUT, R1IN→R1OUT, ขั้ว DB9), `lora` (E32/E22 UART โปร่งใส: M0 M1 RXD TXD AUX VCC GND; `band`, `ch`, `addr`, `sf`, `pw` dBm, `loc` m, `env`, `baud`),
     `term` (คอมพิวเตอร์ + เทอร์มินัล RS-232: TX RX GND, `baud`, `eol`; ช่องพิมพ์ส่งในแผงขวา → `termSend`, หน้าจอ `c._log`)
   - **อินเวอร์เตอร์** `vfd` (L1 L2 L3 / U V W / FWD REV DCM +10V AVI ACM / A B; NV 3 + จุดสตาร์ภายใน `c._star`): ขาออก = แหล่งแรงดัน 3 เฟสแบบ V/f
     (V_LL = inV·max(0.02, |f|/fb), ลำดับเฟสกลับเมื่อ REV) · ไฟเข้ากินกำลัง `_pout`/0.96 + 15 W · FWD/REV ดึงขึ้น 24 V ภายใน 4.7 kΩ (ต่อลง DCM = สั่ง), +10V ผ่าน 100 Ω, AVI 10 kΩ, DCM–ACM ร่วมกัน
     `vfdTick` (ใน discrete): `run` = di/kp/mb, `fsrc` = ai/kp/mb, ทางลาด `acc`/`dec` (0 ↔ fmax), `_f` มีเครื่องหมาย, ฟอลต์ `_flt` oC (> 2.2 × `vfdIn`) / oL (150% 60 s) / Lu (ไฟตกขณะเดิน)
     Modbus สเลฟ (`vfdSlave`, `vfdTables`): holding 0 คำสั่ง (บิต0 RUN, บิต1 REV, บิต7 รีเซ็ต), 1 ความถี่ ×0.01 Hz, 2 ความถี่ขาออก, 3 กระแส ×0.01 A, 4 สถานะ, 5 แรงดัน, 6 ฟอลต์, 7 DC bus
     `vfdFeed()` (ท้าย discrete) หามอเตอร์ที่ต่อกับ U/V/W (สาย + อุปกรณ์ที่นำ, k3 ที่ปิด, ol, pmeter) → `m._fs` = |f|/fb, `m._vfd`
   - `motY` ใช้สลิปจริง = `_fs − _sp` (ไฟบ้าน `_fs` ไม่มี = 1 → เหมือนเดิม) และ admittance ÷ fs (ขดลวด ∝ f) จึงไม่มีกระแสสตาร์ทสูงเมื่อขับด้วย VFD; ความเร็วเป้าหมาย = `_fs`
     · `spDirty(c, tg)` แก้วงจรอีกครั้งเมื่อความเร็วถึงเป้าพอดี · `motor3.tank`/`flow` = ขับปั๊มเติมถัง (แรงบิด ∝ n², จึงกำลัง ∝ n³ เมื่อมี VFD) · `tx420.tank` = วัดระดับถังจริง
   - หน้าสัมผัส `no`/`nc`/`k3` อ้างอิงคอยล์ (`coil`/`tmr`) ด้วยชื่อในฟิลด์ `ref`; ปั๊ม (`tank`) และลูกลอย (`ref`) อ้างอิงถังด้วยชื่อ
2. **โทโพโลยี** — สายต่อกันเฉพาะที่ปลายสายร่วมกัน (โหนด = จุดกริด); สายที่ตัดหรือผ่านมุม/ปลายสาย/ขั้วอื่นกลางเส้นไม่เชื่อมกัน
   - `normalize(full)` ลบสายซ้ำ และแยกสายเฉพาะที่จุดใน `splitPts` (`markSplit`) = ปลายสองข้างของสายที่เพิ่งลาก (ต่อแบบ T เข้ากลางสายอื่น)
     และขั้วของอุปกรณ์ที่เพิ่งวาง/ย้าย/หมุน · `full = true` (ข้อมูลจาก `build()` มี `raw:true`) แยกทุกจุดปลายสาย/ขั้วแบบเดิม — ไฟล์ที่บันทึกแล้วไม่ถูกแยกซ้ำ
   - จุดที่สายผ่านโดยไม่ต่อ (ปลายสาย/ขั้วกลางเส้น, สายตั้งตัดสายนอน) วาดเป็นสะพานโค้ง (`wireHops`, `hopLine`); `wirePts` เลือกทิศหักมุมไม่ให้มุมตกบนจุดต่อที่มีอยู่
   - ย้าย/หมุนอุปกรณ์: `followInit(c)` จำสายเดิม + ขั้วที่ชนกับขั้วอุปกรณ์อื่น แล้ว `followApply(c, F)` ย้ายปลายสายตามขั้วใหม่ (เอียง → หักฉาก โดยมุมต้องไม่อยู่ในกรอบอุปกรณ์ `compBox`;
     ขั้วที่เคยชนกันได้สายเชื่อมใหม่) · Alt + ลาก = ย้ายโดยไม่พาสาย · `hitPin` เลือกขั้ว/ปลายสายที่ใกล้ที่สุดในระยะ `pinTol` (≈10 px บนจอ, สัมผัส 18 px, 0.22–0.45 ช่อง)
3. **โมเดลไฟฟ้า** — `solveAll()` ใช้ Modified Nodal Analysis
   - แก้ 2 ครั้ง: DC (จำนวนจริง, `rsolve`) และ AC phasor (จำนวนเชิงซ้อน, `csolve`) แล้วรวมกันแบบ superposition
   - ทุกจุดกริดที่ใช้ = 1 โหนด, สายไฟ = 1 mΩ (`GW=1e3`), `GMIN=1e-9` ทุกโหนด; มอเตอร์ 3 เฟสมีโหนดจุดสตาร์ภายใน (`c._star`)
   - โหลดเหนี่ยวนำใช้ `yInd(V,S,pf)`; `admit(c,isAC,w)` คืน admittance ของอุปกรณ์ 2 ขั้วแบบพาสซีฟ
   - แหล่งจ่าย/LED/PSU/หม้อแปลงใช้ตัวแปรกระแสเพิ่ม (`NV`, ดัชนีใน `c._kv`) ใช้ดัชนีเดียวกันทั้ง DC และ AC
   - แหล่งจ่ายไฟบ้าน/3 เฟสต่อ N ลงดิน; ขั้ว N ของ `src1`/`src3` มีความต้านทานแหล่ง 0.05 Ω
   - วนแก้ซ้ำสำหรับสถานะพีชคณิต: LED on/off/เสีย, รอยต่อ PN (`JUNC`), BJT, MOSFET, 78xx, ออปโต, หลอดขาด, คอยล์ไหม้, PSU on/โหลดเกิน, ทรานสมิตเตอร์ 4–20 mA
   - ผลลัพธ์อยู่ใน `RES.comp[id]` (`v`,`i` = {d,r,i}, `Vr`,`Ir` = RMS, `P`,`Q`, `ac`; บล็อกมีฟิลด์เฉพาะ เช่น `ph`, `Iph`, `pw`, `inp`),
     `RES.wire`, `RES.src`, `RES.nvv` (แรงดันโหนด), `RES.net` (เส้นสายที่ต่อถึงกันด้วยสายไฟล้วน ใช้ตรวจ RS-485)
4. **PLC** — `compile()`/`ev()` สำหรับโหมดข้อความ, `runLadder()` สำหรับแลดเดอร์,
   `validateLad()` ตรวจตำแหน่ง, `plcScan()` สแกนทุกเฟรม, อิมเมจหน่วยความจำจาก `newImage()` (I0–7, Q0–3, M0–31, T0–7, D0–31 รีจิสเตอร์ 16 บิต)
   - รีจิสเตอร์ D: `numA`/`setD` (0–65535) · เปรียบเทียบ `GT`/`LT` ใช้ AI0/AI1 หรือ Dn (`isNumA`) · ข้อความ `D8 := D0 / 4 + AI0` (นิพจน์ตัวเลข `evn`) · แลดเดอร์เอาต์พุต `MOV` (`{k:'MOV', a:'D8', p:ตัวเลข|'D0'|'AI0'}`)
   - **Modbus RTU 2 พอร์ต** (`plcPorts(p)`): #1 = A/B ฟิลด์ `mbOn`, `mbMode`, `mbId`, `mbBaud`, `mbList`; #2 = A2/B2 ฟิลด์ `mb2*` — แต่ละพอร์ตเป็นมาสเตอร์หรือสเลฟได้อิสระพร้อมกัน
     สถานะรันไทม์ต่อพอร์ตอยู่ใน `rt` (#1 = ตัว PLC เอง: `p._mb`, `p._mbs`, `p._mbrx`, `p._mbBusy`, `p._mbp`; #2 = `p._p2`) · `busPorts(o)` คืนจุดต่อบัสของแต่ละอุปกรณ์
   - **Modbus TCP / Ethernet**: ฟิลด์ `ip`, `ethSrv` (เซิร์ฟเวอร์ พอร์ต 502, ค่าเริ่มต้นเปิด), `mbtOn`, `mbtList` (บรรทัดละ `IP Unit ฟังก์ชัน แอดเดรส จำนวน รีจิสเตอร์PLC`) — เป็นพอร์ตที่ 3 ใน `plcPorts` (`tcp:true`, rt = `p._p3`)
     เครือข่าย `ethLan()`: ขา ETH (`ethIdx`) ของ PLC/HMI ต่อถึงกันตรง ๆ หรือผ่านสวิตช์ `ethsw` (มีไฟ 24 V → ทุกพอร์ตรวมเป็นวงเดียว); `ethFind(src, ip)` ตรวจลิงก์, IP, ซับเน็ต /24
     `ethSend(rt, src, ip, เฟรมRTU)` สร้าง MBAP (`tcpAdu`) แล้วเข้าคิว `dst._tcprx` → `plcTcpServer` ตอบด้วย `mbServe` + `plcMbTables` (ไม่สน Unit ID) → คำตอบเข้าคิว `rt._mbrx` เป็นเฟรมแบบ RTU (มี CRC) เพื่อใช้ `mbCheck`/`mbHandle` เดิม
     HMI `proto = 'tcp'`: `ip`, `srvIp` (IP ของ PLC) · เตือน IP ซ้ำ (IP conflict) / IP ไม่ถูกต้อง · IP ของทุกอุปกรณ์อ่านด้วย `ipOf(o)`
   - **Wi-Fi**: `wifiap` (ขา 24V 0V ETH; `ssid`, `pass`, `ip` เกตเวย์, `pw` dBm) เป็นสมาชิก LAN ผ่านขา ETH · บอร์ดที่มี `MCU[t].wifi` (ESP32, ฟิลด์ `wdist` m ถึง AP)
     ไลบรารี `WiFi` (begin/status/localIP/RSSI/disconnect, `WL_*`) สถานะใน `vm.wifi` — เชื่อมต่อหลัง ~1.5 s ถ้า SSID/รหัสตรงและ RSSI = pw − 40 − 30·log10(d) ≥ −90 (`wifiResolve`),
     IP จาก DHCP = 3 ชุดแรกของ AP + (100 + id); `wifiUpkeep` ทุกสเต็ป: หลุดเมื่อไกล/AP ดับ แล้วต่อใหม่เองทุก ~3 s · `ethLan` รวมไคลเอนต์ Wi-Fi เข้า LAN ของ AP
     `ModbusTCPClient` (แบบ ArduinoModbus: begin(ip, 502), connected, coilRead/discreteInputRead/holdingRegisterRead/inputRegisterRead, coilWrite/holdingRegisterWrite, lastError)
     เรียก `tcpCall` → `mbServe` ของ PLC ทันที (สถิติ `vm.mbtcp`) · `IPAddress`, `WiFiClient`, `const char*` รองรับใน `cToJs`
   - **มาสเตอร์**: `mbList` (บรรทัดละ `สเลฟ ฟังก์ชัน แอดเดรส จำนวน รีจิสเตอร์PLC`, ฟังก์ชัน 1 2 3 4 5 6 15 16; บิต ↔ M/Q, รีจิสเตอร์ ↔ D; `mbParse`)
     **สเลฟ** (`mbMode = 'slave'`, `mbId`): `plcSlave` ตอบคำขอใน `p._mbrx` ผ่าน `mbServe` + `plcMbTables` — คอยล์ 0–31 = M, 100–103 = Q · อินพุต 0–7 = I · holding 0–31 = D · input reg 0–1 = AI×10; สถิติ `p._mbs`
     บัส RS-485 รวมที่ `busDeliver(src, A, B, data, baud, at)` (MAX485 → RO, PLC/HMI ที่เปิด Modbus → `_mbrx`) · `mbCheck` ตรวจคำตอบ (CRC, ID, ข้อยกเว้น)
     `plcModbus` ส่งทีละบรรทัด (`mbRequest` + `crc16`/`mbFrame`, `plcBusSend` → MAX485 บนบัส) รอคำตอบใน `p._mbrx` (ส่งเข้ามาจาก `rs485Tx`) หมดเวลา 0.3 s → `mbHandle` (CRC, ข้อยกเว้น `MB_EXC`), สถิติ `p._mb`
   - **ตัวนับ** C0–C7 (`img.C[n] = {pre, cv, q, last}`, `ctr`): ข้อความ `C0 := CTU(นับ, รีเซ็ต, ค่าตั้ง)` / `CTD(นับลง, โหลด, ค่าตั้ง)`, `RST C0 := expr`; แลดเดอร์เอาต์พุต `CTU` (`{k:'CTU', a:'C0', p}`) + `RST C0`
     ค่า `CV0`–`CV7` ใช้เป็นตัวเลขได้ (`isNumA`) · ปลายทางตัวเลข `isNumDst` = Dn / AQ0 / CVn · ข้อความ `D1 := 60 IF NOT M2` (เงื่อนไขท้ายบรรทัด)
     แลดเดอร์ MOV รับนิพจน์ (`movVal`/`nexpr`/`movOk`, เช่น `D10/10`)
   - **AQ0** (ขาสุดท้ายของ `PLC_PINS`, 0–100% → 0–10 V เทียบ AM ผ่าน 100 Ω, `img.AQ`) · `aim` = '420' (250 Ω) | '010' (20 kΩ, AI = V × 10%)
   - **PID** (`pidList` บรรทัดละวง `EN PV SP MV Kp Ti Td [ต่ำ สูง]`, `pidParse`/`plcPid` ทุกสแกนหลังโปรแกรม): e = SP − PV, อนุพันธ์จาก PV, จำกัด 0–100% กัน wind-up,
     สเกลเป็น ต่ำ…สูง ลง MV; EN = 0 → MV = ต่ำ รีเซ็ตอินทิกรัล; สถานะ `p._pid[i] = {I, u, e, pv, sp}`
   - ขั้ว PLC: L+, M (ไฟเลี้ยง 24 VDC), COM, I0–I7 (ON เมื่อ |V| ≥ 15 V เทียบ COM: ใช้ได้ทั้ง sink/source), C–Q0..Q3 (หน้าสัมผัสรีเลย์), A/B (RS-485 #1), A2/B2 (RS-485 #2), ETH (Ethernet, ต่อท้าย `PLC_PINS` เพื่อไม่ให้ดัชนีขาเดิมเลื่อน),
     AI0/AI1–AM (อินพุต 4–20 mA ผ่าน 250 Ω, อ่านเป็น 0–100% ใน `img.AI`)
   - เปรียบเทียบแอนะล็อก: แลดเดอร์ช่องชนิด `GT`/`LT` (`{k, a:'AI0', p:ค่า}`), ข้อความ `AI0 > 75` (`>`, `<`, `>=`, `<=`)
   - แลดเดอร์: รัง = `{cmt, rows:[{cells:[LC=7], out}], links:[rows-1][LC+1]}`
     ไฟไหลซ้ายไปขวาผ่านช่อง เส้นแนวตั้ง (`links`) ไหลได้สองทาง ช่องว่างในช่วงของแถว (`rowSpan`) = เส้นตรง
     ผลการไหลเก็บใน `plc._mon` เพื่อมอนิเตอร์
   - HMI: `proto` = `link` (ลิงก์ตรงแบบเดิม: `hmiLink` ตรวจ A–A/B–B แล้วเขียนบิตของ PLC โดยตรง) | `modbus` (HMI = มาสเตอร์ `hmiModbus`: ปุ่มกด/ปล่อย → FC05 คอยล์,
     ไฟ M/Q → FC01, I → FC02, D → FC03 แสดงตัวเลข; ค่าใน `h._mbv`, สถิติ `h._mb`, `sid`, `baud`) — `hmiVal(h, a)` ใช้ได้ทั้งสองโหมด
   - ข้อความ: `Q0 := expr`, `SET Q1 := expr`, `RST Q1 := expr`, `T0 := TON(expr, วินาที)`; ตัวดำเนินการ AND/OR/NOT (& | !)
   - โปรแกรมที่คอมไพล์แล้วแคชใน `plc._cp` — ลบทิ้ง (`delete p._cp`) ทุกครั้งที่แก้โปรแกรม
   - ไมโครคอนโทรลเลอร์: บอร์ดนิยามใน `MCU` (สร้างด้วย `mkBoard`: ขา, `role` ต่อขา = GPIO/G/V5/V33, `vcc`, `bits` ของ ADC, `rout`, `imax`, `adc`, `pwm`, `inOnly`)
     โค้ดสไตล์ Arduino เก็บใน `c.code`; `cToJs()` แปลงเป็น JavaScript generator (`delay` → `yield`, ฟังก์ชันผู้ใช้เรียกด้วย `yield*`,
     ลูปแทรก `__chk` กันค้าง) แล้ว `compileSketch()` รันด้วย API จาก `mcuApi()`; สถานะรันไทม์อยู่ใน `c._vm` (`mcuBoot`, `runVm`)
     ขา GPIO ในวงจร: OUTPUT = Norton Vcc/0 ผ่าน `rout`, PWM = Vcc ผ่าน `rout/duty`, INPUT_PULLUP = 35 kΩ ไป Vcc, INPUT = 100 MΩ
     การอ่านขาหลังเปลี่ยนสถานะขาจะแก้วงจรใหม่ก่อน (`vm.dirty`)
     ตัวแปรจำนวนเต็มที่ประกาศพร้อมค่าเริ่มต้นถูกตัดเศษด้วย `__i()` (`wrapInts`); การกำหนดค่าภายหลังยังเป็นทศนิยม
     ไลบรารีจำลอง: `DHT` (readTemperature/readHumidity), `Servo` (attach/write/read), `pulseIn` (HC-SR04), `tone`/`noTone`
     **พอร์ตอนุกรม** (`mkPort` ใน `mcuApi`, สถานะใน `vm.uarts`): `Serial` = Serial Monitor (รับข้อความจากช่องพิมพ์ใต้ Serial Monitor), `SoftwareSerial s(rx, tx)` ทุกบอร์ด,
     `MCU[t].uarts`: ESP32 `Serial2` (16/17), `Serial1` (ต้องระบุขาใน begin), Pico `Serial1` (GP1/GP0), `Serial2` (GP5/GP4) — begin(baud[, cfg, rx, tx]), print/println/write,
     available/read/peek/readString/readStringUntil/parseInt/parseFloat; `read()` คืนอักขระ 1 ตัว (สตริง) หรือ −1; การอ่านแบบรอดึงก้อนที่ตามมาในคิวภายใน 1 s (เลียนแบบ timeout)
     ไลบรารี `ModbusRTUSlave modbus(พอร์ต, ขาDE)`: configureCoils/DiscreteInputs/HoldingRegisters/InputRegisters(อาร์เรย์, n), begin(ID, บอด), poll() — ตอบเฟรม/ข้อยกเว้น สลับ DE เอง, สถิติ `vm.mb`
     String แบบ Arduino: `.length()`, `s.trim();`/`toUpperCase();` (แก้ในตัว), `toInt()`, `toFloat()`, `equals()` (เพิ่มใน `String.prototype`)
   - **การสื่อสาร** (`commSend(net, data, baud, src, at)`): ข้อความเดินตาม `RES.net` จากขา TX → ขารับของบอร์ด / DI ของ `rs485` (`rs485Tx`: ต้อง DE = HIGH, ปลายทาง RE = LOW,
     A/B ต้องตรงกัน สลับ = ข้อมูลกลับบิต `invMix`) / T1IN–R1IN ของ `rs232` / RXD ของ `lora` (`loraTx`: ช่อง/แบนด์/SF/แอดเดรสตรงกัน, M0 = M1 = LOW, ลิงก์ `loraLink`:
     RSSI = pw − (PL1m + 10·n·log d) ≥ `LORA_SENS[sf]`, หน่วง `loraAir`) / RX ของ `term`; เวลาถึง = คิวผู้ส่ง + ไบต์ × 10/บอด; บอดต่างเกิน 3% → `baudMix` (อักขระขยะ)
     · TTL ต่อเข้า RS-232 ตรง → กลับขั้ว + เตือน
   - **ไฟฟ้าบนบัส RS-485**: อินพุตตัวรับดึง A/B ไปราว Vcc/2 (12 kΩ, MAX487 48 kΩ), ตัวขับทำงานช่วงส่ง (`busDrive` → `_drvUntil`/`_drv`, `busDrvTick` ใน discrete): A → Vcc, B → GND ผ่าน 25 Ω,
     ไบแอส fail-safe ของโมดูล `bias` = none/20k/680 · PLC/HMI ใช้ `busStamp` (อ้างอิง M/0V) — บัสว่างที่มีปลายสาย 120 Ω สองปลายวัด A−B ≈ 0 V เป็นเรื่องปกติ
     โมดูลเซนเซอร์ถูกค้นด้วย `sensorAt(ชนิด, ขาของเซนเซอร์, ขาบอร์ด)` ผ่าน `RES.net`; เซอร์โวหาขาที่ควบคุมด้วย `servoTarget()`
   - **จำลองตามเวลา (transient)** `trRun(dt)` — ใช้แทนผล phasor เมื่อ `trApplicable()`: อุปกรณ์ทุกตัวอยู่ใน `TR_OK` และ (มี `cap`/`ind` หรือ มีแหล่ง AC + รอยต่อ PN/ลอจิก/ออปแอมป์)
     สเต็ปย่อย ≈ 100 µs (≥ 200 จุด/คาบ), ตัวเก็บประจุ/ขดลวดแบบ BDF2 (Gear อันดับ 2, สถานะ `_vc`/`_il`), รอยต่อ PN แบบ piecewise (`trJ`, LED = Vf + 1 Ω) วนหาสถานะ ≤ 25 รอบ,
     LU หนาแน่น (`luFactor`/`luSolve`) แคชตามชุดสถานะรอยต่อ · บัฟเฟอร์รูปคลื่นทุกโหนด 1 s (`TR.tw`, อ่านด้วย `trNodeAt(k, t)`)
     ผลใน RES จากคาบเต็มล่าสุด: `v.d` = ค่าเฉลี่ย, `v.r/v.i` = ฮาร์มอนิกหลัก (DFT), `Vr` = True RMS, `Vdc`/`Vac`; `bridge` มี `Vdc`, `Vrip`, `Idc`; `RES.trans = true`
     สโคปอ่านบัฟเฟอร์โดยตรง (ความถี่จากจุดตัดจริง `scCross`), มิเตอร์ `am`/`vm` มี `mode` = rms/dc/ac · ไม่รองรับ: 3 เฟส, มอเตอร์, MCU/PLC, อิเล็กทรอนิกส์บล็อกอื่น (กลับไปใช้ solver เดิม)
     · หม้อแปลงในโหมดนี้ไม่มีความเหนี่ยวนำแม่เหล็ก (ผ่าน DC ได้) · `bridge` ไดโอดบริดจ์ (~1 ~2 + −, รุ่น KBP206/GBU808/KBPC3510)
5. **พฤติกรรมตามเวลา** — `discrete(dt)` (คอยล์/ไทเมอร์, เบรกเกอร์ทริป, PSU retry, ลูกลอย, HMI link, PLC scan, รันโค้ดไมโครคอนโทรลเลอร์เมื่อ dt > 0)
   และ `continuous(dt)` (ความเร็วมอเตอร์, ลำดับเฟส 3 เฟส, หลอดฟลูออเรสเซนต์, ระดับน้ำ)
   - `step(dt)`: continuous → `facStep` → discrete → `settle()` (แก้วงจรซ้ำสูงสุด 8 รอบ ถ้าสถานะเปลี่ยน) → `trRun` ถ้าใช้โหมดตามเวลาได้ → `scopeRecord`
   - ลูปหลัก `frame()` แบ่งเวลาเป็นช่วงละ ≤ 0.05 s ตามความเร็วจำลองที่เลือก
6. **State/ประวัติ** — `ser()`, `load()`, `commit()`, `pushHist()`, `undo()`; บันทึกลง localStorage คีย์ `circuit-board-v2`
   ฟิลด์ที่ขึ้นต้นด้วย `_` เป็นสถานะรันไทม์ ไม่ถูกบันทึก
7. **ตัวอย่าง** — `EX` (series, parallel, mixed, led, home, dol, plcpump, arduino, esp32, pico, ardsense, espgarden, plcsense, indsense, rs485, lora, rs232, modbus, plc2port, hmimodbus, modbustcp, esp32wifi, lcdi2c, rectifier, halfwave, rccharge, logic, flipflop, opamp, opamposc, chaser, cnt7seg, shift595, lm317, tempalarm, ceamp, semi, timer555, pidtank, counter, motor, stardelta, rcdtest, pfc, stair, factory, seqconv, gate, pickplace, lift, elevator, osc, oscxy, oscprobe, blank) — dol/stardelta/plcpump/pico มีฉาก 3D ผูกมาด้วย สร้างด้วย `build((C,W)=>…)`
8. **การวาด** — canvas, `drawTwo()` (อุปกรณ์ 2 ขั้ว, วาดในพิกัดท้องถิ่นที่หมุนแล้ว), `drawBlock()`, `labelTwo()`, `drawFlow()` (จุดกระแส: DC ไหลทางเดียว, AC แกว่งตามมุมเฟส)
   - สีสาย: L1 น้ำตาล, L2 ดำ, L3 เทา (ตามมุมเฟส), N/สายกลับฟ้า, DC + แดง
9. **แผงขวา (inspector)** — `F` = สเปกฟิลด์ของแต่ละชนิด, `NOTES`, `compHTML()`, `warnList()`
10. **ตัวเขียนโปรแกรม** — ลิ้นชักด้านล่าง `#lad` ใช้ร่วมกันระหว่าง PLC และไมโครคอนโทรลเลอร์ (`drawerTarget()` เลือกเป้าหมาย):
    PLC ใช้ `ladStruct()` สร้างโครง, `rungSVG()` วาดรัง, `ladMon()` อัปเดตสด; ไมโครคอนโทรลเลอร์ใช้ `mcuStruct()` (โค้ด + Serial Monitor) และ `mcuMon()`
    **เติมคำสั่งอัตโนมัติ** (`acAttach` บน `#mcode`, ป๊อปอัป `#acpop` ใน body): พิมพ์ตัวอักษร/`#` → `AC_CORE` (ฟังก์ชัน Arduino, ค่าคงที่, ชนิดข้อมูล, โครง if/for/setup/blink, ไลบรารี; ตัวที่มี `'esp32'` แสดงเฉพาะ ESP32)
    + ตัวแปร/ฟังก์ชัน/ออบเจ็กต์ที่ผู้ใช้ประกาศ (`acUser`); "ชื่อ." → เมธอดตามชนิด (`AC_MEM`: Serial, Servo, DHT, LiquidCrystal_I2C, Wire, WiFi, ModbusTCPClient, ModbusRTUSlave, String, SoftwareSerial)
    ไม่เด้งในคอมเมนต์/สตริง (`acCtx`) · ↑↓ Enter/Tab Esc Ctrl+Space (`acKey`) · ใส่ฟังก์ชันแล้วเลือกอาร์กิวเมนต์แรก, Tab ในวงเล็บ → อาร์กิวเมนต์ถัดไป (`acNextArg`) · ตำแหน่งเคอร์เซอร์ `acCaret` (div จำลอง)
    เพิ่มฟังก์ชันใหม่ใน `mcuApi` แล้วควรเพิ่มใน `AC_CORE`/`AC_MEM` ด้วย
    **ระบายสี + ตรวจโค้ด**: `.cedit` = เลขบรรทัด `#cgut` + `<pre id="chl">` ใต้ textarea โปร่งใส (ฟอนต์/padding/การตัดบรรทัดเดียวกัน, `edScroll` เลื่อนตาม, padding ขวาชดเชยสกรอลบาร์)
    `edTokens` → คลาส hk/ht/hf/hc/hs/hn/hm/hp/ho (สี CSS `--hkw` …) · `edRender` วาดทุกครั้งที่พิมพ์, `edLintSoon` ตรวจหลังหยุดพิมพ์ 350 ms → `c._lint`
    `codeLint(code, c)` → [{line, sev e/w, msg, col, len}]: สตริง/คอมเมนต์ไม่ปิด (`edClean`), วงเล็บไม่คู่, ขาด ; (ฮิวริสติก), ฟังก์ชัน/เมธอด/ค่าคงที่ไม่รู้จัก + แนะนำชื่อใกล้ (`edNear`, Damerau ≤ 1–2; รู้จักจาก `AC_CORE`, คีย์ของ `mcuApi`, `AC_MEM_X`),
    = ในเงื่อนไข (เตือน), ไม่มี setup/loop, แล้วจึงคอมไพล์จริง → SyntaxError หาบรรทัดด้วย `edSyntaxLine` (สคริปต์ทดลอง + lineno) — **`cToJs` ต้องรักษาจำนวนบรรทัด** (คอมเมนต์ /* */ เก็บ \n, regex ใช้ `^[ \t]*`)
    แสดง: จุดแดง/เหลืองที่เลขบรรทัด (คลิกไปบรรทัด), พื้นหลังบรรทัด, ขีดหยัก `.sq`, ข้อความท้ายบรรทัด `.lens`, รายการใน `#ladmsg` (`data-goto`) · อัปโหลดเมื่อมีข้อผิดพลาด → ถามยืนยัน

11. **โรงงาน 3D** — ฉากประกอบจากชิ้นเครื่องจักรที่ผู้ใช้จัดวางเอง วาดด้วย WebGL โดยตรงใน `#fx` ไม่ใช้ไลบรารี (ออกแบบฉากเอง)
    - state: `S.fac = {items:[{id, k, x, z, r, …}], btn:[ชื่อปุ่มกดบนแผง]}` (บันทึก/undo ได้) · `k` คือชนิดใน `FKIND`
      (`conv` สายพาน (ลาดเอียงได้: `h` → `h2`), `roller`, `lift` ลิฟต์ยกชิ้นงาน, `elev` ลิฟต์โดยสาร, `emit` ตัวปล่อยกล่อง, `push` กระบอกลม, `stop` ตัวกั้น, `robot` แขนหยิบวางแกนทรี, `photo`, `prox`, `bin`, `station` แท่นปุ่มกด,
      `light`, `beacon` ไฟหมุน, `traffic` ไฟจราจร, `fan` พัดลม, `tank` (+ใบกวน `ag`), `pump`, `gate` ประตูเลื่อน, `fence`, `cab`)
      `FKIND[k] = {nm, d ค่าเริ่มต้น, fp(i) ขอบเขตท้องถิ่น [a0,a1,b0,b1]}`; ป้าย/ชนิดฟิลด์อยู่ใน `FFLD` (ชนิด `bind` = **ชื่ออุปกรณ์บนแผง**, หาด้วย `fcomp(ชื่อ)`)
      ห้ามใช้ชื่อฟิลด์ `r` (การหมุน 0–3), `k`, `x`, `z`, `id` กับความหมายอื่น · พิกัดท้องถิ่น ↔ โลกใช้ `fLoc`/`fWorld` (a ตามทิศ `FDIR[r]`, b ด้านข้าง)
    - การเชื่อมกับแผง: มอเตอร์ (`_sp`, `_dir`, `_run`) → สายพาน/ปั๊ม/ประตู/พัดลม, คอยล์ (`_on`) → กระบอกลม/ตัวกั้น (มีไฟ = เปิดทาง)/แขนหยิบวาง (ขอบขาขึ้น = เริ่มรอบ,
      ตั้ง `det` ของเซนเซอร์ที่ผูกเมื่อ "พร้อม"), `flit(ชื่อ)` = อุปกรณ์ทำงานอยู่ (หลอด/LED/คอยล์/มอเตอร์) → ไฟสัญญาณ, ปุ่มบนแท่นปุ่มกดในฉาก → `fxPress()` กดปุ่มบนแผง,
      กล่องในฉาก → `det` ของเซนเซอร์, ตำแหน่งประตู → `act` ของลิมิตสวิตช์ (ตั้งแล้ว `needSolve`), ถังน้ำ 3D อ่าน `lvl` ของถังบนแผง
    - `facStep(dt)` (เรียกใน `step` หลัง `continuous`): กล่องเคลื่อนตามตัวพา (`facCarrier`) ที่อยู่ใต้, ไม่ทับกัน (รอคิว), ไม่มีตัวพา → ตก; ตกในถัง → นับใน `FXS.cnt`
      (`metal`/`other` ลงถังถูก, `miss` โลหะลงถัง `other`, `wrong` ไม่ใช่โลหะลงถัง `metal`, `floor` ตกพื้น) · สุ่มแบบมี seed เพื่อให้ทดสอบซ้ำได้
      สถานะรันไทม์ต่อชิ้นอยู่ใน `FXS.rt[id]` (`frt(i)`), ไม่ถูกบันทึก, `facReset()` ตอน `load`
    - ฉากสำเร็จรูป `facPreset('sort'|'seq'|'pick'|'lift'|'elev'|'tank'|'gate'|'fan'|'traffic'|'empty')`; ไฟล์เก่าที่มี `fac.map` ถูกแปลงเป็นฉาก `sort`
    - **หลายระดับ**: ชิ้นที่ทำงานระดับสายพานมี `h` (ความสูงผิวบน, ค่าเริ่มต้น 0.8 m; `fH(i)`); `facSurf(i, a)` คืนความสูงผิวตัวพา ณ ตำแหน่ง a
      `facCarrier(b, any)` คืน `[ตัวพา, y ของกล่อง, a]` เฉพาะตัวพาที่อยู่ระดับเดียวกับกล่อง (±0.2 m) — กล่องที่ตกจะลงบนตัวพาระดับล่างได้ (`any`)
      เซนเซอร์/กระบอกลม/ตัวกั้นทำงานเฉพาะกับกล่องระดับเดียวกัน (`fNear`); ตอนวาดยกทั้งชุดด้วย `yo` · สายพานลาดเอียงวาดด้วย `IB` (กล่องเอียงตามแนวลาด)
    - ลิฟต์ (`lift`): คอยล์ `yu`/`yd` เลื่อนแท่น 0.5 m/s ระหว่าง `h` กับ `h2` (`rt.p` 0–1), ตั้ง `act` ของลิมิต `lo`/`hi` และ `det` ของเซนเซอร์ `s` เมื่อแท่นรับกล่องไว้;
      สายพานบนแท่น (`rt.dv`) ดึงกล่องเข้ากลางที่ชั้นล่างและส่งออกที่ชั้นบนเอง
    - ลิฟต์โดยสาร (`elev`): `fl` ชั้น (2–4) สูงชั้นละ `fh`; มอเตอร์ `m` (`_run`, `_sp`, `_dir`) → 0.5 m/s, `rt.p` = ความสูงห้องโดยสาร, ลิมิต `l1`–`l4` ทำงานในช่วง ±6 cm ของแต่ละชั้น,
      ประตูห้องโดยสาร (`rt.ang`) เปิดเมื่อจอดตรงชั้นและ `flit(dr)`; ชนสุดปล่อง → `rt.over` · ตัวอย่าง `elevator` (ฉาก `elev`): PLC จำการเรียก (M1–M3) ชั้นล่าสุด (M11–M13) แวะชั้นที่เรียกระหว่างทาง ประตูเปิด 3 s
    - สายพานมีความเร็วของตัวเอง (`rt.v`): เร่งตามมอเตอร์ แต่หยุดใน ≈ 0.25 s เมื่อตัดไฟ (เกียร์) · กล่องที่ถูกแขนจับ (`held`) ไม่คิดฟิสิกส์
    - ตัววาด: จุดยอด 10 ค่า (ตำแหน่ง, นอร์มัล, สี, ความมันวาว) ใน `VB`; ชิ้นส่วนพื้นฐาน `fbox`, `obox` (กล่องเอียงได้), `fcyl` (ทรงกระบอก/ส่วนโค้ง);
      แสงต่อพิกเซล (hemisphere + Blinn) และเงาตกพื้นแบบฉายระนาบ + stencil (รอบที่สอง `sh = 1` เฉพาะจุดยอดหลัง `fx.nFloor`); ท้องฟ้าเป็น CSS gradient (`--sky1/2`)
      uniform ที่ใช้ร่วมสอง shader ต้องประกาศ precision ให้ตรงกัน (`mediump`) ไม่เช่นนั้นลิงก์ไม่ผ่าน
    - `facScene()` สร้างรูปทรงทั้งฉากทุกเฟรม, `fxDraw()` วาด + ป้ายชื่อ HTML ใน `#flab`, `fxHud()` แผงควบคุม/แก้ไขใน `#fhud` (สร้างใหม่เมื่อคีย์เปลี่ยน — เพิ่ม `fx.hv` เมื่อฉากเปลี่ยน)
    - โหมดแก้ไข (`fx.edit`): `fxPick` เลือกชิ้นจากรังสีเมาส์ (`fxRay`) ตัดระนาบ, ลากย้ายบนพื้น (สแนป 0.1 m), หมุน/ทำซ้ำ/ลบ/แก้ค่า → `facEdited()` (commit)
    - `setView('off'|'split'|'full')` สลับมุมมอง; โหลดตัวอย่างที่มี `fac` จะเปิดแบ่งจอและเล็งกล้องกลางฉาก (`fxFrame`)

12. **ออสซิลโลสโคป** — อุปกรณ์ `scope` (ขา CH1, CH2, ⏚ กราวด์โพรบ; โพรบ 1 MΩ; `earth` = กราวด์โพรบต่อสายดินผ่าน 0.1 Ω) + หน้าต่าง `#scopewin`
    - ตั้งค่าเป็นฟิลด์ที่บันทึกได้: `vdiv1/2`, `pos1/2` (ช่อง), `cpl1/2` DC/AC, `on2`, `tdiv`, `trig` '1'/'2', `slope` up/down, `tlev`, `run`
    - `scopeRefresh()` (ทุก 200 ms ใน `frame` และใน `__sim.scope`) สร้าง `c._cap = {roll, T, t0, trig, ch:[{mn, mx (Float32Array 600 คอลัมน์), max, min, avg, rms, f, duty, src}]}`
    - โหมดเร็ว (`tdiv < 0.1`): v(t) = DC + √2·|เฟเซอร์|·sin(2π·RES.f·t + φ) + สัญญาณสวิตชิ่ง; สวิตชิ่ง (`scopeSwitchers`: PWM/tone ของไมโครคอนโทรลเลอร์,
      NE555 ที่ `_fast`) หาระดับจริงด้วยการแก้วงจรซ้ำโดยตั้ง `FORCE = {c, p, v}` (stamp ของขา MCU และ NE555 อ่าน `FORCE`) แล้วแก้วงจรปกติคืน
      ความถี่ PWM: Uno 490 Hz (ขา 5, 6 = 980 Hz), ESP32/Pico 1 kHz · ทริกเกอร์หาจุดตัดระดับแรกภายใน 1.5 คาบ
    - **เฟรมอนุกรม (UART/RS-485)**: ทุกการส่งถูกบันทึกใน `COMM_HIST` (`commRec(c, p, data, baud, at)`: p = ขา TX ของบอร์ด, `'drv'` ตัวขับ MAX485, `'ro'` ขา RO ฝั่งรับ, `'port'+k` PLC, `'port'` HMI)
      `scopeRefresh` เลือกก้อนล่าสุด (ภายใน 0.4 s, รวมก้อนที่ส่งติดกันจากผู้ส่งเดียวกัน) แล้วหาระดับ mark/space ที่ปลายโพรบด้วย `FORCE = {c, p, v}` (stamp ของ rs485/PLC/HMI/MCU อ่าน FORCE)
      สัญญาณที่ไม่ใช่ UART บันทึกด้วย `waveRec(c, p, t0, idle, segs, dec)` (ลำดับช่วง [ระยะเวลา, บิต]) และอ่านด้วย `waveBit`:
      DHT11/22 (`dhtWave`: start → 80/80 µs → 40 บิต 26/70 µs, FORCE `'data'` ดึงลง), HC-SR04 (`pulseIn`: TRIG 10 µs ที่ขาบอร์ด + ECHO = ระยะ × 58.3 µs, FORCE `'echo'`)
      ระดับไฟฟ้าจริง: RS-232 T1OUT ±5.4 V (`'t1out'`, mark = ลบ), R1OUT TTL (`'r1out'`), PC `term` TX ±12 V (`'tx'`), LoRa TXD (`'txd'`), เซอร์โว = PWM 50 Hz 1–2 ms (`st.servo`, อยู่ใน `scopeSwitchers`)
      → `scopeCapture(c, sws, bs)` วาดบิตจริง (`uartBit`: start 0, 8 บิต LSB ก่อน, stop 1) จุดทริก = start bit ที่ 1 ช่อง, `cap.uart` = ถอดรหัสข้อความ/HEX; Auto Set เลือก Time/div ให้พอดีเฟรม
    - โหมดเลื่อน (`tdiv ≥ 0.1`): ใช้ `c._hist` ที่ `scopeRecord()` บันทึกทุก `step` (DC + แอมพลิจูด AC → วาดเป็นแถบ); สวิตชิ่งเร็วเห็นเป็นค่าเฉลี่ย
      โหมดตามเวลา: แบ่งแต่ละสเต็ปเป็นรายการละ 1 คอลัมน์จอ (min/max จากบัฟเฟอร์) + `md` = ช่วงจริงของ Math (sub/add/mul) ต่อคอลัมน์ — ไม่เป็นขั้นบันได
    - `disp` = `yt` | `xy` | `fft`: XY ใช้ `cap.xy` (คู่ตัวอย่าง CH1/CH2 2400 จุด; โหมดเลื่อนใช้ประวัติ DC), `cap.phase` = เฟส CH2 − CH1 จากเฟเซอร์ (องศา)
      FFT (`scopeFFT`, เฉพาะโหมดเร็ว): บันทึกแยกจากจอ N = 8192, fs = 2.56 × ช่วง (`fspan` หรืออัตโนมัติ = 10 × ความถี่หลัก), หน้าต่าง Hann, `fftRadix2`;
      สัญญาณสร้างแบบจำกัดแบนด์ (DC + ไซน์ + อนุกรมฟูเรียร์ของคลื่นสี่เหลี่ยมถึง Nyquist) จึงไม่มี aliasing; ยอด = รวมกำลัง ±3 ช่อง ÷ ENBW 1.5 → Vrms,
      `cap.fft = {k, span, df, P (Vrms² ต่อช่อง), peaks[{f, v, h}], fund, thd, dc}`; แกนตั้ง dBV (`fref` บนสุด, 10 dB/div)
    - ช่อง Math (`math` = off/sub/add/mul ตาม `SC_MATH`, สเกล `vdivm`/`posm`, สีม่วง) = `cap.ch[2]`: โหมดเร็วคำนวณจุดต่อจุดจาก `fn(0,t)`, `fn(1,t)`,
      โหมดเลื่อนใช้เฟเซอร์ใน `c._hist[].c` (แอมพลิจูด √2·|p1 ∓ p2|; ผลคูณใช้เฉพาะ DC), FFT เลือกแชนเนล `fftch = 'M'` · `scV/scP/scU(c, k)` คืนสเกล/ตำแหน่ง/หน่วยของแชนเนล k
    - เคอร์เซอร์ (`cur` = off/time/volt, `cch` แชนเนลอ้างอิง 1/2/M): เวลา `ta`/`tb` (div 0–10) อ่าน Δt, 1/Δt และค่าที่จุดตัด (`ch.vc` ค่ากลางคอลัมน์),
      แรงดัน `va`/`vb` (div −4..4) = (div − pos)·V/div; ในโหมด FFT เป็นเคอร์เซอร์ความถี่ + dBV · `scopeCursorVals(c)` · ลากบนจอ `#scv` ได้
    - โพรบ `px1`/`px2` = 1 | 10: โหลดวงจร 1 MΩ / 10 MΩ, ช่วง V/div = อินพุต 1 mV–10 V/div × อัตราลดทอน (`scVlist`), พิกัดแรงดันยอด 300 / 600 V (เตือนใน `warnList`)
    - โหมดทริก `tmode` = auto/norm/single (`scopeTrigHold`): Normal ไม่ทริก → ค้างภาพล่าสุด (`cap.wait`) หรือจอว่าง (`cap.blank`); Single ทริกแล้ว `run = false` (`cap.done`), ปุ่ม SINGLE/`scopeArm()` เริ่มรอใหม่ (`c._arm`)
      โหมดเร็ว + DC: ระดับเปลี่ยนข้ามระดับทริกจากภาพก่อน (`c._pd`) = ขั้นบันได วางจุดทริกที่ 1 ช่อง (`cap.tpos`); โหมดเลื่อน: หาจุดตัดใน `c._hist` (Single เอาครั้งแรกหลัง `_arm`) แล้วรอบันทึกอีก 9 ช่อง
    - `scopeFloat(c)` → [CH1, CH2] ลอย = ขาโพรบอยู่คนละเกาะไฟฟ้ากับ ⏚ (union-find ของสาย + ขาอุปกรณ์อื่น, `gnd`/`src1`/`src3` และ earth ของสโคปผูกโหนด 0) → แถบเตือนแดงบนจอ + `warnList`
      (ฟิสิกส์ยังจำลองจริง: วงจรแบตเตอรี่ที่ไม่ได้ต่อ ⏚ ลอยตามความต้านทานโพรบ รูปคลื่นเปลี่ยนเมื่อต่อ/ถอดอีกแชนเนล)
    - `scopeDraw(ctx, x, y, w, h, c, small)` ใช้ทั้งจอเล็กใน `drawBlock` และหน้าต่างเต็ม (`scopeUI`/`scopeLive`); `scopeAutoset(c)` ปรับสเกล/ทริกอัตโนมัติ

13. **เครื่องวิเคราะห์แบบ SPICE** (หน้าต่าง `#anwin`, ปุ่ม "วิเคราะห์") — แยกจากการจำลองสด ใช้แบบจำลองไม่เชิงเส้นจริงแก้ด้วย Newton–Raphson
    - `spBuild()` → netlist: โหนดจาก union-find ของปลายสาย (สายไฟ = 0 Ω), กราวด์ (0) = `gnd`/N ของ `src1`/กราวด์โพรบสโคป, เกาะที่ลอยผูกจุดอ้างอิงลงกราวด์ 1 จุด (`tie`);
      อุปกรณ์ 2 ขั้วอื่นที่ `admit` ให้ค่าได้ (มอเตอร์ 1 เฟส/ปั๊ม, ฟลูออเรสเซนต์, คอยล์, หน้าสัมผัส ฯลฯ) → อิมพีแดนซ์เทียบเท่า R + L (หรือ R + C) ที่สถานะปัจจุบัน (`net.eq`, แจ้งใต้กราฟ),
      `pmeter` = ทางผ่าน L/N (มี I/P) · ที่เหลือ (มอเตอร์ 3 เฟส, PLC, MCU, โมดูล) อยู่ใน `net.unsup` · ชนิดในชุด `SP_OK`
    - `spLoad(net, st)` stamp ทุกอุปกรณ์ (st.mode dc/tran, a0, srcK, gmin, T °C, Cm = เมทริกซ์ความจุสำหรับ AC): ไดโอด Shockley + RS + CJO/VJ/M + TT + BV (`spDioP`, `spDio`, `pnjlim`),
      BJT Ebers–Moll + Early (`spBjtP`), MOSFET Level 1 + Cgs/Cgd + ไดโอดบอดี (`spMosP`), ออปแอมป์มาโครโมเดล (โหนด x: G1 = 1 µS + Cp → ขั้ว GBW, กระแสจำกัด → สลูว์เรต `sr`,
      หนีบ x ด้วย `ramp`, ขาออก tanh จำกัด `isc`, `vos`, `rin`), หลอดไส้ R ∝ V^0.42, หม้อแปลง (อุดมคติ + Lm แม่เหล็ก 3% + R ขด), 78xx/LM317 พฤติกรรม,
      ลอจิกแบบผสม (`spDigEval`: DC วนจนนิ่ง, ชั่วคราวประเมินหลังแต่ละขั้น = หน่วง 1 ขั้น, สถานะเงาใน `el.sh`), NE555 พฤติกรรมตามเวลา
      อุปกรณ์พฤติกรรมใช้ `BI(p, q, ตัวควบคุม, f)` อนุพันธ์เชิงตัวเลข · ประจุ `charge()` อินทิเกรตแบบ BDF2 (ขั้นแรก/หลังลอจิกเปลี่ยน = BE)
    - `spOP` (NR → gmin stepping → source stepping) · `spRun({kind:'op'|'dc'|'ac'|'tran'|'four', probes, temp, …})`: กวาด DC ได้ทั้งค่าแหล่งจ่าย/ฟิลด์ตัวเลขของอุปกรณ์/อุณหภูมิ,
      AC = จาโคเบียนที่จุดทำงาน + jωCm (แหล่งที่เลือก 1 V), ชั่วคราวขั้นคงที่ลดลง ÷4 เมื่อไม่ลู่เข้า, ฟูเรียร์จากคาบเต็มท้ายสุด (`spFourier`, THD), ค่าวัด `spMeas`
    - โพรบ (`spProbes`): `V(ชื่อ)` คร่อม 2 ขั้ว, `V(ชื่อ.ขา)` เทียบกราวด์, `I(ชื่อ)`, `P(ชื่อ)`, สโคป `V(OSC.CH1−⏚)` · ปุ่มกรองชนิด `AN_PT` (ทั้งหมด/V/I/P → `AN.pt`, `anPtOk`/`anPtApply`) · แหล่งจ่าย (`SP_SRC` bat/acs/src1/fgen) มี I/P เป็นบวกเมื่อจ่ายออก (`neg`) = กระแส/กำลังรวม · ค่าตั้งต้น: V ≤ 2 ตัว + I ของแหล่งจ่ายแรก (ไม่มี → โหลดแรก) · `spMeas` เฉลี่ย/RMS เฉพาะคาบเต็ม (ระหว่างจุดตัดแรก–สุดท้าย ถ่วงตามเวลา) · ตารางจุดทำงาน `spOpTable` (ย่าน BJT/MOSFET/ออปแอมป์/ไดโอด)
    - ส่งออก CSV / PNG / netlist (`spNetlist`: ngspice/LTspice, .model ของไดโอด/BJT/MOSFET, ออปแอมป์เป็น G + RC + B-source, หม้อแปลงเป็น L คู่ K)
    - พารามิเตอร์ SPICE แก้ได้ในแผงขวา (`SPX` ต่อท้าย `F`, เว้นว่าง = อัตโนมัติ `SPF`), ค่าตามรุ่นใน `SPMOD` · IS คำนวณจาก Vf ที่กระแสอ้างอิงเมื่อไม่ระบุ
    - เครื่องกำเนิดสัญญาณ `fgen` (OUT COM, `wave` sine/square/tri/saw/pulse, `f`, `vpp`, `off`, `duty`, `ph`, `zo` 50 Ω): solver ปกติใช้ฮาร์มอนิกหลัก (`fgenPh`), `trRun` ใช้ `fgenV(c, t)` จริง · คลื่นที่ไม่ใช่ไซน์บังคับโหมดตามเวลาเสมอ (ถ้าอุปกรณ์ทุกตัวรองรับ) · ดิวตี้บนสโคปโหมดตามเวลาคำนวณจากสัดส่วนคอลัมน์ที่สูงกว่าค่ากลาง

14. **จอสัมผัส / มือถือ / iPad** — `@media (pointer:coarse)`: ปุ่ม ≥ 38 px, ช่องกรอก 16 px (iOS ไม่ซูม) · `@media (max-width:1100px)` (`compact()`): ส่วนหัวแถวเดียวเลื่อนแนวนอนได้
    (ลำดับ ☰/ⓘ → รัน/หยุด → อื่น ๆ, ขอบขวาจาง), แผงวงจรเต็มกว้าง, `#pal`/`#insp` เป็นลิ้นชักซ้าย/ขวา (`drawer('pal'|'insp'|null)` → `#main.palopen/.inspopen`, หัว `.dclose` ปิด),
    เลือกอุปกรณ์จากแถบแล้วปิดลิ้นชักเอง, ปุ่ม ⓘ กะพริบเมื่อเลือกอุปกรณ์ + จุดเหลือง/แดงเมื่อมีคำเตือน · `max-width:600px`: ข้อมูลเป็นแผ่นเลื่อนขึ้นจากล่าง, แถบเครื่องมือลอย `#ftools`
    (ส่งคลิกต่อไปยังปุ่มหัว `data-px`), สโคป/วิเคราะห์เต็มจอ · สัมผัสบน `#cv` (ตัวจับแบบ capture ก่อนตัวจับเดิม): สองนิ้ว = ซูม/เลื่อน (`TP`, `pinch`; ยกเลิกการลากของนิ้วแรกและคืนตำแหน่ง),
    แตะสองครั้งที่อุปกรณ์ = เปิดข้อมูล
    **โทรศัพท์ (≤ 600 px, `phone()`)**: ส่วนหัวเหลือ ☰ อุปกรณ์ / ⓘ ข้อมูล / รัน / `#bMore` "⋯ เมนู" → แผ่นล่าง `#more` (`moreOpen`, `MORE`: ตัวอย่าง + ความเร็ว (select สำเนา `data-msel`)
    และปุ่มกริดที่ส่งคลิกต่อไปยังปุ่มหัวจริง `data-mp`) · `.pop` (เมนูไฟล์/ค่า) เป็นแผ่นล่าง · ลิ้นชัก `#lad.open` เต็มจอใต้ส่วนหัว (`--hdr` จาก `hdrVar`), ปุ่ม `#lhalf` ย่อครึ่งจอ (`.half`)
    · แลดเดอร์: `.ltools`/`.lfields` แถวเลื่อนแนวนอน · โค้ด: แถวสัญลักษณ์ `#kbar` (`KBAR`, `kbarAttach`: ใส่คู่วงเล็บ/คำพูดครอบส่วนที่เลือก, ⇥ = อาร์กิวเมนต์ถัดไป, ⏎ ย่อหน้าอัตโนมัติ; pointerdown preventDefault คงคีย์บอร์ด)
    · หน้าต่างลอยเต็มจอ หัวติดบน (≥ 54 px, ตัดบรรทัดได้ — ปุ่มหลักเช่น ▶ จำลอง ต้องอยู่ในจอเสมอ) ปุ่ม ✕ ตรึงมุมขวาบน · `[data-dclose]` ปิดทั้ง click และ pointerup (สัมผัส) · วิเคราะห์: กด ▶ จำลองแล้วเลื่อนไปที่กราฟเอง (เลื่อนเฉพาะ `#anwin` — ห้าม scrollIntoView เพราะลากทั้งหน้าเลื่อนตาม; มีตัวดึง window.scrollY กลับ 0 ทั้งตอน scroll, focusout (คีย์บอร์ดปิด), visualViewport resize, `drawer()`) · ลิ้นชักที่ปิดอยู่ `visibility:hidden` (ไม่โผล่เมื่อหน้าถูกดัน) · `loadEx` บนโทรศัพท์ไม่เปิดเทรนด์/แบ่งจอ 3D เอง (แจ้ง toast) และปิดมุมมอง 3D เมื่อตัวอย่างไม่มีฉาก (ทุกขนาดจอ)
    · จอสัมผัส (`TOUCH()`): `text()` ขยายตัวอักษรบนแผงให้ ≥ 9.5 px บนจอเมื่อซูมออก (`txtZ` ตั้งใน `draw`, ไม่เกิน 1.8 เท่า) · ฉากที่ผูกชื่ออุปกรณ์แต่ไม่พบบนแผงเลย (`fxOrphan`) มีปุ่ม "ลบฉากนี้"/"ปิดมุมมอง 3D" · แผง 3D บนโทรศัพท์กะทัดรัด (ซ่อนคำแนะนำ, 3D 42%)
    · แผงควบคุม 3D ย่อ/ขยายได้ (`fx.hmin`, ปุ่ม `data-f="hmin"`, `.fcard.min` = แถบเดียว: ชื่อ + ปุ่มกดของฉาก) เริ่มแบบย่อบนโทรศัพท์ ยกเว้นฉากที่ไม่ผูกอุปกรณ์ · `fxPress` ค้างปุ่มอย่างน้อย 0.2 s (แตะสั้นบนจอสัมผัส)
    · ฉาก 3D: สองนิ้วถ่าง/หุบ = ซูม, ลากสองนิ้ว = เลื่อน (`fx.pinch`, ตัวจับ capture บน `#fx` ยกเลิกการหมุนของนิ้วแรก) + ปุ่มลอย `#fzoom` (+ / − / ⤢ = `fxFrame`) ทุกขนาดจอ

15. **แก้ไขวงจร / ไฟล์** — เลือกหลายชิ้น: เครื่องมือ `'box'` (ปุ่ม "เลือกหลายชิ้น" หรือ Shift + ลาก), Shift + คลิกสลับ → `sel = {k:'m', cs, ws}` (`boxSelect`, `selAll`)
    คัดลอก/วาง/ทำสำเนา `copySel`/`pasteClip(dx, dy)`/`dupSel` (คลิปบอร์ดภายใน `CLIP`, ตั้งชื่อใหม่ไม่ซ้ำ, แก้ `ref`/`tank` ที่อ้างถึงกันในชุด), ลบ `delMulti`, ย้ายทั้งชุด `mmoveInit/Apply/End`
    ประวัติ `hist`/`fut`: `undo()`/`redo()` (Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z), Ctrl+C/V/D/A/S/O
    เมนู "ไฟล์ ▾" (`fileAct`): บันทึก/เปิด .json, โค้ดแชร์ `encCircuit`/`decCircuit` (deflate-raw + base64url, ขึ้นต้น `CL1.`; `CL0.` ไม่บีบอัด), ลิงก์ `#c=…`, ส่งออก PNG `circuitPNG()`
    · `clipWrite` ครอบ `navigator.clipboard` (ไม่มีสิทธิ์ → toast) · `solveNow()` เป็นฟังก์ชันระดับบนสุด
16. **ป้ายชื่อสาย** `lbl` (1 ขั้ว, ฟิลด์ `net`, ไม่สนตัวพิมพ์) — ป้ายชื่อเดียวกันเป็นโหนดเดียวกันทุก solver (`lblPairs` ใน stamp, `RES.net`, `trRun`, `spBuild`, `scopeFloat`)
17. **มิเตอร์จิ้มวัด** (ปุ่ม "มิเตอร์", เครื่องมือ `'probe'`): `probeTap` แตะจุดแดงแล้วจุดดำ → `probeVal()` = {dc, ac, …} วาดด้วย `probeDraw`
18. **ความเสียหายจริง** (ใน `discrete`): ตัวต้านทานสะสม `_heat += ((P/Pr) − 1)²·dt` (เย็นลง 0.3/s) > 4 → `_blown` (วงจรเปิด, ควัน);
    อิเล็กโทรไลต์ `_stress` จากกลับขั้ว (< −1.5 V) หรือ > 1.25·Vr นาน 0.6 s → ระเบิด (เปิดวงจร) · ปุ่ม "เปลี่ยนใหม่" ในแผงขวา
19. **จอ LCD I2C** `lcd` (GND VCC SDA SCL; รุ่น 16×2/20×4, `addr` 0x27/0x3F) — `MCU[t].i2c` = ขา SDA/SCL (Uno A4/A5, ESP32 21/22, Pico GP4/GP5), pull-up 4.7 kΩ
    ไลบรารี `Wire` (begin/beginTransmission/endTransmission → 0 หรือ 2 ถ้าไม่พบแอดเดรส) และ `LiquidCrystal_I2C lcd(addr, cols, rows)`
    (init/begin/backlight/noBacklight/clear/home/setCursor/print/write) — บัฟเฟอร์ข้อความ `c._lcd.buf`; ก่อน init แถวแรกเป็นกล่องดำเหมือนจริง; รองรับเฉพาะข้อความ (ไม่มีอักขระกำหนดเอง)
20. **Monte Carlo** (หน้าต่างวิเคราะห์): `AN.mc = {n, tolR, tolC, seed}` — `mcRun(opt, base)` สุ่มค่า R/C แบบเกาส์ σ = tol/3 ตัดที่ ±tol (mulberry32 มี seed) แล้วคืนค่าเดิมใน `finally`;
    ผลใน `r.mc` วาดเส้นจางซ้อน + สถิติ (`mcMetric`, `mcStats`: ค่ากลาง ± σ, ต่ำสุด–สูงสุด ของ −3 dB/ยอด/ค่าเฉลี่ย)
21. **แบบฝึกหัด** (ปุ่ม "แบบฝึกหัด"): `EXER` = led, div, par, stair, reg, rc — แต่ละข้อมี `start` (วงจรเริ่ม), `sol` (เฉลย), `check()` → [ผ่าน, ข้อความ]
    `exStart(id, sol?)`, การ์ด `#task` (`exCard`), `exCheck()`; ข้อที่ผ่านแล้วเก็บใน localStorage `circuit-lab-ex`
22. **ป้ายค่าบนสัญลักษณ์** — ปุ่ม "ค่า ▾" (`#vmenu`): ค่ารวมทั้งแผง `showVal` + `DISP = {val, v, i, p, pin}` (บันทึกใน localStorage `circuit-lab-disp`)
    รายอุปกรณ์ `c.vshow` (บันทึกในวงจร, ตาม `VSHOW`: '' ตามค่ารวม | vi | v | i | p | all | pin | none) → `dispFor(c)`; 2 ขั้ว: `measText` (V สี `--vlab`, I `--ilab`, P `--plab`, `~` = RMS)
    บล็อก: แรงดันที่ขา `pinVLabel` ผ่าน `nodeVAt` เทียบ `vRefNode()` (กราวด์/ไฟบ้าน → โหนด 0, ไม่มี → ขั้วลบแบตเตอรี่/COM fgen ตัวแรก) · ค่าจิ๋วปัดเป็น 0 (`tiny`)
23. **กราฟเทรนด์ / บันทึกข้อมูล** (ปุ่ม "เทรนด์", `#trwin`): `S.trend = {sig:[≤ 6], win, ax}` (บันทึกในวงจร) · `trendRec()` ท้าย `step` สุ่มทุก 0.1 s ใน `TRD` (≤ 36000 จุด)
    สัญญาณ `sigVal('ชื่อ.ค่า')`: PLC → AI0/D1/AQ0/CV0/M0/Q0/PID1 (MV %), VFD → f/I/P/Pin, ถัง → lvl, มอเตอร์ → sp (%)/I/P, 2 ขั้ว → V/I/P, อื่น ๆ → ฟิลด์ตัวเลข · ส่งออก `trendCSV()`
    ตัวอย่างที่มี `trend` เปิดหน้าต่างเองตอน `loadEx` · `#trwin[hidden]` ต้องมี display:none (มิฉะนั้นบังแผงวงจร)
    กราฟทุกชนิดวาดด้วย `plotPaint(g, W, H, ss, pal, o)` (ss = [{t, y, col, w, dash}]) · `plotImage` = PNG พื้นขาวสำหรับรายงาน (`PAL_PRINT`)
24. **ทดลองแบบชุด** (ปุ่ม "ทดลองชุด", `#exwin`): `S.exp = {par, vals, dur, tm, sig, tgt, sig2, ev}` (บันทึกในวงจร) · `expGen(cfg)` generator: ทุกรอบ `load(snap)` ที่ simT = 0,
    `expSet(par, ค่า)` แล้วจำลองด้วย `step(0.05)` ตามเหตุการณ์ `[@t] ชื่อ.ค่า = ตัวเลข` (`expParseEv`; รีจิสเตอร์ PLC เขียนหลังสแกนแรก) — สุดท้ายคืนวงจร/TRD/simT/running เดิมใน `finally`
    `expSet`: ฟิลด์ของอุปกรณ์ (ตัวเลข/บูลีน), `PLC1.PID1.Kp|Ti|Td|SP|lo|hi` (แก้บรรทัดใน pidList), `PLC1.D1`/AQ0/M0 · ค่า `expParseVals`: "1 2 4" หรือ "เริ่ม:ก้าว:จบ" (≤ 50 รอบ)
    `expMetrics(t, y, y2, เป้าหมาย, tm)` → {yf, os %, rise 10–90%, ts ±2%, iae, ess, en Wh (∫ y2 dt)}; เป้าหมายว่าง = ค่าสุดท้าย · `expRunSync` (ทดสอบ) / `expRunUI` (แบ่งช่วงไม่ค้างจอ) · `expCSV`
25. **รายงาน** (เมนูไฟล์ → รายงาน, `#rpt` + iframe srcdoc): `reportHTML()` = HTML แยกไฟล์ (ภาพวงจร, คำเตือน, ตารางอุปกรณ์ + ค่าวัด, โปรแกรม PLC (`ladText`) + PID + Modbus,
    โค้ด MCU, เทรนด์ + สถิติ, ผลทดลองชุด, ภาพ SPICE) · พิมพ์/บันทึก PDF ผ่าน `print()` ของ iframe (ถ้าถูกบล็อก → แจ้งให้ดาวน์โหลด .html) หรือดาวน์โหลด .html

## ข้อตกลง
- สีทั้งหมดเป็น CSS token บน `:root` และรองรับ dark mode (`prefers-color-scheme` + `data-theme`); canvas อ่านค่าผ่าน `readColors()` เก็บใน `K`
- กริด 1 ช่อง = 40 px (`G`)
- แรงดันไฟบ้านค่าเริ่มต้น 230 V, 3 เฟส 400/230 V, 50 Hz
- ทุกการแก้ไขโครงสร้างวงจรต้องเรียก `commit()`; การแก้ค่าพารามิเตอร์แบบต่อเนื่องตั้ง `needSolve=true`
- `window.__sim` เปิดไว้สำหรับทดสอบ (`S`, `RES`, `load`, `EX`, `solveNow`, `poke`, `step`, `run(วินาที)`, `find(ชื่อ)`, `FXS`, `setView`, `flit`, `scope(ชื่อ)` คืน `_cap`, `scopeCursor(ชื่อ)`, `scopeArm(ชื่อ)`, `scopeAutoset(ชื่อ)`)

## การทดสอบ
```bash
NODE_PATH=$(npm root -g) node tests/circuit-lab.test.js
```
สคริปต์เปิดไฟล์ด้วย Playwright แล้วเรียก `window.__sim` ค่าที่ควรได้:
- series: 0.25 A · parallel: ≈1.5 A · mixed: ≈54.5 mA · led: ≈21 mA
- dol: กด START (ตั้ง `_pr=true` แล้ว `poke()`) → คอยล์ K1 ทำงาน, กระแสสตาร์ท ≈ 15.3 A แล้วลดเหลือ 2.55 A/เฟส หลัง `run(6)`; ปลดเบรกเกอร์เฟสกลาง → `_hum=true`
- plcpump: กด START → Q0 ทำงานเมื่อน้ำต่ำกว่า 30% และหยุดที่ 90% (ทั้งโหมดแลดเดอร์และข้อความ), HMI เชื่อมต่อ PLC
- arduino: pot 70% → A0 ≈ 716, LED (PWM) หรี่ลงเมื่อหมุน pot ลง · esp32: กดปุ่มครั้งเดียว → LED ติด นับ 1 ครั้ง · pico: ไฟแดง ≈3.5 mA แล้วเปลี่ยนเป็นเขียว
- ardsense: บรรทัดแรกของ Serial = `T=25C H=60% แสง=936 ระยะ=100cm PIR=0` · espgarden: ดินแห้ง → เซอร์โว 90°, ชื้น → 0°
- plcsense: ทรานสมิตเตอร์ 40% → AI0 ≈ 40, พร็อกซิมิตี้ → Q0, ลิมิตสวิตช์ตัด Q0, AI0 > 75 → Q2
- indsense: H1–H4 = 1011 → ไม่มีน้ำไหล 3 s → เตือน; ความดัน 3 bar ตัด, 2 bar ค้าง, 1.3 bar ต่อ; บังม่านแสง → 0100; แก๊ส → 0101; วัตถุใกล้ UB1 → H4 ดับ; ร้อน → H3 ดับ (แลดเดอร์/ข้อความ)
- rs485: สเลฟรับ `P=60` แล้วหรี่ LED, pot 20% → LED หรี่ลง, บอดไม่ตรง → อ่านไม่ออก · lora: 1.5 km RSSI ≈ −110 dBm รับได้, 9 km SF9 ขาด, SF12 กลับมารับได้
- สโคปบนบัส RS-485 (rs485 + โพรบ A/B): ถอดรหัส `P=60⏎` (50 3D 36 30 0A), บิต 104 µs, A/B กลับขั้วกันทุกคอลัมน์, Auto Set → 1 ms/div
- สัญญาณอุปกรณ์ (สโคปต่อสายเฉพาะปลาย): เซอร์โว 50 Hz ดิวตี้ 7.5% 3.3 V · DHT22 02 58 00 FA 54 (0–4.9 V) · ECHO HC-SR04 ≈ 5800 µs (100 cm) · RS-232 T1OUT ±5.1 V · LoRa TXD 0–3.3 V
- บัส RS-485 (rs485): ว่าง A−B ≈ 0.21 V (MD1 ไบแอส 680 Ω), A−GND ≈ 2.6 V, ขณะส่ง > 2 V
- rs232: เทอร์มินัลได้ข้อความทักทาย, ส่ง ON/OFF คุม LED ขา 13, บอดเทอร์มินัล 2400 → คำสั่งไม่ผ่าน
- modbus (แลดเดอร์/ข้อความ): pot 75% → D0 = 767, H1 + coil 0 (LED ขา 9) ติด, D8 → PWM ขา 6; pot 30% → D0 = 307; ปุ่ม S1 → coil 1; บอดสเลฟ 4800 → CRC ผิด + timeout · `D3 := (AI0 + 10)*2 − D1/4` = 60; CRC ของ 01 03 00 00 00 01 = 84 0A
- hmimodbus (แลดเดอร์/ข้อความ): HMI อ่านไฟ + D5 = 1234, START → M2 = 1, STOP → M2 = 0, ID ผิด → timeout + เตือน · PLC สเลฟ อ่านคอยล์ 40 → ข้อยกเว้น 02
- plc2port (แลดเดอร์/ข้อความ): #1 มาสเตอร์อ่าน Arduino (D0 = 767) + #2 สเลฟ ID 2 19200 ให้ HMI พร้อมกัน, ปุ่ม HMI (M20) → M17 → LED ขา 12 ของ Arduino, บอดพอร์ต #2 ผิด → HMI timeout แต่ #1 ปกติ
- modbustcp (แลดเดอร์/ข้อความ): S1 ที่ PLC2 → H1 ที่ PLC1, ตัวนับ D0 ของ PLC2 → PLC1 → HMI, ปุ่ม HMI → PLC1 M5 → PLC2 → H2; HMI ต่างซับเน็ต → แจ้ง, IP ซ้ำ → เตือน, ถอดสวิตช์ → ไม่มีลิงก์ · MBAP ของ TID 7 = 00 07 00 00 00 06 01 03 …
- esp32wifi (PLC แบบข้อความ/แลดเดอร์): ได้ IP + RSSI −55, pot 30% → D10 ≈ 1228, 90% → H1 + LED บนบอร์ด (Q0), ปุ่ม → M5, ไกล 500 m → หลุด, กลับ 15 m → ต่อใหม่เอง, รหัสผิด → WL_CONNECT_FAILED
- rectifier (ตามเวลา): C 1000 µF → V1 ≈ 14.36 V DC, ริปเปิล ≈ 1.27 Vpp 100 Hz; ปลด S1 → เฉลี่ย ≈ 9.0 V กระเพื่อม 0–15.1 V
  · halfwave: 0–16.27 V เฉลี่ย ≈ 5.06 V, ใส่ C → 15.63–16.27 V · rccharge (τ 4.7 s): ชาร์จ τ → 5.66 V, คายประจุ τ → 3.22 V
- logic: AND/OR/XOR/NOT ตามตารางความจริง (0001/0111/0110/1100) · flipflop: Q สลับทุกขอบขึ้นของ CLK (74HC14 RC ≈ 1 Hz)
- opamp: ×−10 → ±7.07 V 1 kHz, Vs 1.5 V → ตัดยอด ±9.92 V · opamposc: คาบ ≈ 1.05 s, ตัวเก็บประจุ ±3.54 V · DC: ไม่กลับเฟส ×11 (0.6 → 6.6 V), ชมิตต์มีฮิสเทอรีซิส
- chaser: CD4017 นับ 0→9 วนกลับ LED ติดทีละดวง · cnt7seg: CD4518 → CD4511 แสดงส่วน a–g ถูกทุกค่า, 9 → 0 · shift595: shiftOut → ตัวจับ 1, 2, 3… LED ตรงเลขฐานสอง
- lm317: 5.08 V / 9.26 V / dropout 13.0 V / ไม่มีไฟเข้า 0 V · tempalarm: 25 °C → 0.25 V LED ดับ, 35 °C → ติด
- SPICE: RC −3 dB ≈ 159 Hz เฟส −45° · คลื่นสี่เหลี่ยม H3/H1 = 1/3 THD(ถึง H9) ≈ 42.9% · 1N4007 ≈ 0.77 V ที่ 42 mA, −1.4 mV/°C · ceamp Ic ≈ 2.6 mA, ≈ 44 dB, THD > 3%
  · ไซน์ 325 V ช่วงไม่ครบคาบ → เฉลี่ย 0 V RMS 230 V · ปุ่มกรอง "กระแส I" + โพรบกระแสตั้งต้น · I(B1) series = +0.25 A, P = 3 W · pfc: I/P ของมอเตอร์ M1 (เทียบเท่า) ตรงกับจำลองสด, PM1 กระแสลดลงเมื่อสับ C1
  · ออปแอมป์ ×−10: 20 dB, −3 dB ≈ 90 kHz (GBW/11), ±7.07 V · rectifier ≈ 14.4 V ริปเปิล ≈ 1.24 Vpp · ทุกตัวอย่างหาจุดทำงานได้
- สโคป 2 แชนเนล: ceamp (จำลองสด) CH1 20 mVpp → CH2 ≈ 3.15 Vpp · opamposc โหมดเลื่อนเปลี่ยน < 0.15 V ต่อจุด · fgen สี่เหลี่ยม → ±1.95 V / ±0.98 V ดิวตี้ 50%
- สโคป ⏚ ต่อสัญลักษณ์กราวด์แยกจากวงจร cnt7seg → `scopeFloat` = [true, true] + เตือน; ต่อ ⏚ เข้า GND → 0–9 V · ไม่มีตัวอย่างใดเตือนผิด
- มือถือ (iPhone 13): ส่วนหัว ≤ 60 px, แผงวงจรเต็มกว้าง ไม่เลื่อนแนวนอน, ลิ้นชักอุปกรณ์เปิด/ปิด, ซูมสองนิ้ว > 1.5 เท่า วงจรเดิม (0.25 A)
  · หัวหน้าต่างวิเคราะห์/สโคป/เทรนด์/ทดลองชุด ปุ่มอยู่ในจอไม่ถูก ✕ บัง
  · ส่วนหัว 4 ปุ่มไม่ล้น, ⋯ เมนู → เขียนโปรแกรมเต็มจอ, ไม่เปิดเทรนด์เอง, ตัวอย่างไม่มีฉาก → 3D off, แถวสัญลักษณ์ ( ) + ; → "(;)"
- semi: 7805 = 5.00 V, ซีเนอร์ ≈ 5.11 V, S1 เปิด → NPN อิ่มตัว LED ≈ 8.5 mA · timer555: ≈ 1 Hz · counter: 1.5 s → เลข 1 · motor: กดปุ่ม → กระแสสตาร์ทสูงแล้วลดลง < 0.15 A เมื่อหมุน
- stardelta: สตาร์ท ≈ 34 A, สตาร์ ≈ 4.8 A, หลัง 5 s เดลต้า ≈ 14.3 A, เฟสขาด → คราง + อุปกรณ์ป้องกันตัด, E-Stop → K1 หลุด
- factory: กด START → สายพานวิ่ง; ผ่านไป 60 s `FXS.cnt` = โลหะ ≥ 5, ชิ้นงานอื่น ≥ 5, `miss` = 0, `wrong` = 0; กด STOP → สายพานหยุด
- seqconv: ปลายทาง (M2) เริ่มก่อน ต้นทาง (M1) ตามหลัง 3 s; STOP → ต้นทางหยุดทันที ปลายทางหยุดหลัง 4 s; กล่องลงถังครบ `floor` = 0
- pickplace: ผ่านไป 60 s กล่องลงถัง ≥ 10 ใบ `floor` = 0 · ตัวกั้น: คอยล์ไม่มีไฟกล่องต่อคิว มีไฟแล้วไหลลงถัง
- lift: เริ่มที่ชั้นล่าง (SQ1) → ยกกล่องถึง y = 2.15; ผ่านไป 120 s กล่องลงถัง ≥ 6 ใบ `floor` = 0 · กล่องตกจากสายพานสูงลงสายพานล่างได้
- elevator: เรียกชั้น 3 แล้วเรียกชั้น 2 ระหว่างทาง → จอดชั้น 2 (H1 ประตูเปิด) → ชั้น 3; เรียกชั้น 1 → ลงจอด (ทั้งแลดเดอร์และข้อความ)
- gate: OPEN → `FXS.rt[1].p` = 1 แล้ว SQ1 ตัด K1; STOP กลางทางหยุดนิ่ง; CLOSE → p = 0 แล้ว SQ2 ตัด K2
- osc: CH1 ไซน์ Vpp ≈ 33.8 V 50 Hz, CH2 พัลส์ NE555 0–8.85 V ≈ 687 Hz ดิวตี้ ≈ 52%; Auto Set → 10 V/div, 5 V/div, 5 ms/div; โหมดเลื่อนวัดพัลส์ช้าได้ ≈ 0.69 Hz
- FFT: ไซน์ 50 Hz → ยอดเดียว 11.97 Vrms; พัลส์ NE555 → H1 3.97 V, H3 1.29 V, H5 0.74 V, DC 4.64 V (ตามอนุกรมฟูเรียร์) · oscxy: ผลต่างเฟส ≈ −46°; Math CH1−CH2 = แรงดันคร่อม R ≈ 8.64 Vrms
- เคอร์เซอร์: 2→6 div ที่ 5 ms/div → Δt 20 ms, 1/Δt 50 Hz; แรงดัน CH2 A=2, B=−2 div → 25 V, 5 V
- oscprobe: ตัวแบ่ง 1 MΩ/1 MΩ ×1 = 3.33 V, ×10 = 4.76 V; Single รอทริก → กด S1 → จับขั้นบันไดแล้ว STOP; Normal โหมดเลื่อนค้างพัลส์ · วัด 322 Vpk ด้วย ×1 → เตือน
- ลากสายผ่านจุดหักของสายอื่น → ไม่ต่อ (กระแสเดิม), ปลายสายตกกลางสายอื่น → ต่อแบบ T
- ลากหลอด H1 ใน series / หมุน H2 → กระแส 0.25 A คงเดิม, Alt+ลาก → วงจรขาด, Ctrl+Z คืน
- rcdtest: คนแตะสายไฟ → RCD ตัด · pfc: PF 0.65 → > 0.95 · stair: สลับสวิตช์ตัวใดก็ได้ไฟสลับ
- แก้ไข: เลือก 4 อุปกรณ์ 8 สาย → คัดลอก/วาง ได้ชื่อไม่ซ้ำ 0.25 A, undo/redo, ย้ายทั้งชุดกระแสเดิม · โค้ดแชร์ `CL1.` ถอดกลับตรง · PNG
- ป้ายชื่อสาย VCC/GND → 9 mA (สด + SPICE), มิเตอร์จิ้ม 9.00 V · 100 Ω 0.25 W ที่ 9 V → ไหม้ · อิเล็กโทรไลต์กลับขั้ว → ระเบิด
- lcdi2c: "TEMP 27.9 C" / "ADC  57", 40 °C → "TEMP 40.1 C" · แบบฝึกหัด 6 ข้อ: เริ่มต้นไม่ผ่าน เฉลยผ่าน · Monte Carlo RC −3 dB ≈ 159 Hz σ 4–8 Hz
- ป้ายค่า: mixed R1 = 5.45 V / 54.5 mA / 297 mW · semi แรงดันขา 7805 = 12 / 0 / 5 V
- VFD: AVI 6.98 V → 34.9 Hz (ทางลาด 10 Hz/s), มอเตอร์ 1.1 kW 2.55 A ไม่มีกระแสสตาร์ทสูง, ปลด FWD → ลดความถี่ · มอเตอร์ 7.5 kW บน VFD 1.5 kW → oC
- pidtank (แลดเดอร์/ข้อความ): ระดับ 60% ≈ 25 Hz ปั๊ม < 250 W, ใช้น้ำ 4.5 %/s → ≈ 37.6 Hz ระดับคง 60% · Modbus (PLC มาสเตอร์ → VFD) ได้ผลเดียวกัน
- ค่าวัด (ระบบอันดับหนึ่ง τ = 1 s): rise 2.20 s, settling 3.91 s, IAE 1 · ทดลองชุด pidtank Kp 1/2/4/8 → overshoot ≈ 36/19/4/0% ทุกรอบเข้า 60% วงจรคืนเดิม
  · กวาด TK1.out = 2:1:4 → VFD ≈ 16.7/25/33.3 Hz
- ตัวเขียนโค้ด: พิมพ์ d → digitalWrite/digitalRead, Enter → digitalWrite(13, HIGH); เลือก 13, Tab → HIGH, "sv." (Servo sv;) → attach/write, ไม่เด้งในสตริง
- ตัวตรวจโค้ด: ตัวอย่างทุกตัวไม่มีคำเตือน · จับ pinmode→pinMode, ขาด ;, atach→attach, HIHG→HIGH, = ในเงื่อนไข, +* บรรทัด 3, วงเล็บ/สตริงไม่ปิด · ชั้นสีตรงเคอร์เซอร์ (< 2 px)
- PWA (เสิร์ฟ http ชั่วคราวในเทสต์): manifest standalone + ไอคอนครบ, service worker ทำงาน, ตัดเน็ตแล้วยังเปิดได้
  · ปุ่ม 📲 + แถบชวนติดตั้ง: iPhone → วิธีเพิ่มไปยังหน้าจอโฮม, Android (จำลอง beforeinstallprompt) → prompt แล้วปุ่มหาย, file:// ไม่แสดง
- CTU นับ 3 → C0, RST ล้าง · แลดเดอร์ CTU + MOV `(AI0+10)*2` = 30 · AQ0 := (CV0 + 1) * 10 = 40

## งานที่วางแผนไว้
- ซอฟต์สตาร์ทเตอร์, VFD แบบเวกเตอร์/แรงบิด + เบรกต้านทาน, มอเตอร์สเต็ปเปอร์, เครื่องกำเนิดไฟฟ้า, หม้อแปลง 3 เฟส, กราวด์และระบบ TN/TT
- บล็อกหมุนได้ (ตอนนี้หมุนได้เฉพาะอุปกรณ์ 2 ขั้ว), หมุนชุดที่เลือกหลายชิ้น
- ลอจิกแอนะไลเซอร์, สลับภาษา TH/EN, รายงาน PDF, แบบฝึกหัดเพิ่ม (PLC/MCU)
- โรงงาน 3D: เครื่องจักรเพิ่ม (โต๊ะหมุน, แขนปัด, สายพานโค้ง), กล่องเอียงตามทางลาด, แขนหยิบวางต่างระดับ, เงาบนชิ้นงาน (shadow map), ตัวนับ (CTU) ใน PLC, เซนเซอร์แอนะล็อกในฉาก
- ออสซิลโลสโคป: FFT แบบ dB/Vrms สลับได้และหน้าต่างอื่น, สวิตชิ่งเร็วในโหมดเลื่อน, ตัวถอดรหัส I2C/SPI (ยังไม่มีอุปกรณ์ I2C/SPI), อินเวอร์เตอร์, โพรบดิฟเฟอเรนเชียล/โพรบกระแส
- โหมดตามเวลา: ขยายให้ครอบคลุมทรานซิสเตอร์/MOSFET/78xx/NE555/MCU PWM, 3 เฟส, ความเหนี่ยวนำแม่เหล็กหม้อแปลง
- MOSFET/ทรานซิสเตอร์รับ PWM แบบเฉลี่ย (ตอนนี้ PWM ที่เกตถือว่าเปิดเต็ม), สลูว์เรตออปแอมป์, เกต 3–4 อินพุต, ไอซีเพิ่ม (ULN2003, 74HC138, L293D, LCD I2C), ขา PRE/CLR ของ D-FF
- ไมโครคอนโทรลเลอร์: ชนิดตัวแปรจริง (float พิมพ์ 2 ตำแหน่งเสมอ, หารจำนวนเต็ม), Modbus: บอร์ดเป็นมาสเตอร์ RTU / เซิร์ฟเวอร์ TCP, MQTT, W5500 Ethernet, เกตเวย์/เราเตอร์ข้ามซับเน็ต, LoRa แบบ SPI (RA-02), CAN/I2C/SPI
- SPICE: MCU/PLC ในการวิเคราะห์ (ใช้สถานะขาปัจจุบัน), ขั้นเวลาปรับอัตโนมัติ (LTE), วิเคราะห์สัญญาณรบกวน/ความไว, กวาดพารามิเตอร์หลายเส้น, โหมดจำลองสดด้วยเครื่อง SPICE
- PLC: เทอร์โมคัปเปิล, PID ปรับจูนอัตโนมัติ, AQ หลายช่อง, CTD ในแลดเดอร์
- งานวิจัย: กวาด 2 พารามิเตอร์ (ตาราง), Monte Carlo บนวงจรสด, ปรับจูน PID อัตโนมัติจากผลทดลอง, ส่งออก .mat/JSON · การเรียน (ระยะ 3): โหมดหาจุดเสีย, บทเรียนทีละขั้น, โหมดครู
- พิจารณาแยกไฟล์เป็นโมดูล (solver / plc / render / ui) เมื่อโค้ดใหญ่ขึ้น
