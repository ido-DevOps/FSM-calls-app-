import { Tabs } from "expo-router";
import { Text } from "react-native";
import { RoleGate } from "../../components/RoleGate";

export default function TabsLayout() {
  // This tab group owns "/" and is technician-only. RoleGate holds the render
  // until the role is known, so admins/warehouse managers are routed straight
  // to their own area instead of flashing "My Calls" first.
  return (
    <RoleGate allow={["technician"]}>
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
    </RoleGate>
  );
}
