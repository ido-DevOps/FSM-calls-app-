import { Text, View } from "react-native";
import type { CallStatus } from "../types/database.types";

const STYLES: Record<
  CallStatus,
  { bg: string; dot: string; text: string; label: string }
> = {
  open: {
    bg: "bg-slate-100",
    dot: "bg-slate-400",
    text: "text-slate-600",
    label: "Open",
  },
  in_progress: {
    bg: "bg-amber-50",
    dot: "bg-amber-500",
    text: "text-amber-700",
    label: "In Progress",
  },
  pending_parts: {
    bg: "bg-orange-50",
    dot: "bg-orange-500",
    text: "text-orange-700",
    label: "Pending Parts",
  },
  completed: {
    bg: "bg-emerald-50",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    label: "Completed",
  },
  cancelled: {
    bg: "bg-red-50",
    dot: "bg-red-500",
    text: "text-red-600",
    label: "Cancelled",
  },
};

export function StatusBadge({ status }: { status: CallStatus }) {
  const s = STYLES[status];
  return (
    <View
      className={`flex-row items-center self-start rounded-full px-2.5 py-1 ${s.bg}`}
    >
      <View className={`mr-1.5 h-1.5 w-1.5 rounded-full ${s.dot}`} />
      <Text className={`text-xs font-medium ${s.text}`}>{s.label}</Text>
    </View>
  );
}
