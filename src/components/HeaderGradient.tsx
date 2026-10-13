import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { ScreenHeader } from "./ScreenHeader";
import { useRouter } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius } from "../constants/theme";

interface HeaderGradientProps {
  title?: string;
  subtitle?: string;
  variant?: "gold" | "green" | "white";
  showBack?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  style?: ViewStyle;
}

export const HeaderGradient: React.FC<HeaderGradientProps> = ({
  title,
  subtitle,
  variant = "gold",
  showBack = true,
  onBackPress,
  rightAction,
  children,
  style,
}) => {
  const router = useRouter();

  const getBackgroundColor = () => {
    switch (variant) {
      case "green":
        return Colors.greenPrimary;
      case "white":
        return Colors.cardBackground;
      case "gold":
      default:
        return Colors.goldPrimary;
    }
  };

  const getTextColor = () => {
    return variant === "white" ? Colors.textDark : Colors.textWhite;
  };

  const isWhite = variant === "white";

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: getBackgroundColor(),
          borderBottomLeftRadius: isWhite ? 0 : BorderRadius.headerBottom,
          borderBottomRightRadius: isWhite ? 0 : BorderRadius.headerBottom,
          borderBottomWidth: isWhite ? 1 : 0,
          borderBottomColor: Colors.inputBorder,
        },
        style,
        { paddingTop: 0, paddingHorizontal: 0 },
      ]}
    >
      <ScreenHeader contentInset={0} title={title} titleStyle={[styles.title, { color: getTextColor() }]}
        showBack={showBack} color={variant === "green" ? Colors.textWhite : Colors.greenPrimary}
        onBackPress={onBackPress && router.canGoBack() ? onBackPress : undefined} rightAction={rightAction}>
        {subtitle ? <Text style={[styles.subtitle, { color: isWhite ? Colors.textMuted : "rgba(255,255,255,0.9)" }]}>{subtitle}</Text> : null}
      </ScreenHeader>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.md,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: Spacing.md,
    padding: Spacing.xs,
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: Typography.fontSizeXl,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: Typography.fontSizeSm,
    marginTop: 2,
    lineHeight: 18,
  },
  rightAction: {
    marginLeft: Spacing.sm,
  },
});
