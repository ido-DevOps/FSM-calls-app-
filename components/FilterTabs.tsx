import { Pressable, ScrollView, Text } from "react-native";

export interface FilterOption<T extends string> {
  label: string;
  value: T;
}

/** Horizontal, scrollable segmented filter — used for the call status tabs. */
export function FilterTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      // Horizontal ScrollViews default their content container's
      // alignItems to "stretch" — without overriding it, each pill
      // stretches to the row's full height instead of sizing to its own
      // content, producing tall elongated capsules instead of buttons.
      contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center" }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`rounded-full border px-4 py-2 ${
              active ? "border-primary bg-primary" : "border-slate-200 bg-white"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                active ? "text-white" : "text-slate-600"
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
