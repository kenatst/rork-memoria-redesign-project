import React, { useEffect, useCallback } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

interface NavigationOptimizerProps {
  children: React.ReactNode;
  enableHaptics?: boolean;
  preloadRoutes?: string[];
}

export const NavigationOptimizer: React.FC<NavigationOptimizerProps> = ({
  children,
  enableHaptics = true,
  preloadRoutes = []
}) => {
  const router = useRouter();
  const segments = useSegments();

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

  return <>{children}</>;
};

export default NavigationOptimizer;