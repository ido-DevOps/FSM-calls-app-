import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

/** Live barcode scanner with a permission-request fallback state. */
export function ScannerPanel({
  permission,
  onRequestPermission,
  onScanned,
  error,
  hint,
}: {
  permission: ReturnType<typeof useCameraPermissions>[0];
  onRequestPermission: () => void;
  onScanned: (data: string) => void;
  error: string | null;
  hint: string;
}) {
  if (!permission) {
    return (
      <View className="items-center py-8">
        <ActivityIndicator color="#f59e0b" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="items-center rounded-2xl border border-dashed border-slate-200 px-4 py-8">
        <Text className="text-center text-sm text-slate-500">
          Camera access is needed to scan barcodes.
        </Text>
        <Pressable
          onPress={onRequestPermission}
          accessibilityRole="button"
          className="mt-4 rounded-xl bg-primary px-5 py-2.5"
        >
          <Text className="font-medium text-white">Grant Camera Access</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <View className="h-72 overflow-hidden rounded-2xl bg-black">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{
            // datamatrix is what's actually printed on most component
            // labels (e.g. SolarEdge optimizers) — easy to mistake for a
            // QR code at a glance, but a different symbology entirely.
            barcodeTypes: [
              "qr",
              "datamatrix",
              "aztec",
              "pdf417",
              "code128",
              "code39",
              "code93",
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "itf14",
              "codabar",
            ],
          }}
          onBarcodeScanned={(result) => onScanned(result.data)}
        />
      </View>
      <Text className="mt-2 text-center text-xs text-slate-400">{hint}</Text>
      {error ? (
        <Text className="mt-1 text-center text-xs text-red-500">{error}</Text>
      ) : null}
    </View>
  );
}
