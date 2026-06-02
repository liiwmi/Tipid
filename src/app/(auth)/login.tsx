// src/app/(auth)/login.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../lib/supabase";
import { globalStyles as styles } from "../../styles/styles";
import Logo from "../../components/Logo"; // NEW: Importing the SVG logo as a component
import { useTheme } from '../../context/ThemeContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState(""); // NEW: Tracks login errors
  const { colors } = useTheme();

  async function signInWithEmail() {
    setAuthError(""); // Clear previous errors

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
      // If Supabase says invalid credentials, show "Wrong password" just like your image
      setAuthError(
        error.message.includes("Invalid login")
          ? "Wrong password"
          : error.message,
      );
    }

    setLoading(false);
  }

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Logo width={60} height={60} />
            <Text style={[styles.title, { marginTop: 16, color: colors.textPrimary }]}>Tipid</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Welcome back. Ready to save?</Text>
        </View>

        <View style={styles.formContainer}>
          {/* Email Field with Label */}
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#95a5a6"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setAuthError(""); // Clear error when user types
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          {/* Password Field with Label & Dynamic Error Border */}
          <Text style={styles.inputLabel}>Password</Text>
          <View
            style={[
              styles.passwordContainer,
              authError ? styles.inputErrorBorder : null,
            ]}
          >
            <TextInput
              style={styles.passwordInput}
              placeholder="Password"
              placeholderTextColor="#95a5a6"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setAuthError(""); // Clear error when user types
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

          {/* New Footer Layout matching your image */}
          <View style={styles.passwordFooter}>
            <Text style={[styles.forgotPasswordText, { color: colors.forgotPasswordText }]}>{authError}</Text>
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
              loading && styles.disabledButton,
              { marginTop: 10 },
            ]}
            onPress={signInWithEmail}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              loading && styles.disabledButton,
            ]}
            onPress={() => router.push("/(auth)/signup")}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
