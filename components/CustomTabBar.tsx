import React, { useMemo, useEffect, useState } from "react";
import { View, Pressable, StyleSheet, Platform, Animated, Dimensions } from "react-native";
import Colors from "@/constants/colors";
import { Camera, Users2, User2, Sparkles, Home, FolderOpen } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets?: any;
}

export default function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const [glowAnim] = useState(() => new Animated.Value(0));
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [slideAnim] = useState(() => new Animated.Value(0));
  const screenWidth = Dimensions.get('window').width;

  const focusedOptions = descriptors[state.routes[state.index].key]?.options ?? {};
  
  useEffect(() => {
    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Pulse animation for active tab
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slide animation for tab indicator
    Animated.timing(slideAnim, {
      toValue: state.index,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [state.index, glowAnim, pulseAnim, slideAnim]);

  const handleHapticFeedback = React.useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }, []);

  const items = useMemo(() => state.routes.map((route: any, index: number) => {
    const { options } = descriptors[route.key];
    const label: string =
      (options.tabBarLabel as string) ?? options.title ?? (route.name as string);
    const isFocused = state.index === index;

    let Icon: any = Home;
    if (route.name === "(home)") Icon = Home;
    if (route.name === "albums") Icon = FolderOpen;
    if (route.name === "capture") Icon = Camera;
    if (route.name === "groups") Icon = Users2;
    if (route.name === "profile") Icon = User2;

    const onPress = () => {
      handleHapticFeedback();
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
    };

    return { key: route.key, label, isFocused, onPress, Icon, index };
  }), [state.routes, state.index, descriptors, navigation, handleHapticFeedback]);

  if (focusedOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  const routeNameIsCamera = (item: any) => item.Icon === Camera || item.label === 'Caméra';

  return (
    <View style={styles.container} testID="custom-tabbar">
      {Platform.OS !== 'web' ? (
        <BlurView intensity={80} style={StyleSheet.absoluteFillObject} />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, styles.webBlur]} />
      )}
      
      <LinearGradient
        colors={["rgba(0,0,0,0.95)", "rgba(11,11,13,0.98)", "rgba(19,20,23,0.95)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      
      {/* Animated indicator */}
      <Animated.View 
        style={[
          styles.indicator,
          {
            transform: [{
              translateX: slideAnim.interpolate({
                inputRange: [0, items.length - 1],
                outputRange: [screenWidth / items.length * 0.5 - 20, screenWidth - (screenWidth / items.length * 0.5) - 20],
              })
            }]
          }
        ]}
      >
        <LinearGradient
          colors={['#FFD700', '#FFA500', '#FF6B35']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.indicatorGradient}
        />
      </Animated.View>
      
      <View style={styles.content}>
        {items.map((item: any) => {
          const color = item.isFocused ? '#FFFFFF' : Colors.palette.taupe;
          const isCamera = routeNameIsCamera(item);
          const animatedScale = item.isFocused ? pulseAnim : new Animated.Value(1);
          
          return (
            <Animated.View
              key={item.key}
              style={[
                styles.tabContainer,
                {
                  transform: [{ scale: animatedScale }]
                }
              ]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={item.isFocused ? { selected: true } : {}}
                onPress={item.onPress}
                style={[styles.tab, isCamera && styles.cameraTab, item.isFocused && styles.activeTab]}
                testID={`tab-${item.label}`}
              >
                {isCamera && item.isFocused && (
                  <Animated.View style={[styles.cameraGlow, { opacity: glowAnim }]}>
                    <Sparkles color="#FFD700" size={16} />
                  </Animated.View>
                )}
                
                <Animated.View style={{
                  transform: [{
                    scale: item.isFocused ? 1.2 : 1
                  }]
                }}>
                  <item.Icon color={color} size={isCamera ? 32 : 24} strokeWidth={item.isFocused ? 2.5 : 2} />
                </Animated.View>
                

                
                {item.isFocused && (
                  <Animated.View style={[styles.activeDot, { opacity: glowAnim }]} />
                )}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
      
      {/* Floating particles effect */}
      <Animated.View style={[styles.particle1, { opacity: glowAnim }]} />
      <Animated.View style={[styles.particle2, { opacity: glowAnim }]} />
      <Animated.View style={[styles.particle3, { opacity: glowAnim }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 0,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 20,
  },
  webBlur: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    backdropFilter: 'blur(20px)',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  indicatorGradient: {
    flex: 1,
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  tabContainer: {
    flex: 1,
    alignItems: 'center',
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    position: 'relative',
    minHeight: 50,
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  cameraTab: {
    backgroundColor: 'rgba(255,215,0,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  cameraGlow: {
    position: 'absolute',
    top: -8,
    right: -8,
  },

  activeDot: {
    position: 'absolute',
    bottom: -2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  particle1: {
    position: 'absolute',
    top: 15,
    left: 30,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFD700',
  },
  particle2: {
    position: 'absolute',
    top: 25,
    right: 50,
    width: 1.5,
    height: 1.5,
    borderRadius: 0.75,
    backgroundColor: '#FFA500',
  },
  particle3: {
    position: 'absolute',
    top: 20,
    left: '50%',
    width: 1,
    height: 1,
    borderRadius: 0.5,
    backgroundColor: '#FF6B35',
  },
});