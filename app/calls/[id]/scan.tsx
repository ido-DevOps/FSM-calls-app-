import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCameraPermissions } from "expo-camera";
import { useAuthStore } from "../../../store/authStore";
import { useMyInventory } from "../../../hooks/useMyInventory";
import { useCallReplacements } from "../../../hooks/useComponentReplacements";
import { useLogComponentReplacement } from "../../../hooks/useLogComponentReplacement";
import { FilterTabs, type FilterOption } from "../../../components/FilterTabs";
import { InventoryPickList } from "../../../components/InventoryPickList";
import { ScannerPanel } from "../../../components/ScannerPanel";
import { StepDots } from "../../../components/StepDots";
import { SummaryRow } from "../../../components/SummaryRow";
import { TechnicianOnlyNotice } from "../../../components/TechnicianOnlyNotice";
import type { InventoryItem } from "../../../types/database.types";

type Step = "select-new" | "scan-old" | "review";
type NewMode = "list" | "scan";
type OldMode = "manual" | "scan";

const STEPS: Step[] = ["select-new", "scan-old", "review"];

const NEW_MODES: FilterOption<NewMode>[] = [
  { label: "My Inventory", value: "list" },
  { label: "Scan Barcode", value: "scan" },
];

const OLD_MODES: FilterOption<OldMode>[] = [
  { label: "Type Serial", value: "manual" },
  { label: "Scan Barcode", value: "scan" },
];

export default function ScanSerialScreen() {
  const { id: callId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const technicianId = profile?.id;

  const [step, setStep] = useState<Step>("select-new");
  const [newMode, setNewMode] = useState<NewMode>("list");
  const [oldMode, setOldMode] = useState<OldMode>("manual");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [oldSerial, setOldSerial] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const scanLockRef = useRef(false);

  const inventory = useMyInventory(technicianId);
  const replacements = useCallReplacements(callId);
  const logReplacement = useLogComponentReplacement(callId);

  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    // Reset the debounce lock whenever a fresh camera view mounts.
    scanLockRef.current = false;
    setScanError(null);
  }, [newMode, oldMode, step]);

  if (profile && profile.role !== "technician") {
    return <TechnicianOnlyNotice />;
  }

  function pickNewItem(item: InventoryItem) {
    setSelectedItem(item);
    setStep("scan-old");
  }

  function handleNewBarcode(data: string) {
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    const match = inventory.data?.find(
      (item) => item.serial_number.toLowerCase() === data.trim().toLowerCase()
    );

    if (match) {
      pickNewItem(match);
      return;
    }

    setScanError(`No item in your inventory matches "${data}".`);
    setTimeout(() => {
      scanLockRef.current = false;
    }, 1200);
  }

  function handleOldBarcode(data: string) {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    setOldSerial(data.trim());
    setOldMode("manual"); // drop back to the editable field so it can be corrected
  }

  function submit() {
    if (!selectedItem) return;
    const serial = oldSerial.trim();

    if (!serial) {
      Alert.alert("Old serial required", "Scan or type the defective part's serial number.");
      return;
    }
    if (serial.toLowerCase() === selectedItem.serial_number.toLowerCase()) {
      Alert.alert("Same serial", "The old and new serial numbers can't match.");
      return;
    }

    logReplacement.mutate(
      { newItemId: selectedItem.id, oldItemSerial: serial },
      {
        onSuccess: () => {
          Alert.alert(
            "Replacement logged",
            `${selectedItem.model_name} installed. Defective part ${serial} marked for return.`,
            [{ text: "Done", onPress: () => router.back() }]
          );
        },
      }
    );
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, flexGrow: 1 }}>
      <StepDots order={STEPS} current={step} />

      {step === "select-new" && (
        <View className="mt-5">
          <Text className="text-lg font-bold text-slate-900">1. Select the new component</Text>
          <Text className="mt-1 text-sm text-slate-500">
            Choose the replacement part from what's currently checked out to you.
          </Text>

          <View className="mt-4">
            <FilterTabs options={NEW_MODES} value={newMode} onChange={setNewMode} />
          </View>

          <View className="mt-4">
            {newMode === "list" ? (
              <InventoryPickList
                items={inventory.data}
                isLoading={inventory.isPending}
                emptyMessage="Nothing is currently checked out to you. Ask your warehouse manager to assign stock before logging a swap."
                onSelect={pickNewItem}
              />
            ) : (
              <ScannerPanel
                permission={permission}
                onRequestPermission={requestPermission}
                onScanned={handleNewBarcode}
                error={scanError}
                hint="Point the camera at the new component's serial barcode."
              />
            )}
          </View>
        </View>
      )}

      {step === "scan-old" && selectedItem && (
        <View className="mt-5">
          <SelectedItemCard item={selectedItem} onChange={() => setStep("select-new")} />

          <Text className="mt-6 text-lg font-bold text-slate-900">
            2. Scan or enter the old component's serial
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            This is the serial printed on the defective part being removed.
          </Text>

          <View className="mt-4">
            <FilterTabs options={OLD_MODES} value={oldMode} onChange={setOldMode} />
          </View>

          <View className="mt-4">
            {oldMode === "manual" ? (
              <View>
                <TextInput
                  value={oldSerial}
                  onChangeText={setOldSerial}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder="e.g. INV-OPT-0055"
                  placeholderTextColor="#94a3b8"
                  className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-slate-900"
                />
                <Text className="mt-1.5 text-xs text-slate-400">
                  Doesn't need to already be in the system — it'll be logged either way.
                </Text>
              </View>
            ) : (
              <ScannerPanel
                permission={permission}
                onRequestPermission={requestPermission}
                onScanned={handleOldBarcode}
                error={null}
                hint="Point the camera at the defective part's serial barcode."
              />
            )}
          </View>

          <Pressable
            onPress={() => setStep("review")}
            disabled={!oldSerial.trim()}
            accessibilityRole="button"
            className="mt-6 items-center rounded-xl bg-primary py-3.5 active:opacity-80 disabled:opacity-40"
          >
            <Text className="font-semibold text-white">Continue</Text>
          </Pressable>
        </View>
      )}

      {step === "review" && selectedItem && (
        <View className="mt-5">
          <Text className="text-lg font-bold text-slate-900">3. Confirm replacement</Text>

          <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <SummaryRow label="Installing" value={selectedItem.model_name} />
            <SummaryRow label="New serial" value={selectedItem.serial_number} mono />
            <SummaryRow label="Removing (defective)" value={oldSerial.trim()} mono />
          </View>

          {logReplacement.isError ? (
            <Text className="mt-3 text-sm text-red-500">
              {logReplacement.error instanceof Error
                ? logReplacement.error.message
                : "Couldn't log the replacement. Try again."}
            </Text>
          ) : null}

          <Pressable
            onPress={submit}
            disabled={logReplacement.isPending}
            accessibilityRole="button"
            className="mt-6 items-center rounded-xl bg-accent py-4 active:opacity-80 disabled:opacity-60"
          >
            {logReplacement.isPending ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text className="font-semibold text-primary">Log Replacement</Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setStep("scan-old")}
            accessibilityRole="button"
            className="mt-3 items-center py-2"
          >
            <Text className="text-sm font-medium text-slate-500">Back</Text>
          </Pressable>
        </View>
      )}

      {replacements.data && replacements.data.length > 0 ? (
        <View className="mt-8 border-t border-slate-100 pt-5">
          <Text className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Already logged for this call
          </Text>
          {replacements.data.map((r) => (
            <View key={r.id} className="mt-2 flex-row items-center justify-between">
              <Text className="font-mono text-xs text-slate-500">{r.old_item_serial}</Text>
              <Text className="text-xs text-slate-400">→ replaced</Text>
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

function SelectedItemCard({
  item,
  onChange,
}: {
  item: InventoryItem;
  onChange: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <View className="flex-1 pr-3">
        <Text className="text-xs font-medium uppercase tracking-wide text-amber-700">
          New Component
        </Text>
        <Text className="mt-0.5 font-semibold text-slate-900">{item.model_name}</Text>
        <Text className="font-mono text-xs text-slate-500">{item.serial_number}</Text>
      </View>
      <Pressable onPress={onChange} accessibilityRole="button">
        <Text className="text-sm font-medium text-primary">Change</Text>
      </Pressable>
    </View>
  );
}
