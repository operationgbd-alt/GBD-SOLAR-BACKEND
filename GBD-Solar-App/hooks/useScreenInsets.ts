import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Spacing } from "@/constants/theme";

export function useScreenInsets() {
  const insets = useSafeAreaInsets();

  return {
    paddingTop: Spacing.md,
    paddingBottom: Math.max(insets.bottom, Spacing.md) + Spacing.lg,
    scrollInsetBottom: insets.bottom + 16,
  };
}
