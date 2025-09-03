import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Animated, Platform, Dimensions, RefreshControl, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Camera, Users, Calendar, Heart, Plus, Grid3X3, List, Sparkles, Lock, Globe, Search } from 'lucide-react-native';
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

const { width: screenWidth } = Dimensions.get('window');
const CARD_GAP = 16 as const;
const H_PADDING = 20 as const;
const CARD_WIDTH = (screenWidth - H_PADDING * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = Math.round(CARD_WIDTH * 1.2);

type AlbumType = 'event' | 'personal' | 'shared' | 'ephemeral';
type AlbumPrivacy = 'public' | 'private' | 'friends';

interface Album {
  id: string;
  name: string;
  coverImage: string;
  photoCount: number;
  createdAt: Date;
  lastUpdated: Date;
  type: AlbumType;
  privacy: AlbumPrivacy;
  isActive?: boolean;
  groupId?: string;
  views?: number;
  coverTransform?: { scale: number; offsetX: number; offsetY: number };
}

export default function AlbumsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const appState = useAppState();
  const { albums: persistedAlbums, groups: persistedGroups, createAlbum, favoriteAlbums: favoriteAlbumIds, toggleFavoriteAlbum } = appState;
  const { showError, showSuccess } = useToast();
  const { announceForAccessibility, getAccessibleLabel } = useAccessibility();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'shared' | 'favorites' | 'mostViewed' | 'lastActivity'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string | 'all'>('all');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'photos' | 'activity'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [newAlbumName, setNewAlbumName] = useState<string>('');
  const [newAlbumPrivacy, setNewAlbumPrivacy] = useState<AlbumPrivacy>('private');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{ albums: any[]; photos: any[] } | null>(null);
  const [mainFadeAnim] = useState(new Animated.Value(0));
  const [mainSlideAnim] = useState(new Animated.Value(50));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mainFadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.spring(mainSlideAnim, { toValue: 0, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleCreateAlbum = async () => {
    if (!newAlbumName.trim()) {
      showError('Nom requis', "Veuillez saisir un nom pour l'album");
      return;
    }

    setIsCreating(true);
    try {
      await createAlbum(newAlbumName.trim());
      showSuccess('Album créé', `L'album "${newAlbumName}" a été créé avec succès`);
      setShowCreate(false);
      setNewAlbumName('');
      setNewAlbumPrivacy('private');
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error creating album:', error);
      showError('Erreur', "Impossible de créer l'album. Veuillez réessayer.");
    } finally {
      setIsCreating(false);
    }
  };

  const filteredAndSortedAlbums = useMemo(() => {
    if (!albums || albums.length === 0) return [];
    let filtered = searchResults ? searchResults.albums.map(a => albums.find(x => x.id === a.id) || a) : albums;
    if (searchQuery.trim()) filtered = filtered.filter(a => a.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (filterType !== 'all') {
      switch (filterType) {
        case 'recent':
          filtered = filtered.filter(a => (Date.now() - a.lastUpdated.getTime()) / (1000 * 60 * 60 * 24) <= 7);
          break;
        case 'shared':
          filtered = filtered.filter(a => a.type === 'shared' || a.type === 'event');
          break;
        case 'favorites':
          filtered = filtered.filter(a => favoriteAlbumIds.includes(a.id));
          break;
        case 'mostViewed':
          filtered = filtered.sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
          break;
        case 'lastActivity':
          filtered = filtered.sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime()).slice(0, 10);
          break;
      }
    }
    if (selectedGroup !== 'all') filtered = filtered.filter(a => a.groupId === selectedGroup);
    filtered.sort((a, b) => {
      let c = 0;
      switch (sortBy) {
        case 'name': c = a.name.localeCompare(b.name); break;
        case 'date': c = a.createdAt.getTime() - b.createdAt.getTime(); break;
        case 'photos': c = a.photoCount - b.photoCount; break;
        case 'activity': c = a.lastUpdated.getTime() - b.lastUpdated.getTime(); break;
      }
      return sortOrder === 'asc' ? c : -c;
    });
    return filtered;
  }, [albums, searchQuery, filterType, selectedGroup, sortBy, sortOrder, favoriteAlbumIds, searchResults]);

  useEffect(() => {
    setAlbums(persistedAlbums.map(album => ({
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
    })));
  }, [persistedAlbums]);

  const handleHaptic = useCallback((style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (Platform.OS !== 'web') {
      const map = { light: (Haptics.ImpactFeedbackStyle as any).Light, medium: (Haptics.ImpactFeedbackStyle as any).Medium, heavy: (Haptics.ImpactFeedbackStyle as any).Heavy } as const;
      Haptics.impactAsync(map[style]);
    }
  }, []);

  const handleRefreshAlbums = useCallback(async () => {
    handleHaptic('light');
    setRefreshing(true);
    try {
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

  const typeColor = { event: '#D39E5C', personal: '#7A6F63', shared: '#8C93A8', ephemeral: Colors.palette.accentGold } as const;

  const formatDate = (date: Date): string => {
    const now = new Date();
    const d = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (d === 0) return "Aujourd'hui";
    if (d === 1) return 'Hier';
    if (d < 7) return `Il y a ${d} jours`;
    return date.toLocaleDateString('fr-FR');
  };

  return (
    <View style={styles.container}>
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: Colors.light.background }]} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Animated.View style={[styles.content, { opacity: mainFadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Albums</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerButton} onPress={() => { handleHaptic('light'); setShowAdvancedSearch(true); }} testID="advanced-search">
              <Search color={Colors.palette.taupeDeep} size={20} />
            </Pressable>
            <Pressable style={styles.headerButton} onPress={() => setViewMode(p => p === 'grid' ? 'list' : 'grid')} testID="toggle-view">
              {viewMode === 'grid' ? <Grid3X3 color={Colors.palette.taupeDeep} size={20} /> : <List color={Colors.palette.taupeDeep} size={20} />}
            </Pressable>
          </View>
        </View>

        <View style={styles.createAlbumSection}>
          <Pressable style={styles.createCard} onPress={() => { handleHaptic('medium'); setShowCreate(true); }} testID="create-album">
            <LinearGradient colors={[Colors.palette.accentGoldLight, Colors.palette.accentGold]} style={styles.createGradient}>
              <Plus color="#000" size={22} />
              <View style={{ alignItems: 'flex-start' }}>
                <Text style={styles.createTitle}>Créer un album</Text>
                <Text style={{ color: '#1a1a1a', fontWeight: '600', marginTop: 2 }}>Organisez vos souvenirs</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersContent}>
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

        <View style={styles.albumsContainer}>
          {filteredAndSortedAlbums.length === 0 ? (
            <View style={styles.emptyState}>
              <Camera color={Colors.palette.taupe} size={48} />
              <Text style={styles.emptyTitle}>Aucun album</Text>
              <Text style={styles.emptySubtitle}>Créez votre premier album pour commencer</Text>
            </View>
          ) : (
            <FlashList
              data={filteredAndSortedAlbums}
              renderItem={({ item: album }: { item: Album }) => {
                const isFavorite = favoriteAlbumIds.includes(album.id);
                return (
                  <Animated.View style={[styles.albumItem, { opacity: mainFadeAnim, width: CARD_WIDTH }]}>
                    <Pressable style={[styles.albumPressable, { width: CARD_WIDTH, height: CARD_HEIGHT }]} onPress={() => { handleHaptic('medium'); router.push(`/album/${album.id}` as any); }}>
                      <View style={[styles.albumImageContainer, { height: Math.round(CARD_HEIGHT * 0.6) }]}> 
                        <Image source={{ uri: album.coverImage }} style={styles.albumImage} contentFit="cover" transition={300} />
                        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.8)']} style={styles.albumOverlay} />
                        <View style={styles.countBadge}><Text style={styles.countText}>{album.photoCount}</Text></View>
                        <Pressable style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]} onPress={() => { handleHaptic('light'); toggleFavoriteAlbum(album.id); }}>
                          <Heart size={16} color={isFavorite ? '#FF4444' : '#FFFFFF'} fill={isFavorite ? '#FF4444' : 'transparent'} />
                        </Pressable>
                      </View>
                      <View style={[styles.albumInfo, viewMode === 'list' ? { minHeight: 84 } : null]}>
                        <Text style={[styles.albumName, viewMode === 'list' ? { minHeight: 20 } : null]} numberOfLines={2}>{album.name}</Text>
                        <Text style={[styles.albumStats, viewMode === 'list' ? { minHeight: 16 } : null]}>{album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}</Text>
                        <Text style={[styles.albumDate, viewMode === 'list' ? { minHeight: 14 } : null]}>{formatDate(album.lastUpdated)}</Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              }}
              keyExtractor={(item) => item.id}
              numColumns={viewMode === 'grid' ? 2 : 1}
              key={viewMode}
              estimatedItemSize={viewMode === 'grid' ? 280 : 100}
              contentContainerStyle={styles.albumsContent}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefreshAlbums} tintColor={Colors.palette.accentGold} colors={[Colors.palette.accentGold]} progressBackgroundColor="#1a1a1a" />
              }
            />
          )}
        </View>

        {showAdvancedSearch && (
          <AdvancedSearch
            onClose={() => { setShowAdvancedSearch(false); setSearchResults(null); }}
            onResults={(results) => { setSearchResults(results); setShowAdvancedSearch(false); announceForAccessibility(`${results.albums.length + results.photos.length} résultats trouvés`); }}
          />
        )}

        <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
          <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nouvel album</Text>
              <TextInput style={styles.input} placeholder="Nom de l'album" placeholderTextColor="#7A6F63" value={newAlbumName} onChangeText={setNewAlbumName} testID="album-name-input" />
              <View style={styles.privacyRow}>
                {(['public','friends','private'] as const).map((p) => (
                  <Pressable key={p} onPress={() => setNewAlbumPrivacy(p)} style={[styles.privacyChip, newAlbumPrivacy === p && styles.privacyChipActive]} testID={`privacy-${p}`}>
                    <Text style={[styles.privacyText, newAlbumPrivacy === p && styles.privacyTextActive]}>{p === 'public' ? 'Public' : p === 'friends' ? 'Amis' : 'Privé'}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.modalActions}>
                <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowCreate(false)} testID="cancel-create"><Text style={styles.cancelText}>Annuler</Text></Pressable>
                <Pressable style={[styles.modalBtn, styles.createBtn]} onPress={handleCreateAlbum} testID="confirm-create"><Text style={styles.createText}>Créer</Text></Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Animated.View>
      </SafeAreaView>
      <ProgressToast visible={false} label="" progress={0} />
      <ImageCacheOptimizer imageUris={albums.map(a => a.coverImage).filter(Boolean)} priority="high" maxCacheSize={150} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },
  safeArea: { flex: 1 },
  content: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    paddingHorizontal: 20, 
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EBE3D8',
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 8
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.palette.taupeDeep },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#EBE3D8' },

  createAlbumSection: { paddingHorizontal: 20, paddingVertical: 16 },
  createCard: { borderRadius: 16, overflow: 'hidden' },
  createGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16 },
  createTitle: { fontSize: 14, fontWeight: '800', color: '#000000' },

  filtersContainer: { paddingVertical: 12 },
  filtersContent: { paddingHorizontal: 20, gap: 12 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)' },
  filterChipActive: { backgroundColor: 'rgba(214,192,143,0.25)' },
  filterText: { color: Colors.palette.taupe, fontSize: 14, fontWeight: '600' },
  filterTextActive: { color: Colors.palette.taupeDeep, fontWeight: '800' },

  albumsContainer: { flex: 1, paddingHorizontal: 20 },
  albumsContent: { paddingBottom: 120 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.palette.taupeDeep, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.palette.taupe, textAlign: 'center' },

  albumItem: { marginBottom: 16 },
  albumPressable: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBE3D8' },
  albumImageContainer: { position: 'relative' },
  albumImage: { width: '100%', height: '100%' },
  albumOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%' },
  favoriteButton: { position: 'absolute', top: 12, right: 12, width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  favoriteButtonActive: { backgroundColor: 'rgba(255,68,68,0.9)' },
  albumInfo: { padding: 16, height: 140, justifyContent: 'flex-start' },
  albumName: { fontSize: 16, fontWeight: '700', color: Colors.palette.taupeDeep, marginBottom: 8, minHeight: 48, lineHeight: 24 },
  albumStats: { fontSize: 12, color: Colors.palette.taupe, marginBottom: 4 },
  albumDate: { fontSize: 11, color: Colors.palette.taupe },

  countBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 14, paddingHorizontal: 8, height: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  countText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },

  listFavActive: { backgroundColor: Colors.palette.accentGold },
  searchResultsIndicator: { marginHorizontal: 20, marginTop: 8, backgroundColor: 'rgba(214,192,143,0.12)', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchResultsText: { color: Colors.palette.taupeDeep, fontSize: 14, fontWeight: '700', flex: 1 },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: Colors.light.background, padding: 16, borderTopLeftRadius: 20, borderTopRightRadius: 20, gap: 12 },
  modalTitle: { color: Colors.palette.taupeDeep, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  input: { backgroundColor: '#FFFFFF', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: Colors.palette.taupeDeep, borderWidth: 1, borderColor: '#EBE3D8' },
  privacyRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  privacyChip: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  privacyChipActive: { backgroundColor: 'rgba(214,192,143,0.25)' },
  privacyText: { color: Colors.palette.taupe, fontWeight: '700' },
  privacyTextActive: { color: Colors.palette.taupeDeep },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EBE3D8' },
  createBtn: { backgroundColor: Colors.palette.accentGold },
  cancelText: { color: Colors.palette.taupeDeep, fontWeight: '700' },
  createText: { color: '#000000', fontWeight: '800' },
});