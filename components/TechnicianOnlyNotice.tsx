import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";

/** Shown if a non-technician somehow lands on a field-work screen. */
export function TechnicianOnlyNotice() {
  const router = useRouter();
  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text className="text-lg font-semibold text-slate-900">Technician-only</Text>
      <Text className="mt-2 text-center text-slate-500">
        This workflow is for the technician assigned to the call.
      </Text>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        className="mt-6 rounded-xl bg-primary px-5 py-2.5"
      >
        <Text className="font-medium text-white">Go Back</Text>
      </Pressable>
    </View>
  );
}
