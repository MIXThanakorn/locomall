import React, { useState } from "react";
import { View, Text, TextInput, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { Colors, Typography, Spacing, BorderRadius } from "../../src/constants/theme";
import { HeaderGradient } from "../../src/components/HeaderGradient";
import { ImagePlaceholder } from "../../src/components/ImagePlaceholder";
import { Button } from "../../src/components/Button";

export default function EditProfileScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("Hello World");
  const [username, setUsername] = useState("Hello");
  const [personalDetails, setPersonalDetails] = useState("Local community marketplace member and seller.");
  const [email, setEmail] = useState("Hello@gmail.com");
  const [phone, setPhone] = useState("087*******");
  const [age, setAge] = useState("25");

  return (
    <View style={styles.container}>
      <HeaderGradient
        title=""
        variant="gold"
        showBack
        onBackPress={() => router.back()}
        style={styles.header}
      >
        <View style={styles.avatarContainer}>
          <ImagePlaceholder
            width={84}
            height={84}
            borderRadius={42}
            label=""
            iconName="person"
            iconSize={36}
            backgroundColor="#FFFFFF"
          />
          <Text style={styles.headerName}>Hello World</Text>
          <Text style={styles.headerEmail}>Hello@gmail.com</Text>
        </View>
      </HeaderGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Full name</Text>
          <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

          <Text style={styles.inputLabel}>Username</Text>
          <TextInput style={styles.input} value={username} onChangeText={setUsername} />

          <Text style={styles.inputLabel}>Personal Details</Text>
          <TextInput style={styles.input} value={personalDetails} onChangeText={setPersonalDetails} />

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" />

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
            onPress={() => router.back()}
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
