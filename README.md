# 🚀 Game Programming Hackathon 2026 @PCSHS_PHITSANULOK
## Real-time Interactive Opening Ceremony Web Application

ระบบเว็บแอปพลิเคชันแบบอินเทอร์แอคทีฟแบบ Real-time สำหรับพิธีเปิดงาน **Game Programming Hackathon 2026 @PCSHS_PHITSANULOK** ออกแบบในธีม **Neon / Cyberpunk / Gaming** 

ผู้เข้าร่วม 100+ คน สามารถสแกน QR Code เพื่อร่วมแตะจอมือถือรัวๆ สไตล์ PopCat สะสมพลังงานร่วมกันให้ครบเป้าหมาย **2,026 คลิก** ภายในเวลาสั้นๆ เพื่อปลดล็อกเข้าสู่สถานะ **"GAME START!"** พร้อมเอฟเฟกต์แสง สี เสียง และพลุกระดาษ Confetti เต็มรูปแบบ

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
changcat/
├── package.json                   # การกำหนดค่า dependencies (express, socket.io, qrcode)
├── README.md                      # เอกสารคู่มือการใช้งาน
├── server/
│   └── server.js                  # เซิร์ฟเวอร์ Express + Socket.IO (Batching & 100ms Broadcast)
└── public/
    ├── index.html                 # [Player View] สำหรับผู้เล่นบนมือถือ (PopCat)
    ├── screen.html                # [Display View] สำหรับจอโปรเจกเตอร์ / LED Wall
    ├── admin.html                 # [Admin View] แผงควบคุมและมอนิเตอร์สำหรับแอดมิน
    ├── css/
    │   └── style.css              # ระบบดีไซน์ Neon/Cyberpunk, Liquid Wave Fill, Screen Shake
    ├── js/
    │   ├── audio.js               # Zero-Config Web Audio API (Pop, 8-bit BGM, Game Start Fanfare)
    │   ├── player.js              # ตรรกะฝั่งผู้เล่นมือถือ (Multi-touch, 100ms Batching, Particles)
    │   ├── screen.js              # ตรรกะจอใหญ่ (Liquid Wave, Confetti, Dynamic BGM Fade)
    │   └── admin.js               # ตรรกะฝั่งแอดมิน (Real-time HUD, Boost, Force, Reset)
    └── assets/
        ├── แบ็กดรอป Hackathon (1)_2.jpg   # มาสคอตหุบปาก (วางไฟล์ที่นี่)
        ├── แบ็กดรอป Hackathon (2)_2.jpg   # มาสคอตอ้าปาก (วางไฟล์ที่นี่)
        ├── แบ็กดรอป Hackathon.jpg         # โลโก้งาน (วางไฟล์ที่นี่)
        └── README.md
```

---

## 🎨 การจัดการ Assets รูปภาพ

กรุณานำไฟล์รูปภาพทั้ง 3 ไฟล์มาวางไว้ที่โฟลเดอร์ `public/assets/`:
1. `แบ็กดรอป Hackathon (1)_2.jpg` (มาสคอตหุบปาก - แสดงเริ่มต้นบนจอมือถือ)
2. `แบ็กดรอป Hackathon (2)_2.jpg` (มาสคอตอ้าปาก - แสดงเมื่อแตะหน้าจอมือถือ)
3. `แบ็กดรอป Hackathon.jpg` (โลโก้งาน - แสดงพร้อม Liquid Wave Fill บนจอโปรเจกเตอร์)

*(หากยังไม่ได้วางไฟล์ ระบบมี Fallback SVG กราฟิกรองรับอัตโนมัติ ทำให้เว็บเปิดทดสอบได้ทันทีไม่มีภาพแตก)*

---

## 🔊 ระบบเสียงสังเคราะห์ (Zero-Config Web Audio API)

ไม่ต้องโหลดไฟล์ `.mp3` จากภายนอก ระบบสร้างคลื่นเสียงผ่านเบราว์เซอร์ 100%:
1. **เสียง Pop (`playPop`):** เสียงหยดน้ำ/ปุ่มเกมสังเคราะห์ด้วย Sine Wave Sweep จาก 780Hz ลงมา 180Hz พร้อมสุ่ม Pitch เล็กน้อย เพื่อให้เวลาผู้เล่นกดรัวๆ จะได้ยินเสียงที่เป็นธรรมชาติไม่น่ารำคาญ
2. **เสียงดนตรี BGM (`startBGM`):** ซินธิไซเซอร์ 8-bit อาร์เพจจิโอ 16 ขั้นวนลูป (จังหวะ 115 BPM สไตล์ Cyberpunk)
   - **ฟังก์ชันลดเสียง (Fade out):** เมื่อพลังงานขึ้นถึง **85% - 99%** ระบบจะค่อยๆ หรี่เสียงดนตรีลงอัตโนมัติ เพื่อสร้างความเงียบและบรรยากาศลุ้นระทึก (Suspense)
3. **เสียง Game Start Fanfare (`playGameStart`):** เมื่อพลังงานครบ 100% ระบบจะยิงเสียงระเบิด Sub-bass Impact ตามด้วยเสียง Brass Fanfare ชัยชนะแบบอลังการ

---

## ⚡ วิธีการติดตั้งและรันระบบ (Quick Start)

### 1. ติดตั้ง Dependencies (ทำครั้งแรก)
```bash
npm install
```

### 2. รันเซิร์ฟเวอร์
```bash
npm start
```
หรือหากต้องการรันแบบ Watch Mode สำหรับการพัฒนา:
```bash
npm run dev
```

### 3. URL การเข้าใช้งานระบบ
เมื่อเซิร์ฟเวอร์เริ่มทำงาน จะแสดง URL บน Terminal ดังนี้:
- 📱 **หน้าจอมือถือสำหรับผู้เข้าร่วม (Player View):**
  - ในเครื่องเดียวกัน: `http://localhost:3000`
  - เครื่องผู้เข้าร่วมผ่าน Wi-Fi: `http://[IP_เครื่องเซิร์ฟเวอร์]:3000` (เช่น `http://192.168.1.124:3000`)
- 🖥️ **หน้าจอโปรเจกเตอร์ใหญ่ (Display Screen):**
  - `http://localhost:3000/screen.html` (หรือเปิด `/screen`)
- 🛠️ **หน้าจอแผงควบคุม (Admin Dashboard):**
  - `http://localhost:3000/admin.html` (หรือเปิด `/admin`)

---

## 🕹️ ขั้นตอนการดำเนินพิธีเปิด (Ceremony Walkthrough)

1. **เตรียมจอโปรเจกเตอร์:**
   - เปิดบราวเซอร์ที่หน้า `http://localhost:3000/screen.html` บนจอโปรเจกเตอร์ และกด F11 เพื่อแสดงผลแบบเต็มหน้าจอ (Fullscreen)
   - คลิกปุ่ม **"START AUDIO / BGM"** ที่มุมขวาบน 1 ครั้ง เพื่อเริ่มระบบเสียงและดนตรีประกอบ (รองรับ Browser Autoplay Policy)
   - ที่มุมจอด้านขวาบน มี QR Code สำหรับให้ผู้เข้าร่วมสแกนเข้ามาร่วมสนุก

2. **ผู้เข้าร่วมเล่นเกม:**
   - ผู้เข้าร่วมสแกน QR Code บนจอใหญ่เพื่อเปิดหน้าเว็บ Player บนสมาร์ตโฟน
   - แตะที่ตัวมาสคอตช้างรัวๆ (รองรับ Multi-touch ใช้นิ้วรัวได้พร้อมกันหลายนิ้ว)
   - หน้าจอมือถือจะสะสมยอดคลิกส่งเป็น Batch ไปยังเซิร์ฟเวอร์ทุกๆ 100ms ทำให้ระบบเสถียรและหลอดพลังงานไหลลื่นไม่กระตุก

3. **การควบคุมของแอดมิน (บนอุปกรณ์ของเจ้าหน้าที่):**
   - แอดมินเปิด `http://localhost:3000/admin.html`
   - สามารถมอนิเตอร์จำนวนคนออนไลน์และอัตราการคลิกต่อวินาที (CPS) ได้แบบสดๆ
   - มีปุ่ม **"+100 คลิก"**, **"+500 คลิก"** เพื่อช่วยเร่งคะแนน
   - หากถึงเวลาพิธีการและต้องการให้จบเกมทันที สามารถกดปุ่ม **"🚀 FORCE 100% (จบเกมทันที)"**
   - หากต้องการทดสอบซ้ำ สามารถกดปุ่ม **"🔄 RESET GAME"** เพื่อเริ่มนับ 0 ใหม่ได้ตลอดเวลา
