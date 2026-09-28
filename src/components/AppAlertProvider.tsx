import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertButton,
  AlertOptions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { BorderRadius, Colors, Shadows, Spacing, Typography } from "../constants/theme";

type AlertState = {
  title: string;
  message?: string;
  buttons: AlertButton[];
  options?: AlertOptions;
};

export function AppAlertProvider({ children }: React.PropsWithChildren) {
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  useEffect(() => {
    const nativeAlert = Alert.alert;
    Alert.alert = (title, message, buttons, options) => {
      setAlertState({
        title,
        message,
        buttons: buttons?.length ? buttons : [{ text: "ตกลง" }],
        options,
      });
    };
    return () => {
      Alert.alert = nativeAlert;
    };
  }, []);

  const close = (button?: AlertButton) => {
    const onPress = button?.onPress;
    setAlertState(null);
    onPress?.();
  };

  const dismiss = () => {
    if (alertState?.options?.cancelable === false) return;
    const onDismiss = alertState?.options?.onDismiss;
    setAlertState(null);
    onDismiss?.();
  };

  const destructive = alertState?.buttons.some((button) => button.style === "destructive");

  return (
    <>
      {children}
      <Modal
        transparent
        animationType="fade"
        visible={Boolean(alertState)}
        statusBarTranslucent
        onRequestClose={dismiss}
      >
        <Pressable style={styles.backdrop} onPress={dismiss}>
          <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
            <View style={[styles.icon, destructive && styles.dangerIcon]}>
              <Ionicons
                name={destructive ? "log-out-outline" : "information-circle-outline"}
                size={30}
                color={destructive ? Colors.danger : Colors.greenPrimary}
              />
            </View>
            <Text style={styles.title}>{alertState?.title}</Text>
            {alertState?.message ? <Text style={styles.message}>{alertState.message}</Text> : null}
            <View style={styles.actions}>
              {alertState?.buttons.map((button, index) => (
                <TouchableOpacity
                  key={`${button.text ?? "ตกลง"}-${index}`}
                  style={[
                    styles.button,
                    button.style !== "cancel" && styles.primaryButton,
                    button.style === "destructive" && styles.dangerButton,
                  ]}
                  onPress={() => close(button)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      button.style !== "cancel" && styles.primaryButtonText,
                    ]}
                  >
                    {button.text ?? "ตกลง"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
    backgroundColor: "rgba(9, 28, 17, 0.58)",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.cardBackground,
    ...Shadows.modal,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    backgroundColor: "#E8F2EC",
  },
  dangerIcon: { backgroundColor: "#FDECEC" },
  title: {
    marginTop: Spacing.md,
    fontFamily: "Kanit_700Bold",
    fontSize: Typography.fontSizeXl,
    color: Colors.greenDark,
    textAlign: "center",
  },
  message: {
    marginTop: Spacing.sm,
    fontFamily: "Kanit_400Regular",
    fontSize: Typography.fontSizeMd,
    lineHeight: 23,
    color: Colors.textMedium,
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: Spacing.sm, marginTop: Spacing.lg },
  button: {
    flex: 1,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: BorderRadius.round,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: Spacing.md,
  },
  primaryButton: { backgroundColor: Colors.greenPrimary, borderColor: Colors.greenPrimary },
  dangerButton: { backgroundColor: Colors.danger, borderColor: Colors.danger },
  buttonText: { fontFamily: "Kanit_500Medium", fontSize: Typography.fontSizeMd, color: Colors.textMedium },
  primaryButtonText: { color: Colors.textWhite },
});
