import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { supabase } from "../../lib/supabase";
import { globalStyles as styles } from "../../styles/styles";

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResetPassword() {
    if (!email) {
      Alert.alert("Hold on", "Please enter your email address.");
      return;
    }

    setLoading(true);

    // 1. Automatically generate the correct deep link for Expo Go OR Production
    const redirectUrl = Linking.createURL("/reset-password");

    // 2. Send the email with that smart link
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Check your inbox",
        "We sent you a link to reset your password!",
      );
      router.back();
    }

    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Recovery.</Text>
          <Text style={styles.subtitle}>
            Let's get you back to saving money.
          </Text>
        </View>

        {/* Using the flat, borderless layout we just created */}
        <View style={{ width: "100%", paddingHorizontal: 10 }}>
          <Text style={styles.inputLabel}>Registered Email</Text>
          <TextInput
            style={styles.input}
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
              loading && styles.disabledButton,
              { marginTop: 20 },
            ]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.secondaryButton,
              loading && styles.disabledButton,
            ]}
            onPress={() => router.back()}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
