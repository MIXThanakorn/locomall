import { Text, View } from "react-native";
import { parseDeliveryAddress } from "../lib/commerceDto";
import { Colors } from "../constants/theme";

export function DeliveryAddressCard({ value }: { value: unknown }) {
  const address = parseDeliveryAddress(value);
  return <View style={{ padding: 12, marginVertical: 8, borderRadius: 12, backgroundColor: "#EAF1E9", gap: 4 }}>
    <Text style={{ fontFamily: "Kanit_700Bold", color: Colors.greenPrimary }}>ที่อยู่จัดส่ง ณ เวลาสั่งซื้อ</Text>
    {address ? <><Text>{address.recipient_name} · {address.phone}</Text><Text>{address.address_line}</Text><Text>{[address.location?.subdistrict, address.location?.district, address.location?.province, address.postal_code].filter(Boolean).join(" ")}</Text></> : <Text>ออเดอร์เก่านี้ไม่ได้บันทึกสำเนาที่อยู่ ณ เวลาสั่งซื้อ กรุณาตรวจสอบกับผู้ซื้อก่อนจัดส่ง</Text>}
  </View>;
}
