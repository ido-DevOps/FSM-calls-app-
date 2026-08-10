import { Redirect, Tabs } from "expo-router";
import { Text } from "react-native";
import { useAuthStore } from "../../store/authStore";

export default function WarehouseLayout() {
  const { session, profile, isLoading } = useAuthStore();

  if (!isLoading && !session) return <Redirect href="/(auth)/login" />;

  // Inventory work is shared by warehouse managers and admins; technicians
  // don't belong here.
  if (profile && profile.role === "technician") return <Redirect href="/" />;

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
          title: "Inventory",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>📦</Text>,
        }}
      />
      <Tabs.Screen
        name="transfer"
        options={{
          title: "Dispatch",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>🔄</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 18, color }}>👤</Text>,
        }}
      />
      <Tabs.Screen
        name="add-item"
        options={{
          // Reachable via router.push, but not a tab of its own — it's an
          // action off Inventory, not a peer destination.
          href: null,
        }}
      />
    </Tabs>
  );
}
