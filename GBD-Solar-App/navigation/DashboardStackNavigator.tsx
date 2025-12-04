import React from "react";
import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import DashboardScreen from "@/screens/DashboardScreen";
import CalendarScreen from "@/screens/CalendarScreen";
import AppointmentFormScreen from "@/screens/AppointmentFormScreen";
import { CompanyInterventionsScreen } from "@/screens/CompanyInterventionsScreen";
import { CreateInterventionScreen } from "@/screens/CreateInterventionScreen";
import { BulkAssignScreen } from "@/screens/BulkAssignScreen";
import { TechnicianMapScreen } from "@/screens/TechnicianMapScreen";
import InterventionDetailScreen from "@/screens/InterventionDetailScreen";
import { HeaderTitle } from "@/components/HeaderTitle";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { Appointment } from "@/types";
import { Spacing } from "@/constants/theme";

function BackButton() {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Dashboard' }],
      });
    }
  };

  return (
    <Pressable onPress={handleBack} style={{ padding: Spacing.xs }}>
      <Feather name="chevron-left" size={24} color={theme.text} />
    </Pressable>
  );
}

export type DashboardStackParamList = {
  Dashboard: undefined;
  Calendar: undefined;
  AppointmentForm: { appointment?: Appointment; date?: number };
  CompanyInterventions: { companyId: string; companyName: string };
  InterventionDetail: { interventionId: string };
  CreateIntervention: undefined;
  BulkAssign: undefined;
  TechnicianMap: undefined;
};

const Stack = createNativeStackNavigator<DashboardStackParamList>();

export default function DashboardStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        ...getCommonScreenOptions({ theme, isDark }),
      }}
    >
      <Stack.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          headerTitle: () => <HeaderTitle title="SolarTech" />,
        }}
      />
      <Stack.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{ 
          headerTitle: "Calendario",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="AppointmentForm"
        component={AppointmentFormScreen}
        options={({ route }) => ({
          headerTitle: route.params?.appointment ? "Modifica Appuntamento" : "Nuovo Appuntamento",
          presentation: "modal",
          headerLeft: () => <BackButton />,
        })}
      />
      <Stack.Screen
        name="CompanyInterventions"
        component={CompanyInterventionsScreen}
        options={({ route }) => ({
          headerTitle: route.params.companyName,
          headerLeft: () => <BackButton />,
        })}
      />
      <Stack.Screen
        name="CreateIntervention"
        component={CreateInterventionScreen}
        options={{
          headerTitle: "Nuovo Intervento",
          presentation: "modal",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="BulkAssign"
        component={BulkAssignScreen}
        options={{
          headerTitle: "Assegna Interventi",
          presentation: "modal",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="TechnicianMap"
        component={TechnicianMapScreen}
        options={{
          headerTitle: "Mappa Tecnici",
          headerLeft: () => <BackButton />,
        }}
      />
      <Stack.Screen
        name="InterventionDetail"
        component={InterventionDetailScreen}
        options={{
          headerTitle: "Dettaglio Intervento",
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack.Navigator>
  );
}
