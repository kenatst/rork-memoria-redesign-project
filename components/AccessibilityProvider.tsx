import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AccessibilitySettings {
  screenReaderEnabled: boolean;
  highContrastEnabled: boolean;
  largeTextEnabled: boolean;
  reduceMotionEnabled: boolean;
  voiceOverEnabled: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  colorScheme: 'default' | 'high-contrast' | 'dark-high-contrast';
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (newSettings: Partial<AccessibilitySettings>) => void;
  announceForAccessibility: (message: string) => void;
  getAccessibleLabel: (label: string, hint?: string) => string;
  getFontSize: (baseSize: number) => number;
  getContrastColor: (defaultColor: string, highContrastColor: string) => string;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const ACCESSIBILITY_STORAGE_KEY = 'accessibility_settings';

const defaultSettings: AccessibilitySettings = {
  screenReaderEnabled: false,
  highContrastEnabled: false,
  largeTextEnabled: false,
  reduceMotionEnabled: false,
  voiceOverEnabled: false,
  fontSize: 'medium',
  colorScheme: 'default',
};

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);

  useEffect(() => {
    loadSettings();
    detectSystemAccessibilitySettings();
  }, []);

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(ACCESSIBILITY_STORAGE_KEY);
      if (stored) {
        const parsedSettings = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsedSettings });
      }
    } catch (error) {
      console.error('Error loading accessibility settings:', error);
    }
  };

  const saveSettings = async (newSettings: AccessibilitySettings) => {
    try {
      await AsyncStorage.setItem(ACCESSIBILITY_STORAGE_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error('Error saving accessibility settings:', error);
    }
  };

  const detectSystemAccessibilitySettings = async () => {
    if (Platform.OS === 'web') return;

    try {
      const [screenReaderEnabled, reduceMotionEnabled] = await Promise.all([
        AccessibilityInfo.isScreenReaderEnabled(),
        AccessibilityInfo.isReduceMotionEnabled(),
      ]);

      setSettings(prev => ({
        ...prev,
        screenReaderEnabled,
        reduceMotionEnabled,
        voiceOverEnabled: screenReaderEnabled, // VoiceOver is a type of screen reader
      }));
    } catch (error) {
      console.error('Error detecting system accessibility settings:', error);
    }
  };

  const updateSettings = (newSettings: Partial<AccessibilitySettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  };

  const announceForAccessibility = (message: string) => {
    if (Platform.OS !== 'web' && settings.screenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(message);
    }
  };

  const getAccessibleLabel = (label: string, hint?: string): string => {
    if (!settings.screenReaderEnabled) return label;
    return hint ? `${label}. ${hint}` : label;
  };

  const getFontSize = (baseSize: number): number => {
    const multipliers = {
      'small': 0.85,
      'medium': 1,
      'large': 1.2,
      'extra-large': 1.5,
    };
    return baseSize * multipliers[settings.fontSize];
  };

  const getContrastColor = (defaultColor: string, highContrastColor: string): string => {
    return settings.highContrastEnabled ? highContrastColor : defaultColor;
  };

  const contextValue: AccessibilityContextType = {
    settings,
    updateSettings,
    announceForAccessibility,
    getAccessibleLabel,
    getFontSize,
    getContrastColor,
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility(): AccessibilityContextType {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}

// Hook for accessible components
export function useAccessibleComponent(label: string, hint?: string, role?: string) {
  const { settings, getAccessibleLabel, getFontSize, getContrastColor } = useAccessibility();
  
  return {
    accessibilityLabel: getAccessibleLabel(label, hint),
    accessibilityRole: role as any,
    accessibilityHint: hint,
    accessible: true,
    importantForAccessibility: 'yes' as const,
    fontSize: getFontSize(16), // Base font size
    highContrast: settings.highContrastEnabled,
    reduceMotion: settings.reduceMotionEnabled,
    screenReader: settings.screenReaderEnabled,
  };
}

export type { AccessibilitySettings, AccessibilityContextType };