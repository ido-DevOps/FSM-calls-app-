import { Text, View } from "react-native";
import type { ItemStatus } from "../types/database.types";

const STYLES: Record<ItemStatus, { bg: string; dot: string; text: string; label: string }> = {
  in_warehouse: {
    bg: "bg-slate-100",
    dot: "bg-slate-400",
    text: "text-slate-600",
    label: "In Warehouse",
  },
  with_technician: {
    bg: "bg-amber-50",
    dot: "bg-amber-500",
    text: "text-amber-700",
    label: "With Technician",
  },
  installed: {
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    label: "Installed",
  },
  defective_returned: {
    bg: "bg-red-50",
    dot: "bg-red-500",
    text: "text-red-600",
    label: "Defective — Returned",
  },
};

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const s = STYLES[status];
  return (
    <View className={`flex-row items-center self-start rounded-full px-2.5 py-1 ${s.bg}`}>
      <View className={`mr-1.5 h-1.5 w-1.5 rounded-full ${s.dot}`} />
      <Text className={`text-xs font-medium ${s.text}`}>{s.label}</Text>
    </View>
  );
}
