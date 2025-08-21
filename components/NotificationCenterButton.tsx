import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Bell, X } from 'lucide-react-native';
import { useAppState } from '@/providers/AppStateProvider';
import Colors from '@/constants/colors';
import NotificationsPanel from '@/components/NotificationsPanel';

interface NotificationCenterButtonProps {
  style?: any;
}

export default function NotificationCenterButton({ style }: NotificationCenterButtonProps) {
  const { notifications } = useAppState();
  const [showPanel, setShowPanel] = useState<boolean>(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <Pressable 
        style={[styles.container, style]} 
        onPress={() => setShowPanel(true)}
        testID="notification-center-btn"
      >
        {Platform.OS !== 'web' ? (
          <BlurView intensity={20} style={styles.blur}>
            <View style={styles.content}>
              <Bell color={unreadCount > 0 ? '#FFD700' : Colors.palette.taupe} size={20} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </BlurView>
        ) : (
          <View style={[styles.blur, styles.webBlur]}>
            <View style={styles.content}>
              <Bell color={unreadCount > 0 ? '#FFD700' : Colors.palette.taupe} size={20} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Pressable>

      <Modal visible={showPanel} animationType="slide" onRequestClose={() => setShowPanel(false)}>
        <NotificationsPanel visible={showPanel} onClose={() => setShowPanel(false)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
  },
  blur: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webBlur: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(20px)',
  },
  content: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
});