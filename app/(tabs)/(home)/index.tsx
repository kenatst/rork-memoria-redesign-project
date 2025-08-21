import React, { useEffect, useMemo, useState, useCallback } from "react";
import { View, StyleSheet, Text, ScrollView, Pressable, RefreshControl, Animated, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, Redirect } from "expo-router";
import { Image } from "expo-image";
import Colors from "@/constants/colors";
import { Sparkles, QrCode, Images as ImagesIcon, Bell, Calendar, Zap, Shield, Globe, Wifi, WifiOff, Share2, BarChart3 } from "lucide-react-native";
import { useAppState } from "@/providers/AppStateProvider";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/providers/AuthProvider";

export default function HomeScreen() {
  const router = useRouter();
  const { displayName, points, onboardingComplete } = useAppState();
  const { isAuthenticated } = useAuth();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [notifications, setNotifications] = useState<number>(3);
  const fadeAnim = useState(() => new Animated.Value(0))[0];
  const scaleAnim = useState(() => new Animated.Value(0.9))[0];
  const glowAnim = useState(() => new Animated.Value(0))[0];
  const pulseAnim = useState(() => new Animated.Value(1))[0];
  const floatAnim = useState(() => new Animated.Value(0))[0];


  useEffect(() => {
    // Animations d'entrée révolutionnaires
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de glow pulsant
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation de pulse pour les notifications
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Animation de flottement
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Simulation de statut réseau
    const networkInterval = setInterval(() => {
      setIsOnline(prev => Math.random() > 0.1 ? true : prev);
    }, 5000);

    return () => clearInterval(networkInterval);
  }, []);

  const handleHapticFeedback = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const handleRefresh = async () => {
    handleHapticFeedback();
    setRefreshing(true);
    // Simulation de sync intelligente
    await new Promise(resolve => setTimeout(resolve, 1500));
    setNotifications(prev => prev + Math.floor(Math.random() * 3));
    setRefreshing(false);
  };

  const { albums } = useAppState();
  
  const heroImages = useMemo(() => {
    const albumPhotos = albums.flatMap(album => album.photos).slice(0, 3);
    if (albumPhotos.length === 0) {
      return [
        "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=2000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=2000&auto=format&fit=crop",
        "https://images.unsplash.com/photo-1519681393784-d120267933ba?q=80&w=2000&auto=format&fit=crop",
      ];
    }
    return albumPhotos;
  }, [albums]);

  if (!isAuthenticated || !onboardingComplete) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#000000', '#0B0B0D', '#131417']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
      
      <Animated.View style={[styles.animatedContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          testID="home-scroll"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.palette.accentGold}
              colors={[Colors.palette.accentGold]}
              progressBackgroundColor="#1a1a1a"
            />
          }
        >


          <View style={styles.hero} testID="home-hero">
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {heroImages.map((uri, index) => (
                <View key={uri} style={styles.heroImageContainer}>
                  <Image
                    source={{ uri }}
                    style={styles.heroImage}
                    contentFit="cover"
                    transition={500}
                  />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.9)']}
                    style={styles.heroGradient}
                  />
                </View>
              ))}
            </ScrollView>
            {Platform.OS !== 'web' ? (
              <BlurView intensity={20} style={styles.heroOverlay}>
                <Animated.View style={{ opacity: glowAnim }}>
                  <ImagesIcon color={Colors.palette.accentGold} size={32} />
                </Animated.View>
                <Text style={styles.heroTitle}>Vos Albums Photos</Text>
                <Text style={styles.heroSubtitle}>Accès direct • Organisation intelligente • Partage instantané</Text>
              </BlurView>
            ) : (
              <View style={[styles.heroOverlay, styles.webBlur]}>
                <Animated.View style={{ opacity: glowAnim }}>
                  <ImagesIcon color={Colors.palette.accentGold} size={32} />
                </Animated.View>
                <Text style={styles.heroTitle}>Vos Albums Photos</Text>
                <Text style={styles.heroSubtitle}>Accès direct • Organisation intelligente • Partage instantané</Text>
              </View>
            )}
          </View>

          <View style={styles.actionsGrid}>
            <Pressable
              style={[styles.card, styles.primaryCard]}
              onPress={() => {
                handleHapticFeedback();
                router.push("/qr-scan");
              }}
              testID="scan-qr"
            >
              <LinearGradient
                colors={['#1a1a1a', '#2d2d2d']}
                style={styles.cardGradient}
              >
                <View style={styles.cardIcon}>
                  <QrCode color={Colors.palette.accentGold} size={28} />
                </View>
                <Text style={styles.cardTitle}>Scanner QR</Text>
                <Text style={styles.cardSub}>Invitations • Partage instantané</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={[styles.card, styles.secondaryCard]}
              onPress={() => {
                handleHapticFeedback();
                router.push("/(tabs)/albums");
              }}
              testID="open-albums"
            >
              <LinearGradient
                colors={['#131417', '#2A2D34']}
                style={styles.cardGradient}
              >
                <View style={styles.cardIcon}>
                  <ImagesIcon color={Colors.palette.taupeDeep} size={28} />
                </View>
                <Text style={styles.cardTitle}>Albums</Text>
                <Text style={styles.cardSub}>Vos collections photos</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={[styles.card, styles.tertiaryCard]}
              onPress={() => {
                handleHapticFeedback();
                router.push("/(tabs)/capture");
              }}
              testID="open-capture"
            >
              <LinearGradient
                colors={['#0B0B0D', '#1a1a1a']}
                style={styles.cardGradient}
              >
                <View style={styles.cardIcon}>
                  <ImagesIcon color={Colors.palette.taupe} size={28} />
                </View>
                <Text style={styles.cardTitle}>Capture</Text>
                <Text style={styles.cardSub}>Caméra rapide</Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              style={[styles.card, styles.quaternaryCard]}
              onPress={() => {
                handleHapticFeedback();
                router.push("/(tabs)/groups");
              }}
              testID="open-groups"
            >
              <LinearGradient
                colors={['#2A2D34', '#131417']}
                style={styles.cardGradient}
              >
                <View style={styles.cardIcon}>
                  <Shield color={Colors.palette.taupe} size={28} />
                </View>
                <Text style={styles.cardTitle}>Groupes</Text>
                <Text style={styles.cardSub}>Albums partagés</Text>
              </LinearGradient>
            </Pressable>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>Événements Géolocalisés</Text>
                <Text style={styles.sectionSub}>IA • Géofencing • Modération temps réel</Text>
                {!isOnline && (
                  <Animated.View style={[styles.offlineIndicator, { opacity: floatAnim }]}>
                    <WifiOff size={16} color="#FF4444" />
                    <Text style={styles.offlineText}>Mode hors-ligne</Text>
                  </Animated.View>
                )}
              </View>
              <View style={styles.headerActions}>
                <Pressable 
                  style={styles.actionButton}
                  onPress={() => {
                    handleHapticFeedback();
                    router.push('/(tabs)/profile');
                  }}
                  testID="view-profile"
                >
                  <BarChart3 color={Colors.palette.taupe} size={20} />
                </Pressable>
                <Pressable 
                  style={styles.actionButton}
                  onPress={() => {
                    handleHapticFeedback();
                    // Partage social
                  }}
                >
                  <Share2 color={Colors.palette.taupe} size={20} />
                </Pressable>
                <Pressable onPress={() => {
                  handleHapticFeedback();
                  router.push("/(tabs)/albums");
                }}>
                  <Globe color={Colors.palette.taupe} size={24} />
                </Pressable>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 16 }}>
              {albums.length > 0 ? albums.map((album) => (
                <Pressable 
                  key={album.id} 
                  style={styles.albumCard} 
                  testID={`album-card-${album.id}`} 
                  onPress={() => {
                    handleHapticFeedback();
                    router.push(`/album/${album.id}`);
                  }}
                >
                  <View style={styles.albumImageContainer}>
                    <Image
                      source={{ uri: album.coverImage || "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1600&auto=format&fit=crop" }}
                      style={styles.albumCover}
                      contentFit="cover"
                    />
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.8)']}
                      style={styles.albumOverlay}
                    />
                    <View style={[styles.statusBadge, styles.publicBadge]}>
                      <Text style={styles.statusText}>ALBUM</Text>
                    </View>
                  </View>
                  <View style={styles.albumInfo}>
                    <Text style={styles.albumTitle}>{album.name}</Text>
                    <Text style={styles.albumMeta}>{album.photos.length} photos</Text>
                  </View>
                </Pressable>
              )) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>Aucun album créé</Text>
                  <Text style={styles.emptySubtext}>Créez votre premier album pour voir vos photos ici</Text>
                </View>
              )}
            </ScrollView>
          </View>


        </ScrollView>
      </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  animatedContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 120,
  },

  offlineIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  offlineText: {
    color: '#FF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },

  hero: {
    height: 320,
    borderRadius: 24,
    marginHorizontal: 20,
    marginTop: 20,
    overflow: "hidden",
    backgroundColor: '#1a1a1a',
  },
  heroImageContainer: {
    width: 340,
    height: 320,
    marginRight: 8,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroOverlay: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 20,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  webBlur: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(20px)',
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    textAlign: 'center',
  },
  heroSubtitle: {
    color: "#E8EAF0",
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.9,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: 'wrap',
    gap: 16,
    paddingHorizontal: 20,
    marginTop: 24,
  },
  card: {
    width: '47%',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryCard: {},
  secondaryCard: {},
  tertiaryCard: {},
  quaternaryCard: {},
  cardGradient: {
    padding: 20,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  cardIcon: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.palette.taupeDeep,
    marginBottom: 4,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.palette.taupe,
    opacity: 0.8,
  },
  section: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.palette.taupeDeep,
  },
  sectionSub: {
    fontSize: 13,
    color: Colors.palette.taupe,
    marginTop: 4,
    opacity: 0.8,
  },
  albumCard: {
    width: 180,
    marginRight: 16,
    borderRadius: 16,
    backgroundColor: '#131417',
    overflow: "hidden",
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  albumImageContainer: {
    position: 'relative',
  },
  albumCover: {
    width: "100%",
    height: 120,
  },
  albumOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  liveBadge: {
    backgroundColor: '#FF4444',
  },
  privateBadge: {
    backgroundColor: '#9B59B6',
  },
  publicBadge: {
    backgroundColor: '#2ECC71',
  },
  endingBadge: {
    backgroundColor: '#F39C12',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  albumInfo: {
    padding: 12,
    gap: 4,
  },
  albumTitle: {
    color: Colors.palette.taupeDeep,
    fontWeight: "700",
    fontSize: 14,
  },
  albumMeta: {
    color: Colors.palette.taupe,
    fontSize: 12,
    opacity: 0.8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: Colors.palette.taupeDeep,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: Colors.palette.taupe,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },

});