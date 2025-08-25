import { useEffect, useMemo, useState, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useAppState } from '@/providers/AppStateProvider';
import * as Haptics from 'expo-haptics';

interface NotificationsContextValue {
  permissionStatus: Notifications.PermissionStatus | 'unavailable';
  requestPermissions: () => Promise<Notifications.PermissionStatus | 'unavailable'>;
  scheduleLocalNotification: (title: string, body: string, data?: Record<string, unknown>) => Promise<string | null>;
  schedulePushNotification: (title: string, body: string, delay?: number) => Promise<string | null>;
  lastNotification?: Notifications.Notification;
  sendPhotoLikeNotification: (photoId: string, albumName: string) => Promise<void>;
  sendCommentNotification: (photoId: string, albumName: string, comment: string) => Promise<void>;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  } as Notifications.NotificationBehavior),
});

export const [NotificationsProvider, useNotifications] = createContextHook<NotificationsContextValue>(() => {
  const { addNotification } = useAppState();
  const [permissionStatus, setPermissionStatus] = useState<Notifications.PermissionStatus | 'unavailable'>('unavailable');
  const [lastNotification, setLastNotification] = useState<Notifications.Notification | undefined>(undefined);

  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === 'web') {
          setPermissionStatus('unavailable');
          return;
        }
        const settings = await Notifications.getPermissionsAsync();
        setPermissionStatus(settings.status);
        if (settings.status !== 'granted') {
          const req = await Notifications.requestPermissionsAsync();
          setPermissionStatus(req.status);
        }
      } catch (e) {
        console.log('Notifications permission error', e);
        setPermissionStatus('unavailable');
      }
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      setLastNotification(notification);
      
      // Haptic feedback for notifications
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
      try {
        const content = notification.request.content;
        addNotification({
          type: 'photo_added',
          title: content.title ?? 'Notification',
          message: content.body ?? '',
          read: false,
          data: content.data,
        });
      } catch (e) {
        console.log('Add in-app notification failed', e);
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      console.log('Notification response', response);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [addNotification]);

  const requestPermissions = useCallback(async () => {
    if (Platform.OS === 'web') return 'unavailable' as const;
    try {
      const req = await Notifications.requestPermissionsAsync();
      setPermissionStatus(req.status);
      return req.status;
    } catch (e) {
      console.log('Request notifications permission failed', e);
      return 'unavailable' as const;
    }
  }, []);

  const scheduleLocalNotification = useCallback(async (title: string, body: string, data?: Record<string, unknown>) => {
    if (Platform.OS === 'web') {
      console.log('Local notifications are not available on web');
      return null;
    }
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: { title, body, data },
        trigger: null,
      });
      return id;
    } catch (e) {
      console.log('Schedule notification error', e);
      return null;
    }
  }, []);

  const schedulePushNotification = useCallback(async (title: string, body: string, delay: number = 0) => {
    if (Platform.OS === 'web') {
      // Web notification fallback
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/icon.png' });
      }
      return null;
    }
    
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          badge: 1,
        },
        trigger: delay > 0 ? null : null,
      });
      return id;
    } catch (e) {
      console.log('Schedule push notification error', e);
      return null;
    }
  }, []);

  const sendPhotoLikeNotification = useCallback(async (photoId: string, albumName: string) => {
    await schedulePushNotification(
      '❤️ Nouveau like !',
      `Votre photo dans "${albumName}" a reçu un like`,
      0
    );
  }, [schedulePushNotification]);

  const sendCommentNotification = useCallback(async (photoId: string, albumName: string, comment: string) => {
    const truncatedComment = comment.length > 50 ? comment.substring(0, 50) + '...' : comment;
    await schedulePushNotification(
      '💬 Nouveau commentaire !',
      `"${truncatedComment}" sur votre photo dans "${albumName}"`,
      0
    );
  }, [schedulePushNotification]);

  return useMemo(() => ({
    permissionStatus,
    requestPermissions,
    scheduleLocalNotification,
    schedulePushNotification,
    lastNotification,
    sendPhotoLikeNotification,
    sendCommentNotification,
  }), [permissionStatus, requestPermissions, scheduleLocalNotification, schedulePushNotification, lastNotification, sendPhotoLikeNotification, sendCommentNotification]);
});
