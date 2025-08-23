import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Zap, 
  Settings, 
  Trash2, 
  Gauge, 
  Wifi, 
  WifiOff,
  Database,
  Image as ImageIcon,
  Clock,
  BarChart3
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { usePerformance } from '@/providers/PerformanceProvider';

export default function PerformanceDashboardScreen() {
  const {
    metrics,
    settings,
    isOnline,
    updateSettings,
    clearCache,
    optimizeForDevice,
    measureApiCall
  } = usePerformance();

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const handleOptimizeDevice = async () => {
    setIsOptimizing(true);
    try {
      await optimizeForDevice();
      Alert.alert('✅ Optimisation', 'Appareil optimisé avec succès !');
    } catch (error) {
      Alert.alert('❌ Erreur', 'Erreur lors de l\'optimisation');
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleClearCache = async () => {
    Alert.alert(
      'Vider le cache',
      'Êtes-vous sûr de vouloir vider le cache ? Cela peut ralentir temporairement l\'application.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: async () => {
            setIsClearingCache(true);
            try {
              await clearCache();
              Alert.alert('✅ Cache', 'Cache vidé avec succès !');
            } catch (error) {
              Alert.alert('❌ Erreur', 'Erreur lors du vidage du cache');
            } finally {
              setIsClearingCache(false);
            }
          }
        }
      ]
    );
  };

  const testApiPerformance = async () => {
    try {
      await measureApiCall(async () => {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        return { success: true };
      });
      Alert.alert('✅ Test API', 'Test de performance API terminé !');
    } catch (error) {
      Alert.alert('❌ Erreur', 'Erreur lors du test API');
    }
  };

  const getNetworkSpeedColor = (speed: string) => {
    switch (speed) {
      case 'fast': return '#4CAF50';
      case 'medium': return Colors.palette.accentGold;
      case 'slow': return '#F44336';
      default: return Colors.palette.taupe;
    }
  };

  const getNetworkSpeedText = (speed: string) => {
    switch (speed) {
      case 'fast': return 'Rapide';
      case 'medium': return 'Moyen';
      case 'slow': return 'Lent';
      default: return 'Inconnu';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const MetricCard = ({ 
    title, 
    value, 
    unit, 
    icon: Icon, 
    color = Colors.palette.accentGold,
    subtitle 
  }: {
    title: string;
    value: string | number;
    unit?: string;
    icon: any;
    color?: string;
    subtitle?: string;
  }) => (
    <View style={styles.metricCard}>
      <View style={styles.metricHeader}>
        <View style={[styles.metricIcon, { backgroundColor: `${color}20` }]}>
          <Icon color={color} size={20} />
        </View>
        <Text style={styles.metricTitle}>{title}</Text>
      </View>
      <View style={styles.metricContent}>
        <Text style={styles.metricValue}>
          {value}{unit && <Text style={styles.metricUnit}> {unit}</Text>}
        </Text>
        {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      </View>
    </View>
  );

  const SettingRow = ({ 
    title, 
    description, 
    value, 
    onValueChange 
  }: {
    title: string;
    description: string;
    value: boolean;
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#767577', true: Colors.palette.accentGold }}
        thumbColor={value ? '#FFFFFF' : '#f4f3f4'}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Performance',
          headerStyle: { backgroundColor: '#000000' },
          headerTintColor: '#FFFFFF'
        }} 
      />
      <LinearGradient colors={['#000000', '#1a1a1a']} style={StyleSheet.absoluteFillObject} />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Zap color={Colors.palette.accentGold} size={32} />
          </View>
          <Text style={styles.title}>Performance</Text>
          <Text style={styles.subtitle}>
            Optimisez les performances de Memoria
          </Text>
        </View>

        {/* Network Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📡 État du réseau</Text>
          <View style={styles.networkCard}>
            <View style={styles.networkStatus}>
              {isOnline ? (
                <Wifi color="#4CAF50" size={24} />
              ) : (
                <WifiOff color="#F44336" size={24} />
              )}
              <Text style={[styles.networkText, { color: isOnline ? '#4CAF50' : '#F44336' }]}>
                {isOnline ? 'En ligne' : 'Hors ligne'}
              </Text>
            </View>
            <View style={styles.networkSpeed}>
              <Text style={styles.networkSpeedLabel}>Vitesse:</Text>
              <Text style={[styles.networkSpeedValue, { color: getNetworkSpeedColor(metrics.networkSpeed) }]}>
                {getNetworkSpeedText(metrics.networkSpeed)}
              </Text>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Métriques de performance</Text>
          <View style={styles.metricsGrid}>
            <MetricCard
              title="Temps de chargement images"
              value={metrics.imageLoadTime.toFixed(0)}
              unit="ms"
              icon={ImageIcon}
              color="#2196F3"
            />
            <MetricCard
              title="Temps de réponse API"
              value={metrics.apiResponseTime.toFixed(0)}
              unit="ms"
              icon={Clock}
              color="#FF9800"
            />
            <MetricCard
              title="Taux de cache"
              value={metrics.cacheHitRate.toFixed(1)}
              unit="%"
              icon={Database}
              color="#4CAF50"
            />
            <MetricCard
              title="Utilisation mémoire"
              value={metrics.memoryUsage.toFixed(1)}
              unit="%"
              icon={BarChart3}
              color="#9C27B0"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Actions rapides</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleOptimizeDevice}
              disabled={isOptimizing}
            >
              <Gauge color={Colors.palette.accentGold} size={20} />
              <Text style={styles.actionButtonText}>
                {isOptimizing ? 'Optimisation...' : 'Optimiser l\'appareil'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleClearCache}
              disabled={isClearingCache}
            >
              <Trash2 color={Colors.palette.accentGold} size={20} />
              <Text style={styles.actionButtonText}>
                {isClearingCache ? 'Vidage...' : 'Vider le cache'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={testApiPerformance}
            >
              <Zap color={Colors.palette.accentGold} size={20} />
              <Text style={styles.actionButtonText}>
                Tester les API
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Performance Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Paramètres de performance</Text>
          <View style={styles.settingsContainer}>
            <SettingRow
              title="Cache des images"
              description="Met en cache les images pour un chargement plus rapide"
              value={settings.enableImageCaching}
              onValueChange={(value) => updateSettings({ enableImageCaching: value })}
            />
            <SettingRow
              title="Chargement paresseux"
              description="Charge les images uniquement quand elles sont visibles"
              value={settings.enableLazyLoading}
              onValueChange={(value) => updateSettings({ enableLazyLoading: value })}
            />
            <SettingRow
              title="Synchronisation en arrière-plan"
              description="Synchronise les données même quand l'app est fermée"
              value={settings.enableBackgroundSync}
              onValueChange={(value) => updateSettings({ enableBackgroundSync: value })}
            />
          </View>
        </View>

        {/* Compression Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗜️ Compression</Text>
          <View style={styles.compressionContainer}>
            <Text style={styles.compressionLabel}>Niveau de compression:</Text>
            <View style={styles.compressionButtons}>
              {(['low', 'medium', 'high'] as const).map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.compressionButton,
                    settings.compressionLevel === level && styles.compressionButtonActive
                  ]}
                  onPress={() => updateSettings({ compressionLevel: level })}
                >
                  <Text style={[
                    styles.compressionButtonText,
                    settings.compressionLevel === level && styles.compressionButtonTextActive
                  ]}>
                    {level === 'low' ? 'Faible' : level === 'medium' ? 'Moyen' : 'Élevé'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Cache Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💾 Informations du cache</Text>
          <View style={styles.cacheInfo}>
            <View style={styles.cacheItem}>
              <Text style={styles.cacheLabel}>Taille maximale:</Text>
              <Text style={styles.cacheValue}>{settings.maxCacheSize} MB</Text>
            </View>
            <View style={styles.cacheItem}>
              <Text style={styles.cacheLabel}>Distance de préchargement:</Text>
              <Text style={styles.cacheValue}>{settings.preloadDistance} px</Text>
            </View>
            <View style={styles.cacheItem}>
              <Text style={styles.cacheLabel}>Éléments en file d'attente:</Text>
              <Text style={styles.cacheValue}>{metrics.offlineQueueSize}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.palette.taupe,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  networkCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  networkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  networkText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  networkSpeed: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  networkSpeedLabel: {
    color: Colors.palette.taupe,
    fontSize: 14,
    marginRight: 8,
  },
  networkSpeedValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    width: '48%',
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  metricTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  metricContent: {
    alignItems: 'flex-start',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
  },
  metricUnit: {
    fontSize: 14,
    color: Colors.palette.taupe,
  },
  metricSubtitle: {
    color: Colors.palette.taupe,
    fontSize: 12,
    marginTop: 4,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  actionButtonText: {
    color: Colors.palette.accentGold,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  settingsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingDescription: {
    color: Colors.palette.taupe,
    fontSize: 14,
    lineHeight: 20,
  },
  compressionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  compressionLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  compressionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  compressionButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  compressionButtonActive: {
    backgroundColor: Colors.palette.accentGold,
    borderColor: Colors.palette.accentGold,
  },
  compressionButtonText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    fontWeight: '600',
  },
  compressionButtonTextActive: {
    color: '#000000',
  },
  cacheInfo: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 12,
  },
  cacheItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cacheLabel: {
    color: Colors.palette.taupe,
    fontSize: 14,
  },
  cacheValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});