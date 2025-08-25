import React, { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';

interface FadeInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

export function FadeIn({ children, duration = 300, delay = 0, style }: FadeInProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [fadeAnim, duration, delay]);

  return (
    <Animated.View style={[style, { opacity: fadeAnim }]}>
      {children}
    </Animated.View>
  );
}

interface SlideInProps {
  children: React.ReactNode;
  direction: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
}

export function SlideIn({ 
  children, 
  direction, 
  duration = 300, 
  delay = 0, 
  distance = 50,
  style 
}: SlideInProps) {
  const slideAnim = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [slideAnim, duration, delay]);

  const getTransform = () => {
    switch (direction) {
      case 'left':
        return [{ translateX: slideAnim }];
      case 'right':
        return [{ translateX: Animated.multiply(slideAnim, -1) }];
      case 'up':
        return [{ translateY: slideAnim }];
      case 'down':
        return [{ translateY: Animated.multiply(slideAnim, -1) }];
      default:
        return [{ translateX: slideAnim }];
    }
  };

  return (
    <Animated.View style={[style, { transform: getTransform() }]}>
      {children}
    </Animated.View>
  );
}

interface ScaleInProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  initialScale?: number;
  style?: ViewStyle;
}

export function ScaleIn({ 
  children, 
  duration = 300, 
  delay = 0, 
  initialScale = 0.8,
  style 
}: ScaleInProps) {
  const scaleAnim = useRef(new Animated.Value(initialScale)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [scaleAnim, delay]);

  return (
    <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
      {children}
    </Animated.View>
  );
}

interface PulseProps {
  children: React.ReactNode;
  duration?: number;
  minScale?: number;
  maxScale?: number;
  style?: ViewStyle;
}

export function Pulse({ 
  children, 
  duration = 1000, 
  minScale = 0.95, 
  maxScale = 1.05,
  style 
}: PulseProps) {
  const pulseAnim = useRef(new Animated.Value(minScale)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: maxScale,
          duration: duration / 2,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: minScale,
          duration: duration / 2,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulse.start();
    
    return () => pulse.stop();
  }, [pulseAnim, duration, minScale, maxScale]);

  return (
    <Animated.View style={[style, { transform: [{ scale: pulseAnim }] }]}>
      {children}
    </Animated.View>
  );
}

interface RotateProps {
  children: React.ReactNode;
  duration?: number;
  style?: ViewStyle;
}

export function Rotate({ children, duration = 2000, style }: RotateProps) {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      })
    );
    
    rotate.start();
    
    return () => rotate.stop();
  }, [rotateAnim, duration]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={[style, { transform: [{ rotate: spin }] }]}>
      {children}
    </Animated.View>
  );
}