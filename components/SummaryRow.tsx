import { Text, View } from "react-native";

/** Label/value line used in confirmation summaries (swap review, transfer review, …). */
export function SummaryRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <View className="mb-2 flex-row items-center justify-between">
      <Text className="text-xs text-slate-400">{label}</Text>
      <Text className={`text-sm text-slate-900 ${mono ? "font-mono" : "font-medium"}`}>
        {value}
      </Text>
    </View>
  );
}
