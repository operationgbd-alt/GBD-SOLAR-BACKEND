import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Spacing, BorderRadius } from '@/constants/theme';
import { Feather } from '@expo/vector-icons';
import { User } from '@/types';

interface TechnicianMapProps {
  technicians: User[];
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMarkerPress: (tech: User) => void;
  onCallTech: (phone?: string | null) => void;
  mapRef: React.RefObject<any>;
  onlineTechnicians: User[];
  offlineTechnicians: User[];
}

export function TechnicianMap({
  onlineTechnicians,
  offlineTechnicians,
}: TechnicianMapProps) {
  const { theme } = useTheme();

  return (
    <ThemedView style={{
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: Spacing.md,
      marginBottom: Spacing.md,
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      backgroundColor: theme.primaryLight,
    }}>
      <Feather name="info" size={16} color={theme.primary} />
      <ThemedText type="caption" style={{ color: theme.primary, marginLeft: Spacing.sm, flex: 1 }}>
        La mappa interattiva e disponibile solo nell'app mobile. Qui puoi vedere la lista dei tecnici.
      </ThemedText>
    </ThemedView>
  );
}
