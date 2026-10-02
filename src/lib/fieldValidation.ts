export function normalizeMobilePhone(value: string): string {
  return value.replace(/[^0-9]/g, "").slice(0, 10);
}

export function mobilePhoneError(value: string, required = true): string | null {
  if (!value && !required) return null;
  if (!value) return "กรุณากรอกเบอร์มือถือ";
  if (!/^[0-9]+$/.test(value)) return "เบอร์มือถือต้องเป็นตัวเลขเท่านั้น";
  if (!value.startsWith("0")) return "เบอร์มือถือต้องขึ้นต้นด้วยเลข 0";
  if (value.length !== 10) return "เบอร์มือถือต้องมี 10 หลัก";
  return null;
}

export function emailValidationError(value: string): string | null {
  const email = value.trim();
  if (!email) return "กรุณากรอกอีเมล";
  if (/\s/.test(email)) return "อีเมลต้องไม่มีช่องว่าง";
  if (!email.includes("@")) return "อีเมลต้องมีเครื่องหมาย @ เช่น name@example.com";
  const parts = email.split("@");
  if (parts.length !== 2) return "อีเมลต้องมีเครื่องหมาย @ เพียงตัวเดียว";
  if (!parts[0]) return "กรุณากรอกชื่อก่อนเครื่องหมาย @";
  if (!/^[A-Za-z0-9_+%-]+(?:\.[A-Za-z0-9_+%-]+)*$/.test(parts[0])) return "ชื่ออีเมลก่อน @ มีอักขระหรือจุดที่ไม่ถูกต้อง";
  const domain = parts[1];
  if (!domain) return "กรุณากรอกชื่อโดเมนหลังเครื่องหมาย @";
  if (!domain.includes(".")) return "ชื่อโดเมนต้องมีจุดและนามสกุล เช่น .com หรือ .co.th";
  const labels = domain.split(".");
  if (!/^[A-Za-z]{2,}$/.test(labels[labels.length - 1])) return "นามสกุลอีเมลต้องมีอย่างน้อย 2 ตัวอักษร เช่น .com หรือ .co.th";
  if (labels.some((part) => !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(part))) {
    return "รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบชื่อโดเมนและนามสกุลอีเมล";
  }
  return null;
}
