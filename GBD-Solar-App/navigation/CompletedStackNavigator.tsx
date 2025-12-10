import React from "react";
import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import CompletedInterventionsScreen from "@/screens/CompletedInterventionsScreen";
import InterventionDetailScreen from "@/screens/InterventionDetailScreen";
import { Spacing } from "@/constants/theme";

export type CompletedStackParamList = {
  CompletedList: undefined;
  CompletedDetail: { interventionId: string };
};

const Stack = createNativeStackNavigator<CompletedStackParamList>();

function BackButton() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('CompletedList');
    }
  };

  return (
    <Pressable onPress={handleBack} style={{ padding: Spacing.xs, minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
      <Feather name="chevron-left" size={28} color={theme.text} />
    </Pressable>
  );
}

function CompletedListBackButton() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      const tabNav = navigation.getParent();
      if (tabNav) {
        tabNav.navigate('DashboardTab');
      }
    }
  };

  return (
    <Pressable onPress={handleBack} style={{ padding: Spacing.xs, minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
      <Feather name="chevron-left" size={28} color={theme.text} />
    </Pressable>
  );
}

export default function CompletedStackNavigator() {
  const { theme, isDark } = useTheme();
  const commonOptions = getCommonScreenOptions({ theme, isDark });

  return (
    <Stack.Navigator screenOptions={commonOptions}>
      <Stack.Screen
        name="CompletedList"
        component={CompletedInterventionsScreen}
        options={{
          title: "Completati",
          headerLeft: () => <CompletedListBackButton />,
        }}
      />
      <Stack.Screen
        name="CompletedDetail"
        component={InterventionDetailScreen as any}
        options={{
          title: "Dettaglio",
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack.Navigator>
  );
}
