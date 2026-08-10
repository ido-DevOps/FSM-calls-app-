import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export interface PickerOption {
  id: string;
  label: string;
  sublabel?: string;
}

/**
 * Generic searchable "pick one from a list" modal. Used anywhere a plain
 * scrolling list would stop being usable once the list gets long —
 * technicians, model categories, models within a category, etc.
 */
export function OptionPicker({
  options,
  value,
  onChange,
  label = "Option",
  nullLabel = "None",
  showNullOption = true,
  placeholder,
}: {
  options: PickerOption[] | undefined;
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
  nullLabel?: string;
  showNullOption?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected = options?.find((o) => o.id === value);

  const filtered = useMemo(() => {
    const list = options ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  function select(id: string | null) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3"
      >
        <Text className={selected ? "text-slate-900" : "text-slate-500"}>
          {selected?.label ?? placeholder ?? nullLabel}
        </Text>
        <Text className="text-slate-400">›</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <SafeAreaView edges={["top"]} className="flex-1 bg-white px-4">
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-lg font-bold text-slate-900">Select {label}</Text>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button">
              <Text className="text-sm font-medium text-primary">Close</Text>
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={`Search ${label.toLowerCase()}…`}
            placeholderTextColor="#94a3b8"
            autoFocus
            autoCapitalize="none"
            className="mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900"
          />

          <FlatList
            style={{ flex: 1 }}
            data={filtered}
            keyExtractor={(o) => o.id}
            keyboardShouldPersistTaps="handled"
            ListHeaderComponent={
              showNullOption && !query ? (
                <Pressable
                  onPress={() => select(null)}
                  accessibilityRole="button"
                  className={`mb-2 rounded-xl border px-4 py-3 active:opacity-70 ${
                    value === null ? "border-primary bg-primary/5" : "border-slate-200 bg-white"
                  }`}
                >
                  <Text className={value === null ? "font-medium text-primary" : "text-slate-500"}>
                    {nullLabel}
                  </Text>
                </Pressable>
              ) : null
            }
            renderItem={({ item }) => (
              <Pressable
                onPress={() => select(item.id)}
                accessibilityRole="button"
                className={`mb-2 rounded-xl border px-4 py-3 active:opacity-70 ${
                  value === item.id ? "border-primary bg-primary/5" : "border-slate-200 bg-white"
                }`}
              >
                <Text className={value === item.id ? "font-medium text-primary" : "text-slate-900"}>
                  {item.label}
                </Text>
                {item.sublabel ? (
                  <Text className="mt-0.5 text-xs text-slate-400">{item.sublabel}</Text>
                ) : null}
              </Pressable>
            )}
            ListEmptyComponent={
              <Text className="mt-8 text-center text-sm text-slate-400">
                No {label.toLowerCase()} match "{query}".
              </Text>
            }
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}
