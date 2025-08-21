import React, { useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { 
  Bell, 
  MessageCircle, 
  Heart, 
  ImagePlus, 
  Users, 
  X,
  Check,
  Trash2
} from 'lucide-react-native';
import { useAppState } from '@/providers/AppStateProvider';
import Colors from '@/constants/colors';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'comment':
      return MessageCircle;
    case 'like':
      return Heart;
    case 'photo_added':
      return ImagePlus;
    case 'group_invite':
      return Users;
    default:
      return Bell;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'comment':
      return '#2196F3';
    case 'like':
      return '#E91E63';
    case 'photo_added':
      return '#4CAF50';
    case 'group_invite':
      return '#FF9800';
    default:
      return Colors.palette.accentGold;
  }
};

interface NotificationsPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationsPanel({ visible, onClose }: NotificationsPanelProps) {
  const { notifications, markNotificationRead } = useAppState();

  const handleNotificationPress = useCallback((notificationId: string) => {
    markNotificationRead(notificationId);
  }, [markNotificationRead]);

  const markAllAsRead = useCallback(() => {
    notifications.forEach(notification => {
      if (!notification.read) {
        markNotificationRead(notification.id);
      }
    });
  }, [notifications, markNotificationRead]);

  const unreadCount = notifications.filter(n => !n.read).length;

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} />
      
      {/* Header */}
      <View style={styles.header}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={20} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Bell color="#FFD700" size={24} />
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <Pressable style={styles.markAllButton} onPress={markAllAsRead}>
                    <Check color={Colors.palette.taupe} size={16} />
                    <Text style={styles.markAllText}>Tout lire</Text>
                  </Pressable>
                )}
                <Pressable style={styles.closeButton} onPress={onClose}>
                  <X color="#FFFFFF" size={24} />
                </Pressable>
              </View>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.headerBlur, styles.webBlur]}>
            <View style={styles.headerContent}>
              <View style={styles.headerLeft}>
                <Bell color="#FFD700" size={24} />
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <View style={styles.headerActions}>
                {unreadCount > 0 && (
                  <Pressable style={styles.markAllButton} onPress={markAllAsRead}>
                    <Check color={Colors.palette.taupe} size={16} />
                    <Text style={styles.markAllText}>Tout lire</Text>
                  </Pressable>
                )}
                <Pressable style={styles.closeButton} onPress={onClose}>
                  <X color="#FFFFFF" size={24} />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Notifications List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Bell color={Colors.palette.taupe} size={48} />
            <Text style={styles.emptyTitle}>Aucune notification</Text>
            <Text style={styles.emptySubtitle}>
              Vous recevrez ici les notifications sur vos photos, commentaires et groupes
            </Text>
          </View>
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification) => {
              const IconComponent = getNotificationIcon(notification.type);
              const iconColor = getNotificationColor(notification.type);
              const isUnread = !notification.read;

              return (
                <Pressable
                  key={notification.id}
                  style={[styles.notificationItem, isUnread && styles.unreadNotification]}
                  onPress={() => handleNotificationPress(notification.id)}
                >
                  <LinearGradient
                    colors={isUnread ? ['#1a1a1a', '#2d2d2d'] : ['#0f0f0f', '#1a1a1a']}
                    style={styles.notificationGradient}
                  >
                    <View style={styles.notificationIcon}>
                      <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                        <IconComponent color={iconColor} size={20} />
                      </View>
                      {isUnread && <View style={styles.unreadDot} />}
                    </View>

                    <View style={styles.notificationContent}>
                      <Text style={[styles.notificationTitle, isUnread && styles.unreadText]}>
                        {notification.title}
                      </Text>
                      <Text style={styles.notificationMessage}>
                        {notification.message}
                      </Text>
                      <Text style={styles.notificationTime}>
                        {new Date(notification.createdAt).toLocaleString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>

                    {isUnread && (
                      <View style={styles.notificationActions}>
                        <Pressable
                          style={styles.actionButton}
                          onPress={() => handleNotificationPress(notification.id)}
                        >
                          <Check color={Colors.palette.accentGold} size={16} />
                        </Pressable>
                      </View>
                    )}
                  </LinearGradient>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      {notifications.length > 0 && (
        <View style={styles.quickActions}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={20} style={styles.quickActionsBlur}>
              <View style={styles.quickActionsContent}>
                <Pressable style={styles.quickAction} onPress={markAllAsRead}>
                  <Check color={Colors.palette.accentGold} size={20} />
                  <Text style={styles.quickActionText}>Marquer tout comme lu</Text>
                </Pressable>
                
                <View style={styles.quickActionSeparator} />
                
                <Pressable style={styles.quickAction}>
                  <Trash2 color="#FF4444" size={20} />
                  <Text style={[styles.quickActionText, { color: '#FF4444' }]}>Effacer tout</Text>
                </Pressable>
              </View>
            </BlurView>
          ) : (
            <View style={[styles.quickActionsBlur, styles.webBlur]}>
              <View style={styles.quickActionsContent}>
                <Pressable style={styles.quickAction} onPress={markAllAsRead}>
                  <Check color={Colors.palette.accentGold} size={20} />
                  <Text style={styles.quickActionText}>Marquer tout comme lu</Text>
                </Pressable>
                
                <View style={styles.quickActionSeparator} />
                
                <Pressable style={styles.quickAction}>
                  <Trash2 color="#FF4444" size={20} />
                  <Text style={[styles.quickActionText, { color: '#FF4444' }]}>Effacer tout</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  webBlur: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(20px)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  unreadBadge: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  markAllText: {
    color: Colors.palette.taupe,
    fontSize: 12,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.palette.taupe,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  notificationsList: {
    gap: 12,
    paddingBottom: 120,
  },
  notificationItem: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  unreadNotification: {
    shadowColor: Colors.palette.accentGold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  notificationGradient: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  notificationIcon: {
    position: 'relative',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4444',
    borderWidth: 2,
    borderColor: '#000000',
  },
  notificationContent: {
    flex: 1,
    gap: 4,
  },
  notificationTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '700',
  },
  unreadText: {
    color: '#FFFFFF',
  },
  notificationMessage: {
    color: Colors.palette.taupe,
    fontSize: 14,
    lineHeight: 18,
  },
  notificationTime: {
    color: Colors.palette.taupe,
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  notificationActions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  quickActionsBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  quickActionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  quickActionText: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionSeparator: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 16,
  },
});