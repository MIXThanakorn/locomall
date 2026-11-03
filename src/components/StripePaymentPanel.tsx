import React, { useCallback, useEffect, useRef, useState } from "react";
import { Text, View, Alert, AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Button } from "./Button";
import {
  stripePayment,
  paymentLabels,
  type StripePayment,
} from "../lib/stripePayment";
export function StripePaymentPanel({
  orderId,
  status,
  onRefresh,
}: {
  orderId: number;
  status: string;
  onRefresh: () => Promise<void>;
}) {
  const [payment, setPayment] = useState<StripePayment | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const active = useRef(false);
  const pending = useRef(false);
  const refresh = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await stripePayment({ action: "status", orderId });
      if (active.current) {
        setPayment(result);
        await onRefresh();
      }
    } catch {
      if (active.current)
        setError(
          "ยังตรวจสอบกับ Stripe ไม่ได้ กดลองอีกครั้งได้โดยไม่สร้างออเดอร์ใหม่",
        );
    } finally {
      pending.current = false;
      if (active.current) setBusy(false);
    }
  }, [orderId, onRefresh]);
  useFocusEffect(
    useCallback(() => {
      active.current = true;
      void refresh();
      return () => {
        active.current = false;
      };
    }, [refresh]),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && active.current) void refresh();
    });
    const timer = setInterval(() => {
      if (
        active.current &&
        AppState.currentState === "active" &&
        ["stripe_pending", "stripe_refund_pending"].includes(status)
      )
        void refresh();
    }, 15000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [refresh, status]);
  const pay = async () => {
    if (!payment?.url || busy) return;
    await WebBrowser.openBrowserAsync(payment.url);
    if (active.current) await refresh();
  };
  return (
    <View style={{ gap: 10, paddingVertical: 12 }}>
      <Text>{paymentLabels[status] ?? "Stripe โหมดทดสอบ"}</Text>
      <Text>ไม่มีการตัดเงินจริง กรุณาใช้ข้อมูลทดสอบเท่านั้น</Text>
      {status === "stripe_pending" && payment?.url ? (
        <Button
          title="เปิดหน้าชำระเงินทดสอบ"
          onPress={() => {
            void pay().catch(() => Alert.alert("เปิดหน้าชำระไม่สำเร็จ"));
          }}
          disabled={busy}
        />
      ) : null}
      <Button
        title="ตรวจสอบสถานะการชำระ"
        variant="outline"
        onPress={() => {
          void refresh();
        }}
        loading={busy}
      />
      {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    </View>
  );
}
