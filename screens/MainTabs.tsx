import React, { useState, useEffect } from "react";
import { StyleSheet, StatusBar } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import type { IconName, RootTabParamList } from "../types";
import HomeScreen from "./HomeScreen";
import GroupsScreen from "./GroupsScreen";
import StudyPlannerScreen from "./StudyPlannerScreen";
import TutorsScreen from "./TutorsScreen";
import ProfileScreen from "./ProfileScreen";
import * as chatActivity from "../lib/chatActivity";
import { getNotifications, session } from "../api";

const Tab = createBottomTabNavigator<RootTabParamList>();

const icons: Record<string, IconName> = {
  Home: "home",
  Groups: "people",
  Planner: "calendar-outline",
  Tutors: "school",
  Profile: "person",
};

export default function MainTabs() {
  const [unreadGroups, setUnreadGroups] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  // Keep Groups badge in sync with chat activity.
  useEffect(() => {
    const unsub = chatActivity.subscribe(() => {
      setUnreadGroups(chatActivity.getTotalUnread());
    });
    return unsub;
  }, []);

  // Poll for unread system notifications every 30 s.
  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const data = await getNotifications();
        const unread = Array.isArray(data) ? data.filter((n: any) => !n.read).length : 0;
        setUnreadNotifs(unread);
      } catch (_) {
        // ignore — badge just stays as-is
      }
    };
    fetchNotifs();
    const id = setInterval(fetchNotifs, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      <StatusBar barStyle="light-content" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: "#ffffff",
          tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
          tabBarStyle: styles.tabBar,
          tabBarBackground: () => <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />,
          tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />,
          // Green badge on Groups for unread messages.
          tabBarBadge: route.name === "Groups" && unreadGroups > 0
            ? unreadGroups > 99 ? "99+" : unreadGroups
            : route.name === "Home" && unreadNotifs > 0
            ? unreadNotifs > 99 ? "99+" : unreadNotifs
            : undefined,
          tabBarBadgeStyle: { backgroundColor: "#22c55e", color: "#fff", fontSize: 10, fontWeight: "700" },
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Groups" component={GroupsScreen} />
        <Tab.Screen name="Planner" component={StudyPlannerScreen} />
        <Tab.Screen name="Tutors" component={TutorsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    borderTopWidth: 0,
    backgroundColor: "transparent",
    elevation: 0,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
  },
});
