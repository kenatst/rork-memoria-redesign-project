import React, { useMemo } from 'react';
import { View, StyleSheet, Text, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { MapPin, CalendarDays, Users2, Sparkles } from 'lucide-react-native';
import { useAppState } from '@/providers/AppStateProvider';

export default function LocalEventsScreen() {
  const router = useRouter();
  const { getSmartAlbums } = useAppState() as any;
  const events = useMemo(() => getSmartAlbums().byLocation, [getSmartAlbums]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safeArea} edges={['top','bottom']}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Événements autour de vous</Text>
          <Text style={styles.subtitle}>Albums géolocalisés, partagés en temps réel</Text>

          <View style={styles.list}>
            {events.map((ev: any) => (
              <Pressable key={ev.id} style={styles.card} onPress={() => router.push(`/album/${ev.id}`)} testID={`event-${ev.id}`}>
                <Image source={{ uri: ev.coverImage || 'https://images.unsplash.com/photo-1532635224-97aa6b1a4310?q=80&w=1600&auto=format&fit=crop' }} style={styles.cover} contentFit="cover" />
                <LinearGradient colors={['transparent','rgba(0,0,0,0.8)']} style={styles.overlay} />
                <View style={styles.badges}>
                  <View style={styles.badge}><Sparkles size={12} color="#FFD700" /><Text style={styles.badgeText}>LIVE</Text></View>
                  <View style={styles.badge}><Users2 size={12} color="#E8EAF0" /><Text style={styles.badgeText}>{ev.participants ?? 0}</Text></View>
                </View>
                <View style={styles.meta}>
                  <Text numberOfLines={1} style={styles.name}>{ev.name}</Text>
                  <View style={styles.row}><MapPin color={Colors.palette.taupe} size={14} /><Text style={styles.metaText}>{ev.city ?? 'Proche'}</Text></View>
                  <View style={styles.row}><CalendarDays color={Colors.palette.taupe} size={14} /><Text style={styles.metaText}>Aujourd&apos;hui</Text></View>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  content: { padding: 20, paddingBottom: 120, gap: 12 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  subtitle: { color: Colors.palette.taupe, fontSize: 14 },
  list: { gap: 16 },
  card: { borderRadius: 16, overflow: 'hidden', backgroundColor: '#131417' },
  cover: { height: 160, width: '100%' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  badges: { position: 'absolute', top: 8, right: 8, flexDirection: 'row', gap: 8 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  meta: { position: 'absolute', left: 12, right: 12, bottom: 12 },
  name: { color: '#fff', fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  metaText: { color: Colors.palette.taupe, fontSize: 12 },
});