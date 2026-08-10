import { useMemo, useState } from "react";
import { Alert, FlatList, Modal, Pressable, RefreshControl, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useWarehouseInventory, type InventoryItemWithOwner } from "../../hooks/useWarehouseInventory";
import { useTechnicians } from "../../hooks/useTechnicians";
import { useMoveInventoryItem } from "../../hooks/useMoveInventoryItem";
import { useDeleteInventoryItem } from "../../hooks/useDeleteInventoryItem";
import { CallListSkeleton } from "../../components/CallListSkeleton";
import { FilterTabs, type FilterOption } from "../../components/FilterTabs";
import { ItemStatusBadge } from "../../components/ItemStatusBadge";
import { TechnicianPicker } from "../../components/TechnicianPicker";
import type { ItemStatus } from "../../types/database.types";

type FilterValue = "all" | ItemStatus;

const FILTERS: FilterOption<FilterValue>[] = [
  { label: "All", value: "all" },
  { label: "In Warehouse", value: "in_warehouse" },
  { label: "With Technician", value: "with_technician" },
  { label: "Installed", value: "installed" },
  { label: "Defective", value: "defective_returned" },
];

const STATUS_OPTIONS: { value: ItemStatus; label: string }[] = [
  { value: "in_warehouse", label: "In Warehouse" },
  { value: "with_technician", label: "With Technician" },
  { value: "installed", label: "Installed" },
  { value: "defective_returned", label: "Defective / Returned" },
];

function modelBreakdown(items: InventoryItemWithOwner[]) {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(item.model_name, (counts.get(item.model_name) ?? 0) + 1);
  return Array.from(counts.entries());
}

export default function WarehouseInventoryScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [techFilter, setTechFilter] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: items, isPending, isRefetching, refetch, isError } = useWarehouseInventory();
  const technicians = useTechnicians();
  const moveItemMutation = useMoveInventoryItem();
  const deleteItemMutation = useDeleteInventoryItem();

  const [moveTarget, setMoveTarget] = useState<InventoryItemWithOwner | null>(null);
  const [moveStatus, setMoveStatus] = useState<ItemStatus | null>(null);
  const [moveTechnicianId, setMoveTechnicianId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!items) return [];
    const q = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (techFilter && item.current_owner_id !== techFilter) return false;
      if (!q) return true;
      return (
        item.serial_number.toLowerCase().includes(q) ||
        item.model_name.toLowerCase().includes(q)
      );
    });
  }, [items, filter, techFilter, search]);

  // Defective returns, browsed with no specific technician picked, group by
  // technician so you can see who's holding what without opening each item.
  const isGroupedDefective = filter === "defective_returned" && !techFilter && !search;
  const defectiveGroups = useMemo(() => {
    if (!isGroupedDefective || !items) return null;
    const byTech = new Map<string, { technicianId: string; name: string; items: InventoryItemWithOwner[] }>();
    for (const item of items) {
      if (item.status !== "defective_returned") continue;
      const key = item.current_owner_id ?? "unassigned";
      const name = item.current_owner?.full_name ?? "Unassigned";
      if (!byTech.has(key)) byTech.set(key, { technicianId: key, name, items: [] });
      byTech.get(key)!.items.push(item);
    }
    return Array.from(byTech.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [isGroupedDefective, items]);

  function openMove(item: InventoryItemWithOwner) {
    setMoveTarget(item);
    setMoveStatus(item.status);
    setMoveTechnicianId(item.current_owner_id);
  }

  function closeMove() {
    setMoveTarget(null);
    setMoveStatus(null);
    setMoveTechnicianId(null);
  }

  function confirmMove() {
    if (!moveTarget || !moveStatus) return;
    if (moveStatus === "with_technician" && !moveTechnicianId) return;

    moveItemMutation.mutate(
      {
        itemId: moveTarget.id,
        status: moveStatus,
        ownerId: moveStatus === "with_technician" ? moveTechnicianId : null,
      },
      {
        onSuccess: closeMove,
        onError: (err) =>
          Alert.alert("Couldn't move item", err instanceof Error ? err.message : "Try again."),
      }
    );
  }

  function confirmDelete(item: InventoryItemWithOwner) {
    Alert.alert(
      "Delete this item?",
      `${item.model_name} (${item.serial_number}) will be permanently removed. This can't be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            deleteItemMutation.mutate(item.id, {
              onError: (err) =>
                Alert.alert("Couldn't delete item", err instanceof Error ? err.message : "Try again."),
            }),
        },
      ]
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50">
      <View className="px-4 pb-3 pt-2">
        {router.canGoBack() ? (
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            className="mb-2 flex-row items-center self-start"
          >
            <Text className="text-sm font-medium text-primary">‹ Back</Text>
          </Pressable>
        ) : null}
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-2xl font-bold text-slate-900">Inventory</Text>
            <Text className="text-sm text-slate-500">
              {items?.length ?? 0} components across warehouse and field stock
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/warehouse/add-item")}
            accessibilityRole="button"
            className="rounded-full bg-primary px-3 py-1.5"
          >
            <Text className="text-xs font-medium text-white">+ Add Item</Text>
          </Pressable>
        </View>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search serial or model…"
          placeholderTextColor="#94a3b8"
          autoCapitalize="none"
          className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900"
        />
      </View>

      <View className="pb-3">
        <FilterTabs options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      <View className="px-4 pb-3">
        <TechnicianPicker
          technicians={technicians.data}
          value={techFilter}
          onChange={setTechFilter}
          label="Technician"
          nullLabel="All Technicians"
        />
      </View>

      {isPending ? (
        <View className="flex-1 px-4">
          <CallListSkeleton />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-slate-500">
            Couldn't load inventory. Pull down to try again.
          </Text>
        </View>
      ) : isGroupedDefective && defectiveGroups ? (
        <FlatList
          style={{ flex: 1 }}
          data={defectiveGroups}
          keyExtractor={(g) => g.technicianId}
          contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f59e0b" />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-24">
              <Text className="text-slate-400">No defective returns awaiting receipt.</Text>
            </View>
          }
          renderItem={({ item: group }) => (
            <Pressable
              onPress={() => setTechFilter(group.technicianId)}
              accessibilityRole="button"
              className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 active:opacity-70"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-slate-900">{group.name}</Text>
                <View className="rounded-full bg-red-50 px-2.5 py-1">
                  <Text className="text-xs font-medium text-red-600">
                    {group.items.length} defective
                  </Text>
                </View>
              </View>
              {modelBreakdown(group.items).map(([model, count]) => (
                <Text key={model} className="mt-1 text-xs text-slate-500">
                  {model} × {count}
                </Text>
              ))}
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f59e0b" />
          }
          ListHeaderComponent={
            filter === "defective_returned" && techFilter ? (
              <Pressable
                onPress={() => setTechFilter(null)}
                accessibilityRole="button"
                className="mb-3 self-start"
              >
                <Text className="text-sm font-medium text-primary">‹ All technicians</Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-24">
              <Text className="text-slate-400">No matching components.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 pr-3">
                  <Text className="font-semibold text-slate-900">{item.model_name}</Text>
                  <Text className="font-mono text-xs text-slate-500">{item.serial_number}</Text>
                </View>
                <ItemStatusBadge status={item.status} />
              </View>

              <Text className="mt-2 text-xs text-slate-400">
                {item.current_owner?.full_name
                  ? `With ${item.current_owner.full_name}`
                  : item.category ?? "—"}
              </Text>

              <View className="mt-3 flex-row flex-wrap gap-2">
                {item.status === "in_warehouse" ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/warehouse/transfer",
                        params: { itemId: item.id, mode: "dispatch" },
                      })
                    }
                    accessibilityRole="button"
                    className="rounded-full bg-primary px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-white">Dispatch</Text>
                  </Pressable>
                ) : item.status === "defective_returned" ? (
                  <Pressable
                    onPress={() =>
                      router.push({
                        pathname: "/warehouse/transfer",
                        params: { itemId: item.id, mode: "receive" },
                      })
                    }
                    accessibilityRole="button"
                    className="rounded-full bg-emerald-600 px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-white">Receive</Text>
                  </Pressable>
                ) : null}

                {/*
                  Warehouse stock deliberately has NO free-form Move. Handing a
                  part to a technician must go through Dispatch, which forces a
                  scan-or-type serial match against the physical part before it
                  commits (see warehouse/transfer.tsx). Move skips that check
                  entirely, so leaving it on in_warehouse rows would be a
                  one-tap bypass of the whole verification step.
                  Move stays available for the other statuses as the correction
                  escape hatch.
                */}
                {item.status !== "in_warehouse" ? (
                  <Pressable
                    onPress={() => openMove(item)}
                    accessibilityRole="button"
                    className="rounded-full border border-slate-300 px-3 py-1.5"
                  >
                    <Text className="text-xs font-medium text-slate-600">Move</Text>
                  </Pressable>
                ) : null}

                <Pressable
                  onPress={() => confirmDelete(item)}
                  accessibilityRole="button"
                  className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5"
                >
                  <Text className="text-xs font-medium text-red-600">Delete</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={!!moveTarget} animationType="slide" onRequestClose={closeMove}>
        <SafeAreaView edges={["top"]} className="flex-1 bg-white px-5">
          <View className="flex-row items-center justify-between py-3">
            <Text className="text-lg font-bold text-slate-900">Move Item</Text>
            <Pressable onPress={closeMove} accessibilityRole="button">
              <Text className="text-sm font-medium text-primary">Close</Text>
            </Pressable>
          </View>

          {moveTarget ? (
            <View className="gap-4">
              <View className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <Text className="font-semibold text-slate-900">{moveTarget.model_name}</Text>
                <Text className="font-mono text-xs text-slate-500">{moveTarget.serial_number}</Text>
              </View>

              <View>
                <Text className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  New status
                </Text>
                <View className="gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <Pressable
                      key={s.value}
                      onPress={() => setMoveStatus(s.value)}
                      accessibilityRole="button"
                      className={`rounded-xl border px-4 py-3 ${
                        moveStatus === s.value
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <Text
                        className={
                          moveStatus === s.value ? "font-medium text-primary" : "text-slate-900"
                        }
                      >
                        {s.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {moveStatus === "with_technician" ? (
                <View>
                  <Text className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                    Technician
                  </Text>
                  <TechnicianPicker
                    technicians={technicians.data}
                    value={moveTechnicianId}
                    onChange={setMoveTechnicianId}
                    showNullOption={false}
                    nullLabel="Choose a technician"
                  />
                </View>
              ) : null}

              <Pressable
                onPress={confirmMove}
                disabled={
                  moveItemMutation.isPending ||
                  !moveStatus ||
                  (moveStatus === "with_technician" && !moveTechnicianId)
                }
                accessibilityRole="button"
                className="items-center rounded-xl bg-accent py-3.5 active:opacity-80 disabled:opacity-60"
              >
                <Text className="font-semibold text-primary">Confirm Move</Text>
              </Pressable>
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
