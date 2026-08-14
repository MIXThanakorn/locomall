import React from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { mockChatRooms } from "../../src/mock/data";

export default function ChatListScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <HeaderGradient title="Chat" variant="white" style={styles.header} />

      <FlatList
        data={mockChatRooms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.roomCard}
            onPress={() => router.push(`/chat/${item.id}` as any)}
            activeOpacity={0.7}
          >
            <ImagePlaceholder
              width={52}
              height={52}
              borderRadius={26}
              label=""
              iconName="storefront"
              iconSize={22}
              backgroundColor="#FEF3C7"
            />

            <View style={styles.roomInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.marketName} numberOfLines={1}>
                  {item.market_name}
                </Text>
                <Text style={styles.timeText}>{item.last_message_time}</Text>
              </View>

              <View style={styles.msgRow}>
                <Text style={styles.lastMsg} numberOfLines={1}>
                  {item.last_message}
                </Text>
                {item.unread_count ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.unread_count}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingBottom: Spacing.md,
  },
  listContent: {
    padding: Spacing.md,
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  roomInfo: {
    flex: 1,
    marginLeft: Spacing.md,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  marketName: {
    flex: 1,
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.textDark,
    marginRight: Spacing.sm,
  },
  timeText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  msgRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  lastMsg: {
    flex: 1,
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
    marginRight: Spacing.sm,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.greenPrimary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textWhite,
    fontWeight: "700",
  },
});
