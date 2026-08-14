import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { GenderType } from "../../src/types";

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("Hello World");
  const [username, setUsername] = useState("Hello");
  const [email, setEmail] = useState("Hello@gmail.com");
  const [password, setPassword] = useState("********");
  const [phone, setPhone] = useState("087*******");
  const [age, setAge] = useState("25");
  const [gender, setGender] = useState<GenderType>("man");

  // Address
  const [province, setProvince] = useState("Select Province");
  const [district, setDistrict] = useState("Select District");
  const [subDistrict, setSubDistrict] = useState("Select Sub-district");
  const [houseDetails, setHouseDetails] = useState("");

  const handleSignUp = () => {
    router.replace("/(tabs)" as any);
  };

  return (
    <View style={styles.container}>
      <HeaderGradient
        title=""
        variant="green"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      >
        <View style={styles.avatarContainer}>
          <ImagePlaceholder
            width={90}
            height={90}
            borderRadius={45}
            label="PHOTO"
            iconName="person"
            iconSize={36}
            backgroundColor="#E2E8F0"
          />
        </View>
      </HeaderGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Full name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

          <Text style={styles.inputLabel}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} />

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />

          <Text style={styles.inputLabel}>Password</Text>
          <TextInput style={styles.input} value={password} onChangeText={setPassword} secureTextEntry />

          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Text style={styles.inputLabel}>Age</Text>
          <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" />

          {/* Gender Selector with Vector Icons */}
          <Text style={styles.sectionTitle}>Gender</Text>
          <View style={styles.genderRow}>
            <TouchableOpacity
              style={[
                styles.genderBtn,
                { borderColor: Colors.genderMan },
                gender === "man" && { backgroundColor: Colors.genderMan + "20" },
              ]}
              onPress={() => setGender("man")}
            >
              <Ionicons name="male" size={18} color={Colors.genderMan} />
              <Text style={[styles.genderText, { color: Colors.genderMan }]}>Man</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderBtn,
                { borderColor: Colors.genderGirl },
                gender === "girl" && { backgroundColor: Colors.genderGirl + "20" },
              ]}
              onPress={() => setGender("girl")}
            >
              <Ionicons name="female" size={18} color={Colors.genderGirl} />
              <Text style={[styles.genderText, { color: Colors.genderGirl }]}>Girl</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.genderBtn,
                { borderColor: Colors.genderOther },
                gender === "other" && { backgroundColor: Colors.genderOther + "20" },
              ]}
              onPress={() => setGender("other")}
            >
              <Ionicons name="male-female" size={18} color={Colors.genderOther} />
              <Text style={[styles.genderText, { color: Colors.genderOther }]}>Other</Text>
            </TouchableOpacity>
          </View>

          {/* Address Section */}
          <Text style={styles.sectionTitle}>Address</Text>
          <Text style={styles.inputLabel}>Province</Text>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownText}>{province}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </View>

          <Text style={styles.inputLabel}>District</Text>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownText}>{district}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </View>

          <Text style={styles.inputLabel}>Sub-district</Text>
          <View style={styles.dropdown}>
            <Text style={styles.dropdownText}>{subDistrict}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </View>

          <Text style={styles.inputLabel}>House No. & Details</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={houseDetails}
            onChangeText={setHouseDetails}
            placeholder="Apartment, suite, unit, building, floor, etc."
            multiline
            numberOfLines={3}
          />

          <Button
            title="SIGN UP"
            variant="green"
            size="lg"
            style={styles.signUpBtn}
            onPress={handleSignUp}
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
    paddingTop: 50,
    paddingBottom: 50,
    alignItems: "center",
  },
  avatarContainer: {
    alignSelf: "center",
    marginTop: -10,
  },
  content: {
    flex: 1,
    marginTop: -25,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    shadowColor: Colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  inputLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: Typography.fontSizeMd,
    color: Colors.textDark,
  },
  textArea: {
    height: 70,
    textAlignVertical: "top",
  },
  sectionTitle: {
    fontSize: Typography.fontSizeMd,
    fontWeight: "700",
    color: Colors.textDark,
    marginTop: Spacing.lg,
    marginBottom: Spacing.xs,
  },
  genderRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  genderBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: 4,
  },
  genderText: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "700",
  },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 4,
  },
  dropdownText: {
    fontSize: Typography.fontSizeSm,
    color: Colors.textMuted,
  },
  signUpBtn: {
    marginTop: Spacing.xl,
  },
});
