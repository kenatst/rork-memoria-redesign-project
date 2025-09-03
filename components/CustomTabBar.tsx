import React, { useMemo, useEffect, useState } from "react";
import { View, Pressable, StyleSheet, Platform, Animated, Dimensions, Text } from "react-native";
import Colors from "@/constants/colors";
import { Camera, Users2, User2, Home, FolderOpen, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface CustomTabBarProps {
  state: any;
  descriptors: any;
  navigation: any;
  insets?: any;
}

export default function CustomTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const screenWidth = Dimensions.get('window').width;

  const focusedOptions = descriptors[state.routes[state.index].key]?.options ?? {};
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const handleHapticFeedback = React.useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

    return { key: route.key, label, isFocused, onPress, Icon, index, name: route.name };
  }), [state.routes, state.index, descriptors, navigation, handleHapticFeedback]);

  if (focusedOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={styles.container} testID="custom-tabbar">
      <View style={styles.bar} />
      <View style={styles.content}>
        {items.map((item: any) => {
          const isCenter = item.name === 'capture';
          const color = item.isFocused ? Colors.palette.taupeDeep : Colors.light.tabIconDefault;

          if (isCenter) {
            return (
              <View key={item.key} style={styles.centerWrap}>
                <Animated.View style={[styles.fabShadow, { transform: [{ scale: item.isFocused ? pulseAnim : 1 }] }]}> 
                  <Pressable
                    onPress={item.onPress}
                    accessibilityRole="button"
                    style={styles.fab}
                    testID="tab-capture"
                  >
                    <Plus color="#fff" size={24} />
                  </Pressable>
                </Animated.View>
              </View>
            );
          }

          const labelMap: Record<string,string> = {
            "(home)": "Accueil",
            albums: "Albums",
            groups: "Groupes",
            profile: "Profil",
          };

          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityState={item.isFocused ? { selected: true } : {}}
              onPress={item.onPress}
              style={styles.tab}
              testID={`tab-${item.name}`}
            >
              <item.Icon color={color} size={22} />
              <Text style={[styles.label, { color }]}>
                {labelMap[item.name] ?? item.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  bar: {
    backgroundColor: 'rgba(242,235,225,0.90)',
    borderTopWidth: 0,
    height: 68,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -6 },
    shadowRadius: 12,
    elevation: 6,
  },
  content: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 18,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 64,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
  },
  centerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -18,
  },
  fabShadow: {
    shadowColor: Colors.palette.accentGold,
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 8,
    borderRadius: 30,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.palette.accentGold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.palette.accentGoldDark,
  },
});