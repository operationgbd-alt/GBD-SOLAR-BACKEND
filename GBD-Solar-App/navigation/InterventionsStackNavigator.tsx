import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { useTheme } from "@/hooks/useTheme";
import { BackButton } from "@/components/BackButton";
import InterventionsListScreen from "@/screens/InterventionsListScreen";
import InterventionDetailScreen from "@/screens/InterventionDetailScreen";
import { InterventionStatus } from "@/types";

export type InterventionsStackParamList = {
  InterventionsList: { filterStatus?: InterventionStatus } | undefined;
  InterventionDetail: { interventionId: string };
};

const Stack = createNativeStackNavigator<InterventionsStackParamList>();

export default function InterventionsStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator 
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
        headerBackVisible: false,
      }}
    >
      <Stack.Screen
        name="InterventionsList"
        component={InterventionsListScreen}
        options={{
          title: "Interventi",
          headerLeft: () => <BackButton fallbackRoute="DashboardTab" />,
        }}
      />
      <Stack.Screen
        name="InterventionDetail"
        component={InterventionDetailScreen}
        options={{
          title: "Dettaglio",
          headerLeft: () => <BackButton fallbackRoute="InterventionsList" />,
        }}
      />
    </Stack.Navigator>
  );
}
