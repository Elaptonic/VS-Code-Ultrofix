import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components/Icon";
import { useColors } from "@/hooks/useColors";

export type PaymentMode = "upi" | "cash" | "card" | "netbanking";

interface PaymentModeCardProps {
  mode: PaymentMode;
  isSelected: boolean;
  onSelect: () => void;
}

const MODE_CONFIG: Record<PaymentMode, { label: string; icon: string }> = {
  upi: { label: "UPI", icon: "zap" },
  cash: { label: "Cash", icon: "dollar-sign" },
  card: { label: "Card", icon: "credit-card" },
  netbanking: { label: "Net Banking", icon: "landmark" },
};

export function PaymentModeCard({ mode, isSelected, onSelect }: PaymentModeCardProps) {
  const colors = useColors();
  const config = MODE_CONFIG[mode];

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isSelected ? colors.primary : colors.border,
        },
        pressed && { opacity: 0.85 },
      ]}
    >
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: isSelected ? colors.primary + "15" : colors.muted },
        ]}
      >
        <Icon name={config.icon} size={18} color={isSelected ? colors.primary : colors.mutedForeground} />
      </View>
      <Text style={[styles.label, { color: colors.foreground }]}>{config.label}</Text>
      {isSelected && (
        <View style={[styles.checkWrap, { backgroundColor: colors.primary }]}>
          <Icon name="check" size={12} color="#fff" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexBasis: "48%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  checkWrap: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
