import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Colors } from "../src/constants/theme";
import { LanguageProvider } from "../src/context/LanguageContext";
import { AuthProvider } from "../src/context/AuthContext";
import { Kanit_400Regular, Kanit_500Medium, Kanit_700Bold, useFonts } from "@expo-google-fonts/kanit";
import { Spectral_700Bold } from "@expo-google-fonts/spectral";
import { AppAlertProvider } from "../src/components/AppAlertProvider";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Kanit_400Regular, Kanit_500Medium, Kanit_700Bold, Spectral_700Bold });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <AppAlertProvider><AuthProvider><LanguageProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        />
      </LanguageProvider></AuthProvider></AppAlertProvider>
    </SafeAreaProvider>
  );
}
