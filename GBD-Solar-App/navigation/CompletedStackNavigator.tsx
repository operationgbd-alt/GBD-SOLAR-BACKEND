import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import { BackButton } from "@/components/BackButton";
import CompletedInterventionsScreen from "@/screens/CompletedInterventionsScreen";
import InterventionDetailScreen from "@/screens/InterventionDetailScreen";

export type CompletedStackParamList = {
  CompletedList: undefined;
  CompletedDetail: { interventionId: string };
};

const Stack = createNativeStackNavigator<CompletedStackParamList>();

export default function CompletedStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator 
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
        headerBackVisible: false,
      }}
    >
      <Stack.Screen
        name="CompletedList"
        component={CompletedInterventionsScreen}
        options={{
          title: "Completati",
          headerLeft: () => <BackButton fallbackRoute="DashboardTab" />,
        }}
      />
      <Stack.Screen
        name="CompletedDetail"
        component={InterventionDetailScreen as any}
        options={{
          title: "Dettaglio",
          headerLeft: () => <BackButton fallbackRoute="CompletedList" />,
        }}
      />
    </Stack.Navigator>
  );
}
