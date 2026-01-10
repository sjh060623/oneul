import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { DynamicColorIOS, Platform, View } from "react-native";
import "../geoBackground";

export default function TabsLayout() {
  const iosVersion = Platform.OS === "ios" ? parseInt(Platform.Version, 10) : 0;
  const isTargetIOS = Platform.OS === "ios" && iosVersion >= 20;

  if (isTargetIOS) {
    return (
      <NativeTabs
        translucent={false}
        style={{
          backgroundColor: DynamicColorIOS({
            dark: "#0b0b0b",
            light: "#ffffff",
          }),
          borderTopWidth: 0.5,
          borderTopColor: DynamicColorIOS({
            dark: "#1f1f1f",
            light: "#e5e5e5",
          }),
        }}
      >
        <NativeTabs.Trigger name="home">
          <Icon
            sf={{
              default: "house",
              selected: "house.fill",
            }}
          />
          <Label>홈</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="record">
          <Icon
            sf={{
              default: "book.pages",
              selected: "book.pages",
            }}
          />
          <Label>기록</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="search">
          <Icon
            sf={{
              default: "magnifyingglass",
              selected: "magnifyingglass",
            }}
          />
          <Label>검색</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon
            sf={{
              default: "person",
              selected: "person.fill",
            }}
          />
          <Label>프로필</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: DynamicColorIOS({
          dark: "white",
          light: "black",
        }),
        tabBarInactiveTintColor: "#6f7377",

        tabBarStyle: {
          backgroundColor: DynamicColorIOS({
            dark: "#0b0b0b",
            light: "#ffffff",
          }),
          borderTopWidth: 0.5,
          borderTopColor: DynamicColorIOS({
            dark: "#1f1f1f",
            light: "#e5e5e5",
          }),
          height: Platform.OS === "ios" ? 88 : 60,
        },

        tabBarBackground: () => (
          <View
            style={{
              flex: 1,
              backgroundColor: DynamicColorIOS({
                dark: "#0b0b0b",
                light: "#ffffff",
              }),
            }}
          />
        ),

        headerShown: false,
      }}
    >
      {/* 홈 */}
      <Tabs.Screen
        name="home"
        options={{
          title: "홈",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />

      {/* 기록 */}
      <Tabs.Screen
        name="record"
        options={{
          title: "기록",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name="book-outline" size={22} color={color} />
          ),
        }}
      />

      {/* 검색 */}
      <Tabs.Screen
        name="search"
        options={{
          title: "검색",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name="search" size={22} color={color} />
          ),
        }}
      />

      {/* 프로맆ㄹ */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "프로필",
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={22}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
