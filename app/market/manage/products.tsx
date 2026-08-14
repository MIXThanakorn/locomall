import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius } from "../../../src/constants/theme";
import { HeaderGradient } from "../../../src/components/HeaderGradient";
import { ImagePlaceholder } from "../../../src/components/ImagePlaceholder";
import { Button } from "../../../src/components/Button";

export default function CreateMarketProductScreen() {
  const router = useRouter();
  const [productName, setProductName] = useState("");
  const [price, setPrice] = useState("");
  const [unitLabel, setUnitLabel] = useState("ลูก");
  const [description, setDescription] = useState("");

  const handleSave = () => {
    alert(`Created Market Product: ${productName} at ฿${price} / ${unitLabel}`);
    router.back();
  };

  return (
    <View style={styles.container}>
      <HeaderGradient
        title="Create Market Product"
        subtitle="Set standard pricing for participating sellers"
        variant="gold"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <ImagePlaceholder
            height={160}
            label="UPLOAD PRODUCT IMAGE"
            iconName="camera-outline"
            backgroundColor="#E2E8F0"
            style={styles.imagePicker}
          />

          <Text style={styles.inputLabel}>Product Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. มะพร้าวน้ำหอมสด"
            value={productName}
            onChangeText={setProductName}
          />

          <Text style={styles.inputLabel}>Official Unit Price (THB)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 20.00"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />

          <Text style={styles.inputLabel}>Unit Label</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. ลูก, ก้อน, kg, ขวด"
            value={unitLabel}
            onChangeText={setUnitLabel}
          />

          <Text style={styles.inputLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe product standards and quality..."
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Button
            title="Create Market Product"
            variant="green"
            size="lg"
            style={styles.saveBtn}
            onPress={handleSave}
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
  imagePicker: {
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
  saveBtn: {
    marginTop: Spacing.xl,
  },
});
