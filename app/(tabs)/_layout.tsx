import { Tabs } from "expo-router";
import { Camera, FolderOpen, User2, Home, Users2 } from "lucide-react-native";
import React from "react";
import CustomTabBar from "@/components/CustomTabBar";

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
      initialRouteName="(home)"
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "",
          tabBarIcon: ({ color }) => <Home color={color} />,
        }}
      />
      <Tabs.Screen
        name="albums"
        options={{
          title: "",
          tabBarIcon: ({ color }) => <FolderOpen color={color} />,
        }}
      />
      <Tabs.Screen
        name="capture"
        options={{
          title: "",
          tabBarIcon: ({ color }) => <Camera color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: "",
          tabBarIcon: ({ color }) => <Users2 color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "",
          tabBarIcon: ({ color }) => <User2 color={color} />,
        }}
      />
    </Tabs>
  );
}