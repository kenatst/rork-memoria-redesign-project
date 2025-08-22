import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Pressable, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Wifi, WifiOff, Upload, Clock, CheckCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useAppState } from '@/providers/AppStateProvider';
import * as Haptics from 'expo-haptics';

export default function OfflineIndicator() {
  const { isOnline, pendingUploads, syncData, lastSync } = useAppState();
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [slideAnim] = useState(() => new Animated.Value(-100));

  useEffect(() => {
    if (!isOnline || pendingUploads.length > 0) {
      // Show indicator
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();

      // Pulse animation for offline state
      if (!isOnline) {
        Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1.2, duration: 1000, useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
          ])
        ).start();
      }
    } else {
      // Hide indicator
      Animated.spring(slideAnim, {
        toValue: -100,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [isOnline, pendingUploads.length, slideAnim, pulseAnim]);

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setShowDetails(!showDetails);
  };

  const handleSync = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await syncData();
  };

  if (isOnline && pendingUploads.length === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      <Pressable style={styles.indicator} onPress={handlePress}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={20} style={styles.blur}>
            <View style={styles.content}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                {isOnline ? (
                  <Upload color="#FFA500" size={16} />
                ) : (
                  <WifiOff color="#FF4444" size={16} />
                )}
              </Animated.View>
              <Text style={styles.text}>
                {!isOnline ? 'Hors-ligne' : `${pendingUploads.length} en attente`}
              </Text>
              {pendingUploads.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingUploads.length}</Text>
                </View>
              )}
            </View>
          </BlurView>
        ) : (
          <View style={[styles.blur, styles.webBlur]}>
            <View style={styles.content}>
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                {isOnline ? (
                  <Upload color="#FFA500" size={16} />
                ) : (
                  <WifiOff color="#FF4444" size={16} />
                )}
              </Animated.View>
              <Text style={styles.text}>
                {!isOnline ? 'Hors-ligne' : `${pendingUploads.length} en attente`}
              </Text>
              {pendingUploads.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingUploads.length}</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Pressable>

      {showDetails && (
        <View style={styles.details}>
          {Platform.OS !== 'web' ? (
            <BlurView intensity={30} style={styles.detailsBlur}>
              <View style={styles.detailsContent}>
                <Text style={styles.detailsTitle}>État de synchronisation</Text>
                
                <View style={styles.statusRow}>
                  <View style={styles.statusItem}>
                    {isOnline ? (
                      <Wifi color="#2ECC71" size={20} />
                    ) : (
                      <WifiOff color="#FF4444" size={20} />
                    )}
                    <Text style={[styles.statusText, { color: isOnline ? '#2ECC71' : '#FF4444' }]}>
                      {isOnline ? 'En ligne' : 'Hors-ligne'}
                    </Text>
                  </View>
                  
                  <View style={styles.statusItem}>
                    <Clock color="#FFA500" size={20} />
                    <Text style={styles.statusText}>
                      {pendingUploads.length} en attente
                    </Text>
                  </View>
                </View>

                {lastSync && (
                  <Text style={styles.lastSyncText}>
                    Dernière sync: {new Date(lastSync).toLocaleTimeString('fr-FR')}
                  </Text>
                )}

                {isOnline && pendingUploads.length > 0 && (
                  <Pressable style={styles.syncButton} onPress={handleSync}>
                    <CheckCircle color="#000000" size={18} />
                    <Text style={styles.syncButtonText}>Synchroniser maintenant</Text>
                  </Pressable>
                )}
              </View>
            </BlurView>
          ) : (
            <View style={[styles.detailsBlur, styles.webBlur]}>
              <View style={styles.detailsContent}>
                <Text style={styles.detailsTitle}>État de synchronisation</Text>
                
                <View style={styles.statusRow}>
                  <View style={styles.statusItem}>
                    {isOnline ? (
                      <Wifi color="#2ECC71" size={20} />
                    ) : (
                      <WifiOff color="#FF4444" size={20} />
                    )}
                    <Text style={[styles.statusText, { color: isOnline ? '#2ECC71' : '#FF4444' }]}>
                      {isOnline ? 'En ligne' : 'Hors-ligne'}
                    </Text>
                  </View>
                  
                  <View style={styles.statusItem}>
                    <Clock color="#FFA500" size={20} />
                    <Text style={styles.statusText}>
                      {pendingUploads.length} en attente
                    </Text>
                  </View>
                </View>

                {lastSync && (
                  <Text style={styles.lastSyncText}>
                    Dernière sync: {new Date(lastSync).toLocaleTimeString('fr-FR')}
                  </Text>
                )}

                {isOnline && pendingUploads.length > 0 && (
                  <Pressable style={styles.syncButton} onPress={handleSync}>
                    <CheckCircle color="#000000" size={18} />
                    <Text style={styles.syncButtonText}>Synchroniser maintenant</Text>
                  </Pressable>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 100,
  },
  indicator: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 60,
  },
  blur: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  webBlur: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(20px)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  badge: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  details: {
    marginTop: 8,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailsBlur: {
    padding: 20,
  },
  detailsContent: {
    gap: 12,
  },
  detailsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 16,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  lastSyncText: {
    color: '#A9AFBC',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  syncButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
});