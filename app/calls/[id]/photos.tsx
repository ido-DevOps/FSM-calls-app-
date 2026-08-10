import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "../../../lib/supabase";
import { useCallPhotos } from "../../../hooks/useCallPhotos";
import { useAuthStore } from "../../../store/authStore";
import { PhotoCategoryCard, type UploadTask } from "../../../components/PhotoCategoryCard";
import { TechnicianOnlyNotice } from "../../../components/TechnicianOnlyNotice";
import type { PhotoType } from "../../../types/database.types";

const CATEGORIES: { value: PhotoType; label: string; hint: string }[] = [
  { value: "before_repair", label: "Before Repair", hint: "Site or equipment condition on arrival" },
  { value: "defective_part", label: "Defective Part", hint: "Close-up of the part being removed" },
  { value: "new_part", label: "New Part", hint: "Close-up of the part being installed" },
  { value: "production_proof", label: "Production Proof", hint: "Inverter or monitoring display showing output" },
];

const BUCKET = "call-photos";

function makeTaskId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function UploadPhotosScreen() {
  const { id: callId } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const { data: photos } = useCallPhotos(callId);
  const [tasks, setTasks] = useState<UploadTask[]>([]);

  const completedCategories = CATEGORIES.filter((cat) =>
    (photos ?? []).some((p) => p.photo_type === cat.value)
  ).length;

  if (profile && profile.role !== "technician") {
    return <TechnicianOnlyNotice />;
  }

  function updateTask(taskId: string, patch: Partial<UploadTask>) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...patch } : t)));
  }

  async function uploadPhoto(photoType: PhotoType, sourceUri: string, existingTaskId?: string) {
    const taskId = existingTaskId ?? makeTaskId();

    if (existingTaskId) {
      updateTask(taskId, { status: "compressing", error: undefined });
    } else {
      setTasks((prev) => [...prev, { id: taskId, photoType, uri: sourceUri, status: "compressing" }]);
    }

    try {
      const compressed = await ImageManipulator.manipulateAsync(
        sourceUri,
        [{ resize: { width: 1280 } }],
        { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
      );

      updateTask(taskId, { status: "uploading", uri: compressed.uri });

      const path = `${callId}/${photoType}-${Date.now()}.jpg`;
      const arrayBuffer = await fetch(compressed.uri).then((res) => res.arrayBuffer());

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, arrayBuffer, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      const { data: publicUrl } = supabase.storage.from(BUCKET).getPublicUrl(path);

      const { error: insertError } = await supabase.from("call_photos").insert({
        call_id: callId,
        photo_type: photoType,
        image_url: publicUrl.publicUrl,
      });
      if (insertError) throw insertError;

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      queryClient.invalidateQueries({ queryKey: ["call_photos", callId] });
    } catch (err) {
      updateTask(taskId, {
        status: "error",
        error: err instanceof Error ? err.message : "Upload failed.",
      });
    }
  }

  async function pickAndUpload(photoType: PhotoType, source: "camera" | "library") {
    let result: ImagePicker.ImagePickerResult;

    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera access needed", "Enable camera access in Settings to take photos.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Photo library access needed",
          "Enable photo library access in Settings to choose photos."
        );
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
      });
    }

    if (result.canceled || result.assets.length === 0) return;
    await uploadPhoto(photoType, result.assets[0].uri);
  }

  function handleAdd(photoType: PhotoType) {
    Alert.alert(CATEGORIES.find((c) => c.value === photoType)?.label ?? "Add Photo", undefined, [
      { text: "Take Photo", onPress: () => pickAndUpload(photoType, "camera") },
      { text: "Choose from Library", onPress: () => pickAndUpload(photoType, "library") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleRetry(task: UploadTask) {
    uploadPhoto(task.photoType, task.uri, task.id);
  }

  function handleDismiss(taskId: string) {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20 }}>
      <View className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
        <View className="flex-1 pr-3">
          <Text className="font-semibold text-slate-900">Required categories</Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            Every call needs at least one photo in each category below.
          </Text>
        </View>
        <Text className="text-lg font-bold text-slate-900">
          {completedCategories}/{CATEGORIES.length}
        </Text>
      </View>

      <View className="mt-4 gap-4">
        {CATEGORIES.map((cat) => (
          <PhotoCategoryCard
            key={cat.value}
            label={cat.label}
            hint={cat.hint}
            photos={(photos ?? []).filter((p) => p.photo_type === cat.value)}
            tasks={tasks.filter((t) => t.photoType === cat.value)}
            onAdd={() => handleAdd(cat.value)}
            onRetry={handleRetry}
            onDismiss={handleDismiss}
          />
        ))}
      </View>
    </ScrollView>
  );
}
