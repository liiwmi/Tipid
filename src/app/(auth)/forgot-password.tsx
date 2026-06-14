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
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import GradientBackground from "../../components/common/Gradientbackground";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../lib/supabase";
import { globalStyles as styles } from "../../styles/styles";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {
    if (!email) {
      Alert.alert("Hold on", "Please enter your email address.");
      return;
    }
    setLoading(true);
    const redirectUrl = Linking.createURL("/reset-password");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert("Check your inbox", "We sent you a link to reset your password!");
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
              Let's get you back to saving money.
            </Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Registered Email
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
              placeholder="e.g. hello@tipid.com"
              placeholderTextColor="#95a5a6"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />

            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                { backgroundColor: colors.primary, marginTop: 10 },
                loading && styles.disabledButton,
              ]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.buttonText, { color: colors.textOnDark }]}>
                  Send Reset Link
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
}