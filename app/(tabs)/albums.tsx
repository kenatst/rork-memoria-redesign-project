import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, Animated, Platform, Dimensions, RefreshControl, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { Camera, Users, Calendar, Heart, Plus, Grid3X3, List, Sparkles, Lock, Globe, Link2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useAuth } from '@/providers/AuthProvider';
import { useAppState } from '@/providers/AppStateProvider';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

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
}

export default function AlbumsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { albums: persistedAlbums, groups: persistedGroups, createAlbum, displayName, favoriteAlbums: favoriteAlbumIds, toggleFavoriteAlbum } = useAppState();

  const [albums, setAlbums] = useState<Album[]>([]);
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = useState<'all' | 'recent' | 'shared' | 'favorites'>('all');
  const [selectedGroup, setSelectedGroup] = useState<string | 'all'>('all');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [showCreate, setShowCreate] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newPrivacy, setNewPrivacy] = useState<Album['privacy']>('private');

  const [fadeAnim] = useState<Animated.Value>(() => new Animated.Value(0));
  const [slideAnim] = useState<Animated.Value>(() => new Animated.Value(40));
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
      lastUpdated: new Date(album.createdAt),
      type: 'personal' as const,
      privacy: 'private' as const,
      groupId: album.groupId,
    }));
    setAlbums(normalized);

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 10, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, [persistedAlbums]);

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

  const handleRefresh = async () => {
    handleHaptic('light');
    setRefreshing(true);
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
    setRefreshing(false);
  };

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
      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>        
        <Animated.View style={[styles.header, { transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.userRow}>
            <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" cachePolicy="memory-disk" transition={150} />
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayName}</Text>
              <Text style={styles.userBio}>Créateur de souvenirs authentiques</Text>
              <Text style={styles.userEmail}>{user?.email ?? 'invité@exemple.com'}</Text>
            </View>
            <Pressable style={[styles.round, styles.cameraBtn]} onPress={() => { handleHaptic('medium'); router.push('/(tabs)/capture'); }} testID="albums-camera-btn">
              <Camera color="#000" size={22} />
            </Pressable>
          </View>
          <Pressable style={styles.linkCard} onPress={() => handleHaptic('light')} testID="universal-link">
            <View style={styles.linkLeft}><Link2 color={Colors.palette.taupe} size={18} /></View>
            <Text style={styles.linkText}>{universalLink}</Text>
          </Pressable>
        </Animated.View>

        <Animated.View style={[styles.filtersBar, { transform: [{ translateY: slideAnim }] }]}>
          {(['all', 'recent', 'shared', 'favorites'] as const).map((key) => {
            const active = filterType === key;
            return (
              <Pressable key={key} style={[styles.chip, active && styles.chipActive]} onPress={() => setFilterType(key)} testID={`chip-${key}`}>
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {key === 'all' ? 'Tous' : key === 'recent' ? 'Récents' : key === 'shared' ? 'Partagés' : 'Favoris'}
                </Text>
              </Pressable>
            );
          })}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupChipsRow}>
            <Pressable onPress={() => setSelectedGroup('all')} style={[styles.groupChip, selectedGroup === 'all' && styles.groupChipActive]} testID="group-all">
              <Text style={[styles.groupChipText, selectedGroup === 'all' && styles.groupChipTextActive]}>Tous groupes</Text>
            </Pressable>
            {groups.map((g) => (
              <Pressable key={g.id} onPress={() => setSelectedGroup(g.id)} style={[styles.groupChip, selectedGroup === g.id && styles.groupChipActive]} testID={`group-${g.id}`}>
                <Text style={[styles.groupChipText, selectedGroup === g.id && styles.groupChipTextActive]}>{g.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.round} onPress={toggleView} testID="toggle-view">
            {viewMode === 'grid' ? <Grid3X3 color={Colors.palette.taupe} size={18} /> : <List color={Colors.palette.taupe} size={18} />}
          </Pressable>
        </Animated.View>

        <Pressable style={styles.createCard} onPress={() => { handleHaptic('medium'); setShowCreate(true); }} testID="create-album">
          <LinearGradient colors={['#1a1a1a', '#2A2D34']} style={styles.createGradient}>
            <View style={styles.createLeft}><Plus color={Colors.palette.taupeDeep} size={20} /></View>
            <View style={styles.createRight}>
              <Text style={styles.createTitle}>Créer un album</Text>
              <Text style={styles.createSub}>Organisez vos souvenirs</Text>
            </View>
          </LinearGradient>
        </Pressable>

        <ScrollView
          style={styles.albumsContainer}
          contentContainerStyle={styles.albumsContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.palette.accentGold} colors={[Colors.palette.accentGold]} progressBackgroundColor="#1a1a1a" />}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            {filteredAlbums.slice(0, 6).map((a) => (
              <Pressable key={a.id} style={styles.quickItem} onPress={() => router.push(`/album/${a.id}`)} testID={`quick-${a.id}`}>
                <Image source={{ uri: a.coverImage }} style={styles.quickImage} contentFit="cover" cachePolicy="memory-disk" transition={150} />
                <Text numberOfLines={1} style={styles.quickLabel}>{a.name}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={viewMode === 'grid' ? styles.albumsGrid : styles.albumsList}>
            {filteredAlbums.map((album, index) => {
              const Icon = AlbumIcon(album.type);
              const PIcon = PrivacyIcon(album.privacy);
              const anim = albumAnimations[index % albumAnimations.length];
              const color = (typeColor as any)[album.type] as string;
              return (
                <Animated.View key={album.id} style={[viewMode === 'grid' ? styles.albumCard : styles.albumListItem, { opacity: anim.opacity, transform: [{ scale: anim.scale }, { translateY: anim.translateY }] }]}>
                  <Pressable style={styles.albumPressable} onPress={() => { handleHaptic('medium'); router.push(`/album/${album.id}`); }} testID={`album-${album.id}`}>
                    {Platform.OS !== 'web' ? (
                      <BlurView intensity={12} style={styles.albumBlur}>
                        <CardInner album={album} Icon={Icon} PIcon={PIcon} color={color} glow={glowAnim} viewMode={viewMode} formatDate={formatDate} onToggleFavorite={() => toggleFavoriteAlbum(album.id)} isFavorite={favoriteAlbumIds.includes(album.id)} />
                      </BlurView>
                    ) : (
                      <View style={[styles.albumBlur, styles.webBlur]}>
                        <CardInner album={album} Icon={Icon} PIcon={PIcon} color={color} glow={glowAnim} viewMode={viewMode} formatDate={formatDate} onToggleFavorite={() => toggleFavoriteAlbum(album.id)} isFavorite={favoriteAlbumIds.includes(album.id)} />
                      </View>
                    )}
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
          <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Nouvel album</Text>
              <TextInput
                style={styles.input}
                placeholder="Nom de l'album"
                placeholderTextColor="#7A6F63"
                value={newName}
                onChangeText={setNewName}
                testID="album-name-input"
              />
              <View style={styles.privacyRow}>
                {(['public','friends','private'] as const).map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => setNewPrivacy(p)}
                    style={[styles.privacyChip, newPrivacy === p && styles.privacyChipActive]}
                    testID={`privacy-${p}`}
                  >
                    <Text style={[styles.privacyText, newPrivacy === p && styles.privacyTextActive]}>
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
                  onPress={() => {
                    if (!newName.trim()) return;
                    const a: Album = {
                      id: String(Date.now()),
                      name: newName.trim(),
                      coverImage: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1600&auto=format&fit=crop',
                      photoCount: 0,
                      createdAt: new Date(),
                      lastUpdated: new Date(),
                      type: 'personal',
                      privacy: newPrivacy,
                    };
                    // Utiliser le provider pour créer l'album
                    createAlbum(newName.trim());
                    setShowCreate(false);
                    setNewName('');
                    setNewPrivacy('private');
                    handleHaptic('medium');
                  }}
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
          <Image source={{ uri: album.coverImage }} style={styles.albumCover} contentFit="cover" cachePolicy="memory-disk" transition={200} />
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
          <View style={styles.albumMeta}><Text style={styles.albumStats}>{album.photoCount} photos</Text></View>
          <Text style={styles.albumDate}>{formatDate(album.lastUpdated)}</Text>
          {groupBadge}
        </View>
      </View>
    );
  }
  return (
    <View style={styles.albumListContent}>
      <View style={styles.albumListImageContainer}>
        <Image source={{ uri: album.coverImage }} style={styles.albumListCover} contentFit="cover" cachePolicy="memory-disk" transition={200} />
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
  safeArea: { flex: 1, paddingTop: 0 },
  content: { flex: 1, paddingTop: 12 },
  header: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8, gap: 12 },
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
  filtersBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)' },
  chipActive: { backgroundColor: 'rgba(255,215,0,0.2)' },
  chipText: { color: Colors.palette.taupe, fontWeight: '700' },
  chipTextActive: { color: '#FFD700' },
  groupChipsRow: { gap: 8, paddingLeft: 8, alignItems: 'center' },
  groupChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', marginRight: 8 },
  groupChipActive: { backgroundColor: 'rgba(255,215,0,0.2)' },
  groupChipText: { color: Colors.palette.taupe, fontSize: 12, fontWeight: '700' },
  groupChipTextActive: { color: '#FFD700' },
  createCard: { marginHorizontal: 20, marginTop: 6, borderRadius: 16, overflow: 'hidden' },
  createGradient: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  createLeft: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  createRight: { flex: 1 },
  createTitle: { fontSize: 16, fontWeight: '800', color: Colors.palette.taupeDeep },
  createSub: { fontSize: 12, color: Colors.palette.taupe },
  quickRow: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  quickItem: { width: 88 },
  quickImage: { width: 88, height: 88, borderRadius: 16, marginBottom: 8 },
  quickLabel: { color: Colors.palette.taupeDeep, fontSize: 12, fontWeight: '700' },
  albumsContainer: { flex: 1, paddingHorizontal: 20 },
  albumsContent: { paddingBottom: 140 },
  webBlur: { backgroundColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(12px)' as any },
  albumsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  albumsList: { gap: 12 },
  albumCard: { width: (screenWidth - 56) / 2, borderRadius: 16, overflow: 'hidden', backgroundColor: '#131417' },
  albumListItem: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#131417' },
  albumPressable: { borderRadius: 16, overflow: 'hidden' },
  albumBlur: { borderRadius: 16 },
  albumCardContent: { borderRadius: 16 },
  albumImageContainer: { position: 'relative', height: 140 },
  albumCover: { width: '100%', height: '100%' },
  albumOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
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
  albumInfo: { padding: 12, gap: 6, backgroundColor: '#131417' },
  albumName: { color: Colors.palette.taupeDeep, fontSize: 14, fontWeight: '700', lineHeight: 18 },
  albumMeta: { flexDirection: 'row', alignItems: 'center' },
  albumStats: { color: Colors.palette.taupe, fontSize: 12 },
  albumDate: { color: Colors.palette.taupe, fontSize: 11 },
  groupBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 4 },
  groupBadgeText: { color: Colors.palette.taupe, fontSize: 10, fontWeight: '700' },
  albumListContent: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  albumListImageContainer: { position: 'relative' },
  albumListCover: { width: 60, height: 60, borderRadius: 12 },
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
});