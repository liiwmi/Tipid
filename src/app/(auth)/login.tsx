// src/app/(auth)/login.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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

  async function signInWithEmail() {
    setAuthError("");
    if (!email || !password) {
      setAuthError("Please enter both fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
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
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
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
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#95a5a6"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setAuthError("");
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <Text style={styles.inputLabel}>Password</Text>
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
                setAuthError("");
              }}
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

          <View style={styles.passwordFooter}>
            <Text
              style={[
                styles.forgotPasswordText,
                { color: colors.forgotPasswordText },
              ]}
            >
              {authError}
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/forgot-password")}
            >
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>

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

          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              { borderColor: colors.borderSecondary },
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
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
