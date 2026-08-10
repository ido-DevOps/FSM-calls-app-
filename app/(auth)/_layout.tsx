import { Redirect, Stack } from "expo-router";
import { useAuthStore } from "../../store/authStore";

export default function AuthLayout() {
  const session = useAuthStore((s) => s.session);

  // Already signed in — bounce to the home route, which routes on to the
  // right area (technician tabs vs. admin) based on profile role.
  if (session) return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
