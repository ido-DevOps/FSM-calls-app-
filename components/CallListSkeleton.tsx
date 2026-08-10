import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

function SkeletonRow() {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 650,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 650,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity }}
      className="mb-3 rounded-2xl border border-slate-200 bg-white p-4"
    >
      <View className="h-3 w-20 rounded bg-slate-200" />
      <View className="mt-3 h-4 w-40 rounded bg-slate-200" />
      <View className="mt-2 h-3 w-56 rounded bg-slate-200" />
    </Animated.View>
  );
}

/** Skeleton placeholder shown while the calls list is first loading. */
export function CallListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}
