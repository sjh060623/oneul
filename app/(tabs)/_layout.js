import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";
import "../geoBackground";

import { DynamicColorIOS } from "react-native";
export default function TabsLayout() {
  return (
    <NativeTabs
      labelStyle={{
        color: DynamicColorIOS({
          dark: "white",
          light: "white",
        }),
      }}
      tintColor={DynamicColorIOS({
        dark: "white",
        light: "white",
      })}
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
