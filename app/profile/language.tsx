import React, { useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";
import { KeyboardAwareView } from "../../src/components/KeyboardAware";
import { useLanguage, Language } from "../../src/context/LanguageContext";

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const [selectedLang, setSelectedLang] = useState<Language>(language);
  const [search, setSearch] = useState("");

  const handleSelectLanguage = (lang: Language) => {
    setSelectedLang(lang);
    setLanguage(lang);
  };

  const handleApply = () => {
    setLanguage(selectedLang);
    Alert.alert(
      selectedLang === "th" ? "สำเร็จ" : "Success",
      selectedLang === "th" ? "เปลี่ยนภาษาเป็นภาษาไทยเรียบร้อยแล้ว" : "Language changed to English successfully",
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  return (
    <KeyboardAwareView style={styles.container}>
      <HeaderGradient
        title={t("selectLanguage")}
        variant="white"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      />

      <View style={styles.content}>
        {/* Search Language Input */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={selectedLang === "th" ? "ค้นหาภาษา..." : "Search language..."}
            value={search}
            onChangeText={setSearch}
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        <Text style={styles.sectionTitle}>{t("suggestedLanguages")}</Text>

        <TouchableOpacity
          style={[styles.langRow, selectedLang === "en" && styles.activeLangRow]}
          onPress={() => handleSelectLanguage("en")}
          activeOpacity={0.7}
        >
          <View style={styles.flagCircle}>
            <Text style={styles.flagText}>US</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.langName}>English (US)</Text>
            <Text style={styles.langSub}>Default English</Text>
          </View>

          <View style={[styles.radioCircle, selectedLang === "en" && styles.radioActive]}>
            {selectedLang === "en" && <Ionicons name="checkmark" size={14} color={Colors.textWhite} />}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.langRow, selectedLang === "th" && styles.activeLangRow]}
          onPress={() => handleSelectLanguage("th")}
          activeOpacity={0.7}
        >
          <View style={[styles.flagCircle, { backgroundColor: Colors.goldDark }]}>
            <Text style={styles.flagText}>TH</Text>
          </View>
          <View style={styles.textContainer}>
            <Text style={styles.langName}>ไทย (Thai)</Text>
            <Text style={styles.langSub}>ภาษาไทย</Text>
          </View>

          <View style={[styles.radioCircle, selectedLang === "th" && styles.radioActive]}>
            {selectedLang === "th" && <Ionicons name="checkmark" size={14} color={Colors.textWhite} />}
          </View>
        </TouchableOpacity>

        <Button
          title={t("saveLanguage")}
          variant="gold"
          size="lg"
          style={styles.applyBtn}
          textStyle={{ color: Colors.textDark }}
          onPress={handleApply}
        />
      </View>
    </KeyboardAwareView>
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
  content: {
    flex: 1,
    padding: Spacing.lg,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.round,
    paddingHorizontal: Spacing.md,
    height: 42,
    marginBottom: Spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSizeSm,
    color: Colors.textDark,
  },
  sectionTitle: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  langRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  activeLangRow: {
    borderColor: Colors.greenPrimary,
    backgroundColor: Colors.greenPrimary + "08",
  },
  flagCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.greenPrimary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  flagText: {
    fontSize: Typography.fontSizeXs,
    fontWeight: "700",
    color: Colors.textWhite,
  },
  textContainer: {
    flex: 1,
  },
  langName: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
    color: Colors.textDark,
  },
  langSub: {
    fontSize: Typography.fontSizeXs - 1,
    color: Colors.textMuted,
    marginTop: 2,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.inputBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: Colors.greenPrimary,
    backgroundColor: Colors.greenPrimary,
  },
  applyBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.goldPrimary,
  },
});
