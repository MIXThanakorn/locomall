export function passwordValidationError(password: string) {
  if (password.length < 10) return "รหัสผ่านต้องมีอย่างน้อย 10 ตัวอักษร";
  if (!/[a-z]/.test(password)) return "รหัสผ่านต้องมีตัวพิมพ์เล็ก";
  if (!/[A-Z]/.test(password)) return "รหัสผ่านต้องมีตัวพิมพ์ใหญ่";
  if (!/\d/.test(password)) return "รหัสผ่านต้องมีตัวเลข";
  if (!/[^A-Za-z0-9]/.test(password)) return "รหัสผ่านต้องมีสัญลักษณ์";
  return null;
}
