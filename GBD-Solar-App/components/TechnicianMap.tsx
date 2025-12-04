import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Feather } from '@expo/vector-icons';
import { api } from '../services/api';
import { Colors, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../store/AuthContext';

interface TechnicianLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  lastUpdate: string;
  status?: string;
}

interface Props {
  onTechnicianSelect?: (technicianId: string) => void;
}

const { width, height } = Dimensions.get('window');

const DEFAULT_REGION = {
  latitude: 41.9028,
  longitude: 12.4964,
  latitudeDelta: 5,
  longitudeDelta: 5,
};

// FUNZIONE CRITICA: Valida le coordinate per evitare crash
const isValidCoordinate = (lat: any, lng: any): boolean => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  
  if (isNaN(latitude) || isNaN(longitude)) {
    return false;
  }
  
  if (latitude < -90 || latitude > 90) {
    return false;
  }
  
  if (longitude < -180 || longitude > 180) {
    return false;
  }
  
  if (latitude === 0 && longitude === 0) {
    return false;
  }
  
  return true;
};

export default function TechnicianMap({ onTechnicianSelect }: Props) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<TechnicianLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [region, setRegion] = useState(DEFAULT_REGION);

  // CORREZIONE CRITICA: Normalizza il ruolo in MAIUSCOLO
  const userRole = user?.role?.toUpperCase();
  const canViewMap = userRole === 'MASTER' || userRole === 'DITTA';

  const loadTechnicianLocations = useCallback(async () => {
    if (!canViewMap) {
      setError('Accesso non autorizzato');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/users/technician-locations');
      
      if (response.data.success && Array.isArray(response.data.data)) {
        // CORREZIONE CRITICA: Filtra tecnici con coordinate invalide
        const validTechnicians = response.data.data
          .filter((tech: any) => {
            const hasValidCoords = isValidCoordinate(tech.latitude, tech.longitude);
            if (!hasValidCoords) {
              console.log(`[MAP] Skipping technician ${tech.name}: invalid coordinates`, tech.latitude, tech.longitude);
            }
            return hasValidCoords;
          })
          .map((tech: any) => ({
            id: tech.id,
            name: tech.name || 'Tecnico',
            latitude: parseFloat(tech.latitude),
            longitude: parseFloat(tech.longitude),
            lastUpdate: tech.lastUpdate || tech.updatedAt || new Date().toISOString(),
            status: tech.status,
          }));

        console.log(`[MAP] Valid technicians: ${validTechnicians.length}`);
        setTechnicians(validTechnicians);

        if (validTechnicians.length > 0) {
          const avgLat = validTechnicians.reduce((sum: number, t: TechnicianLocation) => sum + t.latitude, 0) / validTechnicians.length;
          const avgLng = validTechnicians.reduce((sum: number, t: TechnicianLocation) => sum + t.longitude, 0) / validTechnicians.length;
          
          if (isValidCoordinate(avgLat, avgLng)) {
            setRegion({
              latitude: avgLat,
              longitude: avgLng,
              latitudeDelta: 0.5,
              longitudeDelta: 0.5,
            });
          }
        }
      } else {
        setTechnicians([]);
      }
    } catch (err: any) {
      console.error('[MAP] Error loading locations:', err);
      setError(err.message || 'Errore nel caricamento delle posizioni');
      setTechnicians([]);
    } finally {
      setLoading(false);
    }
  }, [canViewMap]);

  useEffect(() => {
    loadTechnicianLocations();
  }, [loadTechnicianLocations]);

  if (!canViewMap) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Feather name="lock" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Solo MASTER e DITTA possono visualizzare la mappa
        </Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Caricamento posizioni...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={48} color="#F44336" />
        <Text style={[styles.errorText, { color: '#F44336' }]}>{error}</Text>
      </View>
    );
  }

  if (technicians.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, { backgroundColor: colors.background }]}>
        <Feather name="map-pin" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Nessun tecnico con posizione disponibile
        </Text>
      </View>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.webFallback, { backgroundColor: colors.card }]}>
          <Feather name="map" size={48} color={Colors.primary} />
          <Text style={[styles.webFallbackTitle, { color: colors.text }]}>
            Mappa Tecnici
          </Text>
          <Text style={[styles.webFallbackText, { color: colors.textSecondary }]}>
            La mappa e disponibile solo nell app mobile
          </Text>
          <View style={styles.technicianList}>
            {technicians.map((tech) => (
              <View key={tech.id} style={[styles.technicianItem, { backgroundColor: colors.background }]}>
                <Feather name="user" size={20} color={Colors.primary} />
                <View style={styles.technicianInfo}>
                  <Text style={[styles.technicianName, { color: colors.text }]}>{tech.name}</Text>
                  <Text style={[styles.technicianCoords, { color: colors.textSecondary }]}>
                    {tech.latitude.toFixed(4)}, {tech.longitude.toFixed(4)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton
      >
        {technicians.map((tech) => (
          <Marker
            key={tech.id}
            coordinate={{
              latitude: tech.latitude,
              longitude: tech.longitude,
            }}
            title={tech.name}
            description={`Ultimo aggiornamento: ${new Date(tech.lastUpdate).toLocaleString('it-IT')}`}
            onPress={() => onTechnicianSelect?.(tech.id)}
          >
            <View style={styles.markerContainer}>
              <View style={styles.marker}>
                <Feather name="user" size={16} color="#fff" />
              </View>
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={[styles.legend, { backgroundColor: colors.card }]}>
        <Text style={[styles.legendTitle, { color: colors.text }]}>
          Tecnici attivi: {technicians.length}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    backgroundColor: '#FF6B00',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
  },
  legend: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    padding: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    margin: 16,
    borderRadius: 16,
  },
  webFallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
  },
  webFallbackText: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  technicianList: {
    marginTop: 24,
    width: '100%',
  },
  technicianItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 4,
    borderRadius: 8,
  },
  technicianInfo: {
    marginLeft: 16,
  },
  technicianName: {
    fontSize: 16,
    fontWeight: '600',
  },
  technicianCoords: {
    fontSize: 14,
  },
});
