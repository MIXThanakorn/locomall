import { Ionicons } from "@expo/vector-icons";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { BorderRadius, Colors, Spacing, Typography } from "../constants/theme";
import type { NearbyResult } from "../hooks/useCommerce";

export function CommerceCard({ item, onPress }: { item: NearbyResult; onPress: () => void }) {
  return <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.image} /> : <View style={styles.placeholder}><Ionicons name={item.entity_type === "market" ? "storefront" : "basket"} size={32} color={Colors.greenPrimary} /></View>}
    <View style={styles.body}>
      <View style={styles.row}><Text style={styles.name} numberOfLines={1}>{item.name}</Text><Text style={styles.type}>{item.entity_type === "market" ? "ตลาดชุมชน" : "ร้านค้า"}</Text></View>
      <Text style={styles.description} numberOfLines={2}>{item.description || "สินค้าจากชุมชนใกล้คุณ"}</Text>
      <View style={styles.meta}><Ionicons name="location-outline" size={14} color={Colors.greenPrimary} /><Text style={styles.metaText}>{item.distance_km == null ? "แนะนำสำหรับคุณ" : `${item.distance_km} กม.`}</Text><Text style={styles.dot}>•</Text><Text style={styles.metaText}>{item.entity_type === "market" ? `สินค้าพร้อมขาย ${item.available_stock}` : `คงเหลือ ${item.available_stock}`}</Text></View>
    </View>
  </TouchableOpacity>;
}
const styles=StyleSheet.create({card:{backgroundColor:Colors.cardBackground,borderRadius:BorderRadius.lg,overflow:"hidden",marginBottom:Spacing.md,borderWidth:1,borderColor:Colors.inputBorder},image:{width:"100%",height:150},placeholder:{height:120,alignItems:"center",justifyContent:"center",backgroundColor:"#EAF1E9"},body:{padding:Spacing.md},row:{flexDirection:"row",alignItems:"center",gap:Spacing.sm},name:{flex:1,fontFamily:"Kanit_700Bold",fontSize:Typography.fontSizeLg,color:Colors.textDark},type:{fontFamily:"Kanit_500Medium",fontSize:11,color:Colors.greenPrimary,backgroundColor:"#EAF1E9",paddingHorizontal:8,paddingVertical:3,borderRadius:99},description:{fontFamily:"Kanit_400Regular",fontSize:Typography.fontSizeSm,color:Colors.textMuted,marginTop:4},meta:{flexDirection:"row",alignItems:"center",marginTop:Spacing.sm,gap:4},metaText:{fontFamily:"Kanit_500Medium",fontSize:Typography.fontSizeXs,color:Colors.textMedium},dot:{color:Colors.textLight}});
