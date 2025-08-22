import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { X, Bell, Shield, Users, Camera, MapPin, Heart, Zap, Volume2, VolumeX } from 'lucide-react-native';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';
import { useNotifications } from '@/providers/NotificationsProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface NotificationSettings {
  enabled: boolean;
  sound: boolean;
  vibration: boolean;
  eventJoin: boolean;
  photoUpload: boolean;
  aiModeration: boolean;
  geofencing: boolean;
  social: boolean;
  system: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

const SETTINGS_KEY = 'notification_settings';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { permissionStatus, requestPermissions, scheduleLocalNotification } = useNotifications();
  const [settings, setSettings] = useState<NotificationSettings>({
    enabled: true,
    sound: true,
    vibration: true,
    eventJoin: true,
    photoUpload: true,
    aiModeration: true,
    geofencing: true,
    social: true,
    system: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00'
    }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  const handleToggle = async (key: keyof NotificationSettings, value: boolean) => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const handleCategoryToggle = async (category: string, value: boolean) => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    
    const newSettings = { ...settings, [category]: value };
    saveSettings(newSettings);
  };

  const sendTestNotification = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    if (permissionStatus !== 'granted') {
      const status = await requestPermissions();
      if (status !== 'granted') {
        alert('Permissions de notification requises pour envoyer un test');
        return;
      }
    }
    
    try {
      await scheduleLocalNotification(
        'Test de notification ✅',
        'Vos paramètres de notification fonctionnent correctement ! Memoria est prêt à vous tenir informé.',
        { test: true }
      );
      
      // Show success feedback
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      alert('Erreur lors de l\'envoi de la notification test');
    }
  };

  const getPermissionStatusText = () => {
    switch (permissionStatus) {
      case 'granted': return 'Autorisées';
      case 'denied': return 'Refusées';
      case 'undetermined': return 'Non définies';
      case 'unavailable': return 'Non disponibles (Web)';
      default: return 'Inconnues';
    }
  };

  const getPermissionStatusColor = () => {
    switch (permissionStatus) {
      case 'granted': return '#2ECC71';
      case 'denied': return '#FF4444';
      case 'undetermined': return Colors.palette.accentGold;
      case 'unavailable': return Colors.palette.taupe;
      default: return Colors.palette.taupe;
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0B0B0D', '#131417']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Paramètres Notifications</Text>
            <Text style={styles.subtitle}>Personnalisez vos alertes</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={() => router.back()}>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={20} style={styles.closeBlur}>
                <X color={Colors.palette.taupeDeep} size={24} />
              </BlurView>
            ) : (
              <View style={[styles.closeBlur, styles.webBlur]}>
                <X color={Colors.palette.taupeDeep} size={24} />
              </View>
            )}
          </Pressable>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Permission Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>État des permissions</Text>
            <View style={[styles.card, styles.permissionCard]}>
              <View style={styles.permissionInfo}>
                <Bell color={getPermissionStatusColor()} size={24} />
                <View style={styles.permissionText}>
                  <Text style={styles.permissionStatus}>{getPermissionStatusText()}</Text>
                  <Text style={styles.permissionDescription}>
                    {permissionStatus === 'granted' 
                      ? 'Les notifications sont autorisées'
                      : permissionStatus === 'denied'
                      ? 'Activez les notifications dans les paramètres système'
                      : permissionStatus === 'unavailable'
                      ? 'Les notifications ne sont pas disponibles sur le web'
                      : 'Permissions non définies'
                    }
                  </Text>
                </View>
              </View>
              {permissionStatus !== 'granted' && permissionStatus !== 'unavailable' && (
                <Pressable style={styles.requestButton} onPress={requestPermissions}>
                  <Text style={styles.requestButtonText}>Autoriser</Text>
                </Pressable>
              )}
            </View>
          </View>

          {/* Test Notification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test</Text>
            <Pressable 
              style={styles.testCard} 
              onPress={sendTestNotification}
              disabled={permissionStatus !== 'granted' && permissionStatus !== 'unavailable'}
            >
              <LinearGradient
                colors={[
                  permissionStatus === 'granted' || permissionStatus === 'unavailable' 
                    ? 'rgba(46, 204, 113, 0.1)' 
                    : 'rgba(255, 68, 68, 0.1)',
                  permissionStatus === 'granted' || permissionStatus === 'unavailable'
                    ? 'rgba(46, 204, 113, 0.05)'
                    : 'rgba(255, 68, 68, 0.05)'
                ]}
                style={styles.testCardGradient}
              >
                <Bell 
                  color={permissionStatus === 'granted' || permissionStatus === 'unavailable' ? '#2ECC71' : '#FF4444'} 
                  size={24} 
                />
                <View style={styles.testCardText}>
                  <Text style={[styles.testCardTitle, {
                    color: permissionStatus === 'granted' || permissionStatus === 'unavailable' ? '#2ECC71' : '#FF4444'
                  }]}>
                    {permissionStatus === 'granted' || permissionStatus === 'unavailable' 
                      ? 'Tester les notifications' 
                      : 'Permissions requises'
                    }
                  </Text>
                  <Text style={styles.testCardDescription}>
                    {permissionStatus === 'granted' 
                      ? 'Envoyer une notification de test pour vérifier vos paramètres'
                      : permissionStatus === 'unavailable'
                      ? 'Les notifications ne sont pas disponibles sur le web'
                      : 'Autorisez les notifications pour tester'
                    }
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          </View>

          {/* General Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Paramètres généraux</Text>
            <View style={styles.card}>
              <SettingRow
                icon={Bell}
                title="Notifications activées"
                description="Activer/désactiver toutes les notifications"
                value={settings.enabled}
                onToggle={(value) => handleToggle('enabled', value)}
                iconColor={Colors.palette.accentGold}
              />
              <SettingRow
                icon={settings.sound ? Volume2 : VolumeX}
                title="Son"
                description="Jouer un son lors des notifications"
                value={settings.sound}
                onToggle={(value) => handleToggle('sound', value)}
                iconColor={settings.sound ? '#3498DB' : Colors.palette.taupe}
                disabled={!settings.enabled}
              />
              <SettingRow
                icon={Zap}
                title="Vibration"
                description="Vibrer lors des notifications"
                value={settings.vibration}
                onToggle={(value) => handleToggle('vibration', value)}
                iconColor={Colors.palette.accentGold}
                disabled={!settings.enabled}
                isLast
              />
            </View>
          </View>

          {/* Notification Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Types de notifications</Text>
            <View style={styles.card}>
              <SettingRow
                icon={Users}
                title="Événements"
                description="Invitations et participations aux événements"
                value={settings.eventJoin}
                onToggle={(value) => handleCategoryToggle('eventJoin', value)}
                iconColor="#2ECC71"
                disabled={!settings.enabled}
              />
              <SettingRow
                icon={Camera}
                title="Photos"
                description="Nouvelles photos et synchronisation"
                value={settings.photoUpload}
                onToggle={(value) => handleCategoryToggle('photoUpload', value)}
                iconColor="#3498DB"
                disabled={!settings.enabled}
              />
              <SettingRow
                icon={Shield}
                title="Modération IA"
                description="Résultats de l'analyse automatique"
                value={settings.aiModeration}
                onToggle={(value) => handleCategoryToggle('aiModeration', value)}
                iconColor="#9B59B6"
                disabled={!settings.enabled}
              />
              <SettingRow
                icon={MapPin}
                title="Géolocalisation"
                description="Entrée/sortie de zones d'événements"
                value={settings.geofencing}
                onToggle={(value) => handleCategoryToggle('geofencing', value)}
                iconColor="#E67E22"
                disabled={!settings.enabled}
              />
              <SettingRow
                icon={Heart}
                title="Social"
                description="Likes, commentaires et partages"
                value={settings.social}
                onToggle={(value) => handleCategoryToggle('social', value)}
                iconColor="#E91E63"
                disabled={!settings.enabled}
              />
              <SettingRow
                icon={Zap}
                title="Système"
                description="Mises à jour et informations importantes"
                value={settings.system}
                onToggle={(value) => handleCategoryToggle('system', value)}
                iconColor={Colors.palette.accentGold}
                disabled={!settings.enabled}
                isLast
              />
            </View>
          </View>

          {/* Quiet Hours */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Heures silencieuses</Text>
            <View style={styles.card}>
              <SettingRow
                icon={VolumeX}
                title="Mode silencieux"
                description={`${settings.quietHours.start} - ${settings.quietHours.end}`}
                value={settings.quietHours.enabled}
                onToggle={(value) => {
                  const newSettings = {
                    ...settings,
                    quietHours: { ...settings.quietHours, enabled: value }
                  };
                  saveSettings(newSettings);
                }}
                iconColor={Colors.palette.taupe}
                disabled={!settings.enabled}
                isLast
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

interface SettingRowProps {
  icon: React.ComponentType<any>;
  title: string;
  description: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  iconColor: string;
  disabled?: boolean;
  isLast?: boolean;
}

function SettingRow({ icon: Icon, title, description, value, onToggle, iconColor, disabled = false, isLast = false }: SettingRowProps) {
  return (
    <View style={[styles.settingRow, isLast && styles.settingRowLast]}>
      <View style={styles.settingLeft}>
        <View style={[styles.settingIcon, { backgroundColor: `${iconColor}20` }]}>
          <Icon size={20} color={disabled ? Colors.palette.taupe : iconColor} />
        </View>
        <View style={styles.settingText}>
          <Text style={[styles.settingTitle, disabled && styles.settingDisabled]}>{title}</Text>
          <Text style={[styles.settingDescription, disabled && styles.settingDisabled]}>{description}</Text>
        </View>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: '#2A2D34', true: `${iconColor}40` }}
        thumbColor={value ? iconColor : Colors.palette.taupe}
        ios_backgroundColor="#2A2D34"
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.palette.taupeDeep,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.palette.taupe,
    marginTop: 4,
  },
  closeButton: {},
  closeBlur: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webBlur: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(20px)',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.palette.taupeDeep,
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#131417',
    borderRadius: 16,
    overflow: 'hidden',
  },
  permissionCard: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  permissionText: {
    flex: 1,
  },
  permissionStatus: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.palette.taupeDeep,
  },
  permissionDescription: {
    fontSize: 12,
    color: Colors.palette.taupe,
    marginTop: 2,
  },
  requestButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: Colors.palette.accentGold,
  },
  requestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  testCard: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  testCardGradient: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  testCardText: {
    flex: 1,
  },
  testCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2ECC71',
  },
  testCardDescription: {
    fontSize: 12,
    color: Colors.palette.taupe,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2D34',
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.palette.taupeDeep,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.palette.taupe,
    marginTop: 2,
  },
  settingDisabled: {
    opacity: 0.5,
  },
});