# Google Sign-In บน Android APK

แอปใช้ Supabase OAuth ผ่านเบราว์เซอร์ แล้วกลับเข้าแอปด้วย deep link `locomall://sign-in` ไม่ได้ใช้ Firebase Authentication หรือ FCM key ในการล็อกอินนี้

## ตั้งค่าที่ต้องตรงกัน

1. ใน `app.json` ต้องมี `expo.scheme` เป็น `locomall` (ตั้งไว้แล้ว) และ Android package เป็น `com.locomall.app`
2. เปิด Supabase Dashboard → Authentication → URL Configuration → Redirect URLs แล้วเพิ่ม **`locomall://sign-in`** แบบตรงตัว อย่าใส่เป็น URL ของ Expo Go (`exp://...`) สำหรับ APK
3. ใน Supabase Dashboard → Authentication → Sign In / Providers → Google ต้องเปิด provider และตั้ง Google OAuth client ID/secret (โปรเจ็กต์ปัจจุบันเปิด Google อยู่แล้ว)
4. ใน Google Cloud Console สำหรับ Web OAuth client ให้ Authorized redirect URI ชี้ไปที่ `https://lahohyeeakppglaqnzhk.supabase.co/auth/v1/callback` ซึ่งเป็น callback **จาก Google กลับ Supabase** ไม่ใช่ `locomall://sign-in` ส่วน URI ของแอปให้ตั้งใน Supabase ตามข้อ 2

## ทดสอบ

1. สร้างและติดตั้ง APK **ใหม่** หลังแก้โค้ด เพราะ APK เก่าไม่รับโค้ดที่แก้ครั้งนี้
2. กด “เข้าสู่ระบบด้วย Google” เลือกบัญชี แล้วตรวจว่าเบราว์เซอร์ปิดและกลับเข้าแอป จากนั้นแอปควรพาไปเลือกพื้นที่หลักเมื่อเป็นบัญชีใหม่ หรือไปหน้าแรกเมื่อเคยเลือกแล้ว
3. ถ้าหน้า Google ไม่กลับเข้าแอป ให้ตรวจ Redirect URLs ในข้อ 2 ก่อน หากมีข้อความ error ให้เก็บภาพหน้าจอและเวลาเกิดเหตุเพื่อตรวจ Auth logs

`google-services.json` และ Firebase Admin SDK key ไม่ได้กำหนด callback ของ Supabase browser OAuth เส้นทางนี้ การเพิ่ม SHA-1 ใน Google Cloud อาจจำเป็นสำหรับ Android OAuth client แบบ native แต่ไม่ทดแทน Redirect URL ในข้อ 2
