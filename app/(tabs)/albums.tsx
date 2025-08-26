import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Animated, Platform, Dimensions, RefreshControl, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Camera, Users, Calendar, Heart, Plus, Grid3X3, List, Sparkles, Lock, Globe, Link2, Search } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/providers/AuthProvider';
import { useAppState } from '@/providers/AppStateProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import ProgressToast from '@/components/ProgressToast';
import { useToast } from '@/providers/ToastProvider';
import { useAccessibility } from '@/components/AccessibilityProvider';
import AdvancedSearch from '@/components/AdvancedSearch';
import ImageCacheOptimizer from '@/components/ImageCacheOptimizer';
import OfflineSync from '@/components/OfflineSync';

import { AlbumCard } from '@/components/AlbumCard';
import { ROUTES } from '@/constants/routes';

const { width: screenWidth } = Dimensions.get('window');

interface GroupRef { id: string; name: string; color: string }

interface Album {
  id: string;
  name: string;
  coverImage: string;
  photoCount: number;
  createdAt: Date;
  lastUpdated: Date;
  type: 'event' | 'personal' | 'shared' | 'ephemeral';
  privacy: 'public' | 'private' | 'friends';
  isActive?: boolean;
  groupId?: string;
  views?: number;
  coverTransform?: { scale: number; offsetX: number; offsetY: number };
}

export default function AlbumsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const appState = useAppState();
  const { albums: persistedAlbums, groups: persistedGroups, createAlbum, displayName, favoriteAlbums: favoriteAlbumIds, toggleFavoriteAlbum, addNotification, isOnline } = appState;
  const { showError, showSuccess } = useToast();
  const { announceForAccessibility, getAccessibleLabel } = useAccessibility();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'shared' | 'favorites' | 'mostViewed' | 'lastActivity'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string | 'all'>('all');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'photos' | 'activity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [newAlbumName, setNewAlbumName] = useState<string>('');
  const [newAlbumType, setNewAlbumType] = useState<'personal' | 'shared' | 'event'>('personal');
  const [newAlbumPrivacy, setNewAlbumPrivacy] = useState<'public' | 'private' | 'friends'>('private');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{ albums: any[]; photos: any[] } | null>(null);
  const [mainFadeAnim] = useState(new Animated.Value(0));
  const [mainSlideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mainFadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(mainSlideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      showError('Nom requis', 'Veuillez saisir un nom pour l\'album');
      return;
    }

    setIsCreating(true);
    try {
      await createAlbum(newAlbumName.trim());
      
      showSuccess('Album créé', `L'album "${newAlbumName}" a été créé avec succès`);
      setShowCreate(false);
      setNewAlbumName('');
      setNewAlbumType('personal');
      setNewAlbumPrivacy('private');
      
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error creating album:', error);
      showError('Erreur', 'Impossible de créer l\'album. Veuillez réessayer.');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredAndSortedAlbums = useMemo(() => {
    if (!albums || albums.length === 0) return [];
    
    // Use search results if available
    let filtered = searchResults ? searchResults.albums.map(album => {
      const fullAlbum = albums.find(a => a.id === album.id);
      return fullAlbum || album;
    }) : albums;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(album => 
        album.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    if (filterType !== 'all') {
      switch (filterType) {
        case 'recent':
          filtered = filtered.filter(album => {
            const daysDiff = (Date.now() - album.lastUpdated.getTime()) / (1000 * 60 * 60 * 24);
            return daysDiff <= 7;
          });
          break;
        case 'shared':
          filtered = filtered.filter(album => album.type === 'shared' || album.type === 'event');
          break;
        case 'favorites':
          filtered = filtered.filter(album => favoriteAlbumIds.includes(album.id));
          break;
        case 'mostViewed':
          filtered = filtered.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
          break;
        case 'lastActivity':
          filtered = filtered.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()).slice(0, 10);
          break;
      }
    }

    // Apply group filter
    if (selectedGroup !== 'all') {
      filtered = filtered.filter(album => album.groupId === selectedGroup);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'photos':
          comparison = a.photoCount - b.photoCount;
          break;
        case 'activity':
          comparison = a.lastUpdated.getTime() - b.lastUpdated.getTime();
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [albums, searchQuery, filterType, selectedGroup, sortBy, sortOrder, favoriteAlbumIds, searchResults]);



  const renderAlbumItem = useCallback(({ item: album, index }: { item: Album; index: number }) => {
    const isFavorite = favoriteAlbumIds.includes(album.id);
    const accessibleLabel = getAccessibleLabel(
      `Album ${album.name}, ${album.photoCount} photos`,
      `Appuyez pour ouvrir l'album`
    );

    return (
      <Animated.View
        style={[
          styles.albumCard,
          {
            opacity: mainFadeAnim,
            transform: [{ translateY: mainSlideAnim }],
          },
        ]}
      >
        <Pressable
          style={[styles.albumCard, viewMode === 'list' && styles.albumCardList]}
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            router.push(`/album/${album.id}` as any);
          }}
          accessibilityLabel={accessibleLabel}
          accessibilityRole="button"
          accessibilityHint="Ouvre les détails de l'album"
        >
          <View style={styles.albumImageContainer}>
            <Image
              source={{ uri: album.coverImage }}
              style={[styles.albumCover, viewMode === 'list' && styles.albumCoverList]}
              contentFit="cover"
              transition={300}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.albumOverlay}
            />
            
            {/* Status badges */}
            {album.isActive && (
              <View style={[styles.liveBadge]}>
                <Text style={styles.liveText}>LIVE</Text>
              </View>
            )}
            
            {album.privacy === 'private' && (
              <View style={[styles.statusBadge, styles.privateBadge]}>
                <Lock size={12} color="#FFFFFF" />
              </View>
            )}
            
            {album.privacy === 'public' && (
              <View style={[styles.statusBadge, styles.publicBadge]}>
                <Globe size={12} color="#FFFFFF" />
              </View>
            )}
            
            {/* Favorite button */}
            <Pressable
              style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
              onPress={() => {
                if (Platform.OS !== 'web') {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                toggleFavoriteAlbum(album.id);
                announceForAccessibility(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris');
              }}
              accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              accessibilityRole="button"
            >
              <Heart
                size={16}
                color={isFavorite ? '#FF4444' : '#FFFFFF'}
                fill={isFavorite ? '#FF4444' : 'transparent'}
              />
            </Pressable>
          </View>
          
          <View style={[styles.albumInfo, viewMode === 'list' && styles.albumInfoList]}>
            <Text style={[styles.albumName, viewMode === 'list' && styles.albumTitle]} numberOfLines={viewMode === 'list' ? 2 : 1}>
              {album.name}
            </Text>
            <Text style={styles.albumStats}>
              {album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}
              {album.views && ` • ${album.views} vues`}
            </Text>
            <Text style={styles.albumDate}>
              {album.lastUpdated.toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                year: album.lastUpdated.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
              })}
            </Text>
          </View>
        </Pressable>
      </Animated.View>
    );
  }, [viewMode, favoriteAlbumIds, mainFadeAnim, mainSlideAnim, router, toggleFavoriteAlbum, getAccessibleLabel, announceForAccessibility]);

  const [toastVisible, setToastVisible] = useState<boolean>(false);
  const [toastLabel, setToastLabel] = useState<string>('');
  const [toastProgress, setToastProgress] = useState<number>(0);

  const [glowAnim] = useState<Animated.Value>(() => new Animated.Value(0));
  const [albumAnimations] = useState<{ scale: Animated.Value; opacity: Animated.Value; translateY: Animated.Value; }[]>(() =>
    Array.from({ length: 20 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(30),
    }))
  );



  // Groups come from provider; no mocks
  useEffect(() => {
    setGroups(persistedGroups.map(g => ({ id: g.id, name: g.name })));
  }, [persistedGroups]);

  useEffect(() => {
    const normalized = persistedAlbums.map(album => ({
      id: album.id,
      name: album.name,
      coverImage: album.coverImage || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
      photoCount: album.photos.length,
      createdAt: new Date(album.createdAt),
      lastUpdated: new Date(album.lastActivity ?? album.createdAt),
      type: 'personal' as const,
      privacy: 'private' as const,
      groupId: album.groupId,
      views: (album as any).views ?? 0,
      coverTransform: (album as any).coverTransform ?? { scale: 1, offsetX: 0, offsetY: 0 },
    }));
    setAlbums(normalized);
  }, [persistedAlbums]);

  useEffect(() => {
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    );
    glowAnimation.start();
    
    return () => glowAnimation.stop();
  }, [glowAnim]);

  useEffect(() => {
    console.log('AlbumsScreen state', {
      userEmail: user?.email ?? null,
      albumsCount: albums.length,
      groupsCount: groups.length,
    });
  }, [user?.email, albums.length, groups.length]);

  const loadAlbums = async () => {
    const mock: Album[] = [
      { id: '1', name: "Vacances d'été", coverImage: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1600&auto=format&fit=crop', photoCount: 78, createdAt: new Date('2024-06-12'), lastUpdated: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), type: 'personal', privacy: 'friends', groupId: 'g1' },
      { id: '2', name: 'Mariage Julie', coverImage: 'https://images.unsplash.com/photo-1515165562835-c3b8c2e5d9c0?q=80&w=1600&auto=format&fit=crop', photoCount: 124, createdAt: new Date('2024-05-03'), lastUpdated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), type: 'event', privacy: 'public', isActive: true, groupId: 'g2' },
      { id: '3', name: 'Anniversaire Maman', coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1600&auto=format&fit=crop', photoCount: 45, createdAt: new Date('2024-03-10'), lastUpdated: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000), type: 'shared', privacy: 'friends', groupId: 'g1' },
      { id: '4', name: 'Week-end nature', coverImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop', photoCount: 32, createdAt: new Date('2024-02-01'), lastUpdated: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), type: 'personal', privacy: 'private', groupId: 'g3' },
    ];
    setAlbums(mock);
    mock.forEach((_, i) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.spring(albumAnimations[i % albumAnimations.length].scale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
          Animated.timing(albumAnimations[i % albumAnimations.length].opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.spring(albumAnimations[i % albumAnimations.length].translateY, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }),
        ]).start();
      }, i * 100);
    });
  };

  const handleHaptic = useCallback((style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (Platform.OS !== 'web') {
      const map = {
        light: (Haptics.ImpactFeedbackStyle as any).Light,
        medium: (Haptics.ImpactFeedbackStyle as any).Medium,
        heavy: (Haptics.ImpactFeedbackStyle as any).Heavy,
      } as const;
      Haptics.impactAsync(map[style]);
    }
  }, []);

  const handleRefreshAlbums = useCallback(async () => {
    handleHaptic('light');
    setRefreshing(true);
    try {
      // refresh from provider only
      setAlbums(persistedAlbums.map(album => ({
        id: album.id,
        name: album.name,
        coverImage: album.coverImage || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
        photoCount: album.photos.length,
        createdAt: new Date(album.createdAt),
        lastUpdated: new Date(album.createdAt),
        type: 'personal' as const,
        privacy: 'private' as const,
        groupId: album.groupId,
      })));
      showSuccess('Albums actualisés', 'Vos albums ont été synchronisés avec succès');
      announceForAccessibility('Albums actualisés avec succès');
    } catch (error) {
      console.error('Error refreshing albums:', error);
      showError('Erreur de synchronisation', 'Impossible de synchroniser vos albums. Vérifiez votre connexion.');
      announceForAccessibility('Erreur lors de la synchronisation des albums');
    } finally {
      setRefreshing(false);
    }
  }, [persistedAlbums, showSuccess, showError, announceForAccessibility, handleHaptic]);

  const toggleView = () => {
    handleHaptic('light');
    setViewMode((p) => (p === 'grid' ? 'list' : 'grid'));
  };

  const AlbumIcon = (type: Album['type']) => (type === 'event' ? Calendar : type === 'personal' ? Heart : type === 'shared' ? Users : Sparkles);
  const PrivacyIcon = (privacy: Album['privacy']) => (privacy === 'public' ? Globe : privacy === 'private' ? Lock : Users);
  const typeColor = {
    event: '#D39E5C',
    personal: '#7A6F63',
    shared: '#8C93A8',
    ephemeral: '#FFD700',
  } as const;

  const filteredAlbums = useMemo(() => {
    let list = albums;
    if (filterType === 'recent') list = [...list].sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
    if (filterType === 'shared') list = list.filter((a) => a.type === 'shared' || a.privacy === 'friends');
    if (filterType === 'favorites') list = list.filter((a) => favoriteAlbumIds.includes(a.id));
    if (filterType === 'mostViewed') list = [...list].sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
    if (filterType === 'lastActivity') list = [...list].sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime());
    if (selectedGroup !== 'all') list = list.filter((a) => a.groupId === selectedGroup);
    return list;
  }, [albums, filterType, selectedGroup, favoriteAlbumIds]);

  const formatDate = (date: Date): string => {
    const now = new Date();
    const d = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (d === 0) return "Aujourd'hui";
    if (d === 1) return 'Hier';
    if (d < 7) return `Il y a ${d} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  const universalLink = 'memoria.app/me';
  const avatarUri = 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=400&auto=format&fit=crop';

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, { opacity: mainFadeAnim }]}>        

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Albums</Text>
          <View style={styles.headerActions}>
            <Pressable 
              style={styles.headerButton} 
              onPress={() => {
                handleHaptic('light');
                setShowAdvancedSearch(true);
              }} 
              testID="advanced-search"
            >
              <Search color={Colors.palette.accentGold} size={20} />
            </Pressable>
            <Pressable style={styles.headerButton} onPress={toggleView} testID="toggle-view">
              {viewMode === 'grid' ? <Grid3X3 color={Colors.palette.accentGold} size={20} /> : <List color={Colors.palette.accentGold} size={20} />}
            </Pressable>
          </View>
        </View>

        {/* Create Album Card */}
        <View style={styles.createAlbumSection}>
          <Pressable style={styles.createCard} onPress={() => { handleHaptic('medium'); setShowCreate(true); }} testID="create-album">
            <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.createGradient}>
              <Plus color="#000" size={24} />
              <Text style={styles.createTitle}>Créer un nouvel album</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.filtersContent}
          >
            {(['all', 'recent', 'shared', 'favorites', 'mostViewed', 'lastActivity'] as const).map((key) => {
              const active = filterType === key;
              return (
                <Pressable key={key} style={[styles.filterChip, active && styles.filterChipActive]} onPress={() => setFilterType(key)} testID={`chip-${key}`}>
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {key === 'all' ? 'Tous' : key === 'recent' ? 'Récents' : key === 'shared' ? 'Partagés' : key === 'favorites' ? 'Favoris' : key === 'mostViewed' ? 'Top vues' : 'Activité'}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Albums Grid */}
        <View style={styles.albumsContainer}>
          {filteredAlbums.length === 0 ? (
            <View style={styles.emptyState}>
              <Camera color={Colors.palette.taupe} size={48} />
              <Text style={styles.emptyTitle}>Aucun album</Text>
              <Text style={styles.emptySubtitle}>Créez votre premier album pour commencer</Text>
            </View>
          ) : (
            <FlashList
              data={filteredAlbums}
              renderItem={({ item: album, index }: { item: Album; index: number }) => {
                const isFavorite = favoriteAlbumIds.includes(album.id);
                return (
                  <Animated.View style={[styles.albumItem, { opacity: mainFadeAnim }]}>
                    <Pressable
                      style={styles.albumPressable}
                      onPress={() => {
                        handleHaptic('medium');
                        router.push(`/album/${album.id}` as any);
                      }}
                    >
                      <View style={styles.albumImageContainer}>
                        <Image
                          source={{ uri: album.coverImage }}
                          style={styles.albumImage}
                          contentFit="cover"
                          transition={300}
                        />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.8)']}
                          style={styles.albumOverlay}
                        />
                        
                        {/* Favorite Button */}
                        <Pressable
                          style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
                          onPress={() => {
                            handleHaptic('light');
                            toggleFavoriteAlbum(album.id);
                          }}
                        >
                          <Heart
                            size={16}
                            color={isFavorite ? '#FF4444' : '#FFFFFF'}
                            fill={isFavorite ? '#FF4444' : 'transparent'}
                          />
                        </Pressable>
                      </View>
                      
                      <View style={[styles.albumInfo, viewMode === 'list' ? { minHeight: 84 } : null]}>
                        <Text style={[styles.albumName, viewMode === 'list' ? { minHeight: 20 } : null]} numberOfLines={1}>
                          {album.name}
                        </Text>
                        <Text style={[styles.albumStats, viewMode === 'list' ? { minHeight: 16 } : null]}>
                          {album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}
                        </Text>
                        <Text style={[styles.albumDate, viewMode === 'list' ? { minHeight: 14 } : null]}>
                          {formatDate(album.lastUpdated)}
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              }}
              keyExtractor={(item) => item.id}
              numColumns={viewMode === 'grid' ? 2 : 1}
              key={viewMode}
              estimatedItemSize={viewMode === 'grid' ? 220 : 100}
              contentContainerStyle={styles.albumsContent}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              refreshControl={
                <RefreshControl 
                  refreshing={refreshing} 
                  onRefresh={handleRefreshAlbums} 
                  tintColor="#FFD700" 
                  colors={["#FFD700"]} 
                  progressBackgroundColor="#1a1a1a" 
                />
              }
            />
          )}
        </View>

        {/* Advanced Search Modal */}
        {showAdvancedSearch && (
          <AdvancedSearch
            onClose={() => {
              setShowAdvancedSearch(false);
              setSearchResults(null);
            }}
            onResults={(results) => {
              setSearchResults(results);
              setShowAdvancedSearch(false);
              announceForAccessibility(`${results.albums.length + results.photos.length} résultats trouvés`);
            }}
          />
        )}

        <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
          <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nouvel album</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom de l'album"
                placeholderTextColor="#7A6F63"
                value={newAlbumName}
                onChangeText={setNewAlbumName}
                testID="album-name-input"
              />
              <View style={styles.privacyRow}>
                {(['public','friends','private'] as const).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setNewAlbumPrivacy(p)}
                    style={[styles.privacyChip, newAlbumPrivacy === p && styles.privacyChipActive]}
                    testID={`privacy-${p}`}
                  >
                    <Text style={[styles.privacyText, newAlbumPrivacy === p && styles.privacyTextActive]}>
                      {p === 'public' ? 'Public' : p === 'friends' ? 'Amis' : 'Privé'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.modalActions}>
                <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowCreate(false)} testID="cancel-create">
                  <Text style={styles.cancelText}>Annuler</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalBtn, styles.createBtn]}
                  onPress={handleCreateAlbum}
                  testID="confirm-create"
                >
                  <Text style={styles.createText}>Créer</Text>
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Animated.View>
      </SafeAreaView>
      <ProgressToast visible={toastVisible} label={toastLabel} progress={toastProgress} />
      
      {/* Image Cache Optimizer */}
      <ImageCacheOptimizer 
        imageUris={albums.map(a => a.coverImage).filter(Boolean)}
        priority="high"
        maxCacheSize={150}
      />
    </View>
  );
}

interface CardInnerProps {
  album: Album;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  PIcon: React.ComponentType<{ size?: number; color?: string }>;
  color: string;
  glow: Animated.Value;
  viewMode: 'grid' | 'list';
  formatDate: (d: Date) => string;
  onToggleFavorite: () => void;
  isFavorite: boolean;
}

function CardInner({ album, Icon, PIcon, color, glow, viewMode, formatDate, onToggleFavorite, isFavorite }: CardInnerProps) {
  const groupBadge = album.groupId ? (
    <View style={styles.groupBadge}>
      <Text style={styles.groupBadgeText}>{album.groupId?.toUpperCase()}</Text>
    </View>
  ) : null;

  if (viewMode === 'grid') {
    return (
      <View style={styles.albumCardContent}>
        <View style={styles.albumImageContainer}>
          <Image source={{ uri: album.coverImage }} style={[styles.albumCover, album.coverTransform ? { transform: [{ scale: album.coverTransform.scale }, { translateX: album.coverTransform.offsetX }, { translateY: album.coverTransform.offsetY }] } : null]} contentFit="cover" cachePolicy="memory-disk" transition={200} />
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={styles.albumOverlay} />
          <View style={styles.favoriteBadgeWrap}>
            <Pressable style={[styles.favoriteBadge, isFavorite && styles.favoriteBadgeActive]} onPress={onToggleFavorite} testID={`fav-${album.id}`}>
              <Text style={[styles.favoriteText, isFavorite && styles.favoriteTextActive]}>{isFavorite ? '★' : '☆'}</Text>
            </Pressable>
          </View>
          <View style={styles.albumBadges}>
            {album.isActive && (
              <Animated.View style={[styles.liveBadge, { opacity: glow }]}>
                <Sparkles size={12} color="#FFD700" />
                <Text style={styles.liveText}>LIVE</Text>
              </Animated.View>
            )}
            <View style={[styles.typeBadge, { backgroundColor: `${color}20` }]}>
              <Icon size={14} color={color} />
            </View>
            <View style={styles.privacyBadge}>
              <PIcon size={12} color="#E8EAF0" />
            </View>
          </View>
        </View>
        <View style={styles.albumInfo}>
          <Text style={styles.albumName} numberOfLines={2}>{album.name}</Text>
          <View style={styles.albumMeta}><Text style={styles.albumStats}>{album.photoCount} photos • {(album.views ?? 0)} vues</Text></View>
          <Text style={styles.albumDate}>{formatDate(album.lastUpdated)}</Text>
          {groupBadge}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.albumListContent}>
      <View style={styles.albumListImageContainer}>
        <Image source={{ uri: album.coverImage }} style={[styles.albumListCover, album.coverTransform ? { transform: [{ scale: album.coverTransform.scale }, { translateX: album.coverTransform.offsetX }, { translateY: album.coverTransform.offsetY }] } : null]} contentFit="cover" cachePolicy="memory-disk" transition={200} />
        {album.isActive && (<Animated.View style={[styles.listLiveBadge, { opacity: glow }]}><Sparkles size={10} color="#FFD700" /></Animated.View>)}
      </View>
      <View style={styles.albumListInfo}>
        <View style={styles.albumListHeader}>
          <Text style={styles.albumListName} numberOfLines={1}>{album.name}</Text>
          <View style={styles.albumListBadges}>
            <Pressable style={[styles.listFav, isFavorite && styles.listFavActive]} onPress={onToggleFavorite} testID={`fav-${album.id}`}>
              <Text style={[styles.listFavText, isFavorite && styles.listFavTextActive]}>{isFavorite ? '★' : '☆'}</Text>
            </Pressable>
            <Icon size={16} color={color} />
            <PIcon size={14} color={Colors.palette.taupe} />
          </View>
        </View>
        <Text style={styles.albumListMeta}>{album.photoCount} photos</Text>
        <Text style={styles.albumListDate}>{formatDate(album.lastUpdated)}</Text>
        {groupBadge}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  safeArea: { flex: 1 },
  content: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.palette.taupeDeep
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,215,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  userInfo: { flex: 1 },
  userName: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  userBio: { color: Colors.palette.taupe, fontSize: 12, marginTop: 2 },
  userEmail: { color: Colors.palette.taupe, fontSize: 12 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  cameraBtn: { backgroundColor: '#FFD700' },
  linkCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(255,255,255,0.06)', padding: 12, borderRadius: 14 },
  linkLeft: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  linkText: { color: Colors.palette.taupeDeep, fontSize: 14, fontWeight: '700' },
  createAlbumSection: {
    paddingHorizontal: 20,
    paddingVertical: 16
  },
  createCard: {
    borderRadius: 16,
    overflow: 'hidden'
  },
  createGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20
  },
  createTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000000'
  },
  filtersContainer: {
    paddingVertical: 12
  },
  filtersContent: {
    paddingHorizontal: 20,
    gap: 12
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)'
  },
  filterChipActive: {
    backgroundColor: 'rgba(255,215,0,0.2)'
  },
  filterText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    fontWeight: '600'
  },
  filterTextActive: {
    color: '#FFD700',
    fontWeight: '700'
  },
  offlineBadge: { alignSelf: 'flex-end', backgroundColor: '#FF4444', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, marginBottom: 8 },
  offlineText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  groupChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', marginRight: 8 },
  groupChipActive: { backgroundColor: 'rgba(255,215,0,0.2)' },
  groupChipText: { color: Colors.palette.taupe, fontSize: 12, fontWeight: '700' },
  groupChipTextActive: { color: '#FFD700' },

  createLeft: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  createRight: { flex: 1 },

  createSub: { fontSize: 12, color: Colors.palette.taupe },

  albumsContainer: {
    flex: 1,
    paddingHorizontal: 20
  },
  albumsContent: {
    paddingBottom: 120
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.palette.taupeDeep,
    marginTop: 16,
    marginBottom: 8
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.palette.taupe,
    textAlign: 'center'
  },
  albumItem: {
    marginBottom: 16
  },
  albumPressable: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#131417',
    height: 220,
  },
  albumImageContainer: {
    height: 140,
    position: 'relative'
  },
  albumImage: {
    width: '100%',
    height: '100%'
  },
  albumOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%'
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  favoriteButtonActive: {
    backgroundColor: 'rgba(255,68,68,0.9)'
  },
  albumInfo: {
    padding: 16,
    minHeight: 80,
    justifyContent: 'flex-start',
  },
  albumName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.palette.taupeDeep,
    marginBottom: 4
  },
  albumStats: {
    fontSize: 12,
    color: Colors.palette.taupe,
    marginBottom: 4
  },
  albumDate: {
    fontSize: 11,
    color: Colors.palette.taupe
  },
  webBlur: { backgroundColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' as any },
  flashListContainer: { flex: 1, minHeight: 400 },
  flashListContent: { paddingBottom: 20 },
  albumsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  albumsList: { gap: 12 },
  albumCard: { width: (screenWidth - 56) / 2, borderRadius: 16, overflow: 'hidden', backgroundColor: '#131417' },
  albumListItem: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#131417' },

  albumBlur: { borderRadius: 16 },
  albumCardContent: { borderRadius: 16 },

  albumCover: { width: '100%', height: '100%', backgroundColor: '#1a1a1a' },

  favoriteBadgeWrap: { position: 'absolute', top: 8, left: 8 },
  favoriteBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  favoriteBadgeActive: { backgroundColor: 'rgba(255,215,0,0.9)' },
  favoriteText: { color: '#FFFFFF', fontWeight: '800' },
  favoriteTextActive: { color: '#000000', fontWeight: '800' },
  albumBadges: { position: 'absolute', top: 8, right: 8, gap: 6 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,215,0,0.95)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveText: { color: '#000000', fontSize: 10, fontWeight: '800' },
  typeBadge: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)' },
  privacyBadge: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)' },

  albumMeta: { flexDirection: 'row', alignItems: 'center' },

  groupBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  groupBadgeText: { color: Colors.palette.taupe, fontSize: 10, fontWeight: '700' },
  albumListContent: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  albumListImageContainer: { position: 'relative' },
  albumListCover: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#1a1a1a' },
  listLiveBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FFD700', borderRadius: 8, padding: 2 },
  albumListInfo: { flex: 1, gap: 4 },
  albumListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  albumListName: { color: Colors.palette.taupeDeep, fontSize: 16, fontWeight: '700', flex: 1 },
  albumListBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listFav: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  listFavActive: { backgroundColor: '#FFD700' },
  listFavText: { color: '#FFFFFF', fontWeight: '800' },
  listFavTextActive: { color: '#000000' },
  albumListMeta: { color: Colors.palette.taupe, fontSize: 13 },
  albumListDate: { color: Colors.palette.taupe, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#0B0B0D', padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 12 },
  modalTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', textAlign: 'center' },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: '#FFFFFF' },
  privacyRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  privacyChip: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  privacyChipActive: { backgroundColor: 'rgba(255,215,0,0.2)' },
  privacyText: { color: Colors.palette.taupe, fontWeight: '700' },
  privacyTextActive: { color: '#FFD700' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: 'rgba(255,255,255,0.06)' },
  createBtn: { backgroundColor: '#FFD700' },
  cancelText: { color: Colors.palette.taupe, fontWeight: '700' },
  createText: { color: '#000000', fontWeight: '800' },
  gridItem: { width: (screenWidth - 56) / 2, marginBottom: 16 },
  listItem: { marginBottom: 12 },
  statusBadge: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  privateBadge: { backgroundColor: 'rgba(255,68,68,0.2)' },
  publicBadge: { backgroundColor: 'rgba(34,197,94,0.2)' },

  albumCardList: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  albumCoverList: { width: 60, height: 60, borderRadius: 12 },
  albumInfoList: { flex: 1, marginLeft: 12 },
  albumTitle: { color: Colors.palette.taupeDeep, fontSize: 16, fontWeight: '700' },
  errorText: { color: '#FF4444', fontSize: 14, textAlign: 'center', marginTop: 20 },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingHorizontal: 4, paddingVertical: 8 },
  skeletonCard: { width: (screenWidth - 56) / 2, height: 200, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)' },
  skeletonList: { width: '100%', height: 84, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)' },
  searchResultsIndicator: { marginHorizontal: 20, marginTop: 8, backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchResultsText: { color: '#FFD700', fontSize: 14, fontWeight: '600', flex: 1 },
  clearSearchBtn: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  clearSearchText: { color: Colors.palette.taupe, fontSize: 12, fontWeight: '700' },
});