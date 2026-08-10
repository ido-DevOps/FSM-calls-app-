import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAllServiceCalls } from "../../hooks/useAllServiceCalls";
import { useTechnicians } from "../../hooks/useTechnicians";
import { CallListSkeleton } from "../../components/CallListSkeleton";
import { FilterTabs, type FilterOption } from "../../components/FilterTabs";
import { StatusBadge } from "../../components/StatusBadge";
import { TechnicianPicker } from "../../components/TechnicianPicker";
import type { CallStatus } from "../../types/database.types";

type FilterValue = "all" | CallStatus;

const FILTERS: FilterOption<FilterValue>[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Pending Parts", value: "pending_parts" },
  { label: "Completed", value: "completed" },
  { label: "Cancelled", value: "cancelled" },
];

export default function AdminOverviewScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [technicianFilter, setTechnicianFilter] = useState<string | null>(null);
  const { data: calls, isPending, isRefetching, refetch, isError } = useAllServiceCalls();
  const technicians = useTechnicians();

  const filtered = useMemo(() => {
    if (!calls) return [];
    return calls.filter((c) => {
      if (filter !== "all" && c.status !== filter) return false;
      if (technicianFilter && c.assigned_technician_id !== technicianFilter) return false;
      return true;
    });
  }, [calls, filter, technicianFilter]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50">
      <View className="flex-row items-start justify-between px-4 pb-3 pt-2">
        <View className="flex-1 pr-3">
          <Text className="text-2xl font-bold text-slate-900">Dispatch Overview</Text>
          <Text className="text-sm text-slate-500">
            {filtered.length} of {calls?.length ?? 0} service calls · live
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/warehouse")}
          accessibilityRole="button"
          className="rounded-full border border-slate-200 bg-white px-3 py-1.5"
        >
          <Text className="text-xs font-medium text-slate-600">Inventory</Text>
        </Pressable>
      </View>

      <View className="pb-3">
        <FilterTabs options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      <View className="px-4 pb-3">
        <TechnicianPicker
          technicians={technicians.data}
          value={technicianFilter}
          onChange={setTechnicianFilter}
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
            Couldn't load service calls. Pull down to try again.
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#f59e0b" />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-24">
              <Text className="text-slate-400">No matching calls.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => router.push(`/calls/${item.id}`)}
              accessibilityRole="button"
              className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 active:opacity-70"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-mono text-xs text-slate-400">{item.call_number}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text className="mt-1.5 text-base font-semibold text-slate-900">
                {item.customer_name}
              </Text>
              {item.address ? (
                <Text className="mt-0.5 text-sm text-slate-500" numberOfLines={1}>
                  {item.address}
                </Text>
              ) : null}
              <View className="mt-2.5 flex-row items-center justify-between">
                <View
                  className={`rounded-full px-2.5 py-1 ${
                    item.assigned_technician ? "bg-primary/5" : "bg-slate-100"
                  }`}
                >
                  <Text
                    className={`text-xs font-medium ${
                      item.assigned_technician ? "text-primary" : "text-slate-500"
                    }`}
                  >
                    {item.assigned_technician?.full_name ?? "Unassigned"}
                  </Text>
                </View>
                <Text className="text-xs text-slate-400">
                  {new Date(item.created_at).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
