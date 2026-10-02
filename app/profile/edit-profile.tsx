/* eslint-disable react-hooks/immutability */
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Image } from "react-native";
import { AppTextInput } from "../../src/components/AppTextInput";
import { KeyboardAwareScrollView } from "../../src/components/KeyboardAware";
import { useRouter } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { Button } from "../../src/components/Button";
import { Ionicons } from "@expo/vector-icons";
import { translateDatabaseError } from "../../src/lib/databaseError";
import { supabase } from "../../src/lib/supabase";
import { ownObjectPathFromPublicUrl, selectSquareImage, SelectedImage, uploadPublicImage } from "../../src/lib/storage";
import { mobilePhoneError, normalizeMobilePhone } from "../../src/lib/fieldValidation";

export default function EditProfileScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState("");
  
  const [existingAvatarUrl, setExistingAvatarUrl] = useState<string | null>(null);
  const [newAvatar, setNewAvatar] = useState<SelectedImage | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        setEmail(user.email || "");
        
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (data && !error) {
          setFullName(data.full_name || "");
          setUsername(data.username || "");
          setPhone(data.phone_num || "");
          setAge(data.age ? data.age.toString() : "");
          setExistingAvatarUrl(data.user_img_url || null);
        }
      }
    } catch (error) {
      console.error("Error loading user data", error);
    }
  };

  const pickImage = async () => {
    try { setNewAvatar(await selectSquareImage()); }
    catch { Alert.alert("เลือกรูปไม่สำเร็จ", "กรุณาตรวจสอบสิทธิ์เข้าถึงรูปภาพแล้วลองใหม่อีกครั้ง"); }
  };

  const handleUpdateProfile = async () => {
    if (!userId) return;
    const phoneError = mobilePhoneError(phone, false);
    if (phoneError) return Alert.alert("เบอร์มือถือไม่ถูกต้อง", phoneError);
    
    setUpdating(true);
    try {
      let finalAvatarUrl = existingAvatarUrl;

      // ถ้ามีการเลือกรูปใหม่
      if (newAvatar) {
        const uploaded = await uploadPublicImage("avatars", userId, newAvatar, "avatar");
        finalAvatarUrl = uploaded.publicUrl;

      }

      // อัปเดตข้อมูลตาราง Profiles
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          display_name: fullName.trim(),
          username: username.trim(),
          phone_num: phone,
          age: parseInt(age) || null,
          user_img_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      if (newAvatar && existingAvatarUrl) {
        const oldFilePath = ownObjectPathFromPublicUrl("avatars", existingAvatarUrl, userId);
        if (oldFilePath) void supabase.storage.from("avatars").remove([oldFilePath]);
      }

      Alert.alert("บันทึกสำเร็จ", "แก้ไขข้อมูลส่วนตัวเรียบร้อยแล้ว", [
        { text: "ตกลง", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("บันทึกไม่สำเร็จ", translateDatabaseError(error));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <View style={styles.container}>
      <HeaderGradient
        title=""
        variant="gold"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      >
        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} activeOpacity={0.8}>
          {newAvatar || existingAvatarUrl ? (
            <Image 
              source={{ uri: newAvatar ? newAvatar.uri : existingAvatarUrl! }} 
              style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: Colors.cardBackground }} 
            />
          ) : (
            <ImagePlaceholder
              width={84}
              height={84}
              borderRadius={42}
              label=""
              iconName="person"
              iconSize={36}
              backgroundColor="#FFFFFF"
            />
          )}
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={14} color={Colors.textWhite} />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerName}>{fullName || username || "โปรไฟล์ของฉัน"}</Text>
        <Text style={styles.headerEmail}>{email}</Text>
      </HeaderGradient>

      <KeyboardAwareScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>ชื่อ-นามสกุล</Text>
          <AppTextInput style={styles.input} value={fullName} onChangeText={setFullName} />

          <Text style={styles.inputLabel}>ชื่อผู้ใช้</Text>
          <AppTextInput style={styles.input} value={username} onChangeText={setUsername} />

          <Text style={styles.inputLabel}>อีเมล (แก้ไขไม่ได้)</Text>
          <AppTextInput style={[styles.input, { opacity: 0.7 }]} value={email} editable={false} />

          <Text style={styles.inputLabel}>เบอร์โทรศัพท์</Text>
          <AppTextInput style={styles.input} value={phone} onChangeText={(value) => setPhone(normalizeMobilePhone(value))} keyboardType="number-pad" maxLength={10} placeholder="เช่น 0812345678" />

          <Text style={styles.inputLabel}>อายุ</Text>
          <AppTextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" />

          <Button
            title="บันทึกข้อมูลส่วนตัว"
            variant="gold"
            size="lg"
            style={styles.updateBtn}
            textStyle={{ color: Colors.textWhite }}
            loading={updating}
            onPress={handleUpdateProfile}
          />
        </View>
      </KeyboardAwareScrollView>
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
    paddingBottom: 40,
    alignItems: "center",
  },
  avatarContainer: {
    alignItems: "center",
    marginTop: -10,
    position: "relative",
  },
  editBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: Colors.greenPrimary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.cardBackground,
  },
  headerName: {
    fontSize: Typography.fontSizeLg,
    fontWeight: "700",
    color: Colors.textDark,
    marginTop: Spacing.xs,
  },
  headerEmail: {
    fontSize: Typography.fontSizeXs,
    color: Colors.textDark,
    opacity: 0.8,
  },
  content: {
    flex: 1,
    marginTop: -20,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  card: {
    backgroundColor: Colors.goldPrimary + "20",
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.goldPrimary + "40",
  },
  inputLabel: {
    fontSize: Typography.fontSizeSm,
    fontWeight: "500",
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
    marginTop: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.goldPrimary + "30",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: Typography.fontSizeMd,
    color: Colors.textDark,
  },
  updateBtn: {
    backgroundColor: Colors.goldDark,
    marginTop: Spacing.xl,
  },
});
