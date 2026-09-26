import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  showBack = false,
  onBackPress,
  rightAction,
  children,
  style,
}) => {
  const insets = useSafeAreaInsets();

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
          paddingTop: Math.max(insets.top + 8, 20),
          borderBottomLeftRadius: isWhite ? 0 : BorderRadius.headerBottom,
          borderBottomRightRadius: isWhite ? 0 : BorderRadius.headerBottom,
          borderBottomWidth: isWhite ? 1 : 0,
          borderBottomColor: Colors.inputBorder,
        },
        style,
      ]}
    >
      <View style={styles.topRow}>
        {showBack && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={getTextColor()} />
          </TouchableOpacity>
        )}
        {title ? (
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: getTextColor() }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text
                style={[
                  styles.subtitle,
                  { color: isWhite ? Colors.textMuted : "rgba(255,255,255,0.9)" },
                ]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={styles.titleContainer} />
        )}
        {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
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
