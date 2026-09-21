import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CommerceCard } from "../../src/components/CommerceCard";
import { BorderRadius, Colors, Spacing } from "../../src/constants/theme";
import { useNearby } from "../../src/hooks/useCommerce";

export default function HomeScreen() {
  const router=useRouter(); const insets=useSafeAreaInsets(); const {items,loading,error,refresh}=useNearby("","all");
  return <View style={styles.container}>
    <View style={[styles.hero,{paddingTop:insets.top+14}]}><View><Text style={styles.brand}>Locomall</Text><Text style={styles.tagline}>ของดีจากชุมชน ใกล้คุณก่อนเสมอ</Text></View><TouchableOpacity style={styles.cart} onPress={()=>router.push("/order/cart" as never)}><Ionicons name="cart-outline" size={23} color={Colors.greenPrimary}/></TouchableOpacity></View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh}/>}>
      <TouchableOpacity style={styles.search} onPress={()=>router.push("/(tabs)/nearby" as never)}><Ionicons name="search" size={20} color={Colors.textMuted}/><Text style={styles.searchText}>ค้นหาตลาดหรือร้านค้าใกล้ฉัน</Text></TouchableOpacity>
      <View style={styles.heading}><View><Text style={styles.eyebrow}>แนะนำสำหรับคุณ</Text><Text style={styles.title}>ชุมชนใกล้บ้าน</Text></View><TouchableOpacity onPress={()=>router.push("/(tabs)/nearby" as never)}><Text style={styles.more}>ดูทั้งหมด</Text></TouchableOpacity></View>
      {loading&&!items.length?<ActivityIndicator color={Colors.greenPrimary} style={{marginTop:40}}/>:null}{error?<Text style={styles.message}>โหลดข้อมูลไม่สำเร็จ: {error}</Text>:null}
      {!loading&&!error&&!items.length?<View style={styles.empty}><Ionicons name="leaf-outline" size={38} color={Colors.greenPrimary}/><Text style={styles.emptyTitle}>ยังไม่มีตลาดในพื้นที่</Text><Text style={styles.message}>ระบบจะขยายระยะค้นหาจาก 10 กม. ทีละ 5 กม. ให้อัตโนมัติเมื่อมีตลาดเปิดใช้งาน</Text></View>:null}
      {items.slice(0,8).map(item=><CommerceCard key={`${item.entity_type}-${item.entity_id}`} item={item} onPress={()=>router.push((item.entity_type==="market"?`/market/${item.entity_id}`:`/store/${item.entity_id}`) as never)}/>)}
    </ScrollView>
  </View>
}
const styles=StyleSheet.create({container:{flex:1,backgroundColor:Colors.background},hero:{backgroundColor:Colors.goldPrimary,paddingHorizontal:Spacing.lg,paddingBottom:Spacing.lg,flexDirection:"row",alignItems:"center",justifyContent:"space-between",borderBottomLeftRadius:28,borderBottomRightRadius:28},brand:{fontFamily:"Spectral_700Bold",fontSize:30,color:Colors.greenPrimary},tagline:{fontFamily:"Kanit_400Regular",fontSize:13,color:Colors.greenDark},cart:{width:44,height:44,borderRadius:22,backgroundColor:Colors.cardBackground,alignItems:"center",justifyContent:"center"},content:{padding:Spacing.lg,paddingBottom:80},search:{height:50,borderRadius:BorderRadius.round,backgroundColor:Colors.cardBackground,borderWidth:1,borderColor:Colors.inputBorder,flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:Spacing.md},searchText:{fontFamily:"Kanit_400Regular",color:Colors.textMuted},heading:{flexDirection:"row",alignItems:"flex-end",justifyContent:"space-between",marginTop:Spacing.lg,marginBottom:Spacing.md},eyebrow:{fontFamily:"Kanit_500Medium",fontSize:11,color:Colors.goldDark},title:{fontFamily:"Kanit_700Bold",fontSize:22,color:Colors.greenPrimary},more:{fontFamily:"Kanit_500Medium",color:Colors.greenPrimary},message:{fontFamily:"Kanit_400Regular",color:Colors.textMuted,textAlign:"center",marginTop:8},empty:{padding:Spacing.xl,alignItems:"center",backgroundColor:Colors.cardBackground,borderRadius:BorderRadius.lg,marginBottom:Spacing.lg},emptyTitle:{fontFamily:"Kanit_700Bold",fontSize:17,color:Colors.textDark,marginTop:8}});
