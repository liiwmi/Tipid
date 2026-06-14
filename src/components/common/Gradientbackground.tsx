import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { useTheme } from "../../context/ThemeContext";

interface Props {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function GradientBackground({ children, style }: Props) {
  const { isDarkMode } = useTheme();

  return (
    <LinearGradient
      colors={
        isDarkMode
          ? ["#454303", "#180e08", "#141414"]
          : ["#adcf12bf", "#cbf70a57", "#ffffff"]
      }
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 0.35 }}
      style={[{ flex: 1 }, style]}
    >
      {children}
    </LinearGradient>
  );
}