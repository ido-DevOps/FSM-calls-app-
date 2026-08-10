import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCameraPermissions } from "expo-camera";
import { useCreateInventoryItem } from "../../hooks/useCreateInventoryItem";
import { useComponentModels } from "../../hooks/useComponentModels";
import { useCreateComponentModel } from "../../hooks/useCreateComponentModel";
import { FilterTabs, type FilterOption } from "../../components/FilterTabs";
import { ScannerPanel } from "../../components/ScannerPanel";
import { OptionPicker } from "../../components/OptionPicker";

type SerialMode = "type" | "scan";

const SERIAL_MODES: FilterOption<SerialMode>[] = [
  { label: "Type Serial", value: "type" },
  { label: "Scan Barcode", value: "scan" },
];

interface SuccessBanner {
  serial: string;
}

export default function AddInventoryItemScreen() {
  const router = useRouter();
  const createItem = useCreateInventoryItem();
  const createModel = useCreateComponentModel();
  const models = useComponentModels();
  const [permission, requestPermission] = useCameraPermissions();

  const [serialMode, setSerialMode] = useState<SerialMode>("type");
  const [serialNumber, setSerialNumber] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<SuccessBanner | null>(null);
  const bannerTimeout = useRef<ReturnType<typeof setTimeout>>();

  const [addModelOpen, setAddModelOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [addModelError, setAddModelError] = useState<string | null>(null);

  const selectedModel = models.data?.find((m) => m.id === modelId) ?? null;

  const categoryOptions = useMemo(() => {
    const seen = new Set<string>();
    for (const m of models.data ?? []) seen.add(m.category);
    return Array.from(seen)
      .sort()
      .map((c) => ({ id: c, label: c }));
  }, [models.data]);

  const modelOptions = useMemo(() => {
    if (!category) return [];
    return (models.data ?? [])
      .filter((m) => m.category === category)
      .map((m) => ({ id: m.id, label: m.model_name }));
  }, [models.data, category]);

  useEffect(() => () => clearTimeout(bannerTimeout.current), []);

  function handleScan(data: string) {
    setSerialNumber(data.trim());
    setSerialMode("type"); // drop back to the editable field so it can be corrected
  }

  function reset() {
    setSerialNumber("");
    setCategory(null);
    setModelId(null);
  }

  function handleAddModel() {
    setAddModelError(null);
    if (!newCategory.trim() || !newModelName.trim()) {
      setAddModelError("Both fields are required.");
      return;
    }
    createModel.mutate(
      { category: newCategory, model_name: newModelName },
      {
        onSuccess: (model) => {
          setCategory(model.category);
          setModelId(model.id);
          setNewCategory("");
          setNewModelName("");
          setAddModelOpen(false);
        },
        onError: (err) =>
          setAddModelError(err instanceof Error ? err.message : "Couldn't add this model."),
      }
    );
  }

  function handleCreate() {
    setError(null);

    const trimmedSerial = serialNumber.trim();

    if (!trimmedSerial) {
      setError("Serial number is required.");
      return;
    }
    if (!selectedModel) {
      setError("Pick a model type — use \"+ Add Model\" if it's not listed yet.");
      return;
    }

    createItem.mutate(
      {
        serial_number: trimmedSerial,
        model_name: selectedModel.model_name,
        category: selectedModel.category,
      },
      {
        onSuccess: (item) => {
          reset();
          setBanner({ serial: item.serial_number });
          clearTimeout(bannerTimeout.current);
          bannerTimeout.current = setTimeout(() => setBanner(null), 5000);
        },
        onError: (err) =>
          setError(err instanceof Error ? err.message : "Couldn't add this item. Try again."),
      }
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <SafeAreaView edges={["top"]} className="bg-slate-50">
        <View className="flex-row items-center justify-between px-5 pt-2">
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Text className="text-sm font-medium text-primary">‹ Back</Text>
          </Pressable>
          <Text className="text-sm font-semibold text-slate-900">Add Item</Text>
          <View style={{ width: 44 }} />
        </View>
      </SafeAreaView>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-2xl font-bold text-slate-900">Add to Warehouse</Text>
        <Text className="mt-1 text-sm text-slate-500">
          For new stock arriving from a supplier. Enters the system as In Warehouse, unowned.
        </Text>

        {banner ? (
          <Pressable
            onPress={() => {
              setBanner(null);
              router.back();
            }}
            accessibilityRole="button"
            className="mt-4 flex-row items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 active:opacity-80"
          >
            <Text className="flex-1 pr-2 font-mono text-sm font-medium text-emerald-800">
              {banner.serial} added to warehouse stock.
            </Text>
            <Text className="text-sm font-semibold text-emerald-700">Done ›</Text>
          </Pressable>
        ) : null}

        <View className="mt-6 gap-4">
          <Field label="Serial number" required>
            <View className="mb-2">
              <FilterTabs options={SERIAL_MODES} value={serialMode} onChange={setSerialMode} />
            </View>
            {serialMode === "type" ? (
              <TextInput
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder="e.g. SV3824A-01602D6D2-C0"
                placeholderTextColor="#94a3b8"
                autoCapitalize="characters"
                autoCorrect={false}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-slate-900"
              />
            ) : (
              <ScannerPanel
                permission={permission}
                onRequestPermission={requestPermission}
                onScanned={handleScan}
                error={null}
                hint="Scan the new component's serial barcode."
              />
            )}
          </Field>

          <Pressable
            onPress={() => setAddModelOpen(true)}
            accessibilityRole="button"
            className="self-start rounded-full border border-primary bg-primary/5 px-3 py-1.5"
          >
            <Text className="text-xs font-semibold text-primary">+ Add Model</Text>
          </Pressable>

          <Field label="Model Type" required>
            <OptionPicker
              options={categoryOptions}
              value={category}
              onChange={(c) => {
                setCategory(c);
                if (modelId && models.data?.find((m) => m.id === modelId)?.category !== c) {
                  setModelId(null);
                }
              }}
              label="Model Type"
              nullLabel="Choose a category"
              showNullOption={false}
            />
          </Field>

          <Field label="Model" required>
            {!category ? (
              <View className="rounded-xl border border-dashed border-slate-200 px-4 py-3">
                <Text className="text-sm text-slate-400">Pick a model type first.</Text>
              </View>
            ) : (
              <OptionPicker
                options={modelOptions}
                value={modelId}
                onChange={setModelId}
                label="Model"
                nullLabel="Choose a model"
                showNullOption={false}
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
            disabled={createItem.isPending}
            accessibilityRole="button"
            className="mt-2 items-center rounded-xl bg-accent py-3.5 active:opacity-80 disabled:opacity-60"
          >
            {createItem.isPending ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text className="font-semibold text-primary">Add to Warehouse</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>

      <Modal
        visible={addModelOpen}
        animationType="slide"
        onRequestClose={() => setAddModelOpen(false)}
      >
        <SafeAreaView edges={["top"]} className="flex-1 bg-white px-5">
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-lg font-bold text-slate-900">Add a New Model</Text>
            <Pressable onPress={() => setAddModelOpen(false)} accessibilityRole="button">
              <Text className="text-sm font-medium text-primary">Close</Text>
            </Pressable>
          </View>

          <View className="gap-4">
            <Field label="Model type" required>
              <TextInput
                value={newCategory}
                onChangeText={setNewCategory}
                placeholder="e.g. optimizer, inverter, panel, battery, fan"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
              />
              {categoryOptions.length > 0 ? (
                <Text className="mt-1.5 text-xs text-slate-400">
                  Existing: {categoryOptions.map((c) => c.label).join(", ")}
                </Text>
              ) : null}
            </Field>

            <Field label="Model name" required>
              <TextInput
                value={newModelName}
                onChangeText={setNewModelName}
                placeholder="e.g. S1400 Optimizer"
                placeholderTextColor="#94a3b8"
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900"
              />
            </Field>

            {addModelError ? (
              <Text className="text-sm text-red-500" accessibilityRole="alert">
                {addModelError}
              </Text>
            ) : null}

            <Pressable
              onPress={handleAddModel}
              disabled={createModel.isPending}
              accessibilityRole="button"
              className="items-center rounded-xl bg-accent py-3.5 active:opacity-80 disabled:opacity-60"
            >
              {createModel.isPending ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text className="font-semibold text-primary">Add Model</Text>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
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
