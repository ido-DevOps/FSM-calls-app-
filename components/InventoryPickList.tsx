import { ActivityIndicator, Pressable, Text, View } from "react-native";
import type { InventoryItem } from "../types/database.types";

/** Tappable list of inventory items — used to pick a component to scan/select. */
export function InventoryPickList({
  items,
  isLoading,
  emptyMessage,
  onSelect,
}: {
  items: InventoryItem[] | undefined;
  isLoading: boolean;
  emptyMessage: string;
  onSelect: (item: InventoryItem) => void;
}) {
  if (isLoading) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator color="#f59e0b" />
      </View>
    );
  }

  if (!items || items.length === 0) {
    return (
      <View className="items-center rounded-2xl border border-dashed border-slate-200 px-4 py-8">
        <Text className="text-center text-sm text-slate-500">{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View>
      {items.map((item) => (
        <Pressable
          key={item.id}
          onPress={() => onSelect(item)}
          accessibilityRole="button"
          className="mb-2 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 active:opacity-70"
        >
          <View className="flex-1 pr-3">
            <Text className="font-semibold text-slate-900">{item.model_name}</Text>
            <Text className="font-mono text-xs text-slate-500">{item.serial_number}</Text>
          </View>
          {item.category ? (
            <View className="rounded-full bg-slate-100 px-2.5 py-1">
              <Text className="text-xs text-slate-500">{item.category}</Text>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
