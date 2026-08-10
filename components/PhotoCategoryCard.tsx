import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from "react-native";
import type { CallPhoto, PhotoType } from "../types/database.types";

export interface UploadTask {
  id: string;
  photoType: PhotoType;
  uri: string;
  status: "compressing" | "uploading" | "error";
  error?: string;
}

const THUMB = 84;

export function PhotoCategoryCard({
  label,
  hint,
  photos,
  tasks,
  onAdd,
  onRetry,
  onDismiss,
}: {
  label: string;
  hint: string;
  photos: CallPhoto[];
  tasks: UploadTask[];
  onAdd: () => void;
  onRetry: (task: UploadTask) => void;
  onDismiss: (taskId: string) => void;
}) {
  const complete = photos.length > 0;

  return (
    <View className="rounded-2xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-semibold text-slate-900">{label}</Text>
          <Text className="mt-0.5 text-xs text-slate-500">{hint}</Text>
        </View>
        <View
          className={`rounded-full px-2.5 py-1 ${
            complete ? "bg-emerald-50" : "bg-amber-50"
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              complete ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {complete ? `${photos.length} added` : "Required"}
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10, paddingTop: 12 }}
      >
        {photos.map((photo) => (
          <Image
            key={photo.id}
            source={{ uri: photo.image_url }}
            style={{ width: THUMB, height: THUMB, borderRadius: 12 }}
          />
        ))}

        {tasks.map((task) => (
          <View
            key={task.id}
            style={{ width: THUMB, height: THUMB }}
            className={`items-center justify-center rounded-xl ${
              task.status === "error" ? "border border-red-300 bg-red-50" : "bg-slate-100"
            }`}
          >
            {task.status === "error" ? (
              <Pressable
                onPress={() => onRetry(task)}
                onLongPress={() => onDismiss(task.id)}
                className="items-center px-1"
                accessibilityRole="button"
                accessibilityLabel="Retry upload"
              >
                <Text className="text-center text-[10px] font-medium text-red-600">
                  Failed{"\n"}Tap to retry
                </Text>
              </Pressable>
            ) : (
              <>
                <ActivityIndicator color="#f59e0b" />
                <Text className="mt-1 text-[10px] text-slate-500">
                  {task.status === "compressing" ? "Compressing…" : "Uploading…"}
                </Text>
              </>
            )}
          </View>
        ))}

        <Pressable
          onPress={onAdd}
          style={{ width: THUMB, height: THUMB }}
          className="items-center justify-center rounded-xl border border-dashed border-slate-300"
          accessibilityRole="button"
          accessibilityLabel={`Add ${label} photo`}
        >
          <Text className="text-2xl leading-none text-slate-400">+</Text>
          <Text className="mt-1 text-[10px] text-slate-400">Add</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
