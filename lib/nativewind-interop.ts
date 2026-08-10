/**
 * NativeWind's `className` support is opt-in per component.
 *
 * react-native-css-interop (NativeWind 4's engine) only pre-registers React
 * Native's own built-in components — see
 * `node_modules/react-native-css-interop/dist/runtime/components.js`. Its JSX
 * wrapper resolves the component with:
 *
 *     type = interopComponents.get(type) ?? type;
 *
 * so an *unregistered* component renders as-is and `className` is handed to it
 * as an unknown prop, which it silently drops. No warning, no error.
 *
 * `SafeAreaView` from react-native-safe-area-context is a third-party component
 * and is therefore NOT registered. (The entry in the file above is React
 * Native's own deprecated `SafeAreaView` — a different component.) It just
 * spreads `{...props}` onto its native view and has no default `flex: 1`.
 *
 * Every screen in this app uses it as its root with `className="flex-1 ..."`,
 * so that `flex-1` was being dropped: the root sized to its content instead of
 * filling the screen, and any `flex: 1` child (every FlatList) resolved against
 * an indefinite height and collapsed to zero. That is the "blank list with a
 * correct '9 of 9' header" bug — the header had intrinsic height and rendered,
 * the list did not, and ListEmptyComponent never showed because the data was
 * not actually empty.
 *
 * Registering it here restores `className` on SafeAreaView app-wide.
 * This module must be imported once, before any screen renders — see
 * `app/_layout.tsx`.
 */
import { cssInterop } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";

cssInterop(SafeAreaView, { className: "style" });
