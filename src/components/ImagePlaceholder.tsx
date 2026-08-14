import React from "react";
import { View, Text, StyleSheet, ViewStyle, DimensionValue } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, BorderRadius } from "../constants/theme";

interface ImagePlaceholderProps {
  width?: DimensionValue;
  height?: DimensionValue;
  aspectRatio?: number;
  label?: string;
  borderRadius?: number;
  backgroundColor?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconColor?: string;
  style?: ViewStyle;
}

export const ImagePlaceholder: React.FC<ImagePlaceholderProps> = ({
  width = "100%",
  height = 160,
  aspectRatio,
  label = "IMAGE PLACEHOLDER",
  borderRadius = BorderRadius.md,
  backgroundColor = "#E2E8F0",
  iconName = "image-outline",
  iconSize = 32,
  iconColor = Colors.textMuted,
  style,
}) => {
  return (
    <View
      style={[
        styles.container,
        {
          width,
          height: aspectRatio ? undefined : height,
          aspectRatio,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    >
      <Ionicons name={iconName} size={iconSize} color={iconColor} />
      {label ? <Text style={[styles.label, { color: iconColor }]}>{label}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    padding: 8,
    overflow: "hidden",
  },
  label: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
