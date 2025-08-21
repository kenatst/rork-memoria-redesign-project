import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
import { Bell, BellOff, Heart, MessageCircle, Users, Camera, X, Check, Settings } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppState } from '@/providers/AppStateProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationSettings {
  enabled: boolean;
  types: {
    likes: boolean;
    comments: boolean;
    newPhotos: boolean;
    groupInvites: boolean;
    mentions: boolean;
  };
  schedule: {
    quietHours: {
      enabled: boolean;
      start: string; // "22:00"
      end: string;   // "08:00"
    };
    frequency: 'instant' | 'hourly' | 'daily' | 'weekly';
  };
}

interface NotificationCenterProps {
  isVisible: boolean;
  onClose: () => void;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  enabled: true,
  types: {
    likes: true,
    comments: true,
    newPhotos: true,
    groupInvites: true,
    mentions: true,
  },
  schedule: {
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
    frequency: 'instant',
  },
};

export function NotificationCenter({ isVisible, onClose }: NotificationCenterProps) {
  const { notifications, markNotificationRead, addNotification } = useAppState();
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('notification_settings');
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  const requestNotificationPermissions = async () => {
    if (Platform.OS === 'web') {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    }
    
    // For mobile, you would use expo-notifications here
    return true;
  };

  const toggleNotifications = async () => {
    if (!settings.enabled) {
      const hasPermission = await requestNotificationPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission requise',
          'Veuillez autoriser les notifications dans les paramètres de votre appareil.'
        );
        return;
      }
    }

    const newSettings = { ...settings, enabled: !settings.enabled };
    await saveSettings(newSettings);
  };

  const toggleNotificationType = async (type: keyof NotificationSettings['types']) => {
    const newSettings = {
      ...settings,
      types: {
        ...settings.types,
        [type]: !settings.types[type],
      },
    };
    await saveSettings(newSettings);
  };

  const updateFrequency = async (frequency: NotificationSettings['schedule']['frequency']) => {
    const newSettings = {
      ...settings,
      schedule: {
        ...settings.schedule,
        frequency,
      },
    };
    await saveSettings(newSettings);
  };

  const toggleQuietHours = async () => {
    const newSettings = {
      ...settings,
      schedule: {
        ...settings.schedule,
        quietHours: {
          ...settings.schedule.quietHours,
          enabled: !settings.schedule.quietHours.enabled,
        },
      },
    };
    await saveSettings(newSettings);
  };

  const markAllAsRead = useCallback(() => {
    notifications.forEach(notification => {
      if (!notification.read) {
        markNotificationRead(notification.id);
      }
    });
  }, [notifications, markNotificationRead]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return Heart;
      case 'comment':
        return MessageCircle;
      case 'photo_added':
        return Camera;
      case 'group_invite':
        return Users;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'like':
        return '#FF3B30';
      case 'comment':
        return '#007AFF';
      case 'photo_added':
        return '#34C759';
      case 'group_invite':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR');
  };

  const renderNotification = (notification: any) => {
    const Icon = getNotificationIcon(notification.type);
    const color = getNotificationColor(notification.type);

    return (
      <TouchableOpacity
        key={notification.id}
        style={[
          styles.notificationItem,
          !notification.read && styles.unreadNotification
        ]}
        onPress={() => markNotificationRead(notification.id)}
      >
        <View style={[styles.notificationIcon, { backgroundColor: color }]}>
          <Icon size={16} color="#FFFFFF" />
        </View>
        
        <View style={styles.notificationContent}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          <Text style={styles.notificationTime}>{formatTime(notification.createdAt)}</Text>
        </View>

        {!notification.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderSettings = () => (
    <View style={styles.settingsContainer}>
      <View style={styles.settingsHeader}>
        <TouchableOpacity onPress={() => setShowSettings(false)}>
          <X size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.settingsTitle}>Paramètres de notification</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.settingsContent}>
        {/* Master Toggle */}
        <View style={styles.settingSection}>
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Bell size={20} color="#FFD700" />
              <Text style={styles.settingLabel}>Notifications activées</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.toggle,
                settings.enabled && styles.toggleActive
              ]}
              onPress={toggleNotifications}
            >
              <View style={[
                styles.toggleThumb,
                settings.enabled && styles.toggleThumbActive
              ]} />
            </TouchableOpacity>
          </View>
        </View>

        {settings.enabled && (
          <>
            {/* Notification Types */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>Types de notifications</Text>
              
              {Object.entries(settings.types).map(([type, enabled]) => (
                <View key={type} style={styles.settingItem}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>
                      {getTypeDisplayName(type)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      enabled && styles.toggleActive
                    ]}
                    onPress={() => toggleNotificationType(type as keyof NotificationSettings['types'])}
                  >
                    <View style={[
                      styles.toggleThumb,
                      enabled && styles.toggleThumbActive
                    ]} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Frequency */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>Fréquence</Text>
              
              {(['instant', 'hourly', 'daily', 'weekly'] as const).map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.frequencyOption,
                    settings.schedule.frequency === freq && styles.frequencyOptionActive
                  ]}
                  onPress={() => updateFrequency(freq)}
                >
                  <Text style={[
                    styles.frequencyText,
                    settings.schedule.frequency === freq && styles.frequencyTextActive
                  ]}>
                    {getFrequencyDisplayName(freq)}
                  </Text>
                  {settings.schedule.frequency === freq && (
                    <Check size={16} color="#FFD700" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Quiet Hours */}
            <View style={styles.settingSection}>
              <Text style={styles.sectionTitle}>Heures silencieuses</Text>
              
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <BellOff size={20} color="#8E8E93" />
                  <Text style={styles.settingLabel}>
                    Mode silencieux ({settings.schedule.quietHours.start} - {settings.schedule.quietHours.end})
                  </Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggle,
                    settings.schedule.quietHours.enabled && styles.toggleActive
                  ]}
                  onPress={toggleQuietHours}
                >
                  <View style={[
                    styles.toggleThumb,
                    settings.schedule.quietHours.enabled && styles.toggleThumbActive
                  ]} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );

  const getTypeDisplayName = (type: string): string => {
    const names: Record<string, string> = {
      likes: 'J\'aime',
      comments: 'Commentaires',
      newPhotos: 'Nouvelles photos',
      groupInvites: 'Invitations de groupe',
      mentions: 'Mentions',
    };
    return names[type] || type;
  };

  const getFrequencyDisplayName = (freq: string): string => {
    const names: Record<string, string> = {
      instant: 'Instantané',
      hourly: 'Toutes les heures',
      daily: 'Quotidien',
      weekly: 'Hebdomadaire',
    };
    return names[freq] || freq;
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {Platform.OS !== 'web' ? (
        <BlurView intensity={95} style={styles.backdrop} />
      ) : (
        <View style={[styles.backdrop, styles.webBackdrop]} />
      )}

      <View style={styles.content}>
        {showSettings ? renderSettings() : (
          <>
            <View style={styles.header}>
              <TouchableOpacity onPress={onClose}>
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
              
              <Text style={styles.title}>Notifications</Text>
              
              <TouchableOpacity onPress={() => setShowSettings(true)}>
                <Settings size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <View style={styles.notificationStats}>
              <Text style={styles.statsText}>
                {notifications.filter(n => !n.read).length} non lues
              </Text>
              {notifications.some(n => !n.read) && (
                <TouchableOpacity onPress={markAllAsRead}>
                  <Text style={styles.markAllRead}>Tout marquer comme lu</Text>
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.notificationsList}>
              {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Bell size={48} color="#8E8E93" />
                  <Text style={styles.emptyTitle}>Aucune notification</Text>
                  <Text style={styles.emptyMessage}>
                    Vous recevrez ici les notifications de vos groupes et albums.
                  </Text>
                </View>
              ) : (
                notifications.map(renderNotification)
              )}
            </ScrollView>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  webBackdrop: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    backdropFilter: 'blur(20px)',
  },
  content: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  notificationStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  statsText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  markAllRead: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  notificationsList: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 12,
  },
  unreadNotification: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#6D6D70',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyMessage: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  settingsContainer: {
    flex: 1,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  settingsContent: {
    flex: 1,
  },
  settingSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#39393D',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: '#34C759',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  frequencyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    marginBottom: 8,
  },
  frequencyOptionActive: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  frequencyText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  frequencyTextActive: {
    color: '#FFD700',
    fontWeight: '600',
  },
});