// This screen handles the deep link redirect after the user clicks
// the password reset email from Supabase.

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GradientBackground from "../../components/common/Gradientbackground";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../lib/supabase";
import { globalStyles as styles } from "../../styles/styles";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleUpdatePassword() {
    if (!password || !confirmPassword) {
      Alert.alert("Hold on", "Please fill in both fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Too short", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Mismatch", "Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Password Updated",
        "Your password has been changed successfully!",
        [{ text: "Login", onPress: () => router.replace("/(auth)/login") }],
      );
    }
  }

  return (
    <GradientBackground>
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={[styles.container, { backgroundColor: "transparent" }]}
      >
        {/* BACK BUTTON */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ position: "absolute", top: 56, left: 24, zIndex: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <Image
              source={require("../../../assets/tipid-logo-w-title.png")}
              style={{ width: 180, height: 80 }}
              resizeMode="contain"
            />
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Create a new password for your account.
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* NEW PASSWORD */}
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              New Password
            </Text>
            <View style={{ position: "relative" }}>
              <TextInput
                style={[
                  styles.input,
                  {
                    borderColor: colors.borderSecondary,
                    color: colors.textPrimary,
                    backgroundColor: colors.bgInput,
                    paddingRight: 44,
                  },
                ]}
                placeholder="At least 6 characters"
                placeholderTextColor="#95a5a6"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                editable={!loading}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((v) => !v)}
                style={{ position: "absolute", right: 12, top: 12 }}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* CONFIRM PASSWORD */}
            <Text
              style={[
                styles.inputLabel,
                { color: colors.textPrimary, marginTop: 12 },
              ]}
            >
              Confirm Password
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.borderSecondary,
                  color: colors.textPrimary,
                  backgroundColor: colors.bgInput,
                },
              ]}
              placeholder="Repeat your new password"
              placeholderTextColor="#95a5a6"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              editable={!loading}
            />

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                { backgroundColor: colors.primary, marginTop: 16 },
                loading && styles.disabledButton,
              ]}
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: colors.textOnDark }]}>
                  Update Password
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}
