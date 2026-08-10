import "../global.css";
// Registers `className` support for third-party components (SafeAreaView).
// Must be imported before any screen renders — see the file for why.
import "../lib/nativewind-interop";
import { useState } from "react";
import type { PropsWithChildren } from "react";
import { ActivityIndicator, View } from "react-native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useAuthListener } from "../hooks/useAuthListener";
import { useAuthStore } from "../store/authStore";

/** Loads the session once, then gates rendering until that's resolved. */
function AuthGate({ children }: PropsWithChildren) {
  useAuthListener();
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-primary">
        <ActivityIndicator color="#f59e0b" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <StatusBar style="auto" />
        <AuthGate>
          <Stack screenOptions={{ headerShown: false }} />
        </AuthGate>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
