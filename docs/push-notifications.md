# Push notifications

Locomall ใช้ `expo-notifications` + Expo Push Service และ Supabase Edge Function
`push-notification`. Notification ในแอปและ Push ใช้ row เดียวกันใน
`public.notifications` เพื่อให้ title, body, category และ deep link ตรงกัน.

## สิ่งที่อยู่ในโค้ดแล้ว

- ขอสิทธิ์แจ้งเตือนหลังผู้ใช้เข้าสู่ระบบ; ปฏิเสธได้โดยไม่กระทบการใช้งาน
- สร้าง Android channel `locomall-updates`
- ลงทะเบียน Expo token ผ่าน `register_my_push_device` โดยไม่รับ `user_id` จาก client
- ปิด token ของบัญชีเดิมตอน logout เพื่อป้องกันข้อมูลรั่วบนเครื่องที่ใช้ร่วมกัน
- เก็บ token ใน `user_push_devices` แบบ RPC/server-only; Data API อ่านโดยตรงไม่ได้
- เปิดหน้าที่เกี่ยวข้องเมื่อแตะ Push
- Edge Function ส่ง Push และปิด token ที่ Expo ตอบ `DeviceNotRegistered`

## ตั้งค่าครั้งเดียวก่อนทดสอบบนเครื่องจริง

1. Link โปรเจ็ค Expo/EAS เพื่อให้ `extra.eas.projectId` ถูกเพิ่มใน app config:

   ```bash
   npx eas-cli init
   ```

2. ตั้ง Android FCM V1 และ iOS APNs credentials แล้วสร้าง Development Build:

   ```bash
   npx eas-cli build --profile development --platform android
   npx eas-cli build --profile development --platform ios
   ```

   Remote Push บน Android ไม่ทำงานใน Expo Go ตั้งแต่ SDK 53; ต้องใช้
   Development หรือ Production Build.

3. ใน Supabase Dashboard สร้าง Database Webhook:

   - Table: `public.notifications`
   - Event: `INSERT`
   - Method: `POST`
   - Target: Edge Function `push-notification`
   - เพิ่ม authenticated service header ตามหน้าสร้าง webhook

4. หากเปิด Enhanced Security ใน Expo Push Service ให้สร้าง Expo access token และ
   เก็บเป็น Supabase Edge Function secret ชื่อ `EXPO_ACCESS_TOKEN` เท่านั้น:

   ```bash
   npx supabase secrets set EXPO_ACCESS_TOKEN=your_token
   ```

ห้ามใส่ Expo access token หรือ Supabase service/secret key ใน `.env.local` ของแอป.

## Smoke test

1. ติดตั้ง Development Build บนเครื่องจริงและ login.
2. กดอนุญาตเมื่อระบบถามสิทธิ์แจ้งเตือน.
3. ตรวจว่ามี row enabled ใน `user_push_devices` สำหรับ user (ตรวจจาก Dashboard
   ด้วยสิทธิ์ผู้ดูแลเท่านั้น).
4. ทำ action ที่สร้าง notification เช่นอนุมัติ Market/Store.
5. ปิดหรือ background แอปและยืนยันว่า Push แสดง; แตะแล้วเปิด entity ที่ถูกต้อง.
6. Logout และยืนยันว่าอุปกรณ์ไม่รับ Push ของบัญชีเดิม.

อ้างอิง: [Supabase Push Notifications](https://supabase.com/docs/guides/functions/examples/push-notifications),
[Expo Push Setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).
