import { useState } from "react";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useServiceCall } from "../../hooks/useServiceCall";
import { useUpdateCallStatus } from "../../hooks/useUpdateCallStatus";
import { useCallPhotos } from "../../hooks/useCallPhotos";
import { useCallReplacements } from "../../hooks/useComponentReplacements";
import { useTechnicians } from "../../hooks/useTechnicians";
import { useReassignServiceCall } from "../../hooks/useReassignServiceCall";
import { useAuthStore } from "../../store/authStore";
import { StatusBadge } from "../../components/StatusBadge";
import { TechnicianPicker } from "../../components/TechnicianPicker";
import type { CallStatus, PhotoType, ServiceCall } from "../../types/database.types";

// The one status-change action offered at each stage of a call.
const NEXT_ACTION: Partial<Record<CallStatus, { label: string; next: CallStatus }>> = {
  open: { label: "Start Repair", next: "in_progress" },
  pending_parts: { label: "Resume Repair", next: "in_progress" },
  in_progress: { label: "Complete Call", next: "completed" },
};

const CATEGORY_LABELS: Record<PhotoType, string> = {
  before_repair: "Before Repair",
  defective_part: "Defective Part",
  new_part: "New Part",
  production_proof: "Production Proof",
  general: "General",
};

export default function CallDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const { data: call, isPending, isError } = useServiceCall(id);
  const updateStatus = useUpdateCallStatus(id);
  const { data: photos } = useCallPhotos(id);
  const { data: replacements } = useCallReplacements(id);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#f59e0b" />
      </View>
    );
  }

  if (isError || !call) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-8">
        <Text className="text-center text-slate-500">Couldn't load this call.</Text>
      </View>
    );
  }

  // Field-work actions (status changes, scan/photo capture) are only for the
  // technician this call is assigned to. Admins/warehouse and other
  // technicians get the read-only history view below.
  const isAssignedTechnician =
    profile?.role === "technician" && call.assigned_technician_id === profile.id;
  const isManager = profile?.role === "admin" || profile?.role === "warehouse_manager";
  const action = NEXT_ACTION[call.status];

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20 }}>
      <Stack.Screen options={{ title: call.call_number }} />

      <View className="flex-row items-center justify-between">
        <Text className="font-mono text-sm text-slate-400">{call.call_number}</Text>
        <StatusBadge status={call.status} />
      </View>

      {isManager ? (
        <ReassignSection call={call} />
      ) : (
        <TechnicianNameLine technicianId={call.assigned_technician_id} />
      )}

      <Text className="mt-3 text-2xl font-bold text-slate-900">{call.customer_name}</Text>
      {call.address ? <Text className="mt-1 text-slate-500">{call.address}</Text> : null}

      {call.work_description ? (
        <View className="mt-6">
          <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Work Description
          </Text>
          <Text className="mt-1.5 leading-6 text-slate-700">{call.work_description}</Text>
        </View>
      ) : null}

      {isAssignedTechnician ? (
        <>
          <View className="mt-8 gap-3">
            <Pressable
              onPress={() => router.push(`/calls/${call.id}/scan`)}
              accessibilityRole="button"
              className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 active:opacity-70"
            >
              <View className="flex-1 pr-3">
                <Text className="font-semibold text-slate-900">Scan Serial Number</Text>
                <Text className="mt-0.5 text-xs text-slate-500">
                  Log an installed or removed component
                </Text>
              </View>
              <Text className="text-slate-400">›</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(`/calls/${call.id}/photos`)}
              accessibilityRole="button"
              className="flex-row items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 active:opacity-70"
            >
              <View className="flex-1 pr-3">
                <Text className="font-semibold text-slate-900">Upload Photos</Text>
                <Text className="mt-0.5 text-xs text-slate-500">
                  Before, defective part, new part, production proof
                </Text>
              </View>
              <Text className="text-slate-400">›</Text>
            </Pressable>
          </View>

          {action ? (
            <Pressable
              onPress={() => updateStatus.mutate(action.next)}
              disabled={updateStatus.isPending}
              accessibilityRole="button"
              className="mt-8 items-center rounded-xl bg-accent py-4 active:opacity-80 disabled:opacity-60"
            >
              {updateStatus.isPending ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text className="font-semibold text-primary">{action.label}</Text>
              )}
            </Pressable>
          ) : (
            <View className="mt-8 items-center rounded-xl bg-slate-100 py-4">
              <Text className="font-medium text-slate-500">
                {call.status === "cancelled" ? "Call cancelled" : "Call closed"}
              </Text>
            </View>
          )}

          {updateStatus.isError ? (
            <Text className="mt-3 text-center text-sm text-red-500">
              Couldn't update the call status. Try again.
            </Text>
          ) : null}
        </>
      ) : null}

      {photos && photos.length > 0 ? (
        <View className="mt-8 border-t border-slate-100 pt-5">
          <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Photos
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingTop: 10 }}>
            {photos.map((photo) => (
              <Pressable key={photo.id} onPress={() => setViewerUri(photo.image_url)}>
                <Image
                  source={{ uri: photo.image_url }}
                  style={{ width: 88, height: 88, borderRadius: 12 }}
                />
                <Text className="mt-1 w-[88px] text-center text-[10px] text-slate-400" numberOfLines={1}>
                  {CATEGORY_LABELS[photo.photo_type]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      ) : null}

      {replacements && replacements.length > 0 ? (
        <View className="mt-6 border-t border-slate-100 pt-5">
          <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Component Replacements
          </Text>
          {replacements.map((r) => (
            <View key={r.id} className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-mono text-xs text-red-500">{r.old_item_serial}</Text>
                <Text className="text-slate-300">→</Text>
                <Text className="font-mono text-xs text-emerald-600">
                  {r.new_item?.serial_number ?? "—"}
                </Text>
              </View>
              <Text className="mt-1 text-xs text-slate-500">
                {r.new_item?.model_name ?? "Unknown component"}
                {r.technician?.full_name ? ` · logged by ${r.technician.full_name}` : ""}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <Modal visible={!!viewerUri} transparent animationType="fade" onRequestClose={() => setViewerUri(null)}>
        <Pressable
          onPress={() => setViewerUri(null)}
          className="flex-1 items-center justify-center bg-black/90"
        >
          {viewerUri ? (
            <Image
              source={{ uri: viewerUri }}
              style={{ width: "92%", height: "70%" }}
              resizeMode="contain"
            />
          ) : null}
          <Text className="mt-4 text-sm text-slate-300">Tap anywhere to close</Text>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// Reassigning only makes sense before or between active work — not once a
// technician is actively on the job, and not after the call is closed out.
const REASSIGNABLE_STATUSES: CallStatus[] = ["open", "pending_parts"];

function ReassignSection({ call }: { call: ServiceCall }) {
  const technicians = useTechnicians();
  const reassign = useReassignServiceCall(call.id);

  if (!REASSIGNABLE_STATUSES.includes(call.status)) {
    return (
      <View className="mt-3">
        <TechnicianNameLine technicianId={call.assigned_technician_id} />
        <Text className="mt-1 text-xs text-slate-400">
          {call.status === "in_progress"
            ? "Can't reassign while a technician is actively working this call."
            : "Can't reassign a closed call."}
        </Text>
      </View>
    );
  }

  return (
    <View className="mt-3">
      <Text className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        Assigned to
      </Text>
      <TechnicianPicker
        technicians={technicians.data}
        value={call.assigned_technician_id}
        onChange={(technicianId) => reassign.mutate(technicianId)}
      />
      {reassign.isPending ? (
        <Text className="mt-1.5 text-xs text-slate-400">Updating…</Text>
      ) : reassign.isError ? (
        <Text className="mt-1.5 text-sm text-red-500">
          Couldn't update the assignment. Try again.
        </Text>
      ) : null}
    </View>
  );
}

function TechnicianNameLine({ technicianId }: { technicianId: string | null }) {
  const technicians = useTechnicians();
  const name = technicians.data?.find((t) => t.id === technicianId)?.full_name;

  return (
    <Text className="mt-2 text-sm font-medium text-slate-600">
      {technicianId ? (name ?? "Assigned to a technician") : "Not yet assigned"}
    </Text>
  );
}
