import { useMemo, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuthStore } from "../../store/authStore";
import { useMyServiceCalls } from "../../hooks/useServiceCalls";
import { CallListItem } from "../../components/CallListItem";
import { CallListSkeleton } from "../../components/CallListSkeleton";
import { FilterTabs, type FilterOption } from "../../components/FilterTabs";
import type { CallStatus } from "../../types/database.types";

type FilterValue = "all" | "open" | "in_progress" | "completed";

const FILTERS: FilterOption<FilterValue>[] = [
  { label: "All", value: "all" },
  { label: "Open", value: "open" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
];

export default function MyCallsScreen() {
  const profile = useAuthStore((s) => s.profile);
  const [filter, setFilter] = useState<FilterValue>("all");

  const {
    data: calls,
    isPending,
    isRefetching,
    refetch,
    isError,
  } = useMyServiceCalls(profile?.id);

  const filtered = useMemo(() => {
    if (!calls) return [];
    if (filter === "all") return calls;
    return calls.filter((c) => c.status === (filter as CallStatus));
  }, [calls, filter]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-slate-50">
      <View className="px-4 pb-3 pt-2">
        <Text className="text-2xl font-bold text-slate-900">My Calls</Text>
        <Text className="text-sm text-slate-500">
          {profile?.full_name
            ? `Assigned to ${profile.full_name}`
            : "Your assigned service calls"}
        </Text>
      </View>

      <View className="pb-3">
        <FilterTabs options={FILTERS} value={filter} onChange={setFilter} />
      </View>

      {isPending ? (
        <View className="flex-1 px-4">
          <CallListSkeleton />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-slate-500">
            Couldn't load your calls. Pull down to try again.
          </Text>
        </View>
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingTop: 0, flexGrow: 1 }}
          renderItem={({ item }) => <CallListItem call={item} />}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#f59e0b"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-24">
              <Text className="text-slate-400">
                No {filter === "all" ? "" : filter.replace("_", " ")} calls
                assigned.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
