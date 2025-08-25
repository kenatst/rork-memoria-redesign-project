import React, { useEffect, useCallback, useRef } from 'react';
import { useRouter, useSegments, useFocusEffect } from 'expo-router';
import { Platform, Animated, InteractionManager } from 'react-native';
import * as Haptics from 'expo-haptics';

interface NavigationOptimizerProps {
  children: React.ReactNode;
  enableHaptics?: boolean;
  enableTransitions?: boolean;
  preloadRoutes?: string[];
  onScreenFocus?: () => void;
  onScreenBlur?: () => void;
}

export const NavigationOptimizer: React.FC<NavigationOptimizerProps> = ({
  children,
  enableHaptics = true,
  enableTransitions = true,
  preloadRoutes = [],
  onScreenFocus,
  onScreenBlur
}) => {
  const router = useRouter();
  const segments = useSegments();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const isFirstRender = useRef(true);

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHaptics || Platform.OS === 'web') return;
    
    const hapticMap = {
      light: Haptics.ImpactFeedbackStyle.Light,
      medium: Haptics.ImpactFeedbackStyle.Medium,
      heavy: Haptics.ImpactFeedbackStyle.Heavy,
    };
    
    Haptics.impactAsync(hapticMap[type]);
  }, [enableHaptics]);

  const optimizedPush = useCallback((href: any, options?: any) => {
    triggerHaptic('light');
    return router.push(href, options);
  }, [router, triggerHaptic]);

  const optimizedReplace = useCallback((href: any, options?: any) => {
    triggerHaptic('medium');
    return router.replace(href, options);
  }, [router, triggerHaptic]);

  const optimizedBack = useCallback(() => {
    triggerHaptic('light');
    return router.back();
  }, [router, triggerHaptic]);

  // Précharger les routes importantes
  useEffect(() => {
    if (preloadRoutes.length > 0 && Platform.OS !== 'web') {
      preloadRoutes.forEach(route => {
        try {
          // Précharger la route (si supporté par Expo Router)
          // Note: prefetch n'est pas encore disponible dans Expo Router
          console.log(`Would preload route: ${route}`);
        } catch (error) {
          console.warn(`Failed to preload route ${route}:`, error);
        }
      });
    }
  }, [preloadRoutes, router]);

  // Optimiser les transitions selon la profondeur de navigation
  useEffect(() => {
    const depth = segments.length;
    
    // Ajuster les performances selon la profondeur
    if (depth > 3) {
      // Navigation profonde - optimiser la mémoire
      console.log('Deep navigation detected, optimizing memory usage');
    }
  }, [segments]);

  // Exposer les méthodes optimisées via le contexte si nécessaire
  React.useEffect(() => {
    // Remplacer les méthodes du router par les versions optimisées
    (router as any).optimizedPush = optimizedPush;
    (router as any).optimizedReplace = optimizedReplace;
    (router as any).optimizedBack = optimizedBack;
  }, [router, optimizedPush, optimizedReplace, optimizedBack]);

  // Animation d'entrée optimisée
  const animateIn = useCallback(() => {
    if (!enableTransitions) {
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      return;
    }

    InteractionManager.runAfterInteractions(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: isFirstRender.current ? 300 : 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }, [fadeAnim, scaleAnim, enableTransitions]);

  // Gestion du focus/blur de l'écran
  useFocusEffect(
    useCallback(() => {
      animateIn();
      onScreenFocus?.();
      
      if (isFirstRender.current) {
        isFirstRender.current = false;
      }

      return () => {
        onScreenBlur?.();
      };
    }, [animateIn, onScreenFocus, onScreenBlur])
  );

  if (enableTransitions) {
    return (
      <Animated.View 
        style={{ 
          flex: 1, 
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }}
      >
        {children}
      </Animated.View>
    );
  }

  return <>{children}</>;
};

// Hook pour les transitions de page
export const usePageTransition = (enabled = true) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  const animateIn = useCallback(() => {
    if (!enabled) {
      fadeAnim.setValue(1);
      translateY.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, translateY, enabled]);

  const animateOut = useCallback((callback?: () => void) => {
    if (!enabled) {
      callback?.();
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(callback);
  }, [fadeAnim, translateY, enabled]);

  const animatedStyle = {
    opacity: fadeAnim,
    transform: [{ translateY }]
  };

  return { animateIn, animateOut, animatedStyle };
};

export default NavigationOptimizer;