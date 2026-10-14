import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Colors } from "../src/constants/theme";
import { LanguageProvider } from "../src/context/LanguageContext";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { Kanit_400Regular, Kanit_500Medium, Kanit_700Bold, useFonts } from "@expo-google-fonts/kanit";
import { Spectral_700Bold } from "@expo-google-fonts/spectral";
import { AppAlertProvider } from "../src/components/AppAlertProvider";
import { PushNotificationBootstrap } from "../src/components/PushNotificationBootstrap";
import { BadgeProvider } from "../src/context/BadgeContext";
import { CatalogPreferencesProvider } from "../src/context/CatalogPreferencesContext";

function PhoneCompletionGuard() {
  const { session, loading, hasPhone } = useAuth();
  const segments = useSegments();
  const route = segments.join("/");
  const router = useRouter();
  const navigationKey = useRootNavigationState()?.key;
  useEffect(() => {
    if (!navigationKey || loading || !session || hasPhone !== false) return;
    if (route === "" || route === "index" || route === "(auth)/phone-onboarding" || route === "(auth)/switch-account") return;
    router.replace("/(auth)/phone-onboarding" as never);
  }, [navigationKey, loading, session, hasPhone, route, router]);
  return null;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Kanit_400Regular, Kanit_500Medium, Kanit_700Bold, Spectral_700Bold });
  if (!fontsLoaded) return null;
  return (
    <SafeAreaProvider>
      <AppAlertProvider><AuthProvider><CatalogPreferencesProvider><LanguageProvider><BadgeProvider><PushNotificationBootstrap />
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="(auth)/switch-account" options={{ animation: "none" }} />
          <Stack.Screen name="index" options={{ animation: "none" }} />
        </Stack>
        <PhoneCompletionGuard />
      </BadgeProvider></LanguageProvider></CatalogPreferencesProvider></AuthProvider></AppAlertProvider>
    </SafeAreaProvider>
  );
}
