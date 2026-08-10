import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBadge } from "./StatusBadge";
import type { ServiceCall } from "../types/database.types";

export function CallListItem({ call }: { call: ServiceCall }) {
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/calls/${call.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Call ${call.call_number} for ${call.customer_name}`}
      className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 active:opacity-70"
    >
      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-xs text-slate-400">
          {call.call_number}
        </Text>
        <StatusBadge status={call.status} />
      </View>
      <Text className="mt-1.5 text-base font-semibold text-slate-900">
        {call.customer_name}
      </Text>
      {call.address ? (
        <Text className="mt-0.5 text-sm text-slate-500" numberOfLines={1}>
          {call.address}
        </Text>
      ) : null}
    </Pressable>
  );
}
