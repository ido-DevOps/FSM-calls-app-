import type { PropsWithChildren } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";
import type { UserRole } from "../types/database.types";

/** Where each role's home screen lives. */
export function homeForRole(role: UserRole): "/" | "/admin" | "/warehouse" {
  if (role === "admin") return "/admin";
  if (role === "warehouse_manager") return "/warehouse";
  return "/";
}

/**
 * Shown when we have a session but couldn't determine the user's role. This
 * used to be indistinguishable from "no special role", so the old deny-list
 * guards let it through and rendered the admin/warehouse UI to an
 * unprovisioned user. Now it's an explicit dead end with a way out.
 */
function ProfileUnavailable({ message }: { message: string | null }) {
  const queryClient = useQueryClient();

  return (
    <View className="flex-1 items-center justify-center bg-slate-50 px-8">
      <Text className="mb-2 text-center text-lg font-semibold text-slate-900">
        Can't load your account
      </Text>
      <Text className="mb-6 text-center text-sm text-slate-500">
        {message ?? "We couldn't determine your role. Please try signing in again."}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={async () => {
          try {
            await supabase.auth.signOut();
          } finally {
            queryClient.clear();
          }
        }}
        className="rounded-xl bg-primary px-5 py-3 active:opacity-80"
      >
        <Text className="font-semibold text-white">Sign Out</Text>
      </Pressable>
    </View>
  );
}

/**
 * Deny-by-default role guard for a route group.
 *
 * The rule that matters: a role is only granted when it is *known* and appears
 * in `allow`. An unresolved profile blocks (spinner) and a failed one dead-ends
 * — neither falls through. The previous guards were deny-lists built on
 * `profile?.role === "..."`, so `profile === null` matched nothing and rendered
 * the protected UI.
 */
export function RoleGate({
  allow,
  children,
}: PropsWithChildren<{ allow: UserRole[] }>) {
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isProfileLoading = useAuthStore((s) => s.isProfileLoading);
  const profileError = useAuthStore((s) => s.profileError);

  if (!session) return <Redirect href="/(auth)/login" />;

  // Role not resolved yet — wait rather than guessing. This also removes the
  // flash of "My Calls" that every admin/warehouse manager saw on sign-in.
  if (isProfileLoading || (!profile && !profileError)) {
    return (
      <View className="flex-1 items-center justify-center bg-primary">
        <ActivityIndicator color="#f59e0b" />
      </View>
    );
  }

  if (!profile) return <ProfileUnavailable message={profileError} />;

  if (!allow.includes(profile.role)) {
    return <Redirect href={homeForRole(profile.role)} />;
  }

  return <>{children}</>;
}
