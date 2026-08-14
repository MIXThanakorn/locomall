import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { mockChatMessages } from "../../src/mock/data";

export default function ChatDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [inputText, setInputText] = useState("");

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Chat Header with Safe Area Insets */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 20) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.textDark} />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>Harvest Grove Artisans</Text>
          <View style={styles.statusRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.statusText}>ONLINE</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="call-outline" size={20} color={Colors.textDark} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn}>
            <Ionicons name="bag-handle-outline" size={20} color={Colors.textDark} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.messageScroll} contentContainerStyle={styles.messageContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.dateHeader}>TODAY</Text>

        {mockChatMessages.map((msg) => {
          const isMe = msg.sender_id === "usr-101";

          return (
            <View key={msg.id} style={[styles.bubbleWrapper, isMe ? styles.myWrapper : styles.otherWrapper]}>
              <View style={[styles.bubble, isMe ? styles.myBubble : styles.otherBubble]}>
                <Text style={[styles.messageText, isMe && styles.myText]}>{msg.message}</Text>

                {/* Embedded Product Card in Chat */}
                {msg.attachments?.map((att, idx) => (
                  <View key={idx} style={styles.embeddedProductCard}>
                    <ImagePlaceholder
                      width={54}
                      height={54}
                      borderRadius={BorderRadius.sm}
                      label=""
                      iconName="cube-outline"
                      iconSize={22}
                      backgroundColor="#FEF3C7"
                    />
                    <View style={styles.embeddedInfo}>
                      <Text style={styles.embeddedTitle} numberOfLines={1}>{att.product_name}</Text>
                      <Text style={styles.embeddedPrice}>฿{att.product_price?.toFixed(2)} / {att.unit_label || "unit"}</Text>
                      <View style={styles.lowStockTag}>
                        <Text style={styles.lowStockText}>LOW STOCK</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
              <Text style={styles.timestamp}>{msg.created_at}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Input Bar with Safe Area Bottom Inset */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity style={styles.attachBtn}>
          <Ionicons name="add-circle-outline" size={26} color={Colors.textDark} />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Type your message..."
          value={inputText}
          onChangeText={setInputText}
          placeholderTextColor={Colors.textMuted}
        />
        <TouchableOpacity style={styles.sendBtn} activeOpacity={0.8}>
          <Ionicons name="send" size={16} color={Colors.textWhite} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: Colors.inputBorder,
  },
  backBtn: {
    padding: Spacing.xs,
    marginRight: Spacing.xs,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.textDark,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.greenPrimary,
    marginRight: 4,
  },
  statusText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  iconBtn: {
    padding: Spacing.xs,
  },
  messageScroll: {
    flex: 1,
  },
  messageContent: {
    padding: Spacing.md,
  },
  dateHeader: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textMuted,
    textAlign: "center",
    marginVertical: Spacing.md,
  },
  bubbleWrapper: {
    marginBottom: Spacing.md,
    maxWidth: "82%",
  },
  myWrapper: {
    alignSelf: "flex-end",
  },
  otherWrapper: {
    alignSelf: "flex-start",
  },
  bubble: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  myBubble: {
    backgroundColor: Colors.greenDark,
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    backgroundColor: Colors.cardBackground,
    borderBottomLeftRadius: 2,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  messageText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
    lineHeight: 20,
  },
  myText: {
    color: Colors.textWhite,
  },
  timestamp: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  embeddedProductCard: {
    flexDirection: "row",
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginTop: Spacing.sm,
    alignItems: "center",
  },
  embeddedInfo: {
    marginLeft: Spacing.sm,
    flex: 1,
  },
  embeddedTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textDark,
  },
  embeddedPrice: {
    fontSize: Typography.fontSizeXs,
    color: Colors.goldDark,
    fontWeight: "700",
  },
  lowStockTag: {
    backgroundColor: Colors.warning + "20",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  lowStockText: {
    fontSize: 9,
    color: Colors.warning,
    fontWeight: "700",
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.inputBorder,
    gap: Spacing.sm,
  },
  attachBtn: {
    padding: Spacing.xs,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.greenDark,
    alignItems: "center",
    justifyContent: "center",
  },
});
