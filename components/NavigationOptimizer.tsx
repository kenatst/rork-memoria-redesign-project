import React, { useEffect, useCallback, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Dimensions,
  Platform,
  Animated,
  InteractionManager,
} from 'react-native';
import { useRouter, useSegments, useFocusEffect } from 'expo-router';
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Grid,
  List,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useToast } from '@/providers/ToastProvider';

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

// Configuration pour la pagination
const PAGINATION_CONFIG = {
  itemsPerPage: 20,
  preloadPages: 2,
  maxCachedPages: 5,
  virtualizedThreshold: 50,
  batchSize: 10,
};

interface PaginationState<T> {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  error: string | null;
}

interface PaginatedListProps<T> {
  data: T[];
  renderItem: ({ item, index }: { item: T; index: number }) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  itemsPerPage?: number;
  onLoadMore?: (page: number) => Promise<T[]>;
  onRefresh?: () => Promise<void>;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  numColumns?: number;
  horizontal?: boolean;
  showPagination?: boolean;
  searchQuery?: string;
  filterFn?: (item: T, query: string) => boolean;
  sortFn?: (a: T, b: T) => number;
  style?: any;
  contentContainerStyle?: any;
  testID?: string;
}

// Hook pour la pagination intelligente
export const usePagination = <T,>(initialData: T[] = [], itemsPerPage = PAGINATION_CONFIG.itemsPerPage) => {
  const [state, setState] = useState<PaginationState<T>>({
    currentPage: 0,
    totalPages: Math.ceil(initialData.length / itemsPerPage),
    totalItems: initialData.length,
    items: initialData.slice(0, itemsPerPage),
    isLoading: false,
    hasMore: initialData.length > itemsPerPage,
    error: null,
  });

  const cache = useRef<Map<number, T[]>>(new Map());
  const dataRef = useRef(initialData);

  // Mettre à jour les données quand elles changent
  useEffect(() => {
    dataRef.current = initialData;
    const totalPages = Math.ceil(initialData.length / itemsPerPage);
    const currentPageItems = initialData.slice(
      state.currentPage * itemsPerPage,
      (state.currentPage + 1) * itemsPerPage
    );

    setState(prev => ({
      ...prev,
      totalPages,
      totalItems: initialData.length,
      items: currentPageItems,
      hasMore: (state.currentPage + 1) * itemsPerPage < initialData.length,
    }));

    // Nettoyer le cache si les données ont changé
    cache.current.clear();
  }, [initialData, itemsPerPage, state.currentPage]);

  const goToPage = useCallback((page: number) => {
    if (page < 0 || page >= state.totalPages || page === state.currentPage) return;

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    // Vérifier le cache d'abord
    const cachedItems = cache.current.get(page);
    if (cachedItems) {
      setState(prev => ({
        ...prev,
        currentPage: page,
        items: cachedItems,
        isLoading: false,
        hasMore: (page + 1) * itemsPerPage < prev.totalItems,
      }));
      return;
    }

    // Calculer les éléments pour cette page
    const startIndex = page * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, dataRef.current.length);
    const pageItems = dataRef.current.slice(startIndex, endIndex);

    // Mettre en cache
    cache.current.set(page, pageItems);

    // Nettoyer le cache si trop de pages sont mises en cache
    if (cache.current.size > PAGINATION_CONFIG.maxCachedPages) {
      const oldestKey = cache.current.keys().next().value;
      cache.current.delete(oldestKey);
    }

    setState(prev => ({
      ...prev,
      currentPage: page,
      items: pageItems,
      isLoading: false,
      hasMore: endIndex < prev.totalItems,
    }));

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [state.currentPage, state.totalPages, itemsPerPage]);

  const nextPage = useCallback(() => {
    goToPage(state.currentPage + 1);
  }, [goToPage, state.currentPage]);

  const prevPage = useCallback(() => {
    goToPage(state.currentPage - 1);
  }, [goToPage, state.currentPage]);

  const reset = useCallback(() => {
    cache.current.clear();
    setState({
      currentPage: 0,
      totalPages: Math.ceil(dataRef.current.length / itemsPerPage),
      totalItems: dataRef.current.length,
      items: dataRef.current.slice(0, itemsPerPage),
      isLoading: false,
      hasMore: dataRef.current.length > itemsPerPage,
      error: null,
    });
  }, [itemsPerPage]);

  return {
    ...state,
    goToPage,
    nextPage,
    prevPage,
    reset,
    canGoNext: state.currentPage < state.totalPages - 1,
    canGoPrev: state.currentPage > 0,
  };
};

// Composant de pagination avec contrôles
interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  showPageNumbers?: boolean;
  maxVisiblePages?: number;
}

export const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
  showPageNumbers = true,
  maxVisiblePages = 5,
}) => {
  const { showError } = useToast();

  const visiblePages = useMemo(() => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(0, currentPage - half);
    let end = Math.min(totalPages - 1, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(0, end - maxVisiblePages + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, [currentPage, totalPages, maxVisiblePages]);

  const handlePageChange = useCallback((page: number) => {
    if (isLoading) {
      showError('Navigation', 'Veuillez attendre la fin du chargement');
      return;
    }
    onPageChange(page);
  }, [isLoading, onPageChange, showError]);

  if (totalPages <= 1) return null;

  return (
    <View style={paginationStyles.paginationContainer}>
      {/* Bouton précédent */}
      <Pressable
        style={[
          paginationStyles.paginationButton,
          (currentPage === 0 || isLoading) && paginationStyles.paginationButtonDisabled,
        ]}
        onPress={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 0 || isLoading}
      >
        <ChevronLeft
          size={20}
          color={currentPage === 0 || isLoading ? '#666' : Colors.palette.taupeDeep}
        />
      </Pressable>

      {/* Numéros de page */}
      {showPageNumbers && (
        <View style={paginationStyles.pageNumbersContainer}>
          {visiblePages[0] > 0 && (
            <>
              <Pressable
                style={paginationStyles.pageNumber}
                onPress={() => handlePageChange(0)}
                disabled={isLoading}
              >
                <Text style={paginationStyles.pageNumberText}>1</Text>
              </Pressable>
              {visiblePages[0] > 1 && (
                <View style={paginationStyles.ellipsis}>
                  <MoreHorizontal size={16} color={Colors.palette.taupe} />
                </View>
              )}
            </>
          )}

          {visiblePages.map(page => (
            <Pressable
              key={page}
              style={[
                paginationStyles.pageNumber,
                page === currentPage && paginationStyles.pageNumberActive,
              ]}
              onPress={() => handlePageChange(page)}
              disabled={isLoading}
            >
              <Text
                style={[
                  paginationStyles.pageNumberText,
                  page === currentPage && paginationStyles.pageNumberTextActive,
                ]}
              >
                {page + 1}
              </Text>
            </Pressable>
          ))}

          {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 2 && (
                <View style={paginationStyles.ellipsis}>
                  <MoreHorizontal size={16} color={Colors.palette.taupe} />
                </View>
              )}
              <Pressable
                style={paginationStyles.pageNumber}
                onPress={() => handlePageChange(totalPages - 1)}
                disabled={isLoading}
              >
                <Text style={paginationStyles.pageNumberText}>{totalPages}</Text>
              </Pressable>
            </>
          )}
        </View>
      )}

      {/* Bouton suivant */}
      <Pressable
        style={[
          paginationStyles.paginationButton,
          (currentPage === totalPages - 1 || isLoading) && paginationStyles.paginationButtonDisabled,
        ]}
        onPress={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages - 1 || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={Colors.palette.taupe} />
        ) : (
          <ChevronRight
            size={20}
            color={currentPage === totalPages - 1 ? '#666' : Colors.palette.taupeDeep}
          />
        )}
      </Pressable>
    </View>
  );
};

// Liste paginée optimisée
export const PaginatedList = <T,>({
  data,
  renderItem,
  keyExtractor,
  itemsPerPage = PAGINATION_CONFIG.itemsPerPage,
  onLoadMore,
  onRefresh,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  numColumns = 1,
  horizontal = false,
  showPagination = true,
  searchQuery = '',
  filterFn,
  sortFn,
  style,
  contentContainerStyle,
  testID,
}: PaginatedListProps<T>) => {
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Filtrer et trier les données
  const processedData = useMemo(() => {
    let result = [...data];

    // Filtrage
    if (searchQuery && filterFn) {
      result = result.filter(item => filterFn(item, searchQuery));
    }

    // Tri
    if (sortFn) {
      result.sort(sortFn);
    }

    return result;
  }, [data, searchQuery, filterFn, sortFn]);

  const pagination = usePagination(processedData, itemsPerPage);

  const handleRefresh = useCallback(async () => {
    if (onRefresh) {
      setRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    }
  }, [onRefresh]);

  const handleLoadMore = useCallback(async () => {
    if (onLoadMore && pagination.hasMore && !pagination.isLoading) {
      try {
        const newItems = await onLoadMore(pagination.currentPage + 1);
        // Logique pour ajouter les nouveaux éléments
      } catch (error) {
        console.error('Failed to load more items:', error);
      }
    }
  }, [onLoadMore, pagination.hasMore, pagination.isLoading, pagination.currentPage]);

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const listProps = {
    data: pagination.items,
    renderItem,
    keyExtractor,
    numColumns: viewMode === 'grid' ? numColumns : 1,
    horizontal,
    refreshing,
    onRefresh: handleRefresh,
    onEndReached: handleLoadMore,
    onEndReachedThreshold: 0.5,
    ListHeaderComponent,
    ListFooterComponent,
    ListEmptyComponent,
    style,
    contentContainerStyle,
    testID,
    showsVerticalScrollIndicator: false,
    showsHorizontalScrollIndicator: false,
    removeClippedSubviews: true,
    maxToRenderPerBatch: PAGINATION_CONFIG.batchSize,
    windowSize: 10,
    initialNumToRender: PAGINATION_CONFIG.batchSize,
  };

  return (
    <View style={paginationStyles.container}>
      {/* En-tête avec contrôles */}
      <View style={paginationStyles.header}>
        <View style={paginationStyles.headerLeft}>
          <Text style={paginationStyles.itemCount}>
            {pagination.totalItems} élément{pagination.totalItems > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={paginationStyles.headerRight}>
          <Pressable style={paginationStyles.viewModeButton} onPress={toggleViewMode}>
            {viewMode === 'grid' ? (
              <List size={20} color={Colors.palette.taupeDeep} />
            ) : (
              <Grid size={20} color={Colors.palette.taupeDeep} />
            )}
          </Pressable>
        </View>
      </View>

      {/* Liste */}
      <FlatList {...listProps} />

      {/* Contrôles de pagination */}
      {showPagination && (
        <PaginationControls
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          onPageChange={pagination.goToPage}
          isLoading={pagination.isLoading}
        />
      )}
    </View>
  );
};

const paginationStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  itemCount: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    fontWeight: '600',
  },
  viewModeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paginationButtonDisabled: {
    opacity: 0.3,
  },
  pageNumbersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  pageNumber: {
    minWidth: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  pageNumberActive: {
    backgroundColor: '#FFD700',
  },
  pageNumberText: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    fontWeight: '600',
  },
  pageNumberTextActive: {
    color: '#000000',
  },
  ellipsis: {
    paddingHorizontal: 4,
  },
});

export default NavigationOptimizer;