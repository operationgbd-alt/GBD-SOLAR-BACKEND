import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Share,
} from 'react-native';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '../store/AuthContext';
import { useApp } from '../store/AppContext';
import { api } from '../services/api';
import { Colors, Spacing, Typography } from '../constants/theme';
import { useTheme } from '../hooks/useTheme';

interface RouteParams {
  interventionId: string;
}

export default function InterventionDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation<any>();
  const { interventionId } = route.params as RouteParams;
  const { user } = useAuth();
  const { refreshFromServer } = useApp();
  const { colors } = useTheme();
  
  const [intervention, setIntervention] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // CORREZIONE CRITICA: Normalizza il ruolo in MAIUSCOLO
  const userRole = user?.role?.toUpperCase();
  const isMaster = userRole === 'MASTER';
  const isDitta = userRole === 'DITTA';
  const isTecnico = userRole === 'TECNICO';
  const canDelete = isMaster;
  const canGeneratePdf = isMaster || isDitta;
  const canEditStatus = isMaster || isDitta || isTecnico;

  const loadIntervention = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[DETAIL] Loading intervention:', interventionId);
      const response: any = await api.get(`/interventions/${interventionId}`);
      console.log('[DETAIL] Response:', JSON.stringify(response));
      if (response.success) {
        setIntervention(response.data);
        console.log('[DETAIL] Intervention loaded successfully');
      } else {
        console.log('[DETAIL] Response not successful:', response);
      }
    } catch (error: any) {
      console.error('[DETAIL] Error loading intervention:', error);
      Alert.alert('Errore', 'Impossibile caricare i dettagli dell\'intervento');
    } finally {
      setLoading(false);
    }
  }, [interventionId]);

  useFocusEffect(
    useCallback(() => {
      loadIntervention();
    }, [loadIntervention])
  );

  const handleCall = (phone: string) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const handleEmail = (email: string) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    }
  };

  const handleNavigate = () => {
    if (intervention?.clientAddress) {
      const address = `${intervention.clientAddress} ${intervention.clientCivicNumber || ''}, ${intervention.clientCity || ''}`;
      const url = Platform.select({
        ios: `maps:?q=${encodeURIComponent(address)}`,
        android: `geo:0,0?q=${encodeURIComponent(address)}`,
      });
      if (url) Linking.openURL(url);
    }
  };

  const handleDelete = () => {
    if (!canDelete) {
      Alert.alert('Accesso Negato', 'Solo gli utenti MASTER possono eliminare gli interventi');
      return;
    }

    Alert.alert(
      'Conferma Eliminazione',
      `Sei sicuro di voler eliminare l'intervento ${intervention?.number}? Questa azione non può essere annullata.`,
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              setActionLoading('delete');
              const response: any = await api.delete(`/interventions/${interventionId}`);
              if (response.success) {
                Alert.alert('Successo', 'Intervento eliminato con successo');
                await refreshFromServer();
                navigation.goBack();
              } else {
                Alert.alert('Errore', response.error || 'Impossibile eliminare l\'intervento');
              }
            } catch (error: any) {
              console.error('Error deleting intervention:', error);
              const errorMessage = error.response?.data?.error || 'Errore durante l\'eliminazione';
              Alert.alert('Errore', errorMessage);
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleGeneratePdf = async () => {
    if (!canGeneratePdf) {
      Alert.alert('Accesso Negato', 'Solo MASTER e DITTA possono generare report PDF');
      return;
    }

    try {
      setGeneratingPdf(true);
      
      const pdfUrl = `${api.getBaseUrl()}/interventions/${interventionId}/pdf`;
      const filename = `Intervento_${intervention?.number || interventionId}.pdf`;
      
      if (Platform.OS === 'web') {
        const token = await api.getToken();
        const response = await fetch(pdfUrl, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error('Errore download PDF');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        Alert.alert('Successo', 'PDF scaricato con successo!');
      } else {
        const token = await api.getToken();
        const downloadResult = await (FileSystem as any).downloadAsync(
          pdfUrl,
          `${(FileSystem as any).documentDirectory}${filename}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        if (downloadResult.status === 200) {
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(downloadResult.uri, {
              mimeType: 'application/pdf',
              dialogTitle: 'Condividi Report PDF',
            });
          } else {
            Alert.alert('Successo', `PDF salvato: ${filename}`);
          }
        } else {
          Alert.alert('Errore', 'Impossibile scaricare il PDF');
        }
      }
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      Alert.alert('Errore', error.message || 'Errore durante la generazione del PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      setActionLoading('status');
      const response: any = await api.patch(`/interventions/${interventionId}/status`, {
        status: newStatus,
      });
      if (response.success) {
        await loadIntervention();
        await refreshFromServer();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      Alert.alert('Errore', 'Impossibile aggiornare lo stato');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assegnato': return '#FFA500';
      case 'appuntamento_fissato': return '#2196F3';
      case 'in_corso': return '#9C27B0';
      case 'completato': return '#4CAF50';
      case 'chiuso': return '#607D8B';
      default: return '#999';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assegnato': return 'Assegnato';
      case 'appuntamento_fissato': return 'Appuntamento Fissato';
      case 'in_corso': return 'In Corso';
      case 'completato': return 'Completato';
      case 'chiuso': return 'Chiuso';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return '#F44336';
      case 'media': return '#FF9800';
      case 'bassa': return '#4CAF50';
      default: return '#999';
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.backgroundDefault }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!intervention) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: colors.backgroundDefault }]}>
        <Feather name="alert-circle" size={48} color={colors.textSecondary} />
        <Text style={[styles.errorText, { color: colors.textSecondary }]}>
          Intervento non trovato
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.backgroundDefault }]}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={[styles.interventionNumber, { color: colors.text }]}>
            {intervention.number}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(intervention.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(intervention.status)}</Text>
          </View>
        </View>
        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(intervention.priority) }]}>
          <Text style={styles.priorityText}>
            {intervention.priority?.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cliente</Text>
        <Text style={[styles.clientName, { color: colors.text }]}>{intervention.clientName}</Text>
        
        <TouchableOpacity style={styles.infoRow} onPress={() => handleCall(intervention.clientPhone)}>
          <Feather name="phone" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>{intervention.clientPhone}</Text>
        </TouchableOpacity>

        {intervention.clientEmail ? (
          <TouchableOpacity style={styles.infoRow} onPress={() => handleEmail(intervention.clientEmail)}>
            <Feather name="mail" size={18} color={colors.primary} />
            <Text style={[styles.infoText, { color: colors.primary }]}>{intervention.clientEmail}</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={styles.infoRow} onPress={handleNavigate}>
          <Feather name="map-pin" size={18} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            {`${intervention.clientAddress} ${intervention.clientCivicNumber || ''}, ${intervention.clientCity || ''}`}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Dettagli Intervento</Text>
        <Text style={[styles.category, { color: colors.textSecondary }]}>
          Categoria: {intervention.category}
        </Text>
        {intervention.description ? (
          <Text style={[styles.description, { color: colors.text }]}>
            {intervention.description}
          </Text>
        ) : null}
      </View>

      {intervention.technician ? (
        <View style={[styles.section, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Tecnico Assegnato</Text>
          <Text style={[styles.technicianName, { color: colors.text }]}>
            {intervention.technician.name}
          </Text>
          {intervention.technician.phone ? (
            <TouchableOpacity 
              style={styles.infoRow} 
              onPress={() => handleCall(intervention.technician.phone)}
            >
              <Feather name="phone" size={18} color={colors.primary} />
              <Text style={[styles.infoText, { color: colors.primary }]}>
                {intervention.technician.phone}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <View style={styles.actionsContainer}>
        {canGeneratePdf ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.pdfButton]}
            onPress={handleGeneratePdf}
            disabled={generatingPdf}
          >
            {generatingPdf ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="file-text" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Genera PDF</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {canDelete ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
            disabled={actionLoading === 'delete'}
          >
            {actionLoading === 'delete' ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Feather name="trash-2" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Elimina</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    padding: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  interventionNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  infoText: {
    marginLeft: 8,
    fontSize: 16,
  },
  category: {
    fontSize: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
  },
  technicianName: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    gap: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  pdfButton: {
    backgroundColor: '#FF6B00',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
