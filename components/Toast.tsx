import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, Text, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import * as Haptics from 'expo-haptics';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onDismiss?: () => void;
  visible: boolean;
}

export default function Toast({ type, title, message, duration = 4000, onDismiss, visible }: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(false);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (mountedRef.current) {
        setIsVisible(false);
        onDismiss?.();
      }
    });
  }, [translateY, opacity, scale, onDismiss]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (visible && !isVisible) {
      setIsVisible(true);
      
      // Haptic feedback
      if (Platform.OS !== 'web') {
        switch (type) {
          case 'success':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            break;
          case 'error':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            break;
          case 'warning':
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            break;
          default:
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }

      // Show animation
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      const timer = setTimeout(() => {
        if (mountedRef.current) hideToast();
      }, duration);

      return () => clearTimeout(timer);
    } else if (!visible && isVisible) {
      hideToast();
    }
  }, [visible, isVisible, type, duration, hideToast]);



  const getIcon = () => {
    switch (type) {
      case 'success':
        return CheckCircle;
      case 'error':
        return X;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      default:
        return Info;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          icon: '#2ECC71',
          background: 'rgba(46, 204, 113, 0.1)',
          border: 'rgba(46, 204, 113, 0.3)',
        };
      case 'error':
        return {
          icon: '#FF4444',
          background: 'rgba(255, 68, 68, 0.1)',
          border: 'rgba(255, 68, 68, 0.3)',
        };
      case 'warning':
        return {
          icon: Colors.palette.accentGold,
          background: `rgba(255, 215, 0, 0.1)`,
          border: `rgba(255, 215, 0, 0.3)`,
        };
      case 'info':
        return {
          icon: '#3498DB',
          background: 'rgba(52, 152, 219, 0.1)',
          border: 'rgba(52, 152, 219, 0.3)',
        };
      default:
        return {
          icon: Colors.palette.taupe,
          background: 'rgba(255, 255, 255, 0.1)',
          border: 'rgba(255, 255, 255, 0.2)',
        };
    }
  };

  const Icon = getIcon();
  const colors = getColors();

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    >
      {Platform.OS !== 'web' ? (
        <BlurView intensity={20} style={[styles.toast, { borderColor: colors.border }]}>
          <ToastContent
            Icon={Icon}
            iconColor={colors.icon}
            title={title}
            message={message}
            onDismiss={hideToast}
          />
        </BlurView>
      ) : (
        <View
          style={[
            styles.toast,
            styles.webBlur,
            {
              backgroundColor: colors.background,
              borderColor: colors.border,
            },
          ]}
        >
          <ToastContent
            Icon={Icon}
            iconColor={colors.icon}
            title={title}
            message={message}
            onDismiss={hideToast}
          />
        </View>
      )}
    </Animated.View>
  );
}

interface ToastContentProps {
  Icon: React.ComponentType<any>;
  iconColor: string;
  title: string;
  message?: string;
  onDismiss: () => void;
}

function ToastContent({ Icon, iconColor, title, message, onDismiss }: ToastContentProps) {
  return (
    <View style={styles.content}>
      <View style={styles.iconContainer}>
        <Icon size={20} color={iconColor} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        {message && <Text style={styles.message}>{message}</Text>}
      </View>
      <View style={styles.dismissContainer}>
        <Text style={styles.dismissButton} onPress={onDismiss}>
          ✕
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  toast: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  webBlur: {
    backdropFilter: 'blur(20px)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  iconContainer: {
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.palette.taupeDeep,
    lineHeight: 20,
  },
  message: {
    fontSize: 14,
    color: Colors.palette.taupe,
    marginTop: 4,
    lineHeight: 18,
  },
  dismissContainer: {
    marginTop: 2,
  },
  dismissButton: {
    fontSize: 16,
    color: Colors.palette.taupe,
    opacity: 0.7,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
});