import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack initialRouteName="splash" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="splash" options={{ animation: "none" }} />
      <Stack.Screen name="switch-account" options={{ animation: "none" }} />
    </Stack>
  );
}
