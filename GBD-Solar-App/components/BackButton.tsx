import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";

interface BackButtonProps {
  fallbackRoute?: string;
  color?: string;
}

export function BackButton({ fallbackRoute, color }: BackButtonProps) {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (fallbackRoute) {
      navigation.navigate(fallbackRoute);
    }
  };

  return (
    <Pressable onPress={handleBack} style={styles.button}>
      <Feather 
        name="chevron-left" 
        size={28} 
        color={color || theme.primary} 
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 4,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
