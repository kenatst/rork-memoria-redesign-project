import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useAppState } from '@/providers/AppStateProvider';
import { useSupabase } from '@/providers/SupabaseProvider';
import Colors from '@/constants/colors';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react-native';

interface OfflineSyncProps {
  showIndicator?: boolean;
  autoSync?: boolean;
  syncInterval?: number; // en millisecondes
}

export const OfflineSync: React.FC<OfflineSyncProps> = ({
  showIndicator = true,
  autoSync = true,
  syncInterval = 30000 // 30 secondes
}) => {
  const { isOnline, syncData, lastSync } = useAppState();
  const { user } = useSupabase();
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncAnimation] = useState(new Animated.Value(0));

  const performSync = useCallback(async () => {
    if (!user || !isOnline || isSyncing) return;
    
    setIsSyncing(true);
    
    // Animation de rotation pour l'indicateur de sync
    Animated.loop(
      Animated.timing(syncAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();

    try {
      await syncData();
      console.log('✅ Sync completed successfully');
    } catch (error) {
      console.error('❌ Sync failed:', error);
    } finally {
      setIsSyncing(false);
      syncAnimation.stopAnimation();
      syncAnimation.setValue(0);
    }
  }, [user, isOnline, isSyncing, syncData, syncAnimation]);

  // Auto-sync périodique
  useEffect(() => {
    if (!autoSync || !user) return;

    const interval = setInterval(() => {
      if (isOnline && !isSyncing) {
        performSync();
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, user, isOnline, isSyncing, performSync, syncInterval]);

  // Sync au retour en ligne
  useEffect(() => {
    if (isOnline && user && !isSyncing) {
      // Délai court pour éviter les syncs trop fréquents
      const timeout = setTimeout(performSync, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, user, isSyncing, performSync]);

  const formatLastSync = useCallback((timestamp?: string) => {
    if (!timestamp) return 'Jamais synchronisé';
    
    const now = new Date();
    const syncTime = new Date(timestamp);
    const diffMs = now.getTime() - syncTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    
    return syncTime.toLocaleDateString('fr-FR');
  }, []);

  if (!showIndicator) return null;

  const spin = syncAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        {isOnline ? (
          <Wifi size={16} color="#22C55E" />
        ) : (
          <WifiOff size={16} color="#EF4444" />
        )}
        
        <Text style={[styles.statusText, { color: isOnline ? '#22C55E' : '#EF4444' }]}>
          {isOnline ? 'En ligne' : 'Hors ligne'}
        </Text>
        
        {isSyncing && (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <RefreshCw size={14} color={Colors.palette.taupe} />
          </Animated.View>
        )}
      </View>
      
      {lastSync && (
        <Text style={styles.lastSyncText}>
          Dernière sync: {formatLastSync(lastSync)}
        </Text>
      )}
      
      {!isOnline && (
        <Text style={styles.offlineWarning}>
          Les modifications seront synchronisées au retour en ligne
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    gap: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lastSyncText: {
    fontSize: 10,
    color: Colors.palette.taupe,
  },
  offlineWarning: {
    fontSize: 10,
    color: '#F59E0B',
    fontStyle: 'italic',
  },
});

export default OfflineSync;