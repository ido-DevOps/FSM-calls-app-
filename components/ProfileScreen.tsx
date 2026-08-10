import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

/**
 * Identical for every role — the layout guard each role's tab group sits
 * under decides where signing out sends you next.
 */
export function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);

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
        onPress={() => supabase.auth.signOut()}
        accessibilityRole="button"
        className="mt-6 items-center rounded-xl border border-red-200 bg-red-50 py-3.5 active:opacity-70"
      >
        <Text className="font-semibold text-red-600">Sign Out</Text>
      </Pressable>
    </SafeAreaView>
  );
}
