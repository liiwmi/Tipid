// src/app/(auth)/signup.tsx
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

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  async function handleSignUp() {
    if (!email || !password || !confirmPassword) {
      Alert.alert("Hold on", "Please fill out all fields.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert(
        "Passwords do not match",
        "Please ensure both passwords are exactly the same.",
      );
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        "Weak Password",
        "Your password must be at least 6 characters long.",
      );
      return;
    }
    if (!agreedToTerms) {
      Alert.alert(
        "Terms & Conditions",
        "You must read and agree to the Terms and Conditions before creating an account.",
      );
      return;
    }
    setLoading(true);
    const { error, data } = await supabase.auth.signUp({ email, password });
    if (error) {
      Alert.alert("Sign Up Failed", error.message);
    } else if (data?.session) {
      Alert.alert("Success", "Account created and logged in!");
    } else {
      Alert.alert("Success", "Please check your inbox for email verification!");
      router.back();
    }
    setLoading(false);
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
              Take control of your electricity bill.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Email
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
              placeholder="Email address"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Password
            </Text>
            <View
              style={[
                styles.passwordContainer,
                {
                  borderColor: colors.borderSecondary,
                  backgroundColor: colors.bgInput,
                },
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                placeholder="Password"
                placeholderTextColor={colors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Confirm Password
            </Text>
            <View
              style={[
                styles.passwordContainer,
                {
                  borderColor: colors.borderSecondary,
                  backgroundColor: colors.bgInput,
                },
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textSecondary}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* ── TERMS CHECKBOX ── */}
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                marginTop: 14,
                marginBottom: 4,
              }}
              onPress={() => setAgreedToTerms((v) => !v)}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: agreedToTerms
                    ? colors.primary
                    : colors.borderSecondary,
                  backgroundColor: agreedToTerms
                    ? colors.primary
                    : "transparent",
                  justifyContent: "center",
                  alignItems: "center",
                  flexShrink: 0,
                }}
              >
                {agreedToTerms && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: colors.textSecondary,
                  lineHeight: 18,
                }}
              >
                I have read and agree to the{" "}
                <Text
                  style={{ color: colors.primary, fontWeight: "600" }}
                  onPress={() => router.push("/(main)/terms" as any)}
                >
                  Terms and Conditions
                </Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                {
                  backgroundColor: agreedToTerms
                    ? colors.primary
                    : colors.borderSecondary,
                  marginTop: 10,
                },
                loading && styles.disabledButton,
              ]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: colors.textOnDark }]}>
                  Create Account
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}
