/* eslint-disable react-hooks/immutability */
import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { Button } from "../../src/components/Button";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../src/lib/supabase";
import { ownObjectPathFromPublicUrl, selectSquareImage, SelectedImage, uploadPublicImage } from "../../src/lib/storage";

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
  const [loading, setLoading] = useState(true);
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
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    try { setNewAvatar(await selectSquareImage()); }
    catch (error: any) { Alert.alert("เลือกรูปไม่สำเร็จ", error.message); }
  };

  const handleUpdateProfile = async () => {
    if (!userId) return;
    
    setUpdating(true);
    try {
      let finalAvatarUrl = existingAvatarUrl;

      // ถ้ามีการเลือกรูปใหม่
      if (newAvatar) {
        const uploaded = await uploadPublicImage("avatars", userId, newAvatar, "avatar");
        finalAvatarUrl = uploaded.publicUrl;

        // ลบรูปเก่าทิ้งเพื่อประหยัดพื้นที่ (ถ้ามีรูปเก่า)
        if (existingAvatarUrl) {
          const oldFilePath = ownObjectPathFromPublicUrl("avatars", existingAvatarUrl, userId);
          if (oldFilePath) await supabase.storage.from("avatars").remove([oldFilePath]);
        }
      }

      // อัปเดตข้อมูลตาราง Profiles
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          username,
          phone_num: phone,
          age: parseInt(age) || null,
          user_img_url: finalAvatarUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      Alert.alert("Success", "Profile updated successfully!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
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
        <Text style={styles.headerName}>{fullName || username || "Your Profile"}</Text>
        <Text style={styles.headerEmail}>{email}</Text>
      </HeaderGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Full name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

          <Text style={styles.inputLabel}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} />

          <Text style={styles.inputLabel}>Email (Read Only)</Text>
          <TextInput style={[styles.input, { opacity: 0.7 }]} value={email} editable={false} />

          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />

          <Text style={styles.inputLabel}>Age</Text>
          <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" />

          <Button
            title="Update Profile"
            variant="gold"
            size="lg"
            style={styles.updateBtn}
            textStyle={{ color: Colors.textWhite }}
            loading={updating}
            onPress={handleUpdateProfile}
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
