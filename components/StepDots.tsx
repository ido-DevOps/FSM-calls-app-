import { View } from "react-native";

/** Progress indicator for a linear multi-step flow (scan, transfer, …). */
export function StepDots<T extends string>({
  order,
  current,
}: {
  order: readonly T[];
  current: T;
}) {
  const index = order.indexOf(current);
  return (
    <View className="flex-row gap-2">
      {order.map((step, i) => (
        <View
          key={step}
          className={`h-1.5 flex-1 rounded-full ${i <= index ? "bg-accent" : "bg-slate-200"}`}
        />
      ))}
    </View>
  );
}
