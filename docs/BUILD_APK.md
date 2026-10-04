# วิธีสร้าง Android APK ของ Locomall

คู่มือนี้ใช้กับ APK สำหรับติดตั้งทดสอบ (`preview` / internal distribution) ไม่ใช่ไฟล์ AAB สำหรับส่งขึ้น Google Play โปรไฟล์ `preview` ใน `eas.json` กำหนด `android.buildType` เป็น `apk` แล้ว

## เตรียมก่อนบิลด์

1. เปิด PowerShell ใน root โปรเจ็กต์ และติดตั้ง dependencies ด้วย `npm ci`
2. ลงชื่อเข้าใช้ Expo account เจ้าของ EAS project: `npx eas-cli login` แล้วตรวจด้วย `npx eas-cli whoami`
3. ตรวจว่า `app.json` มี `expo.extra.eas.projectId`, Android package `com.locomall.app`, และ `googleServicesFile` ชี้ไปยัง `./google-services.json`
4. ตรวจว่า EAS environment `preview` มี `EXPO_PUBLIC_SUPABASE_URL` และ `EXPO_PUBLIC_SUPABASE_ANON_KEY` ตรงกับ Supabase project ที่ต้องการ ไม่ใส่ service-role key ลงในแอป และอย่า commit `.env.local` หรือ service-account private key
5. ถ้าจะทดสอบ Google Sign-In ให้เพิ่ม `locomall://sign-in` ใน Supabase Dashboard → Authentication → URL Configuration → Redirect URLs ก่อน ดูรายละเอียดใน [GOOGLE_SIGN_IN_ANDROID.md](GOOGLE_SIGN_IN_ANDROID.md)

## ตรวจและบิลด์

```powershell
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx eas-cli build --platform android --profile preview --non-interactive --wait
```

เมื่อ EAS แจ้ง `FINISHED` ให้เปิด build details URL หรือใช้ `npx eas-cli build:list --platform android --limit 5` แล้วคัดลอกลิงก์ APK ของ build **รอบใหม่** จาก `artifacts.buildUrl` ระวังอย่าดาวน์โหลด build เก่าที่มีชื่อแอปและเวอร์ชันเดียวกัน

## เก็บไฟล์ในโปรเจ็กต์

```powershell
New-Item -ItemType Directory -Path outputs/apk -Force
Invoke-WebRequest -Uri '<APK artifact URL ของ build รอบใหม่>' -OutFile 'outputs/apk/Locomall-1.0.0-preview-YYYY-MM-DD.apk'
Get-Item 'outputs/apk/Locomall-1.0.0-preview-YYYY-MM-DD.apk' | Select-Object Name,Length
Get-FileHash 'outputs/apk/Locomall-1.0.0-preview-YYYY-MM-DD.apk' -Algorithm SHA256
```

ตั้งชื่อวันที่ตามวันที่บิลด์จริงและไม่ทับไฟล์เก่า `outputs/` ถูก `.gitignore` จึงไม่อัปโหลด APK ขนาดใหญ่หรือข้อมูลบิลด์ขึ้น GitHub โดยไม่ตั้งใจ

## ติดตั้งและทดสอบบนเครื่อง Android

- เปิดไฟล์ APK บนเครื่อง Android แล้วอนุญาตให้ติดตั้งจากแหล่งนั้นตามที่ระบบถาม หรือเชื่อมเครื่องกับคอมพิวเตอร์แล้วใช้ `adb install -r <path-to-apk>`
- ทดสอบเปิดแอป, สมัคร/เข้าสู่ระบบ, Google Sign-In, เลือกพื้นที่หลัก, หน้า Home, ตะกร้า, คำสั่งซื้อ, แชต และแจ้งเตือนบนเครื่องจริง
- หากติดตั้งทับไม่ได้ ให้ตรวจว่า APK เก่าและใหม่ลงนามด้วย certificate เดียวกันก่อน การถอนการติดตั้งจะลบข้อมูลแอปในเครื่อง จึงอย่าถอนทันทีโดยไม่สำรองข้อมูลที่จำเป็น
- Google Sign-In ต้องเปิดหน้า Google และกลับเข้าแอปหลังเลือกบัญชี ถ้าไม่กลับ ให้ตรวจ Supabase Redirect URL และเก็บข้อความ error/เวลาเกิดเหตุไว้เทียบ Auth logs
- Push notification บน Android ต้องมี FCM V1 credential ของ EAS และทดสอบบนเครื่องจริง การทดสอบด้วย Expo Go ไม่เทียบเท่า APK

## บิลด์ประเภทอื่น

`npx eas-cli build --platform android --profile production` ใช้โปรไฟล์ `production` ซึ่งโดยปกติออกเป็น AAB สำหรับ Google Play ไม่ใช่ APK ติดตั้งตรง หากต้องการ APK ติดตั้งทดสอบ ให้ใช้ `preview` ตามคู่มือนี้
