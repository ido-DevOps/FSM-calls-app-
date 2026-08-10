import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    // On success, useAuthListener picks up the new session and
    // (auth)/_layout redirects to "/" — which routes by role from there.
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-primary"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-1 justify-center px-6">
        <Text className="text-3xl font-bold text-white">Solaris FSM</Text>
        <Text className="mt-1 text-slate-300">
          Sign in to view your assigned calls.
        </Text>

        <View className="mt-8 gap-3">
          <View>
            <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              placeholder="you@company.com"
              placeholderTextColor="#64748b"
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
            />
          </View>

          <View>
            <Text className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              placeholder="••••••••"
              placeholderTextColor="#64748b"
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white"
            />
          </View>

          {error ? (
            <Text className="text-sm text-red-400" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={handleSignIn}
            disabled={loading}
            accessibilityRole="button"
            className="mt-2 items-center rounded-xl bg-accent py-3.5 active:opacity-80 disabled:opacity-60"
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text className="font-semibold text-primary">Sign In</Text>
            )}
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
