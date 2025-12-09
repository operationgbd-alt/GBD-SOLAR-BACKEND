import React from "react";
import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import InterventionsListScreen from "@/screens/InterventionsListScreen";
import InterventionDetailScreen from "@/screens/InterventionDetailScreen";
import { InterventionStatus } from "@/types";
import { Spacing } from "@/constants/theme";

export type InterventionsStackParamList = {
  InterventionsList: { filterStatus?: InterventionStatus } | undefined;
  InterventionDetail: { interventionId: string };
};

const Stack = createNativeStackNavigator<InterventionsStackParamList>();

function BackButton() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('InterventionsList');
    }
  };

  return (
    <Pressable onPress={handleBack} style={{ padding: Spacing.xs, minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
      <Feather name="chevron-left" size={28} color={theme.text} />
    </Pressable>
  );
}

function InterventionsListBackButton() {
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

export default function InterventionsStackNavigator() {
  const { theme, isDark } = useTheme();
  const commonOptions = getCommonScreenOptions({ theme, isDark });

  return (
    <Stack.Navigator screenOptions={commonOptions}>
      <Stack.Screen
        name="InterventionsList"
        component={InterventionsListScreen}
        options={{
          title: "Interventi",
          headerLeft: () => <InterventionsListBackButton />,
        }}
      />
      <Stack.Screen
        name="InterventionDetail"
        component={InterventionDetailScreen}
        options={{
          title: "Dettaglio",
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack.Navigator>
  );
}
