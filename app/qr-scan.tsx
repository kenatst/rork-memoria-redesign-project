import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Text, Pressable, Alert, Animated, Platform, Dimensions } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { X, Zap, MapPin, Shield, Wifi, WifiOff, Flashlight, FlashlightOff } from 'lucide-react-native';
import Colors from '@/constants/colors';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { useAppState } from '@/providers/AppStateProvider';
import { Audio } from 'expo-av';



interface QRData {
  type: 'group_invite' | 'event';
  groupId?: string;
  groupName?: string;
  inviteCode?: string;
  eventId?: string;
  eventName?: string;
  location?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  timestamp: number;
  requiresGeofencing?: boolean;
}

export default function QRScanScreen() {
  const router = useRouter();
  const { joinGroupByCode, addNotification } = useAppState();
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  const [scanned, setScanned] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [scanningAnimation] = useState(new Animated.Value(0));
  const [arOverlayAnimation] = useState(new Animated.Value(0));
  const [particleAnimations] = useState(() => 
    Array.from({ length: 20 }, () => new Animated.Value(0))
  );
  const window = Dimensions.get('window');
  const frameSize = useMemo(() => Math.round(Math.min(window.width, window.height) * 0.65), [window.width, window.height]);
  const [glassBreakAnim] = useState(new Animated.Value(0));
  const [showGlass, setShowGlass] = useState<boolean>(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  
  useEffect(() => {
    requestLocationPermission();
    startAnimations();
    checkNetworkStatus();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setCurrentLocation(location);
      }
    } catch (error) {
      console.log('Location permission error:', error);
    }
  };

  const checkNetworkStatus = () => {
    // Simulate network check - in real app use NetInfo
    setIsOnline(Math.random() > 0.2); // 80% online simulation
  };

  const startAnimations = () => {
    // Scanning animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanningAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanningAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // AR overlay animation
    Animated.timing(arOverlayAnimation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Particle animations
    particleAnimations.forEach((anim, index) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 3000 + index * 200,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 3000 + index * 200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });
  };

  const validateGeofencing = async (qrData: QRData): Promise<boolean> => {
    if (!qrData.requiresGeofencing || !qrData.location || !currentLocation) {
      return true;
    }

    const distance = calculateDistance(
      currentLocation.coords.latitude,
      currentLocation.coords.longitude,
      qrData.location.latitude,
      qrData.location.longitude
    );

    return distance <= qrData.location.radius;
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Distance in meters
  };

  const moderateContent = async (qrData: QRData): Promise<boolean> => {
    // AI moderation simulation
    console.log('AI Moderation: Analyzing QR code content...');
    
    // Simulate AI checks
    const checks = {
      maliciousContent: Math.random() > 0.95,
      fraudulentEvent: Math.random() > 0.98,
      expiredEvent: Date.now() > qrData.timestamp + (24 * 60 * 60 * 1000),
    };

    return !checks.maliciousContent && !checks.fraudulentEvent && !checks.expiredEvent;
  };

  const playSuccessSound = async () => {
    try {
      if (Platform.OS === 'web') {
        const audio = new (window as any).Audio('https://cdn.pixabay.com/download/audio/2022/03/15/audio_2b9285e3a9.mp3?filename=click-124467.mp3');
        audio.volume = 0.6;
        audio.play();
        return;
      }
      const { sound: snd } = await Audio.Sound.createAsync({ uri: 'https://cdn.pixabay.com/download/audio/2022/03/10/audio_5f8c3d85d3.mp3?filename=success-1-6297.mp3' });
      setSound(snd);
      await snd.setVolumeAsync(0.6);
      await snd.playAsync();
    } catch (e) {
      console.log('playSuccessSound error', e);
    }
  };

  const triggerGlassBreak = () => {
    setShowGlass(true);
    glassBreakAnim.setValue(0);
    Animated.timing(glassBreakAnim, {
      toValue: 1,
      duration: 700,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setTimeout(() => setShowGlass(false), 500);
      }
    });
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    
    // Haptic feedback
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      // Try to parse as JSON first (new format)
      let qrData: QRData;
      try {
        qrData = JSON.parse(data);
      } catch {
        // Fallback: check if it's a group invite URL
        const urlMatch = data.match(/memoria:\/\/invite\?code=([A-Z0-9]+)|https:\/\/memoria\.app\/join\/([A-Z0-9]+)/);
        if (urlMatch) {
          const inviteCode = urlMatch[1] || urlMatch[2];
          qrData = {
            type: 'group_invite',
            inviteCode,
            timestamp: Date.now()
          };
        } else {
          throw new Error('Invalid QR format');
        }
      }
      
      if (qrData.type === 'group_invite') {
        // Handle group invitation
        if (!qrData.inviteCode) {
          Alert.alert(
            'Code d\'invitation manquant',
            'Ce QR code ne contient pas de code d\'invitation valide.',
            [{ text: 'OK', onPress: () => setScanned(false) }]
          );
          return;
        }

        try {
          await playSuccessSound();
          triggerGlassBreak();
        } catch (e) {
          console.log('sound error', e);
        }
        Alert.alert(
          'Invitation au groupe',
          `Voulez-vous rejoindre ce groupe Memoria ?\n\nCode: ${qrData.inviteCode}`,
          [
            { text: 'Annuler', onPress: () => setScanned(false) },
            { 
              text: 'Rejoindre', 
              onPress: async () => {
                const success = await joinGroupByCode(qrData.inviteCode!);
                if (success) {
                  Alert.alert(
                    'Succès !',
                    'Vous avez rejoint le groupe avec succès.',
                    [{ text: 'OK', onPress: () => router.back() }]
                  );
                } else {
                  Alert.alert(
                    'Erreur',
                    'Impossible de rejoindre le groupe. Vérifiez le code d\'invitation.',
                    [{ text: 'OK', onPress: () => setScanned(false) }]
                  );
                }
              }
            }
          ]
        );
        return;
      }
      
      // Handle event QR codes (existing logic)
      // AI Moderation
      const isContentSafe = await moderateContent(qrData);
      if (!isContentSafe) {
        Alert.alert(
          'Contenu Bloqué',
          'Ce QR code a été bloqué par notre IA de modération pour des raisons de sécurité.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
        return;
      }

      // Geofencing validation
      const isLocationValid = await validateGeofencing(qrData);
      if (!isLocationValid) {
        Alert.alert(
          'Localisation Requise',
          'Vous devez être à proximité de l\'événement pour accéder à cet album.',
          [{ text: 'OK', onPress: () => setScanned(false) }]
        );
        return;
      }

      // Success UX: sound + glass break ceremony
      await playSuccessSound();
      triggerGlassBreak();

      Alert.alert(
        'QR Code Scanné!',
        `Accès autorisé à: ${qrData.eventName ?? 'Événement'}\n\nFonctionnalités activées:\n• Réalité Augmentée\n• Géofencing Vérifié\n• Modération IA\n• Mode Hors-ligne`,
        [
          { text: 'Annuler', onPress: () => setScanned(false) },
          { 
            text: 'Rejoindre', 
            onPress: () => {
              router.push(`/event/${qrData.eventId}`);
            }
          }
        ]
      );
    } catch (error) {
      console.error('QR scan error:', error);
      Alert.alert(
        'QR Code Invalide',
        'Ce QR code n\'est pas reconnu par Memoria.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#000000', '#0B0B0D', '#131417']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingContainer}>
          <Animated.View style={{ opacity: arOverlayAnimation }}>
            <Zap color={Colors.palette.accentGold} size={48} />
          </Animated.View>
        </View>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#000000', '#0B0B0D', '#131417']}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.permissionContainer}>
          <Zap color={Colors.palette.accentGold} size={64} />
          <Text style={styles.permissionTitle}>Accès Caméra Requis</Text>
          <Text style={styles.permissionText}>
            Memoria a besoin d&apos;accéder à votre caméra pour scanner les QR codes avec réalité augmentée.
          </Text>
          <Pressable style={styles.permissionButton} onPress={requestPermission}>
            <LinearGradient
              colors={['#FFFFFF', '#E8EAF0']}
              style={styles.buttonGradient}
            >
              <Text style={styles.permissionButtonText}>Autoriser l&apos;Accès</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  const cameraExtraProps: any = Platform.OS !== 'web' ? { torch: torchOn ? 'on' : 'off' } : {};

  return (
    <View style={styles.container}>
      <CameraView
        testID="camera-view"
        style={styles.camera}
        facing={'back' as CameraType}
        {...cameraExtraProps}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        {/* AR Particles */}
        {particleAnimations.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: `${(index * 5.26) % 100}%`,
                top: `${(index * 7.89) % 100}%`,
                opacity: anim,
                transform: [
                  {
                    translateY: anim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -100],
                    }),
                  },
                  {
                    scale: anim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0, 1.2, 0],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}

        {/* AR Scanning Overlay */}
        <Animated.View 
          style={[
            styles.scanningOverlay,
            {
              opacity: arOverlayAnimation,
            },
          ]}
        >
          <View style={styles.scanMask} pointerEvents="none">
            <View style={styles.maskPieceVertical} />
            <View style={styles.maskRow}>
              <View style={styles.maskSide} />
              <View style={[styles.maskHole, { width: frameSize, height: frameSize }]} />
              <View style={styles.maskSide} />
            </View>
            <View style={styles.maskPieceVertical} />
          </View>
          <View style={[styles.scanFrame, { width: frameSize, height: frameSize, alignSelf: 'center' }]} testID="scan-frame">
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [
                    {
                      translateY: scanningAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, frameSize - 4],
                      }),
                    },
                  ],
                },
              ]}
            />
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </Animated.View>

        {/* Status indicators */}
        <View style={styles.statusContainer}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={20} style={styles.statusBlur}>
              <View style={styles.statusRow}>
                <View style={[styles.statusItem, locationPermission && styles.statusActive]}>
                  <MapPin size={16} color={locationPermission ? '#2ECC71' : '#E74C3C'} />
                  <Text style={[styles.statusText, locationPermission && styles.statusTextActive]}>
                    GPS
                  </Text>
                </View>
                <View style={[styles.statusItem, isOnline && styles.statusActive]}>
                  {isOnline ? (
                    <Wifi size={16} color="#2ECC71" />
                  ) : (
                    <WifiOff size={16} color="#E74C3C" />
                  )}
                  <Text style={[styles.statusText, isOnline && styles.statusTextActive]}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
                <View style={[styles.statusItem, styles.statusActive]}>
                  <Shield size={16} color="#2ECC71" />
                  <Text style={[styles.statusText, styles.statusTextActive]}>IA</Text>
                </View>
              </View>
            </BlurView>
          ) : (
            <View style={[styles.statusBlur, styles.webBlur]}>
              <View style={styles.statusRow}>
                <View style={[styles.statusItem, locationPermission && styles.statusActive]}>
                  <MapPin size={16} color={locationPermission ? '#2ECC71' : '#E74C3C'} />
                  <Text style={[styles.statusText, locationPermission && styles.statusTextActive]}>
                    GPS
                  </Text>
                </View>
                <View style={[styles.statusItem, isOnline && styles.statusActive]}>
                  {isOnline ? (
                    <Wifi size={16} color="#2ECC71" />
                  ) : (
                    <WifiOff size={16} color="#E74C3C" />
                  )}
                  <Text style={[styles.statusText, isOnline && styles.statusTextActive]}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
                <View style={[styles.statusItem, styles.statusActive]}>
                  <Shield size={16} color="#2ECC71" />
                  <Text style={[styles.statusText, styles.statusTextActive]}>IA</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={20} style={styles.instructionsBlur}>
              <Text style={styles.instructionsTitle}>Scanner QR Memoria</Text>
              <Text style={styles.instructionsText}>
                Scannez un QR code pour rejoindre un groupe ou accéder à un événement Memoria.
              </Text>
            </BlurView>
          ) : (
            <View style={[styles.instructionsBlur, styles.webBlur]}>
              <Text style={styles.instructionsTitle}>Scanner QR Memoria</Text>
              <Text style={styles.instructionsText}>
                Scannez un QR code pour rejoindre un groupe ou accéder à un événement Memoria.
              </Text>
            </View>
          )}
        </View>

        {/* Close + Torch buttons */}
        <Pressable 
          style={styles.closeButton} 
          onPress={() => router.back()}
        >
          {Platform.OS !== 'web' ? (
            <BlurView intensity={20} style={styles.closeBlur}>
              <X color={Colors.palette.taupeDeep} size={24} />
            </BlurView>
          ) : (
            <View style={[styles.closeBlur, styles.webBlur]}>
              <X color={Colors.palette.taupeDeep} size={24} />
            </View>
          )}
        </Pressable>

        <Pressable 
          style={styles.torchButton}
          onPress={() => setTorchOn((v) => !v)}
          testID="toggle-torch"
        >
          {Platform.OS !== 'web' ? (
            <BlurView intensity={20} style={styles.closeBlur}>
              {torchOn ? (
                <Flashlight color={Colors.palette.taupeDeep} size={24} />
              ) : (
                <FlashlightOff color={Colors.palette.taupeDeep} size={24} />
              )}
            </BlurView>
          ) : (
            <View style={[styles.closeBlur, styles.webBlur]}>
              {torchOn ? (
                <Flashlight color={Colors.palette.taupeDeep} size={24} />
              ) : (
                <FlashlightOff color={Colors.palette.taupeDeep} size={24} />
              )}
            </View>
          )}
        </Pressable>
        {/* Glass break ceremony bottom-left */}
        {showGlass && (
          <Animated.View
            testID="glass-break-overlay"
            style={[
              styles.glassContainer,
              {
                opacity: glassBreakAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
                transform: [
                  { scale: glassBreakAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.05] }) },
                ],
              },
            ]}
          >
            <View style={styles.shardRow}>
              <View style={[styles.shard, { transform: [{ rotate: '-8deg' }] }]} />
              <View style={[styles.shard, { transform: [{ rotate: '12deg' }], width: 24 }]} />
              <View style={[styles.shard, { transform: [{ rotate: '-18deg' }], width: 18 }]} />
            </View>
            <View style={styles.shardRow}>
              <View style={[styles.shard, { transform: [{ rotate: '6deg' }], width: 22 }]} />
              <View style={[styles.shard, { transform: [{ rotate: '-10deg' }], width: 26 }]} />
            </View>
          </Animated.View>
        )}
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.palette.taupeDeep,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: Colors.palette.taupe,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  buttonGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    alignItems: 'center',
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
  },
  camera: {
    flex: 1,
  },
  particle: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.palette.accentGold,
    shadowColor: Colors.palette.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    position: 'relative',
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'center',
  },
  scanLine: {
    position: 'absolute',
    left: 2,
    right: 2,
    height: 2,
    backgroundColor: Colors.palette.accentGold,
    shadowColor: Colors.palette.accentGold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    top: 2,
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.palette.accentGold,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 20,
  },
  scanMask: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  maskRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  maskPieceVertical: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  maskHole: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  statusContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
  },
  statusBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 16,
  },
  webBlur: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(20px)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(231, 76, 60, 0.2)',
  },
  statusActive: {
    backgroundColor: 'rgba(46, 204, 113, 0.2)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E74C3C',
  },
  statusTextActive: {
    color: '#2ECC71',
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
  },
  instructionsBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    padding: 20,
    alignItems: 'center',
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.palette.taupeDeep,
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.palette.taupe,
    textAlign: 'center',
    lineHeight: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  torchButton: {
    position: 'absolute',
    top: 60,
    right: 80,
  },
  closeBlur: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  glassContainer: {
    position: 'absolute',
    left: 20,
    bottom: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  shardRow: {
    flexDirection: 'row',
    gap: 6,
  },
  shard: {
    height: 2,
    width: 20,
    backgroundColor: '#FFFFFF',
    opacity: 0.9,
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});