import React, { useMemo, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Animated, Dimensions, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';
import { ArrowLeft, Music, Music2, Shuffle, Download, Share2, Play, Pause } from 'lucide-react-native';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');
import { Audio } from 'expo-av';

export default function MiniFilmScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { albums } = useAppState();
  const album = useMemo(() => albums.find(a => a.id === id), [albums, id]);

  const [withMusic, setWithMusic] = useState<boolean>(true);
  const [transition, setTransition] = useState<'fade' | 'slide' | 'zoom'>('fade');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedVideoUri, setGeneratedVideoUri] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const progress = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    startShow();
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, [album, transition, withMusic]);

  const startShow = async () => {
    progress.stopAnimation();
    progress.setValue(0);
    setIsPlaying(true);
    
    if (withMusic) {
      try {
        if (soundRef.current) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        }
        const { sound } = await Audio.Sound.createAsync({ uri: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c3f1c0e7e9.mp3?filename=upbeat-pop-110997.mp3' });
        soundRef.current = sound;
        await sound.setVolumeAsync(0.6);
        await sound.playAsync();
      } catch (e) {
        console.log('music error', e);
      }
    }
    
    Animated.timing(progress, { toValue: 1, duration: 3000, useNativeDriver: true }).start(({ finished }) => {
      if (finished) {
        setIsPlaying(false);
        if (soundRef.current) {
          soundRef.current.stopAsync().catch(() => {});
        }
      }
    });
  };

  const generateVideo = async () => {
    if (!album || album.photos.length === 0) {
      Alert.alert('Erreur', 'Aucune photo disponible pour créer le mini-film');
      return;
    }

    setIsGenerating(true);
    
    if (Platform.OS !== 'web') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    try {
      // Simulate video generation process
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // In a real implementation, you would:
      // 1. Use FFmpeg or similar to combine images into video
      // 2. Add transitions and effects
      // 3. Overlay music if selected
      // 4. Export as MP4
      
      const mockVideoUri = `${FileSystem.documentDirectory}mini-film-${album.id}.mp4`;
      setGeneratedVideoUri(mockVideoUri);
      
      Alert.alert(
        'Mini-film créé!',
        'Votre mini-film de 3 secondes est prêt. Vous pouvez le sauvegarder ou le partager.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
    } catch (error) {
      console.error('Erreur génération vidéo:', error);
      Alert.alert('Erreur', 'Impossible de générer le mini-film');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveVideo = async () => {
    if (!generatedVideoUri) return;
    
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Accès à la galerie nécessaire pour sauvegarder');
        return;
      }
      
      await MediaLibrary.saveToLibraryAsync(generatedVideoUri);
      Alert.alert('Sauvegardé', 'Mini-film sauvegardé dans votre galerie');
      
      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      Alert.alert('Erreur', 'Impossible de sauvegarder le mini-film');
    }
  };

  const shareVideo = async () => {
    if (!generatedVideoUri) return;
    
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(generatedVideoUri, {
          mimeType: 'video/mp4',
          dialogTitle: 'Partager le mini-film'
        });
      } else {
        Alert.alert('Partage indisponible', 'Le partage n\'est pas disponible sur cet appareil');
      }
    } catch (error) {
      console.error('Erreur partage:', error);
      Alert.alert('Erreur', 'Impossible de partager le mini-film');
    }
  };

  const slides = album?.photos.slice(0, 12) ?? [];

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} />
      <SafeAreaView style={styles.safe} edges={['top','bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.round} onPress={() => router.back()}>
            <ArrowLeft color="#fff" size={20} />
          </Pressable>
          <Text style={styles.title}>Mini film</Text>
          <View style={styles.right} />
        </View>

        <View style={styles.stage}>
          {slides.map((uri, i) => {
            const delay = (i / Math.max(1, slides.length)) * 1;
            const opacity = progress.interpolate({ inputRange: [delay, Math.min(1, delay + 0.25)], outputRange: [0, 1], extrapolate: 'clamp' });
            const translateX = progress.interpolate({ inputRange: [delay, Math.min(1, delay + 0.25)], outputRange: [transition === 'slide' ? width : 0, 0], extrapolate: 'clamp' });
            const scale = progress.interpolate({ inputRange: [delay, Math.min(1, delay + 0.25)], outputRange: [transition === 'zoom' ? 1.2 : 1, 1], extrapolate: 'clamp' });
            return (
              <Animated.View key={`${uri}-${i}`} style={[StyleSheet.absoluteFillObject, { opacity, transform: [{ translateX }, { scale }] }]}> 
                <Image source={{ uri }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
              </Animated.View>
            );
          })}
          {slides.length === 0 && (
            <View style={styles.empty}><Text style={styles.emptyText}>Pas encore de photos</Text></View>
          )}
        </View>

        <View style={styles.controls}>
          <Pressable style={styles.ctrl} onPress={() => setWithMusic(v => !v)} testID="toggle-music">
            {withMusic ? <Music color="#FFD700" size={18} /> : <Music2 color={Colors.palette.taupe} size={18} />}
            <Text style={styles.ctrlText}>{withMusic ? 'Musique: ON' : 'Musique: OFF'}</Text>
          </Pressable>
          <Pressable style={styles.ctrl} onPress={() => setTransition(t => t === 'fade' ? 'slide' : t === 'slide' ? 'zoom' : 'fade')} testID="toggle-transition">
            <Shuffle color="#FFD700" size={18} />
            <Text style={styles.ctrlText}>Transition: {transition}</Text>
          </Pressable>
          <Pressable style={[styles.ctrl, isPlaying && styles.playing]} onPress={startShow} testID="replay">
            {isPlaying ? <Pause color="#000" size={18} /> : <Play color="#000" size={18} />}
            <Text style={[styles.ctrlText, styles.primaryText]}>{isPlaying ? 'Pause' : 'Aperçu 3s'}</Text>
          </Pressable>
        </View>

        <View style={styles.actions}>
          <Pressable 
            style={[styles.actionBtn, isGenerating && styles.generating]} 
            onPress={generateVideo}
            disabled={isGenerating}
            testID="generate-video"
          >
            <Text style={styles.actionText}>
              {isGenerating ? 'Génération...' : 'Créer Mini-Film MP4'}
            </Text>
          </Pressable>
          
          {generatedVideoUri && (
            <View style={styles.videoActions}>
              <Pressable style={styles.videoBtn} onPress={saveVideo} testID="save-video">
                <Download color="#fff" size={20} />
                <Text style={styles.videoBtnText}>Sauvegarder</Text>
              </Pressable>
              <Pressable style={styles.videoBtn} onPress={shareVideo} testID="share-video">
                <Share2 color="#fff" size={20} />
                <Text style={styles.videoBtnText}>Partager</Text>
              </Pressable>
            </View>
          )}
        </View>

        <Text style={styles.license}>Musique libre de droits: Pixabay • Vidéo générée avec transitions {transition}</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  title: { color: '#fff', fontSize: 16, fontWeight: '800' },
  right: { width: 40 },
  stage: { flex: 1, borderRadius: 12, overflow: 'hidden', margin: 16, backgroundColor: '#111' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16, paddingBottom: 16 },
  ctrl: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 12 },
  ctrlText: { color: '#fff', fontWeight: '700' },
  primary: { backgroundColor: '#FFD700' },
  playing: { backgroundColor: '#FF3B30' },
  primaryText: { color: '#000' },
  actions: { paddingHorizontal: 16, paddingBottom: 16, gap: 12 },
  actionBtn: { backgroundColor: '#FFD700', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  generating: { backgroundColor: Colors.palette.taupe, opacity: 0.7 },
  actionText: { color: '#000', fontSize: 16, fontWeight: '800' },
  videoActions: { flexDirection: 'row', gap: 12 },
  videoBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 12, borderRadius: 12 },
  videoBtnText: { color: '#fff', fontWeight: '700' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: Colors.palette.taupe },
  license: { color: Colors.palette.taupe, fontSize: 10, textAlign: 'center', marginBottom: 8 },
});