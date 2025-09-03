import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable, RefreshControl, Animated, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Redirect } from 'expo-router';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { Plus, Users2, FolderOpen, Camera, ChevronRight, Shield, Clock } from 'lucide-react-native';
import { useAppState } from '@/providers/AppStateProvider';
import * as Haptics from 'expo-haptics';

export default function HomeScreen() {
  const router = useRouter();
  const { displayName, onboardingComplete, groups, albums } = useAppState() as any;
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const fade = useState(() => new Animated.Value(0))[0];
  const slide = useState(() => new Animated.Value(20))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(slide, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleHaptic = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleRefresh = async () => {
    handleHaptic();
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 800));
    setRefreshing(false);
  };

  const stats = useMemo(() => {
    const photosCount = albums?.reduce((sum: number, a: any) => sum + (a.photos?.length ?? 0), 0) ?? 0;
    const videosCount = albums?.reduce((sum: number, a: any) => sum + (a.videos?.length ?? 0), 0) ?? 0;
    return [
      { label: 'Photos', value: photosCount },
      { label: 'Vidéos', value: videosCount },
      { label: 'Albums', value: albums?.length ?? 0 },
    ] as const;
  }, [albums]);

  if (!onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  const recentGroups = (groups ?? []).slice(0, 6);
  const recentAlbums = (albums ?? []).slice(0, 5);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          testID="dashboard-scroll"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.palette.accentGold}
              colors={[Colors.palette.accentGold]}
              progressBackgroundColor={Colors.light.background}
            />
          }
        >
          <Animated.View style={[styles.header, { opacity: fade, transform: [{ translateY: slide }] }]}>
            <View style={styles.headerLeft}>
              <Text style={styles.brand}>Memoria</Text>
              <Text style={styles.period}>Ce mois</Text>
            </View>
            <Pressable
              onPress={() => router.push('/profile')}
              style={styles.avatarBtn}
              testID="open-profile"
            >
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=300&auto=format&fit=crop' }}
                style={styles.avatar}
              />
            </Pressable>
          </Animated.View>

          <View style={styles.statsRow}>
            {stats.map((s, idx) => (
              <View key={s.label + idx} style={styles.statCard} testID={`stat-${s.label}`}>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Groupes récents</Text>
            <Pressable onPress={() => router.push('/(tabs)/groups')} style={styles.seeAll} testID="see-all-groups">
              <Text style={styles.seeAllText}>Voir tout</Text>
              <ChevronRight color={Colors.palette.taupe} size={16} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupsRow}>
            {recentGroups.map((g: any) => (
              <Pressable key={g.id} style={styles.groupCard} onPress={() => router.push(`/group/${g.id}`)} testID={`group-${g.id}`}>
                <Image source={{ uri: g.coverImage || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop' }} style={styles.groupCover} contentFit="cover" />
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName} numberOfLines={1}>{g.name}</Text>
                  <Text style={styles.groupMeta} numberOfLines={1}>{(g.members?.length ?? 0)} membres</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Albums récents</Text>
            <Pressable onPress={() => router.push('/(tabs)/albums')} style={styles.seeAll} testID="see-all-albums">
              <Text style={styles.seeAllText}>Voir tout</Text>
              <ChevronRight color={Colors.palette.taupe} size={16} />
            </Pressable>
          </View>

          <View style={styles.albumHighlight}>
            {recentAlbums.length > 0 ? (
              <>
                <View style={styles.highlightLeft}>
                  <Image source={{ uri: recentAlbums[0].coverImage || 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1200&auto=format&fit=crop' }} style={styles.highlightMain} contentFit="cover" />
                </View>
                <View style={styles.highlightRight}>
                  {(recentAlbums[1]?.photos ?? []).slice(0,3).length > 0 ? (
                    <Image source={{ uri: recentAlbums[1].coverImage || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop' }} style={styles.highlightSmall} contentFit="cover" />
                  ) : (
                    <Image source={{ uri: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop' }} style={styles.highlightSmall} contentFit="cover" />
                  )}
                  <Image source={{ uri: recentAlbums[2]?.coverImage || 'https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=1200&auto=format&fit=crop' }} style={styles.highlightSmall} contentFit="cover" />
                </View>
              </>
            ) : (
              <View style={styles.albumEmpty}><Text style={styles.albumEmptyText}>Créez votre premier album</Text></View>
            )}
          </View>

          <View style={styles.ctaRow}>
            <Pressable style={[styles.ctaCard, styles.ctaPrimary]} onPress={() => { handleHaptic(); router.push('/(tabs)/albums'); }} testID="cta-create-album">
              <Plus color="#000" size={18} />
              <Text style={styles.ctaText}>Créer un album</Text>
            </Pressable>
            <Pressable style={[styles.ctaCard, styles.ctaSecondary]} onPress={() => router.push('/(tabs)/groups')} testID="cta-create-group">
              <Users2 color={Colors.palette.taupeDeep} size={18} />
              <Text style={styles.ctaTextSecondary}>Créer un groupe</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.palette.beige },
  safeArea: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 120 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 },
  headerLeft: { gap: 2 },
  brand: { fontSize: 28, fontWeight: '900', color: Colors.palette.taupeDeep },
  period: { fontSize: 12, color: Colors.palette.taupe },
  avatarBtn: { width: 36, height: 36, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: Colors.palette.taupeSoft },
  avatar: { width: '100%', height: '100%' },
  statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  statCard: { flex: 1, backgroundColor: Colors.palette.card, borderRadius: 16, paddingVertical: 18, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 2 },
  statValue: { fontSize: 22, fontWeight: '900', color: Colors.palette.taupeDeep },
  statLabel: { marginTop: 4, fontSize: 12, color: Colors.palette.taupe },
  sectionHeader: { marginTop: 24, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.palette.taupeDeep },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 10, backgroundColor: Colors.palette.card },
  seeAllText: { color: Colors.palette.taupe, fontSize: 12, fontWeight: '700' },
  groupsRow: { paddingHorizontal: 20, gap: 12, paddingVertical: 12 },
  groupCard: { width: 160, borderRadius: 16, overflow: 'hidden', backgroundColor: Colors.palette.card },
  groupCover: { width: '100%', height: 110 },
  groupInfo: { padding: 10, gap: 2 },
  groupName: { color: Colors.palette.taupeDeep, fontWeight: '700' },
  groupMeta: { color: Colors.palette.taupe, fontSize: 12 },
  albumHighlight: { marginTop: 8, marginHorizontal: 20, backgroundColor: Colors.palette.card, borderRadius: 16, overflow: 'hidden', flexDirection: 'row', gap: 8, padding: 8 },
  highlightLeft: { flex: 2 },
  highlightRight: { flex: 1, gap: 8 },
  highlightMain: { width: '100%', height: 140, borderRadius: 12 },
  highlightSmall: { width: '100%', height: 66, borderRadius: 12 },
  albumEmpty: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  albumEmptyText: { color: Colors.palette.taupe, fontWeight: '700' },
  ctaRow: { marginTop: 16, paddingHorizontal: 20, flexDirection: 'row', gap: 12 },
  ctaCard: { flex: 1, borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  ctaPrimary: { backgroundColor: Colors.palette.accentGold },
  ctaSecondary: { backgroundColor: Colors.palette.card },
  ctaText: { color: '#000', fontWeight: '800' },
  ctaTextSecondary: { color: Colors.palette.taupeDeep, fontWeight: '800' },
});