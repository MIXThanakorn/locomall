import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Colors } from "../src/constants/theme";
import { useAuth } from "../src/context/AuthContext";
export default function Index(){const{session,loading,hasLocation,isAdmin}=useAuth();if(loading||(session&&(hasLocation===null||isAdmin===null)))return <View style={s.root}><ActivityIndicator color={Colors.greenPrimary}/></View>;if(!session)return <Redirect href="/(auth)/splash"/>;if(isAdmin)return <Redirect href={"/admin" as any}/>;if(!hasLocation)return <Redirect href={"/(auth)/location-onboarding" as any}/>;return <Redirect href="/(tabs)"/>}
const s=StyleSheet.create({root:{flex:1,alignItems:"center",justifyContent:"center",backgroundColor:Colors.background}});
