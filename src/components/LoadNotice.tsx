import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { Colors } from "../constants/theme";

export function LoadNotice({ onRetry, message = "โหลดข้อมูลไม่สำเร็จ ข้อมูลที่แสดงอาจยังไม่ล่าสุด" }: { onRetry: () => void; message?: string }) {
  return <TouchableOpacity accessibilityRole="button" onPress={onRetry} style={styles.notice}>
    <Text style={styles.text}>{message}</Text><Text style={styles.retry}>ลองใหม่</Text>
  </TouchableOpacity>;
}
const styles = StyleSheet.create({ notice: { padding: 12, marginVertical: 8, borderRadius: 12, backgroundColor: Colors.cardBackground }, text: { fontFamily: "Kanit_400Regular", color: Colors.danger, textAlign: "center" }, retry: { fontFamily: "Kanit_500Medium", color: Colors.greenPrimary, textAlign: "center", paddingTop: 6 } });
