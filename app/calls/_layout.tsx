import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../store/authStore";

export default function CallsLayout() {
  const { session, isLoading } = useAuthStore();

  // Shared by every role — RLS already scopes what data comes back, this
  // just avoids rendering the shell for a signed-out deep link.
  if (!isLoading && !session) return <Redirect href="/(auth)/login" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#ffffff" },
        headerTitleStyle: { fontWeight: "700" },
        headerTintColor: "#0f172a",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="[id]" options={{ title: "Call Details" }} />
      <Stack.Screen name="[id]/scan" options={{ title: "Scan Serial" }} />
      <Stack.Screen name="[id]/photos" options={{ title: "Upload Photos" }} />
    </Stack>
  );
}
