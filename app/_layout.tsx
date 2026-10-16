import { Stack, useRootNavigationState, useRouter, useSegments } from "expo-router";
import { type PropsWithChildren, useEffect } from "react";
import { View } from "react-native";
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

function AccountScreenBoundary({ children }: PropsWithChildren) {
  const { session } = useAuth();
  // Inactive navigation screens are remounted as well: no old account state or
  // pending response can reappear through back history after an account change.
  return <View key={session?.user.id ?? "guest"} style={{ flex: 1 }}>{children}</View>;
}
function accountScreenLayout({ children, route }: { children: React.ReactNode; route: { name: string } }) {
  // Keep the auth flow alive while its PKCE exchange publishes a new session.
  return route.name === "(auth)" ? <>{children}</> : <AccountScreenBoundary>{children}</AccountScreenBoundary>;
}

function PhoneCompletionGuard() {
  const { session, loading, hasPhone } = useAuth();
  const segments = useSegments();
  const route = segments.join("/");
  const router = useRouter();
  const navigationKey = useRootNavigationState()?.key;
  useEffect(() => {
    if (!navigationKey || loading || !session || hasPhone !== false) return;
    if (route === "" || route === "index" || route === "(auth)/phone-onboarding" || route === "(auth)/switch-account" || route === "(auth)/new-password") return;
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
          initialRouteName="index"
          screenLayout={accountScreenLayout}
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.background },
          }}
        >
          <Stack.Screen name="index" options={{ animation: "none" }} />
          <Stack.Screen name="(auth)" options={{ animation: "none" }} />
        </Stack>
        <PhoneCompletionGuard />
      </BadgeProvider></LanguageProvider></CatalogPreferencesProvider></AuthProvider></AppAlertProvider>
    </SafeAreaProvider>
  );
}
