import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuthStore } from "../../store/authStore";

export default function TabsLayout() {
  const { session, profile, isLoading } = useAuthStore();

  if (!isLoading && !session) return <Redirect href="/(auth)/login" />;

  // This tab group is technician-only; admins/warehouse managers land here
  // briefly on sign-in and get bounced to their own area.
  if (profile?.role === "warehouse_manager") return <Redirect href="/warehouse" />;
  if (profile?.role === "admin") return <Redirect href="/admin" />;

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
          title: "My Calls",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🗂️</Text>,
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
