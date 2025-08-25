import React, { useCallback } from 'react';
import { PanResponder, GestureResponderEvent, PanResponderGestureState, Platform, View } from 'react-native';
import * as Haptics from 'expo-haptics';

interface GestureHandlerProps {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  swipeThreshold?: number;
  velocityThreshold?: number;
  children: React.ReactNode;
}

export default function GestureHandler({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  onTap,
  onDoubleTap,
  swipeThreshold = 50,
  velocityThreshold = 0.5,
  children
}: GestureHandlerProps) {
  const handleHaptic = useCallback((style: 'light' | 'medium' | 'heavy' = 'light') => {
    if (Platform.OS !== 'web') {
      const hapticStyle = style === 'light' ? Haptics.ImpactFeedbackStyle.Light :
                         style === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy :
                         Haptics.ImpactFeedbackStyle.Medium;
      Haptics.impactAsync(hapticStyle);
    }
  }, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    
    onPanResponderGrant: (evt: GestureResponderEvent) => {
      const touches = (evt.nativeEvent as any).touches;
      if (touches && touches.length === 1 && onTap) {
        // Single tap detection
        setTimeout(() => {
          onTap();
          handleHaptic('light');
        }, 100);
      }
    },

    onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      const touches = (evt.nativeEvent as any).touches;
      
      // Pinch gesture detection
      if (touches && touches.length === 2 && onPinch) {
        const touch1 = touches[0];
        const touch2 = touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.pageX - touch1.pageX, 2) + 
          Math.pow(touch2.pageY - touch1.pageY, 2)
        );
        
        // Calculate scale based on distance change
        const scale = distance / 200; // Normalize distance
        onPinch(Math.max(0.5, Math.min(3, scale)));
      }
    },

    onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      const { dx, dy, vx, vy } = gestureState;
      
      // Double tap detection
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && onDoubleTap) {
        // This is a simple double tap detection - in production you'd want more sophisticated logic
        onDoubleTap();
        handleHaptic('medium');
        return;
      }

      // Swipe detection
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const absVx = Math.abs(vx);
      const absVy = Math.abs(vy);

      // Horizontal swipes
      if (absDx > absDy && (absDx > swipeThreshold || absVx > velocityThreshold)) {
        if (dx > 0 && onSwipeRight) {
          onSwipeRight();
          handleHaptic('light');
        } else if (dx < 0 && onSwipeLeft) {
          onSwipeLeft();
          handleHaptic('light');
        }
      }
      
      // Vertical swipes
      else if (absDy > absDx && (absDy > swipeThreshold || absVy > velocityThreshold)) {
        if (dy > 0 && onSwipeDown) {
          onSwipeDown();
          handleHaptic('light');
        } else if (dy < 0 && onSwipeUp) {
          onSwipeUp();
          handleHaptic('light');
        }
      }
    },
  });

  return (
    <View {...panResponder.panHandlers}>
      {children}
    </View>
  );
}