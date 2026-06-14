import { supabase } from "@/src/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useProfileContext } from "../../context/ProfileContext";
import { useTheme } from "../../context/ThemeContext";
import { UserProfile } from "../../hooks/useProfile";
import {
  borderRadius,
  fontSizes,
  fontWeights,
  spacing,
} from "../../styles/theme";
// Add supabase import at the top
const REGIONS = ["Luzon", "Visayas", "Mindanao"] as const;

export default function ProfileScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { profile, loading, saving, saveProfile } = useProfileContext();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [region, setRegion] = useState<UserProfile["region"]>("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Populate fields once profile loads
  useEffect(() => {
    if (!loading) {
      setDisplayName(profile.displayName);
      setEmail(profile.email);
      setPhone(profile.phone);
      setRegion(profile.region);
      setAvatarUri(profile.avatarUri);
    }
  }, [loading]);

  const markDirty = () => setIsDirty(true);

  // ── PICK IMAGE ───────────────────────────────────────────
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow access to your photo library.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri); // local preview only
      markDirty();
    }
  };

  // ── SAVE ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert("Validation", "Display name cannot be empty.");
      return;
    }

    let finalAvatarUri = avatarUri;

    // If it's a local file (not already a Supabase URL), upload it
    if (avatarUri && avatarUri.startsWith("file://")) {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          const ext = avatarUri.split(".").pop() ?? "jpg";
          const fileName = `${user.id}.${ext}`;
          const formData = new FormData();
          formData.append("file", {
            uri: avatarUri,
            name: fileName,
            type: `image/${ext}`,
          } as any);

          const { error: uploadError } = await supabase.storage
            .from("avatars")
            .upload(fileName, formData, {
              upsert: true,
              contentType: `image/${ext}`,
            });

          if (uploadError) {
            console.log("Upload error:", uploadError.message);
            Alert.alert("Error", "Failed to upload image.");
            return;
          }

          const { data: urlData } = supabase.storage
            .from("avatars")
            .getPublicUrl(fileName);

          finalAvatarUri = urlData.publicUrl;
        }
      } catch (e) {
        console.log("Avatar upload error:", e);
        Alert.alert("Error", "Failed to upload image.");
        return;
      }
    }

    await saveProfile({
      displayName,
      email,
      phone,
      region,
      avatarUri: finalAvatarUri,
    });
    setAvatarUri(finalAvatarUri);
    setIsDirty(false);
    Alert.alert("Saved", "Your profile has been updated.");
  };

  // ── INITIALS FALLBACK ────────────────────────────────────
  const initials = displayName
    ? displayName
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  if (loading) {
    return (
      <SafeAreaView style={[s.safe, { backgroundColor: colors.bgSecondary }]}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  const cardStyle = [
    s.card,
    { backgroundColor: colors.bgCard, borderColor: colors.borderDefault },
  ];
  const rowBorder = { borderBottomColor: colors.borderDefault };

  return (
    <SafeAreaView
      edges={["top", "bottom", "left", "right"]}
      style={[s.safe, { backgroundColor: colors.bgSecondary }]}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[s.pageTitle, { color: colors.textPrimary }]}>
            My Profile
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {/* AVATAR */}
        <View style={s.avatarSection}>
          <TouchableOpacity onPress={pickImage} style={s.avatarWrapper}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={s.avatarImage} />
            ) : (
              <View
                style={[
                  s.avatarFallback,
                  { backgroundColor: colors.bgListIcon },
                ]}
              >
                <Text style={[s.avatarInitials, { color: colors.primary }]}>
                  {initials}
                </Text>
              </View>
            )}
            <View
              style={[s.avatarEditBadge, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={[s.avatarHint, { color: colors.textSecondary }]}>
            Tap to change photo
          </Text>
        </View>

        {/* PERSONAL INFO */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
          PERSONAL INFO
        </Text>
        <View style={cardStyle}>
          {/* Display Name */}
          <View style={[s.row, rowBorder]}>
            <View style={[s.rowIcon, { backgroundColor: colors.bgListIcon }]}>
              <Ionicons
                name="person-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowLabel, { color: colors.textSecondary }]}>
                Display Name
              </Text>
              <TextInput
                style={[s.rowInput, { color: colors.textPrimary }]}
                value={displayName}
                onChangeText={(v) => {
                  setDisplayName(v);
                  markDirty();
                }}
                placeholder="Your name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>

          {/* Email */}
          <View style={[s.row, rowBorder]}>
            <View style={[s.rowIcon, { backgroundColor: colors.bgListIcon }]}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowLabel, { color: colors.textSecondary }]}>
                Email
              </Text>
              <TextInput
                style={[s.rowInput, { color: colors.textPrimary }]}
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  markDirty();
                }}
                placeholder="your@email.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Phone */}
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <View style={[s.rowIcon, { backgroundColor: colors.bgListIcon }]}>
              <Ionicons
                name="call-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowLabel, { color: colors.textSecondary }]}>
                Phone
              </Text>
              <TextInput
                style={[s.rowInput, { color: colors.textPrimary }]}
                value={phone}
                onChangeText={(v) => {
                  setPhone(v);
                  markDirty();
                }}
                placeholder="+63 9XX XXX XXXX"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </View>
        </View>

        {/* REGION */}
        <Text style={[s.sectionLabel, { color: colors.textSecondary }]}>
          REGION
        </Text>
        <View style={cardStyle}>
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <View style={[s.rowIcon, { backgroundColor: colors.bgListIcon }]}>
              <Ionicons
                name="location-outline"
                size={18}
                color={colors.textSecondary}
              />
            </View>
            <View style={s.rowBody}>
              <Text style={[s.rowLabel, { color: colors.textSecondary }]}>
                Grid Region
              </Text>
              <Text style={[s.rowHint, { color: colors.textSecondary }]}>
                Affects your electricity rate calculation
              </Text>
            </View>
          </View>
          <View style={s.regionRow}>
            {REGIONS.map((r) => (
              <TouchableOpacity
                key={r}
                style={[
                  s.regionChip,
                  { borderColor: colors.borderDefault },
                  region === r && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => {
                  setRegion(r);
                  markDirty();
                }}
              >
                <Text
                  style={[
                    s.regionText,
                    { color: region === r ? "#fff" : colors.textPrimary },
                  ]}
                >
                  {r}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SAVE BUTTON */}
        {isDirty && (
          <TouchableOpacity
            style={[
              s.saveBtn,
              { backgroundColor: colors.primary },
              saving && { opacity: 0.6 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    marginTop: spacing.sm,
  },
  pageTitle: {
    fontSize: fontSizes.xl,
    fontWeight: fontWeights.bold,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: spacing.sm,
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    fontSize: fontSizes.xxl,
    fontWeight: fontWeights.bold,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarHint: {
    fontSize: fontSizes.sm,
  },
  sectionLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    gap: spacing.sm,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  rowBody: { flex: 1 },
  rowLabel: {
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
    marginBottom: 2,
  },
  rowInput: {
    fontSize: fontSizes.base,
    paddingVertical: 2,
  },
  rowHint: {
    fontSize: fontSizes.xs,
    marginTop: 2,
  },
  regionRow: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  regionChip: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 0.5,
    alignItems: "center",
  },
  regionText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
  },
  saveBtn: {
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  saveBtnText: {
    fontSize: fontSizes.base,
    fontWeight: fontWeights.bold,
    color: "#fff",
  },
});
