// src/app/(auth)/login.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const { colors } = useTheme();
  const emailRef = useRef("");
  const passwordRef = useRef("");

  async function signInWithEmail() {
    setAuthError("");
    const emailVal = emailRef.current || email;
    const passwordVal = passwordRef.current || password;

    console.log("Email:", emailVal);
    console.log("Password length:", passwordVal.length);

    if (!emailVal || !passwordVal) {
      setAuthError("Please enter both fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: emailVal.trim(),
      password: passwordVal.trim(),
    });
    console.log("Auth error:", error);
    if (error) {
      setAuthError(
        error.message.includes("Invalid login")
          ? "Wrong password"
          : error.message,
      );
    }
    setLoading(false);
  }

  return (
    <GradientBackground>
      <SafeAreaView
        edges={["top", "bottom", "left", "right"]}
        style={[styles.container, { backgroundColor: "transparent" }]}
      >
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
              Welcome back. Ready to save?
            </Text>
          </View>

          <View style={styles.formContainer}>
            {/* EMAIL */}
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
              placeholderTextColor="#95a5a6"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                emailRef.current = text;
                setAuthError("");
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              importantForAutofill="yes"
              editable={!loading}
            />

            {/* PASSWORD */}
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
                authError ? styles.inputErrorBorder : null,
              ]}
            >
              <TextInput
                style={[styles.passwordInput, { color: colors.textPrimary }]}
                placeholder="Password"
                placeholderTextColor="#95a5a6"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  passwordRef.current = text;
                  setAuthError("");
                }}
                autoComplete="current-password"
                textContentType="password"
                importantForAutofill="yes"
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
                  color="#7f8c8d"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* FOOTER ROW */}
          <View style={styles.passwordFooter}>
            <Text style={[styles.forgotPasswordText, { color: colors.danger }]}>
              {authError}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text
                style={[
                  styles.forgotPasswordText,
                  { color: colors.forgotPasswordText },
                ]}
              >
                Forgot password?
              </Text>
            </TouchableOpacity>
          </View>

          {/* SIGN IN BUTTON */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              { backgroundColor: colors.primary, marginTop: 10 },
              loading && styles.disabledButton,
            ]}
            onPress={signInWithEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, { color: colors.textOnDark }]}>
                Sign In
              </Text>
            )}
          </TouchableOpacity>

          {/* CREATE ACCOUNT BUTTON */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              {
                borderColor: colors.borderSecondary,
                backgroundColor: colors.bgPrimary,
              },
              loading && styles.disabledButton,
            ]}
            onPress={() => router.push("/(auth)/signup")}
            disabled={loading}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.textPrimary },
              ]}
            >
              Create Account
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}
