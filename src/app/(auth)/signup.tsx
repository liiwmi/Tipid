import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

export default function SignUpScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Join Tipid.
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Take control of your electricity bill.
          </Text>
        </View>

        <View style={styles.formContainer}>
          {/* Email */}
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

          {/* Password */}
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

          {/* Confirm Password */}
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

          {/* Create Account Button */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.primaryButton,
              { backgroundColor: colors.primary, marginTop: 10 },
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

          {/* Back to Login Button */}
          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              { borderColor: colors.borderSecondary },
              loading && styles.disabledButton,
            ]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text
              style={[
                styles.secondaryButtonText,
                { color: colors.textPrimary },
              ]}
            >
              Back to Login
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
