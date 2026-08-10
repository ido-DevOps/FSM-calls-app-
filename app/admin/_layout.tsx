import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuthStore } from "../../store/authStore";

export default function AdminLayout() {
  const { session, profile, isLoading } = useAuthStore();

  if (!isLoading && !session) return <Redirect href="/(auth)/login" />;
  if (profile?.role === "technician") return <Redirect href="/" />;
  // Dispatch is admin-only; warehouse managers have their own area.
  if (profile?.role === "warehouse_manager") return <Redirect href="/warehouse" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#f59e0b",
        tabBarInactiveTintColor: "#94a3b8",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Overview",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="new-call"
        options={{
          title: "New Call",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>➕</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text>,
        }}
      />
    </Tabs>
  );
}
