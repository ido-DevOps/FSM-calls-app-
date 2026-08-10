import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useCameraPermissions } from "expo-camera";
import { useWarehouseInventory } from "../../hooks/useWarehouseInventory";
import { useTechnicians } from "../../hooks/useTechnicians";
import { useTransferInventoryItem } from "../../hooks/useTransferInventoryItem";
import { useReceiveInventoryItem } from "../../hooks/useReceiveInventoryItem";
import { FilterTabs, type FilterOption } from "../../components/FilterTabs";
import { InventoryPickList } from "../../components/InventoryPickList";
import { ScannerPanel } from "../../components/ScannerPanel";
import { SummaryRow } from "../../components/SummaryRow";
import { TechnicianPicker } from "../../components/TechnicianPicker";
import type { InventoryItem } from "../../types/database.types";

type Mode = "dispatch" | "receive";
type Step = "find-item" | "assign" | "review";
type FindMode = "list" | "scan";
type VerifyMode = "type" | "scan";

const MODES: FilterOption<Mode>[] = [
  { label: "Dispatch", value: "dispatch" },
  { label: "Receive Return", value: "receive" },
];

const FIND_MODES: FilterOption<FindMode>[] = [
  { label: "List", value: "list" },
  { label: "Scan Barcode", value: "scan" },
];

const VERIFY_MODES: FilterOption<VerifyMode>[] = [
  { label: "Type Serial", value: "type" },
  { label: "Scan Barcode", value: "scan" },
];

export default function TransferScreen() {
  const params = useLocalSearchParams<{ itemId?: string; mode?: string }>();

  const [mode, setMode] = useState<Mode>(params.mode === "receive" ? "receive" : "dispatch");
  const [step, setStep] = useState<Step>("find-item");
  const [findMode, setFindMode] = useState<FindMode>("list");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const scanLockRef = useRef(false);
  const lastPreselectedItemId = useRef<string | undefined>(undefined);

  // Rapid receive-by-scan: each match is received immediately, no review
  // step, so a warehouse worker can scan a whole stack of returns in a row.
  const [receivedCount, setReceivedCount] = useState(0);
  const [lastReceivedName, setLastReceivedName] = useState<string | null>(null);

  // Receive-by-browse still requires proving physical possession before it
  // commits — scan or type the exact serial.
  const [verifyMode, setVerifyMode] = useState<VerifyMode>("type");
  const [verifyInput, setVerifyInput] = useState("");

  const inventory = useWarehouseInventory();
  const technicians = useTechnicians();
  const transferItem = useTransferInventoryItem();
  const receiveItem = useReceiveInventoryItem();
  const [permission, requestPermission] = useCameraPermissions();

  const submitting = transferItem.isPending || receiveItem.isPending;
  const pool = (inventory.data ?? []).filter((item) =>
    mode === "dispatch" ? item.status === "in_warehouse" : item.status === "defective_returned"
  );
  const selectedTechnician = technicians.data?.find((t) => t.id === selectedTechnicianId) ?? null;
  const verified =
    !!selectedItem &&
    verifyInput.trim().length > 0 &&
    verifyInput.trim().toLowerCase() === selectedItem.serial_number.toLowerCase();

  // Deep-link from the inventory list's per-row "Dispatch" / "Receive"
  // button. Compares against the last id we preselected (not a one-shot
  // flag) because tab screens stay mounted — a second, different itemId
  // needs to re-trigger this even though the component never remounted.
  // Also re-derives `mode` from the params directly rather than trusting
  // the component's `mode` state: that state only initializes once, so if
  // this same mounted screen was previously used in the other mode, the
  // stale state would send the item down the wrong flow entirely.
  useEffect(() => {
    if (!params.itemId || params.itemId === lastPreselectedItemId.current || !inventory.data) return;
    const match = inventory.data.find((i) => i.id === params.itemId);
    if (match) {
      lastPreselectedItemId.current = params.itemId;
      const targetMode: Mode = params.mode === "receive" ? "receive" : "dispatch";
      setMode(targetMode);
      setSelectedItem(match);
      setSelectedTechnicianId(null);
      setVerifyInput("");
      setStep(targetMode === "dispatch" ? "assign" : "review");
    }
  }, [params.itemId, params.mode, inventory.data]);

  useEffect(() => {
    scanLockRef.current = false;
    setScanError(null);
  }, [findMode, step]);

  function resetFlow() {
    setSelectedItem(null);
    setSelectedTechnicianId(null);
    setVerifyInput("");
    setVerifyMode("type");
    setStep("find-item");
  }

  function switchMode(next: Mode) {
    setMode(next);
    resetFlow();
    setReceivedCount(0);
    setLastReceivedName(null);
  }

  function pickItem(item: InventoryItem) {
    setSelectedItem(item);
    setVerifyInput("");
    setStep(mode === "dispatch" ? "assign" : "review");
  }

  function handleScan(data: string) {
    if (scanLockRef.current) return;
    scanLockRef.current = true;

    const match = pool.find(
      (item) => item.serial_number.toLowerCase() === data.trim().toLowerCase()
    );

    if (!match) {
      setScanError(
        `No ${mode === "dispatch" ? "warehouse" : "defective-returned"} item matches "${data}".`
      );
      setTimeout(() => {
        scanLockRef.current = false;
      }, 1200);
      return;
    }

    if (mode === "receive") {
      // The scan itself proves possession — no separate confirm step.
      // Receive immediately and stay ready for the next scan.
      receiveItem.mutate(match.id, {
        onSuccess: () => {
          setReceivedCount((n) => n + 1);
          setLastReceivedName(match.model_name);
          setScanError(null);
          scanLockRef.current = false;
        },
        onError: (err) => {
          setScanError(err instanceof Error ? err.message : "Couldn't receive this item.");
          scanLockRef.current = false;
        },
      });
      return;
    }

    pickItem(match);
  }

  function handleVerifyScan(data: string) {
    setVerifyInput(data.trim());
    setVerifyMode("type"); // drop back to the editable field so it can be corrected
  }

  function submit() {
    if (!selectedItem || !verified) return;

    if (mode === "dispatch") {
      if (!selectedTechnician) return;
      transferItem.mutate(
        { itemId: selectedItem.id, technicianId: selectedTechnician.id },
        {
          onSuccess: () => {
            Alert.alert(
              "Dispatched",
              `${selectedItem.model_name} is now with ${selectedTechnician.full_name ?? "the technician"}.`
            );
            resetFlow();
          },
          onError: (err) =>
            Alert.alert("Couldn't dispatch", err instanceof Error ? err.message : "Try again."),
        }
      );
    } else {
      if (!verified) return;
      receiveItem.mutate(selectedItem.id, {
        onSuccess: () => {
          Alert.alert("Received", `${selectedItem.model_name} is back in warehouse stock.`);
          resetFlow();
        },
        onError: (err) =>
          Alert.alert("Couldn't receive", err instanceof Error ? err.message : "Try again."),
      });
    }
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerStyle={{ padding: 20, flexGrow: 1 }}>
      <FilterTabs options={MODES} value={mode} onChange={switchMode} />

      {step === "find-item" && (
        <View className="mt-5">
          <Text className="text-lg font-bold text-slate-900">
            {mode === "dispatch" ? "Select the item to dispatch" : "Select the returned item"}
          </Text>
          <Text className="mt-1 text-sm text-slate-500">
            {mode === "dispatch"
              ? "Pick from unassigned warehouse stock."
              : "Scan to receive instantly, or pick from the list to verify and receive."}
          </Text>

          <View className="mt-4">
            <FilterTabs options={FIND_MODES} value={findMode} onChange={setFindMode} />
          </View>

          <View className="mt-4">
            {findMode === "list" ? (
              <InventoryPickList
                items={pool}
                isLoading={inventory.isPending}
                emptyMessage={
                  mode === "dispatch"
                    ? "No unassigned stock in the warehouse."
                    : "No defective parts awaiting receipt."
                }
                onSelect={pickItem}
              />
            ) : (
              <>
                <ScannerPanel
                  permission={permission}
                  onRequestPermission={requestPermission}
                  onScanned={handleScan}
                  error={scanError}
                  hint={
                    mode === "receive"
                      ? "Scan a defective part's barcode to receive it immediately."
                      : "Point the camera at the component's serial barcode."
                  }
                />
                {mode === "receive" && receivedCount > 0 ? (
                  <View className="mt-3 items-center rounded-xl bg-emerald-50 py-3">
                    <Text className="font-semibold text-emerald-700">
                      ✓ {receivedCount} received this session
                    </Text>
                    {lastReceivedName ? (
                      <Text className="mt-0.5 text-xs text-emerald-600">
                        Last: {lastReceivedName}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>
      )}

      {step === "assign" && selectedItem && mode === "dispatch" && (
        <View className="mt-5">
          <ItemCard item={selectedItem} onChange={() => setStep("find-item")} />

          <Text className="mt-6 text-lg font-bold text-slate-900">Assign to a technician</Text>

          {technicians.isPending ? (
            <View className="items-center py-8">
              <ActivityIndicator color="#f59e0b" />
            </View>
          ) : (
            <View className="mt-3">
              <TechnicianPicker
                technicians={technicians.data}
                value={selectedTechnicianId}
                onChange={(id) => {
                  setSelectedTechnicianId(id);
                  if (id) setStep("review");
                }}
                showNullOption={false}
                nullLabel="Select a technician"
              />
            </View>
          )}
        </View>
      )}

      {step === "review" && selectedItem && (
        <View className="mt-5">
          <Text className="text-lg font-bold text-slate-900">
            Confirm {mode === "dispatch" ? "dispatch" : "receipt"}
          </Text>

          <View className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <SummaryRow label="Component" value={selectedItem.model_name} />
            <SummaryRow label="Serial" value={selectedItem.serial_number} mono />
            {mode === "dispatch" ? (
              <SummaryRow label="Assign to" value={selectedTechnician?.full_name ?? "—"} />
            ) : (
              <SummaryRow label="New status" value="In Warehouse" />
            )}
          </View>

          <View className="mt-6">
            <Text className="text-sm font-semibold text-slate-900">Verify the physical part</Text>
            <Text className="mt-1 text-xs text-slate-500">
              Scan or type this item's serial to confirm you're holding the right part before it's{" "}
              {mode === "dispatch" ? "dispatched" : "received"}.
            </Text>

            <View className="mt-3">
              <FilterTabs options={VERIFY_MODES} value={verifyMode} onChange={setVerifyMode} />
            </View>

            <View className="mt-3">
              {verifyMode === "type" ? (
                <View>
                  <TextInput
                    value={verifyInput}
                    onChangeText={setVerifyInput}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    placeholder="Type the serial exactly"
                    placeholderTextColor="#94a3b8"
                    className={`rounded-xl border px-4 py-3 font-mono text-slate-900 ${
                      verifyInput && !verified
                        ? "border-red-300 bg-red-50"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  />
                  {verifyInput && !verified ? (
                    <Text className="mt-1.5 text-xs text-red-500">
                      Doesn't match this item's serial.
                    </Text>
                  ) : null}
                </View>
              ) : (
                <ScannerPanel
                  permission={permission}
                  onRequestPermission={requestPermission}
                  onScanned={handleVerifyScan}
                  error={null}
                  hint="Scan this item's serial barcode to verify."
                />
              )}
              {verified ? (
                <Text className="mt-1.5 text-xs font-medium text-emerald-600">✓ Verified</Text>
              ) : null}
            </View>
          </View>

          <Pressable
            onPress={submit}
            disabled={submitting || !verified || (mode === "dispatch" && !selectedTechnician)}
            accessibilityRole="button"
            className="mt-6 items-center rounded-xl bg-accent py-4 active:opacity-80 disabled:opacity-60"
          >
            {submitting ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text className="font-semibold text-primary">
                {mode === "dispatch" ? "Confirm Dispatch" : "Confirm Receipt"}
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setStep(mode === "dispatch" ? "assign" : "find-item")}
            accessibilityRole="button"
            className="mt-3 items-center py-2"
          >
            <Text className="text-sm font-medium text-slate-500">Back</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function ItemCard({ item, onChange }: { item: InventoryItem; onChange: () => void }) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <View className="flex-1 pr-3">
        <Text className="text-xs font-medium uppercase tracking-wide text-amber-700">
          Selected Component
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
