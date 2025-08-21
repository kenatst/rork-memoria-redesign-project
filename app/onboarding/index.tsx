import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, StyleSheet, Text, ScrollView, Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, Animated, Platform, TextInput, Alert, KeyboardAvoidingView } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import Colors from "@/constants/colors";
import { useAppState } from "@/providers/AppStateProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Sparkles, Camera, Users, Zap, Heart, Mail, Lock, User } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

interface Slide {
  id: string;
  title: string;
  subtitle: string;
  uri: string;
  icon: React.ComponentType<any>;
  gradient: string[];
}

export default function Onboarding() {
  const { setOnboardingComplete } = useAppState();
  const { signIn, signUp, isLoading } = useAuth();
  const router = useRouter();
  const [index, setIndex] = useState<number>(0);
  const [showAuth, setShowAuth] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const ref = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(Array.from({ length: 20 }, () => new Animated.Value(0))).current;

  const slides = useMemo<Slide[]>(
    () => [
      {
        id: "1",
        title: "Memoria",
        subtitle: "L'app photo révolutionnaire du siècle. Capturez, partagez, vibrez.",
        uri: "https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?q=80&w=2000&auto=format&fit=crop",
        icon: Sparkles,
        gradient: ["#000000", "#1a1a1a", "#2d2d2d"]
      },
      {
        id: "2",
        title: "Événements Éphémères",
        subtitle: "QR codes exclusifs pour soirées, mariages, festivals. Accès vérifié par géolocalisation.",
        uri: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=2000&auto=format&fit=crop",
        icon: Camera,
        gradient: ["#0a0a0a", "#1f1f23", "#2a2a2e"]
      },
      {
        id: "3",
        title: "Partage Intime",
        subtitle: "Albums privés familles, couples, amis. Sécurité cryptée, modération IA.",
        uri: "https://images.unsplash.com/photo-1511988617509-a57c8a288659?q=80&w=2000&auto=format&fit=crop",
        icon: Users,
        gradient: ["#0d0d0f", "#1c1c20", "#292932"]
      },
      {
        id: "4",
        title: "IA Révolutionnaire",
        subtitle: "Curation automatique, filtres AR sensuels, détection fraude temps réel.",
        uri: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?q=80&w=2000&auto=format&fit=crop",
        icon: Zap,
        gradient: ["#0b0b0d", "#1e1e22", "#2c2c30"]
      },
      {
        id: "5",
        title: "Votre Histoire Commence",
        subtitle: "Rejoignez des millions d'utilisateurs. Gamification, points, badges exclusifs.",
        uri: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2000&auto=format&fit=crop",
        icon: Heart,
        gradient: ["#000000", "#1a1a1a", "#333333"]
      },
    ],
    []
  );

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation des particules
    const animateParticles = () => {
      particleAnims.forEach((anim, i) => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000 + i * 100,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 2000 + i * 100,
              useNativeDriver: true,
            }),
          ])
        ).start();
      });
    };
    animateParticles();
  }, []);

  useEffect(() => {
    // Animation de slide
    Animated.spring(slideAnim, {
      toValue: index,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, [index]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / width);
    if (i !== index) setIndex(i);
  };

  const handleComplete = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setShowAuth(true);
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (authMode === 'signup' && !displayName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer votre nom');
      return;
    }

    try {
      if (authMode === 'signin') {
        await signIn(email, password);
      } else {
        await signUp(email, password, displayName);
      }
      
      setOnboardingComplete(true);
      router.replace("/(tabs)/capture");
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de se connecter');
    }
  };

  const currentSlide = slides[index];

  if (showAuth) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#000000', '#0B0B0D', '#131417']}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Particules */}
        {particleAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: `${(i * 5.26) % 100}%`,
                top: `${(i * 7.89) % 100}%`,
                opacity: anim,
              },
            ]}
          />
        ))}
        
        <KeyboardAvoidingView style={styles.keyboardContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View style={[
            styles.authContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}>
            <View style={styles.authHeader}>
              <Sparkles color={Colors.palette.accentGold} size={48} />
              <Text style={styles.authTitle}>Memoria</Text>
              <Text style={styles.authSubtitle}>L'app photo révolutionnaire</Text>
            </View>
            
            <View style={styles.authTabs}>
              <Pressable 
                style={[styles.authTab, authMode === 'signin' && styles.authTabActive]}
                onPress={() => setAuthMode('signin')}
              >
                <Text style={[styles.authTabText, authMode === 'signin' && styles.authTabTextActive]}>
                  Connexion
                </Text>
              </Pressable>
              <Pressable 
                style={[styles.authTab, authMode === 'signup' && styles.authTabActive]}
                onPress={() => setAuthMode('signup')}
              >
                <Text style={[styles.authTabText, authMode === 'signup' && styles.authTabTextActive]}>
                  Inscription
                </Text>
              </Pressable>
            </View>
            
            <View style={styles.authForm}>
              {authMode === 'signup' && (
                <View style={styles.inputGroup}>
                  <View style={styles.inputContainer}>
                    <User color={Colors.palette.taupe} size={20} style={styles.inputIcon} />
                    <TextInput
                      style={styles.authInput}
                      value={displayName}
                      onChangeText={setDisplayName}
                      placeholder="Nom d'utilisateur"
                      placeholderTextColor={Colors.palette.taupe}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}
              
              <View style={styles.inputGroup}>
                <View style={styles.inputContainer}>
                  <Mail color={Colors.palette.taupe} size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.authInput}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor={Colors.palette.taupe}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              <View style={styles.inputGroup}>
                <View style={styles.inputContainer}>
                  <Lock color={Colors.palette.taupe} size={20} style={styles.inputIcon} />
                  <TextInput
                    style={styles.authInput}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Mot de passe"
                    placeholderTextColor={Colors.palette.taupe}
                    secureTextEntry
                  />
                </View>
              </View>
              
              <Pressable 
                style={styles.authButton}
                onPress={handleAuth}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#FFD700', '#FFA500', '#FF6B35']}
                  style={styles.authButtonGradient}
                >
                  <Text style={styles.authButtonText}>
                    {isLoading ? 'Chargement...' : 
                     authMode === 'signin' ? 'Se connecter' : 'S\'inscrire'}
                  </Text>
                </LinearGradient>
              </Pressable>
              
              <Pressable 
                style={styles.backButton}
                onPress={() => setShowAuth(false)}
              >
                <Text style={styles.backButtonText}>Retour</Text>
              </Pressable>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="onboarding">
      {/* Particules flottantes */}
      {particleAnims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              left: `${(i * 5.26) % 100}%`,
              top: `${(i * 7.89) % 100}%`,
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -50],
                  }),
                },
                {
                  scale: anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 1, 0],
                  }),
                },
              ],
            },
          ]}
        />
      ))}

      {/* Gradient de fond dynamique */}
      <LinearGradient
        colors={currentSlide?.gradient as [string, string, ...string[]] || ["#000000", "#1a1a1a", "#2d2d2d"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
      >
        {slides.map((slide, slideIndex) => {
          const SlideIcon = slide.icon;
          return (
            <View key={slide.id} style={[styles.slide, { width }]}>
              {/* Image de fond avec effet parallax */}
              <Animated.View
                style={[
                  styles.imageContainer,
                  {
                    transform: [
                      {
                        translateX: slideAnim.interpolate({
                          inputRange: [slideIndex - 1, slideIndex, slideIndex + 1],
                          outputRange: [width * 0.3, 0, -width * 0.3],
                          extrapolate: 'clamp',
                        }),
                      },
                      {
                        scale: slideAnim.interpolate({
                          inputRange: [slideIndex - 1, slideIndex, slideIndex + 1],
                          outputRange: [1.2, 1, 1.2],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Image 
                  source={{ uri: slide.uri }} 
                  style={styles.slideImage} 
                  contentFit="cover"
                  transition={500}
                />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
                  style={styles.imageOverlay}
                />
              </Animated.View>

              {/* Contenu avec animations */}
              <Animated.View
                style={[
                  styles.content,
                  {
                    opacity: fadeAnim,
                    transform: [
                      { scale: scaleAnim },
                      {
                        translateY: slideAnim.interpolate({
                          inputRange: [slideIndex - 1, slideIndex, slideIndex + 1],
                          outputRange: [50, 0, -50],
                          extrapolate: 'clamp',
                        }),
                      },
                    ],
                  },
                ]}
              >
                {/* Icône avec glow effect */}
                <View style={styles.iconContainer}>
                  <View style={styles.iconGlow} />
                  <SlideIcon size={48} color="#FFFFFF" strokeWidth={1.5} />
                </View>

                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.subtitle}>{slide.subtitle}</Text>
              </Animated.View>
            </View>
          );
        })}
      </ScrollView>

      {/* Indicateurs avec animation */}
      <View style={styles.indicators}>
        {slides.map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.indicator,
              {
                opacity: index === i ? 1 : 0.3,
                transform: [
                  {
                    scale: index === i ? 1.2 : 1,
                  },
                ],
              },
            ]}
          />
        ))}
      </View>

      {/* Boutons avec blur effect */}
      <View style={styles.buttonsContainer}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={20} style={styles.blurContainer}>
            <View style={styles.buttonsRow}>
              <Pressable 
                style={styles.skipButton} 
                onPress={handleComplete}
                testID="skip"
              >
                <Text style={styles.skipText}>Passer</Text>
              </Pressable>
              
              <Pressable
                style={styles.nextButton}
                onPress={() => {
                  if (index < slides.length - 1) {
                    ref.current?.scrollTo({ x: (index + 1) * width, animated: true });
                  } else {
                    handleComplete();
                  }
                }}
                testID="next"
              >
                <LinearGradient
                  colors={['#FFFFFF', '#E8EAF0']}
                  style={styles.nextGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.nextText}>
                    {index < slides.length - 1 ? "Suivant" : "Commencer"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.blurContainer, styles.webBlur]}>
            <View style={styles.buttonsRow}>
              <Pressable 
                style={styles.skipButton} 
                onPress={handleComplete}
                testID="skip"
              >
                <Text style={styles.skipText}>Passer</Text>
              </Pressable>
              
              <Pressable
                style={styles.nextButton}
                onPress={() => {
                  if (index < slides.length - 1) {
                    ref.current?.scrollTo({ x: (index + 1) * width, animated: true });
                  } else {
                    handleComplete();
                  }
                }}
                testID="next"
              >
                <LinearGradient
                  colors={['#FFFFFF', '#E8EAF0']}
                  style={styles.nextGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.nextText}>
                    {index < slides.length - 1 ? "Suivant" : "Commencer"}
                  </Text>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 10,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    opacity: 0.1,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8EAF0',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.9,
    maxWidth: 280,
  },
  indicators: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  buttonsContainer: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
  },
  blurContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    padding: 20,
  },
  webBlur: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    backdropFilter: 'blur(20px)',
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  keyboardContainer: {
    flex: 1,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 32,
  },
  authHeader: {
    alignItems: 'center',
    gap: 16,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  authSubtitle: {
    fontSize: 16,
    color: Colors.palette.taupe,
    textAlign: 'center',
  },
  authTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 4,
  },
  authTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  authTabActive: {
    backgroundColor: '#FFFFFF',
  },
  authTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.palette.taupe,
  },
  authTabTextActive: {
    color: '#000000',
    fontWeight: '700',
  },
  authForm: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  inputIcon: {
    marginRight: 12,
  },
  authInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  authButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  authButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  authButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
  },
  backButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.palette.taupe,
  },
});