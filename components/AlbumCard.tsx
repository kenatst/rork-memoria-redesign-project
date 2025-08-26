import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';
import { Sparkles } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');

export interface AlbumCardData {
  id: string;
  name: string;
  coverImage: string;
  photoCount: number;
  lastUpdated: Date;
  isActive?: boolean;
  coverTransform?: { scale: number; offsetX: number; offsetY: number };
}

interface Props {
  album: AlbumCardData;
  viewMode: 'grid' | 'list';
  isFavorite: boolean;
  color: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
  PIcon: React.ComponentType<{ size?: number; color?: string }>;
  glow: Animated.Value;
  formatDate: (d: Date) => string;
  onPress: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  testID?: string;
}

function AlbumCardImpl({ album, viewMode, isFavorite, color, Icon, PIcon, glow, formatDate, onPress, onToggleFavorite, testID }: Props) {
  const handlePress = useCallback(() => onPress(album.id), [onPress, album.id]);
  const handleToggleFavorite = useCallback(() => onToggleFavorite(album.id), [onToggleFavorite, album.id]);
  
  if (viewMode === 'list') {
    return (
      <Pressable style={styles.listRoot} onPress={handlePress} testID={testID} accessibilityRole="button">
        <View style={styles.listImageWrap}>
          <Image source={{ uri: album.coverImage }} style={styles.listCover} contentFit="cover" cachePolicy="memory-disk" transition={150} />
          {album.isActive && (
            <Animated.View style={[styles.listLiveBadge, { opacity: glow }]}>
              <Sparkles size={10} color="#FFD700" />
            </Animated.View>
          )}
        </View>
        <View style={styles.listInfo}>
          <View style={styles.listHeader}>
            <Text numberOfLines={1} style={styles.listName}>{album.name}</Text>
            <View style={styles.listBadges}>
              <Pressable style={[styles.favBtn, isFavorite && styles.favBtnActive]} onPress={handleToggleFavorite} testID={`fav-${album.id}`}>
                <Text style={[styles.favText, isFavorite && styles.favTextActive]}>{isFavorite ? '★' : '☆'}</Text>
              </Pressable>
              <Icon size={16} color={color} />
              <PIcon size={14} color={Colors.palette.taupe} />
            </View>
          </View>
          <Text style={styles.listMeta}>{album.photoCount} photos</Text>
          <Text style={styles.listDate}>{formatDate(album.lastUpdated)}</Text>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable style={styles.gridRoot} onPress={handlePress} testID={testID} accessibilityRole="button">
      <View style={styles.gridImageWrap}>
        <Image source={{ uri: album.coverImage }} style={styles.gridCover} contentFit="cover" cachePolicy="memory-disk" transition={200} />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)"]} style={StyleSheet.absoluteFillObject} />
        {album.isActive && (
          <Animated.View style={[styles.liveBadge, { opacity: glow }]}>
            <Sparkles size={12} color="#FFD700" />
            <Text style={styles.liveText}>LIVE</Text>
          </Animated.View>
        )}
        <View style={styles.gridBadges}>
          <View style={[styles.typeBadge, { backgroundColor: `${color}20` }]}>
            <Icon size={14} color={color} />
          </View>
          <View style={styles.privacyBadge}>
            <PIcon size={12} color="#E8EAF0" />
          </View>
        </View>
        <Pressable style={[styles.favPill, isFavorite && styles.favPillActive]} onPress={handleToggleFavorite} testID={`fav-${album.id}`}>
          <Text style={[styles.favPillText, isFavorite && styles.favPillTextActive]}>{isFavorite ? '★' : '☆'}</Text>
        </Pressable>
      </View>
      <View style={styles.gridInfo}> 
        <Text numberOfLines={2} style={styles.gridName}>{album.name}</Text>
        <Text style={styles.gridStats}>{album.photoCount} photos</Text>
        <Text style={styles.gridDate}>{formatDate(album.lastUpdated)}</Text>
      </View>
    </Pressable>
  );
}

function areEqual(prev: Props, next: Props) {
  return (
    prev.viewMode === next.viewMode &&
    prev.isFavorite === next.isFavorite &&
    prev.album.id === next.album.id &&
    prev.album.name === next.album.name &&
    prev.album.coverImage === next.album.coverImage &&
    prev.album.photoCount === next.album.photoCount &&
    prev.album.lastUpdated.getTime() === next.album.lastUpdated.getTime()
  );
}

const styles = StyleSheet.create({
  gridRoot: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#131417', width: (screenWidth - 48) / 2 },
  gridImageWrap: { height: 140, position: 'relative' },
  gridCover: { width: '100%', height: '100%', backgroundColor: '#1a1a1a' },
  liveBadge: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 4, backgroundColor: 'rgba(255,215,0,0.95)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveText: { color: '#000', fontSize: 10, fontWeight: '800' },
  gridBadges: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 6 },
  typeBadge: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.3)' },
  privacyBadge: { padding: 6, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.5)' },
  favPill: { position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  favPillActive: { backgroundColor: 'rgba(255,215,0,0.9)' },
  favPillText: { color: '#FFFFFF', fontWeight: '800' },
  favPillTextActive: { color: '#000000', fontWeight: '800' },
  gridInfo: { padding: 12, gap: 6, backgroundColor: '#131417', minHeight: 84, justifyContent: 'flex-start' },
  gridName: { color: Colors.palette.taupeDeep, fontSize: 14, fontWeight: '700', minHeight: 36, lineHeight: 18 },
  gridStats: { color: Colors.palette.taupe, fontSize: 12 },
  gridDate: { color: Colors.palette.taupe, fontSize: 11 },

  listRoot: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, borderRadius: 16, backgroundColor: '#131417', minHeight: 84 },
  listImageWrap: { position: 'relative' },
  listCover: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#1a1a1a' },
  listLiveBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FFD700', borderRadius: 8, padding: 2 },
  listInfo: { flex: 1, gap: 4 },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  listName: { color: Colors.palette.taupeDeep, fontSize: 16, fontWeight: '700', flex: 1 },
  listBadges: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  favBtn: { backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  favBtnActive: { backgroundColor: '#FFD700' },
  favText: { color: '#FFFFFF', fontWeight: '800' },
  favTextActive: { color: '#000000' },
  listMeta: { color: Colors.palette.taupe, fontSize: 13 },
  listDate: { color: Colors.palette.taupe, fontSize: 12 },
});

export const AlbumCard = memo(AlbumCardImpl, areEqual);
