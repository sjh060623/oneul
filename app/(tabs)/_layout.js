import { AntDesign, Ionicons } from "@expo/vector-icons"; // 지난번 에러 수정 반영
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import { DynamicColorIOS, Platform, View, useColorScheme } from "react-native";
import "../geoBackground";

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

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
          <Icon sf={{ default: "house", selected: "house.fill" }} />
          <Label>홈</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="record">
          <Icon sf={{ default: "book.pages", selected: "book.pages" }} />
          <Label>기록</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="insight">
          <Icon
            sf={{
              default: "chart.dots.scatter",
              selected: "chart.dots.scatter",
            }}
          />
          <Label>분석</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <Icon sf={{ default: "person", selected: "person.fill" }} />
          <Label>프로필</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  // 아이콘 렌더러 함수
  const renderTabBarIcon =
    (name, type = "Ionicons") =>
    ({ focused, color }) => {
      if (type === "AntDesign")
        return <AntDesign name={name} size={22} color={color} />;
      const iconName = focused ? name.replace("-outline", "") : name;
      return <Ionicons name={iconName} size={22} color={color} />;
    };

  const getScreenOptions = () => {
    if (Platform.OS === "android") {
      return {
        tabBarActiveTintColor: isDark ? "white" : "black",
        tabBarInactiveTintColor: "#6f7377",
        tabBarStyle: {
          backgroundColor: isDark ? "#0b0b0b" : "#ffffff",
          borderTopWidth: 0.5,
          borderTopColor: isDark ? "#1f1f1f" : "#e5e5e5",
          height: 60,
        },
        tabBarBackground: () => (
          <View
            style={{ flex: 1, backgroundColor: isDark ? "#0b0b0b" : "#ffffff" }}
          />
        ),
      };
    }

    // iOS 구버전
    return {
      tabBarActiveTintColor: DynamicColorIOS({ dark: "white", light: "black" }),
      tabBarInactiveTintColor: "#6f7377",
      tabBarStyle: {
        backgroundColor: DynamicColorIOS({ dark: "#0b0b0b", light: "#ffffff" }),
        borderTopWidth: 0.5,
        borderTopColor: DynamicColorIOS({ dark: "#1f1f1f", light: "#e5e5e5" }),
        height: 88,
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
    };
  };

  return (
    <Tabs
      screenOptions={{
        ...getScreenOptions(),
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "홈",
          tabBarIcon: renderTabBarIcon("home-outline"),
        }}
      />
      <Tabs.Screen
        name="record"
        options={{
          title: "기록",
          tabBarIcon: renderTabBarIcon("book-outline"),
        }}
      />
      <Tabs.Screen
        name="insight"
        options={{
          title: "분석",
          tabBarIcon: renderTabBarIcon("dot-chart", "AntDesign"),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "프로필",
          tabBarIcon: renderTabBarIcon("person-outline"),
        }}
      />
      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
