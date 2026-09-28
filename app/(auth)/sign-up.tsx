import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing, BorderRadius, Shadows } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { Button } from "../../src/components/Button";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { GenderType } from "../../src/types";
import { supabase } from "../../src/lib/supabase";
import { passwordValidationError } from "../../src/lib/password";
import { translateAuthError } from "../../src/lib/authError";

export default function SignUpScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
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
    if (password !== passwordConfirmation) {
      Alert.alert("รหัสผ่านไม่ตรงกัน", "กรุณากรอกรหัสผ่านและยืนยันรหัสผ่านให้ตรงกัน");
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
      Alert.alert("สมัครสมาชิกไม่สำเร็จ", translateAuthError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
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

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        <View style={styles.card}>
          <Text style={styles.inputLabel}>ชื่อ–นามสกุล</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} placeholder="ชื่อและนามสกุลจริง" />

          <Text style={styles.inputLabel}>ชื่อผู้ใช้</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} autoCapitalize="none" placeholder="ชื่อที่ใช้แสดงในระบบ" />

          <Text style={styles.inputLabel}>อีเมล</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" placeholder="name@example.com" />

          <Text style={styles.inputLabel}>รหัสผ่าน</Text>
          <Text style={styles.passwordHint}>อย่างน้อย 10 ตัว และต้องมีตัวพิมพ์เล็ก ตัวพิมพ์ใหญ่ ตัวเลข และสัญลักษณ์</Text>
          <View style={styles.passwordContainer}>
            <TextInput style={styles.passwordInput} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" placeholder="สร้างรหัสผ่าน" />
            <TouchableOpacity onPress={() => setShowPassword((value) => !value)} accessibilityLabel={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={21} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>ยืนยันรหัสผ่าน</Text>
          <View style={styles.passwordContainer}>
            <TextInput style={styles.passwordInput} value={passwordConfirmation} onChangeText={setPasswordConfirmation} secureTextEntry={!showPasswordConfirmation} autoCapitalize="none" placeholder="กรอกรหัสผ่านอีกครั้ง" />
            <TouchableOpacity onPress={() => setShowPasswordConfirmation((value) => !value)} accessibilityLabel={showPasswordConfirmation ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}>
              <Ionicons name={showPasswordConfirmation ? "eye-off-outline" : "eye-outline"} size={21} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>เบอร์โทรศัพท์</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="เช่น 0812345678" />

          <Text style={styles.inputLabel}>อายุ</Text>
          <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" placeholder="อายุ (ปี)" />

          {/* Gender Selector with Vector Icons */}
          <Text style={styles.sectionTitle}>เพศ</Text>
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
              <Text style={[styles.genderText, { color: Colors.genderMan }]}>ชาย</Text>
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
              <Text style={[styles.genderText, { color: Colors.genderGirl }]}>หญิง</Text>
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
              <Text style={[styles.genderText, { color: Colors.genderOther }]}>อื่น ๆ</Text>
            </TouchableOpacity>
          </View>

          <Button
            title="สมัครสมาชิก"
            variant="green"
            size="lg"
            style={styles.signUpBtn}
            loading={loading}
            onPress={handleSignUp}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    paddingBottom: 140,
  },
  card: {
    backgroundColor: Colors.cardBackground,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.card,
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
  passwordHint: {
    fontFamily: "Kanit_400Regular",
    fontSize: Typography.fontSizeXs,
    lineHeight: 18,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    fontFamily: "Kanit_400Regular",
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
