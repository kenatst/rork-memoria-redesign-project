import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Platform, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Cloud, CloudUpload, CloudDownload, HardDrive, Wifi, WifiOff, CheckCircle, AlertCircle, Clock, Settings } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useToast } from '@/providers/ToastProvider';
import { useAppState } from '@/providers/AppStateProvider';
import Colors from '@/constants/colors';
import ProgressToast from '@/components/ProgressToast';

interface BackupSettings {
  autoBackup: boolean;
  wifiOnly: boolean;
  includeVideos: boolean;
  compressionLevel: 'none' | 'low' | 'medium' | 'high';
  backupFrequency: 'realtime' | 'daily' | 'weekly';
}

interface BackupStatus {
  lastBackup?: Date;
  totalFiles: number;
  backedUpFiles: number;
  pendingFiles: number;
  storageUsed: number;
  storageLimit: number;
  isBackingUp: boolean;
  progress: number;
}

export default function BackupCloudScreen() {
  const router = useRouter();
  const { showError, showSuccess } = useToast();
  const { photos, albums } = useAppState();

  const [settings, setSettings] = useState<BackupSettings>({
    autoBackup: true,
    wifiOnly: true,
    includeVideos: false,
    compressionLevel: 'medium',
    backupFrequency: 'daily'
  });

  const [status, setStatus] = useState<BackupStatus>({
    lastBackup: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    totalFiles: photos.length + albums.length,
    backedUpFiles: Math.floor((photos.length + albums.length) * 0.85),
    pendingFiles: Math.ceil((photos.length + albums.length) * 0.15),
    storageUsed: 2.4, // GB
    storageLimit: 15, // GB
    isBackingUp: false,
    progress: 0
  });

  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    // Simulate network status check
    const checkConnection = () => {
      setIsConnected(Math.random() > 0.1); // 90% chance of being connected
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleBack = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  }, [router]);

  const updateSetting = useCallback((key: keyof BackupSettings, value: any) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setSettings(prev => ({ ...prev, [key]: value }));
    showSuccess('Paramètre mis à jour', `${key} modifié avec succès`);
  }, [showSuccess]);

  const startBackup = useCallback(async () => {
    if (!isConnected) {
      showError('Pas de connexion', 'Vérifiez votre connexion internet');
      return;
    }

    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setStatus(prev => ({ ...prev, isBackingUp: true, progress: 0 }));

    // Simulate backup progress
    const totalSteps = 100;
    for (let i = 0; i <= totalSteps; i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      setStatus(prev => ({ ...prev, progress: i / totalSteps }));
    }

    // Update status after backup
    setStatus(prev => ({
      ...prev,
      isBackingUp: false,
      progress: 0,
      lastBackup: new Date(),
      backedUpFiles: prev.totalFiles,
      pendingFiles: 0,
      storageUsed: prev.storageUsed + 0.1
    }));

    showSuccess('Sauvegarde terminée', 'Tous vos fichiers sont maintenant sauvegardés');
  }, [isConnected, showError, showSuccess]);

  const restoreFromBackup = useCallback(async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    Alert.alert(
      'Restaurer la sauvegarde',
      'Cette action remplacera vos données locales par celles de la sauvegarde cloud. Continuer ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Restaurer',
          style: 'destructive',
          onPress: async () => {
            setStatus(prev => ({ ...prev, isBackingUp: true, progress: 0 }));
            
            // Simulate restore progress
            for (let i = 0; i <= 100; i++) {
              await new Promise(resolve => setTimeout(resolve, 30));
              setStatus(prev => ({ ...prev, progress: i / 100 }));
            }
            
            setStatus(prev => ({ ...prev, isBackingUp: false, progress: 0 }));
            showSuccess('Restauration terminée', 'Vos données ont été restaurées');
          }
        }
      ]
    );
  }, [showSuccess]);

  const formatFileSize = (sizeInGB: number): string => {
    if (sizeInGB < 1) {
      return `${Math.round(sizeInGB * 1000)} MB`;
    }
    return `${sizeInGB.toFixed(1)} GB`;
  };

  const formatLastBackup = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Il y a moins d\'une heure';
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  };

  const getStatusColor = (): string => {
    if (!isConnected) return '#FF4444';
    if (status.pendingFiles > 0) return Colors.palette.accentGold;
    return '#2ECC71';
  };

  const getStatusText = (): string => {
    if (!isConnected) return 'Hors ligne';
    if (status.isBackingUp) return 'Sauvegarde en cours...';
    if (status.pendingFiles > 0) return `${status.pendingFiles} fichiers en attente`;
    return 'Tout est sauvegardé';
  };

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#000000', '#0B0B0D', '#131417']} 
        style={StyleSheet.absoluteFillObject} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable 
            style={styles.backButton}
            onPress={handleBack}
            accessibilityLabel="Retour"
            accessibilityRole="button"
            testID="back-button"
          >
            <ArrowLeft size={24} color={Colors.palette.taupeDeep} />
          </Pressable>
          
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Sauvegarde Cloud</Text>
            <Text style={styles.headerSubtitle}>
              Protégez vos souvenirs automatiquement
            </Text>
          </View>
          
          <View style={styles.headerIcon}>
            <Cloud size={24} color={Colors.palette.accentGold} />
          </View>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Status Card */}
          <View style={styles.statusCard}>
            <LinearGradient
              colors={['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
              style={styles.statusCardGradient}
            >
              <View style={styles.statusHeader}>
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]}>
                  {isConnected ? (
                    status.pendingFiles === 0 ? (
                      <CheckCircle size={16} color="#FFFFFF" />
                    ) : (
                      <Clock size={16} color="#FFFFFF" />
                    )
                  ) : (
                    <WifiOff size={16} color="#FFFFFF" />
                  )}
                </View>
                <View style={styles.statusInfo}>
                  <Text style={styles.statusTitle}>{getStatusText()}</Text>
                  {status.lastBackup && (
                    <Text style={styles.statusSubtitle}>
                      Dernière sauvegarde: {formatLastBackup(status.lastBackup)}
                    </Text>
                  )}
                </View>
                <View style={styles.connectionStatus}>
                  {isConnected ? (
                    <Wifi size={20} color="#2ECC71" />
                  ) : (
                    <WifiOff size={20} color="#FF4444" />
                  )}
                </View>
              </View>

              <View style={styles.statusStats}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{status.backedUpFiles}</Text>
                  <Text style={styles.statLabel}>Sauvegardés</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{status.pendingFiles}</Text>
                  <Text style={styles.statLabel}>En attente</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{formatFileSize(status.storageUsed)}</Text>
                  <Text style={styles.statLabel}>Utilisé</Text>
                </View>
              </View>

              {/* Storage Progress */}
              <View style={styles.storageProgress}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${(status.storageUsed / status.storageLimit) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.storageText}>
                  {formatFileSize(status.storageUsed)} / {formatFileSize(status.storageLimit)}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Actions rapides</Text>
            
            <View style={styles.actionsGrid}>
              <Pressable 
                style={[styles.actionCard, !isConnected && styles.actionCardDisabled]}
                onPress={startBackup}
                disabled={!isConnected || status.isBackingUp}
                testID="start-backup"
              >
                <View style={styles.actionIcon}>
                  <CloudUpload size={24} color={!isConnected ? Colors.palette.taupe : '#2ECC71'} />
                </View>
                <Text style={[styles.actionTitle, !isConnected && styles.actionTitleDisabled]}>
                  Sauvegarder maintenant
                </Text>
                <Text style={[styles.actionDescription, !isConnected && styles.actionDescriptionDisabled]}>
                  Lancer une sauvegarde manuelle
                </Text>
              </Pressable>

              <Pressable 
                style={[styles.actionCard, !isConnected && styles.actionCardDisabled]}
                onPress={restoreFromBackup}
                disabled={!isConnected}
                testID="restore-backup"
              >
                <View style={styles.actionIcon}>
                  <CloudDownload size={24} color={!isConnected ? Colors.palette.taupe : '#3498DB'} />
                </View>
                <Text style={[styles.actionTitle, !isConnected && styles.actionTitleDisabled]}>
                  Restaurer
                </Text>
                <Text style={[styles.actionDescription, !isConnected && styles.actionDescriptionDisabled]}>
                  Récupérer depuis le cloud
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paramètres de sauvegarde</Text>
            
            <View style={styles.settingsCard}>
              <LinearGradient
                colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={styles.settingsCardGradient}
              >
                {/* Auto Backup */}
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Sauvegarde automatique</Text>
                    <Text style={styles.settingDescription}>
                      Sauvegarder automatiquement les nouvelles photos
                    </Text>
                  </View>
                  <Switch
                    value={settings.autoBackup}
                    onValueChange={(value) => updateSetting('autoBackup', value)}
                    trackColor={{ false: '#767577', true: Colors.palette.accentGold }}
                    thumbColor={settings.autoBackup ? '#FFFFFF' : '#f4f3f4'}
                    testID="auto-backup-switch"
                  />
                </View>

                {/* WiFi Only */}
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>WiFi uniquement</Text>
                    <Text style={styles.settingDescription}>
                      Sauvegarder seulement en WiFi
                    </Text>
                  </View>
                  <Switch
                    value={settings.wifiOnly}
                    onValueChange={(value) => updateSetting('wifiOnly', value)}
                    trackColor={{ false: '#767577', true: Colors.palette.accentGold }}
                    thumbColor={settings.wifiOnly ? '#FFFFFF' : '#f4f3f4'}
                    testID="wifi-only-switch"
                  />
                </View>

                {/* Include Videos */}
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Inclure les vidéos</Text>
                    <Text style={styles.settingDescription}>
                      Sauvegarder aussi les fichiers vidéo
                    </Text>
                  </View>
                  <Switch
                    value={settings.includeVideos}
                    onValueChange={(value) => updateSetting('includeVideos', value)}
                    trackColor={{ false: '#767577', true: Colors.palette.accentGold }}
                    thumbColor={settings.includeVideos ? '#FFFFFF' : '#f4f3f4'}
                    testID="include-videos-switch"
                  />
                </View>

                {/* Compression Level */}
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Compression</Text>
                    <Text style={styles.settingDescription}>
                      Niveau: {settings.compressionLevel}
                    </Text>
                  </View>
                  <Pressable 
                    style={styles.settingButton}
                    onPress={() => {
                      const levels: BackupSettings['compressionLevel'][] = ['none', 'low', 'medium', 'high'];
                      const currentIndex = levels.indexOf(settings.compressionLevel);
                      const nextLevel = levels[(currentIndex + 1) % levels.length];
                      updateSetting('compressionLevel', nextLevel);
                    }}
                    testID="compression-level"
                  >
                    <Settings size={16} color={Colors.palette.accentGold} />
                  </Pressable>
                </View>

                {/* Backup Frequency */}
                <View style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingTitle}>Fréquence</Text>
                    <Text style={styles.settingDescription}>
                      {settings.backupFrequency === 'realtime' ? 'Temps réel' : 
                       settings.backupFrequency === 'daily' ? 'Quotidienne' : 'Hebdomadaire'}
                    </Text>
                  </View>
                  <Pressable 
                    style={styles.settingButton}
                    onPress={() => {
                      const frequencies: BackupSettings['backupFrequency'][] = ['realtime', 'daily', 'weekly'];
                      const currentIndex = frequencies.indexOf(settings.backupFrequency);
                      const nextFreq = frequencies[(currentIndex + 1) % frequencies.length];
                      updateSetting('backupFrequency', nextFreq);
                    }}
                    testID="backup-frequency"
                  >
                    <Clock size={16} color={Colors.palette.accentGold} />
                  </Pressable>
                </View>
              </LinearGradient>
            </View>
          </View>

          {/* Storage Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stockage cloud</Text>
            
            <View style={styles.storageCard}>
              <LinearGradient
                colors={['rgba(255,215,0,0.1)', 'rgba(255,215,0,0.05)']}
                style={styles.storageCardGradient}
              >
                <View style={styles.storageHeader}>
                  <HardDrive size={24} color={Colors.palette.accentGold} />
                  <Text style={styles.storageTitle}>Plan gratuit</Text>
                </View>
                
                <View style={styles.storageDetails}>
                  <Text style={styles.storageUsage}>
                    {formatFileSize(status.storageUsed)} utilisés sur {formatFileSize(status.storageLimit)}
                  </Text>
                  <Text style={styles.storageRemaining}>
                    {formatFileSize(status.storageLimit - status.storageUsed)} restants
                  </Text>
                </View>

                <Pressable style={styles.upgradeButton} testID="upgrade-storage">
                  <LinearGradient
                    colors={[Colors.palette.accentGold, '#E6B800']}
                    style={styles.upgradeButtonGradient}
                  >
                    <Text style={styles.upgradeButtonText}>Augmenter le stockage</Text>
                  </LinearGradient>
                </Pressable>
              </LinearGradient>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
      
      <ProgressToast 
        visible={status.isBackingUp} 
        label={status.isBackingUp ? "Sauvegarde en cours..." : "Restauration en cours..."} 
        progress={status.progress} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: Colors.palette.taupe,
    fontSize: 14,
    marginTop: 2,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  statusCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  statusCardGradient: {
    padding: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '700',
  },
  statusSubtitle: {
    color: Colors.palette.taupe,
    fontSize: 12,
    marginTop: 2,
  },
  connectionStatus: {
    padding: 4,
  },
  statusStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    color: Colors.palette.taupe,
    fontSize: 12,
    marginTop: 4,
  },
  storageProgress: {
    gap: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.palette.accentGold,
    borderRadius: 3,
  },
  storageText: {
    color: Colors.palette.taupe,
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  actionTitleDisabled: {
    color: Colors.palette.taupe,
  },
  actionDescription: {
    color: Colors.palette.taupe,
    fontSize: 12,
    textAlign: 'center',
  },
  actionDescriptionDisabled: {
    opacity: 0.6,
  },
  settingsCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  settingsCardGradient: {
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '600',
  },
  settingDescription: {
    color: Colors.palette.taupe,
    fontSize: 12,
    marginTop: 2,
  },
  settingButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  storageCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  storageCardGradient: {
    padding: 20,
  },
  storageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  storageTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '700',
  },
  storageDetails: {
    marginBottom: 16,
  },
  storageUsage: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  storageRemaining: {
    color: Colors.palette.taupe,
    fontSize: 14,
    marginTop: 4,
  },
  upgradeButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  upgradeButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
});