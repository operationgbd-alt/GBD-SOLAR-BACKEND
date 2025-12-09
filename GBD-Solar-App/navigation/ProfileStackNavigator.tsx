import React from "react";
import { Pressable } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import ProfileScreen from "@/screens/ProfileScreen";
import { ManageCompaniesScreen } from "@/screens/ManageCompaniesScreen";
import { ManageUsersScreen } from "@/screens/ManageUsersScreen";
import { CreateInterventionScreen } from "@/screens/CreateInterventionScreen";
import { CompanyAccountScreen } from "@/screens/CompanyAccountScreen";
import { CloseInterventionsScreen } from "@/screens/CloseInterventionsScreen";
import { ManageTechniciansScreen } from "@/screens/ManageTechniciansScreen";
import { useTheme } from "@/hooks/useTheme";
import { getCommonScreenOptions } from "@/navigation/screenOptions";
import { Spacing } from "@/constants/theme";

export type ProfileStackParamList = {
  Profile: undefined;
  ManageCompanies: { origin?: 'Dashboard' | 'Profile' } | undefined;
  ManageUsers: { origin?: 'Dashboard' | 'Profile' } | undefined;
  CreateIntervention: { origin?: 'Dashboard' | 'Profile' } | undefined;
  CompanyAccount: { origin?: 'Dashboard' | 'Profile' } | undefined;
  CloseInterventions: { origin?: 'Dashboard' | 'Profile' } | undefined;
  ManageTechnicians: { origin?: 'Dashboard' | 'Profile' } | undefined;
};

function ContextAwareBackButton({ routeName }: { routeName: keyof ProfileStackParamList }) {
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ProfileStackParamList, typeof routeName>>();
  
  const origin = (route.params as any)?.origin;

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (origin === 'Dashboard') {
      const tabNav = navigation.getParent();
      if (tabNav) {
        tabNav.navigate('DashboardTab');
      }
    } else {
      navigation.navigate('Profile');
    }
  };

  return (
    <Pressable onPress={handleBack} style={{ padding: Spacing.xs, minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
      <Feather name="chevron-left" size={28} color={theme.text} />
    </Pressable>
  );
}

function ProfileBackButton() {
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
          headerLeft: () => <ProfileBackButton />,
        }}
      />
      <Stack.Screen
        name="ManageCompanies"
        component={ManageCompaniesScreen}
        options={{
          title: "Gestione Ditte",
          headerLeft: () => <ContextAwareBackButton routeName="ManageCompanies" />,
        }}
      />
      <Stack.Screen
        name="ManageUsers"
        component={ManageUsersScreen}
        options={{
          title: "Gestione Utenti",
          headerLeft: () => <ContextAwareBackButton routeName="ManageUsers" />,
        }}
      />
      <Stack.Screen
        name="CreateIntervention"
        component={CreateInterventionScreen}
        options={{
          title: "Nuovo Intervento",
          headerLeft: () => <ContextAwareBackButton routeName="CreateIntervention" />,
        }}
      />
      <Stack.Screen
        name="CompanyAccount"
        component={CompanyAccountScreen}
        options={{
          title: "Account Ditta",
          headerLeft: () => <ContextAwareBackButton routeName="CompanyAccount" />,
        }}
      />
      <Stack.Screen
        name="CloseInterventions"
        component={CloseInterventionsScreen}
        options={{
          title: "Chiudi Interventi",
          headerLeft: () => <ContextAwareBackButton routeName="CloseInterventions" />,
        }}
      />
      <Stack.Screen
        name="ManageTechnicians"
        component={ManageTechniciansScreen}
        options={{
          title: "Gestione Tecnici",
          headerLeft: () => <ContextAwareBackButton routeName="ManageTechnicians" />,
        }}
      />
    </Stack.Navigator>
  );
}
