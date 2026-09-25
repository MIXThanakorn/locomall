import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Colors } from "../../src/constants/theme";
import { useAuth } from "../../src/context/AuthContext";

export default function ProfileLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator color={Colors.greenPrimary} /></View>;
  }
  if (!session) return <Redirect href="/(auth)/sign-in" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.background },
});
