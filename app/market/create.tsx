import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { Button } from "../../src/components/Button";

export default function CreateMarketScreen() {
  const router = useRouter();
  const [marketName, setMarketName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    alert(`Market "${marketName}" created successfully! Now create your shared market products.`);
    router.replace("/market/manage" as any);
  };

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="Create Community Market"
        subtitle="Establish a local market for multiple community sellers"
        variant="gold"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <ImagePlaceholder
            height={150}
            label="UPLOAD MARKET BANNER"
            iconName="camera-outline"
            backgroundColor="#FEF3C7"
            style={styles.bannerPicker}
          />

          <Text style={styles.inputLabel}>Market Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. ตลาดมะพร้าวชุมชน"
            value={marketName}
            onChangeText={setMarketName}
          />

          <Text style={styles.inputLabel}>Category</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Local Farm / Organic, Handicraft"
            value={category}
            onChangeText={setCategory}
          />

          <Text style={styles.inputLabel}>Market Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the purpose and community background of this market..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Button
            title="Create Market"
            variant="green"
            size="lg"
            style={styles.submitBtn}
            onPress={handleCreate}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingTop: 54,
    paddingBottom: 30,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
  },
  bannerPicker: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    marginTop: Spacing.md,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSizeSm,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  submitBtn: {
    marginTop: Spacing.xl,
  },
});
