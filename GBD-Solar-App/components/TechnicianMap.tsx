import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, AnimatedRegion, Callout } from 'react-native-maps';
import ClusteredMapView from 'react-native-map-clustering';
import { Feather } from '@expo/vector-icons';
import { Colors, Spacing, BorderRadius } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';
import { User } from '../types';

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

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;

const ITALY_REGION = {
  latitude: 42.5,
  longitude: 12.5,
  latitudeDelta: 8,
  longitudeDelta: 8 * ASPECT_RATIO,
};

const isValidCoordinate = (lat: any, lng: any): boolean => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  
  if (isNaN(latitude) || isNaN(longitude)) return false;
  if (latitude < -90 || latitude > 90) return false;
  if (longitude < -180 || longitude > 180) return false;
  if (latitude === 0 && longitude === 0) return false;
  
  return true;
};

const TechnicianMarker = memo(({ 
  tech, 
  isOnline,
  onPress,
  theme 
}: { 
  tech: User; 
  isOnline: boolean;
  onPress: () => void;
  theme: any;
}) => {
  const lat = tech.lastLocation?.latitude;
  const lng = tech.lastLocation?.longitude;
  
  if (!isValidCoordinate(lat, lng)) return null;
  
  return (
    <Marker
      key={tech.id}
      identifier={tech.id}
      coordinate={{
        latitude: Number(lat),
        longitude: Number(lng),
      }}
      tracksViewChanges={false}
      onPress={onPress}
    >
      <View style={styles.markerContainer}>
        <View style={[
          styles.marker,
          { backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E' }
        ]}>
          <Feather name="user" size={14} color="#fff" />
        </View>
        <View style={[
          styles.markerDot,
          { backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E' }
        ]} />
      </View>
      <Callout tooltip onPress={onPress}>
        <View style={[styles.callout, { backgroundColor: theme.backgroundDefault }]}>
          <Text style={[styles.calloutTitle, { color: theme.text }]}>{tech.name}</Text>
          <Text style={[styles.calloutSubtitle, { color: theme.textSecondary }]}>
            {tech.companyName || 'Azienda'}
          </Text>
          <View style={styles.calloutStatus}>
            <View style={[
              styles.statusDot,
              { backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E' }
            ]} />
            <Text style={[styles.calloutStatusText, { color: theme.textSecondary }]}>
              {isOnline ? 'Online' : 'Offline'}
            </Text>
          </View>
        </View>
      </Callout>
    </Marker>
  );
});

TechnicianMarker.displayName = 'TechnicianMarker';

export function TechnicianMap({
  technicians,
  initialRegion,
  onMarkerPress,
  onCallTech,
  mapRef,
  onlineTechnicians,
  offlineTechnicians,
}: TechnicianMapProps) {
  const { theme } = useTheme();
  const [mapReady, setMapReady] = useState(false);
  const [region, setRegion] = useState(initialRegion || ITALY_REGION);
  
  const validTechnicians = useMemo(() => {
    return technicians.filter(tech => {
      if (!tech?.lastLocation) return false;
      return isValidCoordinate(tech.lastLocation.latitude, tech.lastLocation.longitude);
    });
  }, [technicians]);

  const onlineIds = useMemo(() => {
    return new Set(onlineTechnicians.map(t => t.id));
  }, [onlineTechnicians]);

  useEffect(() => {
    if (mapReady && mapRef.current && validTechnicians.length > 0) {
      const validCoords = validTechnicians
        .filter(t => t.lastLocation && isValidCoordinate(t.lastLocation.latitude, t.lastLocation.longitude))
        .map(t => ({
          latitude: Number(t.lastLocation!.latitude),
          longitude: Number(t.lastLocation!.longitude),
        }));
      
      if (validCoords.length > 0) {
        try {
          mapRef.current.fitToCoordinates(validCoords, {
            edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
            animated: true,
          });
        } catch (e) {
          console.warn('[TechnicianMap] fitToCoordinates error:', e);
        }
      }
    }
  }, [mapReady, validTechnicians]);

  const handleMapReady = useCallback(() => {
    setMapReady(true);
  }, []);

  const handleRegionChange = useCallback((newRegion: any) => {
    setRegion(newRegion);
  }, []);

  const renderCluster = useCallback((cluster: any) => {
    const { id, geometry, onPress, properties } = cluster;
    const points = properties.point_count;
    
    return (
      <Marker
        key={`cluster-${id}`}
        coordinate={{
          latitude: geometry.coordinates[1],
          longitude: geometry.coordinates[0],
        }}
        tracksViewChanges={false}
        onPress={onPress}
      >
        <View style={styles.clusterContainer}>
          <View style={[styles.cluster, { backgroundColor: Colors.primary }]}>
            <Text style={styles.clusterText}>{points}</Text>
          </View>
        </View>
      </Marker>
    );
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.webNotice, { backgroundColor: theme.primaryLight }]}>
        <Feather name="info" size={16} color={theme.primary} />
        <Text style={[styles.webNoticeText, { color: theme.primary }]}>
          La mappa interattiva e disponibile solo nell'app mobile. Qui puoi vedere la lista dei tecnici.
        </Text>
      </View>
    );
  }

  if (validTechnicians.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.backgroundDefault }]}>
        <Feather name="map-pin" size={48} color={theme.textTertiary} />
        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
          Nessun tecnico con posizione GPS disponibile
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ClusteredMapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        initialRegion={initialRegion || ITALY_REGION}
        onMapReady={handleMapReady}
        onRegionChangeComplete={handleRegionChange}
        showsUserLocation
        showsMyLocationButton
        showsCompass
        showsScale
        loadingEnabled
        loadingIndicatorColor={Colors.primary}
        moveOnMarkerPress={false}
        clusterColor={Colors.primary}
        clusterTextColor="#fff"
        clusterFontFamily="System"
        radius={50}
        extent={512}
        minZoom={1}
        maxZoom={16}
        minPoints={3}
        preserveClusterPressBehavior
        renderCluster={renderCluster}
        animationEnabled
        spiralEnabled
        spiderLineColor={Colors.primary}
      >
        {validTechnicians.map((tech) => (
          <TechnicianMarker
            key={tech.id}
            tech={tech}
            isOnline={onlineIds.has(tech.id)}
            onPress={() => onMarkerPress(tech)}
            theme={theme}
          />
        ))}
      </ClusteredMapView>

      <View style={[styles.legend, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Text style={[styles.legendText, { color: theme.text }]}>
              Online ({onlineTechnicians.length})
            </Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#9E9E9E' }]} />
            <Text style={[styles.legendText, { color: theme.text }]}>
              Offline ({offlineTechnicians.length})
            </Text>
          </View>
        </View>
      </View>

      <Pressable
        style={[styles.centerButton, { backgroundColor: theme.backgroundDefault }]}
        onPress={() => {
          if (mapRef.current && validTechnicians.length > 0) {
            const coords = validTechnicians
              .filter(t => t.lastLocation)
              .map(t => ({
                latitude: Number(t.lastLocation!.latitude),
                longitude: Number(t.lastLocation!.longitude),
              }));
            mapRef.current.fitToCoordinates(coords, {
              edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
              animated: true,
            });
          }
        }}
      >
        <Feather name="maximize" size={20} color={theme.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 300,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: -4,
    borderWidth: 1,
    borderColor: '#fff',
  },
  clusterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cluster: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  clusterText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  callout: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    minWidth: 150,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  calloutSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  calloutStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calloutStatusText: {
    fontSize: 12,
    marginLeft: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legend: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
    fontWeight: '500',
  },
  centerButton: {
    position: 'absolute',
    top: Spacing.md,
    right: Spacing.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emptyContainer: {
    height: 200,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.md,
  },
  webNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  webNoticeText: {
    fontSize: 14,
    marginLeft: Spacing.sm,
    flex: 1,
  },
});

export default TechnicianMap;
