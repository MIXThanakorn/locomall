import React from "react";
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from "react-native";
import { Colors, Typography, Spacing, BorderRadius } from "../constants/theme";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: "gold" | "green" | "outline" | "ghost" | "danger" | "white";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "gold",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}) => {
  const getContainerStyle = (): ViewStyle => {
    let bg = Colors.goldPrimary;
    let border = "transparent";

    if (variant === "green") {
      bg = Colors.greenPrimary;
    } else if (variant === "outline") {
      bg = "transparent";
      border = Colors.goldDark;
    } else if (variant === "ghost") {
      bg = "transparent";
    } else if (variant === "danger") {
      bg = Colors.danger;
    } else if (variant === "white") {
      bg = Colors.cardBackground;
    }

    let paddingVertical = Spacing.md;
    if (size === "sm") paddingVertical = Spacing.sm;
    if (size === "lg") paddingVertical = Spacing.md + 2;

    return {
      backgroundColor: bg,
      borderColor: border,
      borderWidth: variant === "outline" ? 1.5 : 0,
      paddingVertical,
      opacity: disabled ? 0.6 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    let color = Colors.textWhite;
    if (variant === "outline" || variant === "ghost") {
      color = Colors.goldDark;
    } else if (variant === "white") {
      color = Colors.textDark;
    }

    let fontSize = Typography.fontSizeMd;
    if (size === "sm") fontSize = Typography.fontSizeSm;
    if (size === "lg") fontSize = Typography.fontSizeLg;

    return {
      color,
      fontSize,
    };
  };

  return (
    <TouchableOpacity
      style={[styles.button, getContainerStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === "outline" ? Colors.goldDark : Colors.textWhite} />
      ) : (
        <React.Fragment>
          {icon ? <React.Fragment>{icon}</React.Fragment> : null}
          <Text style={[styles.text, getTextStyle(), textStyle]}>{title}</Text>
        </React.Fragment>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.round,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
  },
  text: {
    fontWeight: "700",
    textAlign: "center",
  },
});
