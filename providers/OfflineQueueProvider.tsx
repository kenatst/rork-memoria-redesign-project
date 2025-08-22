import React, { useState, useCallback, useEffect, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface QueueAction {
  id: string;
  type: 'photo_upload' | 'comment_add' | 'like_photo' | 'create_album' | 'join_group';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
}

interface OfflineQueueContextValue {
  queue: QueueAction[];
  addToQueue: (type: QueueAction['type'], data: any, maxRetries?: number) => void;
  processQueue: () => Promise<void>;
  clearQueue: () => void;
  isProcessing: boolean;
  failedCount: number;
  pendingCount: number;
}

const QUEUE_STORAGE_KEY = 'offline_queue_v1';
const MAX_RETRY_DELAY = 5 * 60 * 1000; // 5 minutes max delay

export const [OfflineQueueProvider, useOfflineQueue] = createContextHook<OfflineQueueContextValue>(() => {
  const [queue, setQueue] = useState<QueueAction[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Load queue from storage on mount
  useEffect(() => {
    loadQueue();
  }, []);

  // Auto-process queue when online
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isProcessing && queue.some(action => action.status === 'pending' && action.nextRetryAt <= Date.now())) {
        processQueue();
      }
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [queue, isProcessing]);

  // Persist queue changes
  useEffect(() => {
    saveQueue();
  }, [queue]);

  const loadQueue = async () => {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsedQueue: QueueAction[] = JSON.parse(stored);
        setQueue(parsedQueue.filter(action => action.status !== 'completed'));
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  };

  const saveQueue = async () => {
    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  };

  const addToQueue = useCallback((type: QueueAction['type'], data: any, maxRetries: number = 3) => {
    const action: QueueAction = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries,
      nextRetryAt: Date.now(),
      status: 'pending',
    };

    setQueue(prev => [...prev, action]);
    console.log(`Added to offline queue: ${type}`, action);
  }, []);

  const calculateRetryDelay = (retryCount: number): number => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, etc. (capped at MAX_RETRY_DELAY)
    const delay = Math.min(1000 * Math.pow(2, retryCount), MAX_RETRY_DELAY);
    // Add jitter to prevent thundering herd
    return delay + Math.random() * 1000;
  };

  const processAction = async (action: QueueAction): Promise<boolean> => {
    try {
      console.log(`Processing offline action: ${action.type}`, action.data);
      
      // Simulate API calls based on action type
      switch (action.type) {
        case 'photo_upload':
          // Simulate photo upload
          await new Promise(resolve => setTimeout(resolve, 2000));
          if (Math.random() > 0.7) throw new Error('Upload failed');
          break;
          
        case 'comment_add':
          // Simulate comment creation
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (Math.random() > 0.8) throw new Error('Comment failed');
          break;
          
        case 'like_photo':
          // Simulate like action
          await new Promise(resolve => setTimeout(resolve, 500));
          if (Math.random() > 0.9) throw new Error('Like failed');
          break;
          
        case 'create_album':
          // Simulate album creation
          await new Promise(resolve => setTimeout(resolve, 1500));
          if (Math.random() > 0.8) throw new Error('Album creation failed');
          break;
          
        case 'join_group':
          // Simulate group join
          await new Promise(resolve => setTimeout(resolve, 1000));
          if (Math.random() > 0.85) throw new Error('Group join failed');
          break;
          
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
      
      console.log(`Successfully processed: ${action.type}`);
      return true;
    } catch (error) {
      console.error(`Failed to process action ${action.type}:`, error);
      return false;
    }
  };

  const processQueue = useCallback(async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    console.log('Starting offline queue processing...');
    
    try {
      const pendingActions = queue.filter(
        action => action.status === 'pending' && action.nextRetryAt <= Date.now()
      );
      
      if (pendingActions.length === 0) {
        console.log('No pending actions to process');
        return;
      }
      
      console.log(`Processing ${pendingActions.length} pending actions`);
      
      for (const action of pendingActions) {
        // Update status to processing
        setQueue(prev => prev.map(a => 
          a.id === action.id ? { ...a, status: 'processing' as const } : a
        ));
        
        const success = await processAction(action);
        
        if (success) {
          // Mark as completed and remove from queue
          setQueue(prev => prev.filter(a => a.id !== action.id));
        } else {
          // Handle retry logic
          const newRetryCount = action.retryCount + 1;
          
          if (newRetryCount >= action.maxRetries) {
            // Max retries reached, mark as failed
            setQueue(prev => prev.map(a => 
              a.id === action.id 
                ? { ...a, status: 'failed' as const, retryCount: newRetryCount }
                : a
            ));
            console.log(`Action ${action.type} failed permanently after ${newRetryCount} attempts`);
          } else {
            // Schedule retry with exponential backoff
            const retryDelay = calculateRetryDelay(newRetryCount);
            const nextRetryAt = Date.now() + retryDelay;
            
            setQueue(prev => prev.map(a => 
              a.id === action.id 
                ? { 
                    ...a, 
                    status: 'pending' as const, 
                    retryCount: newRetryCount,
                    nextRetryAt 
                  }
                : a
            ));
            
            console.log(`Scheduled retry ${newRetryCount}/${action.maxRetries} for ${action.type} in ${Math.round(retryDelay/1000)}s`);
          }
        }
        
        // Small delay between actions to prevent overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error processing offline queue:', error);
    } finally {
      setIsProcessing(false);
      console.log('Finished offline queue processing');
    }
  }, [queue, isProcessing]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    console.log('Offline queue cleared');
  }, []);

  const failedCount = useMemo(() => 
    queue.filter(action => action.status === 'failed').length, 
    [queue]
  );
  
  const pendingCount = useMemo(() => 
    queue.filter(action => action.status === 'pending').length, 
    [queue]
  );

  return useMemo(() => ({
    queue,
    addToQueue,
    processQueue,
    clearQueue,
    isProcessing,
    failedCount,
    pendingCount,
  }), [queue, addToQueue, processQueue, clearQueue, isProcessing, failedCount, pendingCount]);
});