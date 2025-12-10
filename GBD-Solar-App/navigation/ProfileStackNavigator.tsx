import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "@/screens/ProfileScreen";
import { ManageCompaniesScreen } from "@/screens/ManageCompaniesScreen";
import { ManageUsersScreen } from "@/screens/ManageUsersScreen";
import { CreateInterventionScreen } from "@/screens/CreateInterventionScreen";
import { CompanyAccountScreen } from "@/screens/CompanyAccountScreen";
import { CloseInterventionsScreen } from "@/screens/CloseInterventionsScreen";
import { ManageTechniciansScreen } from "@/screens/ManageTechniciansScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { BackButton } from "@/components/BackButton";

export type ProfileStackParamList = {
  Profile: undefined;
  ManageCompanies: { origin?: 'Dashboard' | 'Profile' } | undefined;
  ManageUsers: { origin?: 'Dashboard' | 'Profile' } | undefined;
  CreateIntervention: { origin?: 'Dashboard' | 'Profile' } | undefined;
  CompanyAccount: { origin?: 'Dashboard' | 'Profile' } | undefined;
  CloseInterventions: { origin?: 'Dashboard' | 'Profile' } | undefined;
  ManageTechnicians: { origin?: 'Dashboard' | 'Profile' } | undefined;
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

export default function ProfileStackNavigator() {
  const { theme, isDark } = useTheme();

  return (
    <Stack.Navigator screenOptions={getCommonScreenOptions({ theme, isDark })}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profilo",
          headerBackVisible: false,
          headerLeft: () => <BackButton fallbackRoute="DashboardTab" />,
        }}
      />
      <Stack.Screen
        name="ManageCompanies"
        component={ManageCompaniesScreen}
        options={{
          title: "Gestione Ditte",
          headerBackVisible: false,
          headerLeft: () => <BackButton fallbackRoute="Profile" />,
        }}
      />
      <Stack.Screen
        name="ManageUsers"
        component={ManageUsersScreen}
        options={{
          title: "Gestione Utenti",
          headerBackVisible: false,
          headerLeft: () => <BackButton fallbackRoute="Profile" />,
        }}
      />
      <Stack.Screen
        name="CreateIntervention"
        component={CreateInterventionScreen}
        options={{
          title: "Nuovo Intervento",
          headerBackVisible: false,
          headerLeft: () => <BackButton fallbackRoute="Profile" />,
        }}
      />
      <Stack.Screen
        name="CompanyAccount"
        component={CompanyAccountScreen}
        options={{
          title: "Account Ditta",
          headerBackVisible: false,
          headerLeft: () => <BackButton fallbackRoute="Profile" />,
        }}
      />
      <Stack.Screen
        name="CloseInterventions"
        component={CloseInterventionsScreen}
        options={{
          title: "Chiudi Interventi",
          headerBackVisible: false,
          headerLeft: () => <BackButton fallbackRoute="Profile" />,
        }}
      />
      <Stack.Screen
        name="ManageTechnicians"
        component={ManageTechniciansScreen}
        options={{
          title: "Gestione Tecnici",
          headerBackVisible: false,
          headerLeft: () => <BackButton fallbackRoute="Profile" />,
        }}
      />
    </Stack.Navigator>
  );
}
