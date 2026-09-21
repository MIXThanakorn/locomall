import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { GenderType } from "../../src/types";
import { supabase } from "../../src/lib/supabase";
import { passwordValidationError } from "../../src/lib/password";

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<GenderType>("man");

  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !fullName || !username) {
      Alert.alert("ข้อมูลไม่ครบ", "กรุณากรอกอีเมล รหัสผ่าน ชื่อ และชื่อผู้ใช้");
      return;
    }

    const passwordError = passwordValidationError(password);
    if (passwordError) {
      Alert.alert("รหัสผ่านไม่ปลอดภัย", passwordError);
      return;
    }

    setLoading(true);
    try {
      // Avatar uploads require an authenticated, user-scoped path. They are handled
      // from Edit Profile after sign-up.
      const avatarUrl = "";

      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            avatar_url: avatarUrl,
            username: username,
            phone_num: phone,
            age: age ? parseInt(age) : null,
            gender: gender,
          }
        }
      });

      if (authError) throw authError;

      Alert.alert("สมัครสำเร็จ", "เลือกพื้นที่หลักเพื่อเริ่มใช้งาน Locomall", [
        { text: "ตกลง", onPress: () => router.replace("/(auth)/location-onboarding" as any) }
      ]);
    } catch (error: any) {
      Alert.alert("Sign Up Failed", error.message);
    } finally {
      setLoading(false);
    }
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
          <ImagePlaceholder width={90} height={90} borderRadius={45} label="" iconName="person" iconSize={36} backgroundColor="#E2E8F0" />
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

          <Button
            title="SIGN UP"
            variant="green"
            size="lg"
            style={styles.signUpBtn}
            loading={loading}
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
    position: "relative",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.greenPrimary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.cardBackground,
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
