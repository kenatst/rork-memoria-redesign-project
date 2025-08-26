import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { AlertTriangle, RefreshCw, WifiOff, Upload } from 'lucide-react-native';
import Colors from '@/constants/colors';

// Network status monitoring
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = React.useState(true);
  const [connectionType] = React.useState<'wifi' | 'cellular' | 'unknown'>('unknown');

  React.useEffect(() => {
    const checkConnection = async () => {
      try {
        const response = await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          cache: 'no-cache',
        });
        setIsOnline(response.ok);
      } catch {
        setIsOnline(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  return { isOnline, connectionType };
};

// Robust retry logic hook
export const useRetryOperation = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);
  const retryTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  const execute = React.useCallback(async (
    operation: () => Promise<any>,
    options?: {
      maxRetries?: number;
      retryDelay?: number;
      onSuccess?: (result: any) => void;
      onError?: (error: Error) => void;
      shouldRetry?: (error: Error, attempt: number) => boolean;
    }
  ) => {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      onSuccess,
      onError,
      shouldRetry = (error: Error) => 
        error.message.includes('Network') || 
        error.message.includes('fetch') ||
        error.message.includes('timeout')
    } = options || {};

    const attemptOperation = async (attempt: number): Promise<any> => {
      try {
        setLoading(true);
        setError(null);
        setRetryCount(attempt);
        
        const result = await operation();
        onSuccess?.(result);
        setRetryCount(0);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Une erreur inconnue s\'est produite');
        setError(error);
        
        if (attempt < maxRetries && shouldRetry(error, attempt)) {
          const delay = retryDelay * Math.pow(2, attempt) + Math.random() * 500;
          console.log(`Retrying operation in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
          
          return new Promise((resolve, reject) => {
            retryTimeoutRef.current = setTimeout(async () => {
              try {
                const result = await attemptOperation(attempt + 1);
                resolve(result);
              } catch (retryError) {
                reject(retryError);
              }
            }, delay) as any;
          });
        } else {
          onError?.(error);
          throw error;
        }
      } finally {
        setLoading(false);
      }
    };

    return attemptOperation(0);
  }, []);

  const reset = React.useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setError(null);
    setLoading(false);
    setRetryCount(0);
  }, []);

  React.useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    loading,
    error,
    retryCount,
    execute,
    reset,
  };
};

// Offline queue system
export const useOfflineQueue = () => {
  const [queue, setQueue] = React.useState<{
    id: string;
    operation: () => Promise<any>;
    retries: number;
    maxRetries: number;
    timestamp: number;
    priority: 'low' | 'normal' | 'high';
    type: string;
  }[]>([]);
  const [processing, setProcessing] = React.useState(false);
  const { isOnline } = useNetworkStatus();

  const addToQueue = React.useCallback((
    operation: () => Promise<any>, 
    options?: {
      maxRetries?: number;
      priority?: 'low' | 'normal' | 'high';
      type?: string;
    }
  ) => {
    const { maxRetries = 3, priority = 'normal', type = 'unknown' } = options || {};
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    setQueue(prev => {
      const newItem = {
        id,
        operation,
        retries: 0,
        maxRetries,
        timestamp: Date.now(),
        priority,
        type,
      };
      
      const priorityOrder = { high: 3, normal: 2, low: 1 };
      return [...prev, newItem].sort((a, b) => {
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return a.timestamp - b.timestamp;
      });
    });
    
    return id;
  }, []);

  const processQueue = React.useCallback(async () => {
    if (processing || !isOnline || queue.length === 0) return;

    setProcessing(true);
    const currentQueue = [...queue];
    
    for (const item of currentQueue) {
      try {
        console.log(`Processing queue item: ${item.type} (attempt ${item.retries + 1})`);
        await item.operation();
        setQueue(prev => prev.filter(q => q.id !== item.id));
        console.log(`Successfully processed: ${item.type}`);
      } catch (error) {
        console.error(`Queue operation failed (${item.type}):`, error);
        
        if (item.retries < item.maxRetries) {
          setQueue(prev => prev.map(q => 
            q.id === item.id ? { ...q, retries: q.retries + 1 } : q
          ));
        } else {
          console.warn(`Removing failed item after ${item.maxRetries} retries: ${item.type}`);
          setQueue(prev => prev.filter(q => q.id !== item.id));
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setProcessing(false);
  }, [processing, isOnline, queue]);

  React.useEffect(() => {
    if (isOnline && queue.length > 0) {
      const timeout = setTimeout(processQueue, 1000);
      return () => clearTimeout(timeout);
    }
  }, [isOnline, queue.length, processQueue]);

  const clearQueue = React.useCallback(() => {
    setQueue([]);
  }, []);

  return {
    queue,
    queueLength: queue.length,
    processing,
    addToQueue,
    processQueue,
    clearQueue,
  };
};

// Network status indicator component
interface NetworkStatusProps {
  style?: any;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusProps> = ({ style }) => {
  const { isOnline } = useNetworkStatus();
  const { queueLength } = useOfflineQueue();

  if (isOnline && queueLength === 0) return null;

  return (
    <View style={[styles.networkStatus, style]}>
      <View style={styles.networkStatusContent}>
        {!isOnline ? (
          <>
            <WifiOff size={16} color="#FF6B6B" />
            <Text style={styles.networkStatusText}>Hors ligne</Text>
          </>
        ) : queueLength > 0 ? (
          <>
            <Upload size={16} color="#FFA500" />
            <Text style={styles.networkStatusText}>
              Synchronisation ({queueLength})
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
};

// Retry button component
interface RetryButtonProps {
  onRetry: () => void;
  loading?: boolean;
  error?: Error | null;
  retryCount?: number;
  maxRetries?: number;
}

export const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  loading = false,
  error,
  retryCount = 0,
  maxRetries = 3,
}) => {
  if (!error && !loading) return null;

  const canRetry = retryCount < maxRetries;

  return (
    <View style={styles.retryContainer}>
      {error && (
        <View style={styles.errorInfo}>
          <AlertTriangle size={16} color="#FF6B6B" />
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}
      
      {retryCount > 0 && (
        <Text style={styles.retryInfo}>
          Tentative {retryCount}/{maxRetries}
        </Text>
      )}

      {canRetry && (
        <Pressable
          style={[styles.retryButton, loading && styles.retryButtonDisabled]}
          onPress={onRetry}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <RefreshCw size={16} color="#FFFFFF" />
          )}
          <Text style={styles.retryButtonText}>
            {loading ? 'Tentative...' : 'Réessayer'}
          </Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  networkStatus: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 8,
    padding: 8,
    margin: 8,
  },
  networkStatusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  networkStatusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  retryContainer: {
    padding: 16,
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 8,
    margin: 8,
  },
  errorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 14,
    flex: 1,
  },
  retryInfo: {
    color: Colors.palette.taupe,
    fontSize: 12,
    marginBottom: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.palette.taupeDeep,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonDisabled: {
    opacity: 0.6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});