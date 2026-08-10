import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useTechnicians } from "../../hooks/useTechnicians";
import { useCreateServiceCall } from "../../hooks/useCreateServiceCall";
import { TechnicianPicker } from "../../components/TechnicianPicker";

interface SuccessBanner {
  callId: string;
  callNumber: string;
  technicianName: string | null;
}

export default function NewCallScreen() {
  const router = useRouter();
  const technicians = useTechnicians();
  const createCall = useCreateServiceCall();

  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<SuccessBanner | null>(null);
  const bannerTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(bannerTimeout.current), []);

  function reset() {
    setCustomerName("");
    setAddress("");
    setWorkDescription("");
    setTechnicianId(null);
  }

  function handleCreate() {
    setError(null);

    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }

    const technicianName = technicians.data?.find((t) => t.id === technicianId)?.full_name ?? null;

    createCall.mutate(
      {
        customer_name: customerName,
        address,
        work_description: workDescription,
        assigned_technician_id: technicianId,
      },
      {
        onSuccess: (call) => {
          reset();
          setBanner({ callId: call.id, callNumber: call.call_number, technicianName });
          clearTimeout(bannerTimeout.current);
          bannerTimeout.current = setTimeout(() => setBanner(null), 6000);
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : "Couldn't create the call. Try again."),
      }
    );
  }

  const selectedTechnician = technicians.data?.find((t) => t.id === technicianId);

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-2xl font-bold text-slate-900">New Service Call</Text>
        <Text className="mt-1 text-sm text-slate-500">
          There's no customer directory yet — enter the customer's details directly.
        </Text>

        {banner ? (
          <Pressable
            onPress={() => {
              setBanner(null);
              router.push(`/calls/${banner.callId}`);
            }}
            accessibilityRole="button"
            className="mt-4 flex-row items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 active:opacity-80"
          >
            <Text className="flex-1 pr-2 text-sm font-medium text-emerald-800">
              {banner.callNumber} created
              {banner.technicianName ? ` for ${banner.technicianName}` : " — unassigned"}.
            </Text>
            <Text className="text-sm font-semibold text-emerald-700">View ›</Text>
          </Pressable>
        ) : null}

        <View className="mt-6 gap-4">
          <Field label="Customer name" required>
            <TextInput
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Sarah Chen"
              placeholderTextColor="#94a3b8"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
          </Field>

          <Field label="Address">
            <TextInput
              value={address}
              onChangeText={setAddress}
              placeholder="482 Ridgeview Dr, Austin, TX"
              placeholderTextColor="#94a3b8"
              className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
          </Field>

          <Field label="Work description">
            <TextInput
              value={workDescription}
              onChangeText={setWorkDescription}
              placeholder="What needs to happen on this visit?"
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="min-h-[96px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
            />
          </Field>

          <Field label="Assign to">
            {technicians.isPending ? (
              <ActivityIndicator color="#f59e0b" />
            ) : (
              <TechnicianPicker
                technicians={technicians.data}
                value={technicianId}
                onChange={setTechnicianId}
                nullLabel="Unassigned — dispatch later"
              />
            )}
          </Field>

          {error ? (
            <Text className="text-sm text-red-500" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            onPress={handleCreate}
            disabled={createCall.isPending}
            accessibilityRole="button"
            className="mt-2 items-center rounded-xl bg-accent py-3.5 active:opacity-80 disabled:opacity-60"
          >
            {createCall.isPending ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text className="font-semibold text-primary">
                Create Call{selectedTechnician ? ` for ${selectedTechnician.full_name}` : ""}
              </Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <View>
      <Text className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
        {required ? " *" : ""}
      </Text>
      {children}
    </View>
  );
}
