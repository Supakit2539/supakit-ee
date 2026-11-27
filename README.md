# แผงทดลองวงจรไฟฟ้า (Circuit Lab)

เว็บแอปหน้าเดียวสำหรับสอน วิจัย และจำลองวงจรไฟฟ้า: DC, AC 1 เฟส/3 เฟส, ตู้ควบคุมรีเลย์, PLC (แลดเดอร์ + ข้อความ, PID, Modbus RTU/TCP),
อินเวอร์เตอร์ (VFD), ไมโครคอนโทรลเลอร์ (Arduino Uno, ESP32, Raspberry Pi Pico), เซนเซอร์, อิเล็กทรอนิกส์, ออสซิลโลสโคป, เครื่องวิเคราะห์แบบ SPICE,
กราฟเทรนด์/ทดลองแบบชุด และโรงงาน 3D ที่ควบคุมด้วยวงจรบนแผง

## เปิดใช้งาน
- เปิดไฟล์ `circuit-lab.html` ในเบราว์เซอร์ได้ทันที (ไม่มี build step, ไม่มี dependency)
- หรือผ่าน GitHub Pages: `https://supakit2539.github.io/-/` (หน้า `index.html` ส่งต่อเข้าแอปเอง)

## ติดตั้งเป็นแอปบนโทรศัพท์ (PWA)
1. เปิด GitHub Pages: **Settings → Pages → Build and deployment → Source: Deploy from a branch** เลือก branch และโฟลเดอร์ `/ (root)` แล้วกด Save
2. เปิด `https://supakit2539.github.io/-/circuit-lab.html` บนโทรศัพท์
3. Android (Chrome): **⋯ เมนู → 📲 ติดตั้งแอป** · iPhone/iPad (Safari): ปุ่มแชร์ → **เพิ่มไปยังหน้าจอโฮม**

ใช้งานออฟไลน์ได้หลังเปิดครั้งแรก · ต้องการไฟล์ APK: นำ URL ไปสร้างที่ PWABuilder (pwabuilder.com) → Android

## ไฟล์
| ไฟล์ | หน้าที่ |
|---|---|
| `circuit-lab.html` | ทั้งแอป (HTML + CSS + JS) |
| `circuit-lab.webmanifest`, `circuit-lab-sw.js`, `icons/` | ข้อมูลแอป PWA, service worker (ออฟไลน์), ไอคอน |
| `index.html` | หน้าส่งต่อไป `circuit-lab.html` |
| `tests/circuit-lab.test.js` | ชุดทดสอบ Playwright |
| `CLAUDE.md` | เอกสารโครงสร้างโค้ดและค่าที่ทดสอบ |

## ทดสอบ
```bash
NODE_PATH=$(npm root -g) node tests/circuit-lab.test.js
```
