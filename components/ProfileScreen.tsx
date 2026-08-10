import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

/**
 * Identical for every role — the layout guard each role's tab group sits
 * under decides where signing out sends you next.
 */
export function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      // `scope: "local"` drops the session on this device without needing the
      // network. A global sign-out round-trips to revoke the refresh token,
      // which fails offline — and this app is used on roofs and in basements,
      // where the old fire-and-forget call silently did nothing.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch (e) {
      Alert.alert("Sign out failed", e instanceof Error ? e.message : "Please try again.");
      setSigningOut(false);
      return;
    } finally {
      // The QueryClient is created once for the whole process, so without this
      // every cached row stays in memory across sign-out. Most query keys
      // aren't namespaced by user, so the next person to sign in on a shared
      // tablet would render the previous user's data before any refetch.
      queryClient.clear();
    }
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50 px-4 pt-2">
      <Text className="text-2xl font-bold text-slate-900">Profile</Text>

      <View className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">Name</Text>
        <Text className="mt-1 text-base text-slate-900">{profile?.full_name ?? "—"}</Text>

        <Text className="mt-4 text-xs font-medium uppercase tracking-wide text-slate-400">
          Role
        </Text>
        <Text className="mt-1 text-base capitalize text-slate-900">
          {profile?.role?.replace("_", " ") ?? "—"}
        </Text>
      </View>

      <Pressable
        onPress={handleSignOut}
        disabled={signingOut}
        accessibilityRole="button"
        accessibilityState={{ disabled: signingOut }}
        className={`mt-6 items-center rounded-xl border border-red-200 bg-red-50 py-3.5 ${
          signingOut ? "opacity-50" : "active:opacity-70"
        }`}
      >
        {signingOut ? (
          <ActivityIndicator color="#dc2626" />
        ) : (
          <Text className="font-semibold text-red-600">Sign Out</Text>
        )}
      </Pressable>
    </SafeAreaView>
  );
}
