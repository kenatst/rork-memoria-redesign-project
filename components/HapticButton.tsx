import React, { useCallback } from 'react';
import { Pressable, PressableProps, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface HapticButtonProps extends PressableProps {
  hapticStyle?: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error';
  children: React.ReactNode;
}

export default function HapticButton({ 
  hapticStyle = 'light', 
  onPress, 
  children, 
  ...props 
}: HapticButtonProps) {
  const handlePress = useCallback((event: any) => {
    // Trigger haptic feedback
    if (Platform.OS !== 'web') {
      switch (hapticStyle) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'selection':
          Haptics.selectionAsync();
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    }
    
    // Call the original onPress handler
    if (onPress) {
      onPress(event);
    }
  }, [hapticStyle, onPress]);

  return (
    <Pressable onPress={handlePress} {...props}>
      {children}
    </Pressable>
  );
}