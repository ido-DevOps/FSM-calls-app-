import { Tabs } from "expo-router";
import { Text } from "react-native";
import { RoleGate } from "../../components/RoleGate";

export default function AdminLayout() {
  // Dispatch is admin-only; warehouse managers have their own area and
  // technicians get bounced to theirs.
  return (
    <RoleGate allow={["admin"]}>
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
    </RoleGate>
  );
}
