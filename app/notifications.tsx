import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { X, Bell, Zap, Users, QrCode, MapPin, Heart, MessageCircle, Camera, Shield, Globe } from 'lucide-react-native';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

interface Notification {
  id: string;
  type: 'event_join' | 'photo_upload' | 'ai_moderation' | 'geofencing' | 'social' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  data?: any;
  priority: 'low' | 'medium' | 'high';
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [slideAnim] = useState(new Animated.Value(300));
  const [bellAnimations] = useState(() => 
    Array.from({ length: 8 }, () => new Animated.Value(0))
  );
  const [notificationAnimations] = useState(() => 
    Array.from({ length: 10 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      translateX: new Animated.Value(100),
    }))
  );

  useEffect(() => {
    loadNotifications();
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Main animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Bell particle animations
    bellAnimations.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000 + index * 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 2000 + index * 300,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // Notification card animations
    notificationAnimations.forEach((animSet, index) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(animSet.scale, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
          Animated.timing(animSet.opacity, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.spring(animSet.translateX, {
            toValue: 0,
            tension: 80,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }, index * 100);
    });
  };

  const loadNotifications = () => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'event_join',
        title: 'Nouvel événement rejoint',
        message: 'Vous avez rejoint "Soirée Électro Underground" avec succès. 247 personnes participent déjà!',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        isRead: false,
        priority: 'high',
        data: { eventId: '1', participants: 247 }
      },
      {
        id: '2',
        type: 'ai_moderation',
        title: 'IA Modération Active',
        message: 'Notre IA a analysé et approuvé 15 nouvelles photos pour votre événement. Aucun contenu inapproprié détecté.',
        timestamp: new Date(Date.now() - 15 * 60 * 1000),
        isRead: false,
        priority: 'medium',
        data: { photosApproved: 15, photosRejected: 0 }
      },
      {
        id: '3',
        type: 'geofencing',
        title: 'Géofencing Activé',
        message: 'Vous êtes maintenant dans la zone de l\'événement "Mariage Royal". Vous pouvez commencer à capturer des souvenirs!',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        isRead: true,
        priority: 'high',
        data: { eventName: 'Mariage Royal', distance: 50 }
      },
      {
        id: '4',
        type: 'photo_upload',
        title: 'Photos synchronisées',
        message: '23 nouvelles photos ont été ajoutées à votre album "Festival Tech 2024". Mode hors-ligne synchronisé avec succès.',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        isRead: true,
        priority: 'medium',
        data: { photoCount: 23, albumName: 'Festival Tech 2024' }
      },
      {
        id: '5',
        type: 'social',
        title: 'Partage Instagram réussi',
        message: 'Votre story avec filtres AR a été partagée sur Instagram. 156 vues en 10 minutes!',
        timestamp: new Date(Date.now() - 60 * 60 * 1000),
        isRead: true,
        priority: 'low',
        data: { platform: 'instagram', views: 156 }
      },
      {
        id: '6',
        type: 'system',
        title: 'Mise à jour disponible',
        message: 'Nouvelle version avec filtres AR améliorés et géofencing plus précis. Mise à jour recommandée.',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        isRead: true,
        priority: 'medium',
        data: { version: '2.1.0', features: ['AR filters', 'Better geofencing'] }
      },
    ];
    setNotifications(mockNotifications);
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'event_join': return Users;
      case 'photo_upload': return Camera;
      case 'ai_moderation': return Shield;
      case 'geofencing': return MapPin;
      case 'social': return Heart;
      case 'system': return Zap;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: Notification['type'], priority: Notification['priority']) => {
    if (priority === 'high') return '#FF4444';
    if (priority === 'medium') return Colors.palette.accentGold;
    
    switch (type) {
      case 'event_join': return '#2ECC71';
      case 'photo_upload': return '#3498DB';
      case 'ai_moderation': return '#9B59B6';
      case 'geofencing': return '#E67E22';
      case 'social': return '#E91E63';
      case 'system': return Colors.palette.accentGold;
      default: return Colors.palette.taupe;
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (Platform.OS !== 'web') {
      await Haptics.selectionAsync();
    }
    
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId && !notif.isRead
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  const markAllAsRead = async () => {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const formatTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    return `Il y a ${days}j`;
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0B0B0D', '#131417']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Bell particles */}
      {bellAnimations.map((anim, index) => (
        <Animated.View
          key={index}
          style={[
            styles.bellParticle,
            {
              left: `${(index * 12.5) % 100}%`,
              top: `${(index * 15) % 100}%`,
              opacity: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.4],
              }),
              transform: [
                {
                  scale: anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0.5, 1.2, 0.5],
                  }),
                },
                {
                  rotate: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <Bell size={16} color={Colors.palette.accentGold} />
        </Animated.View>
      ))}

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Notifications</Text>
            <Text style={styles.subtitle}>
              {unreadCount > 0 ? `${unreadCount} non lues` : 'Toutes lues'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <Pressable style={styles.markAllButton} onPress={markAllAsRead}>
                <Text style={styles.markAllText}>Tout lire</Text>
              </Pressable>
            )}
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
        </View>

        {/* Notifications List */}
        <Animated.View style={[styles.listContainer, { transform: [{ translateY: slideAnim }] }]}>
          <ScrollView 
            style={styles.notificationsList} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.notificationsContent}
          >
            {notifications.map((notification, index) => {
              const IconComponent = getNotificationIcon(notification.type);
              const iconColor = getNotificationColor(notification.type, notification.priority);
              const animSet = notificationAnimations[index % notificationAnimations.length];
              
              return (
                <Animated.View
                  key={notification.id}
                  style={[
                    styles.notificationCard,
                    {
                      opacity: animSet.opacity,
                      transform: [
                        { scale: animSet.scale },
                        { translateX: animSet.translateX },
                      ],
                    },
                  ]}
                >
                  <Pressable
                    style={[styles.notificationPressable, !notification.isRead && styles.unreadNotification]}
                    onPress={() => {
                      if (!notification.isRead) {
                        markAsRead(notification.id);
                      }
                    }}
                  >
                    {Platform.OS !== 'web' ? (
                      <BlurView intensity={notification.isRead ? 5 : 15} style={styles.notificationBlur}>
                        <NotificationContent 
                          notification={notification}
                          IconComponent={IconComponent}
                          iconColor={iconColor}
                          formatTimeAgo={formatTimeAgo}
                        />
                      </BlurView>
                    ) : (
                      <View style={[styles.notificationBlur, styles.webBlur, !notification.isRead && styles.webBlurUnread]}>
                        <NotificationContent 
                          notification={notification}
                          IconComponent={IconComponent}
                          iconColor={iconColor}
                          formatTimeAgo={formatTimeAgo}
                        />
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

interface NotificationContentProps {
  notification: Notification;
  IconComponent: React.ComponentType<any>;
  iconColor: string;
  formatTimeAgo: (timestamp: Date) => string;
}

function NotificationContent({ notification, IconComponent, iconColor, formatTimeAgo }: NotificationContentProps) {
  return (
    <View style={styles.notificationContent}>
      <View style={styles.notificationLeft}>
        <View style={[styles.iconContainer, { backgroundColor: `${iconColor}20` }]}>
          <IconComponent size={24} color={iconColor} />
        </View>
        <View style={styles.notificationText}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Text style={styles.notificationMessage}>{notification.message}</Text>
          <Text style={styles.notificationTime}>{formatTimeAgo(notification.timestamp)}</Text>
        </View>
      </View>
      {!notification.isRead && <View style={styles.unreadDot} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  bellParticle: {
    position: 'absolute',
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  markAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.palette.taupeDeep,
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
  listContainer: {
    flex: 1,
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationsContent: {
    paddingBottom: 40,
  },
  notificationCard: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  notificationPressable: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  unreadNotification: {
    shadowColor: Colors.palette.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  notificationBlur: {
    padding: 16,
  },
  webBlurUnread: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  notificationLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationText: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.palette.taupeDeep,
  },
  notificationMessage: {
    fontSize: 14,
    color: Colors.palette.taupe,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: Colors.palette.taupe,
    opacity: 0.7,
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.palette.accentGold,
    marginTop: 4,
  },
});