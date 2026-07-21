import React from "react";
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

const Tab = createBottomTabNavigator<RootTabParamList>();
const icons: Record<string, IconName> = {
  Home: "home",
  Groups: "people",
  Planner: "calendar-outline",
  Tutors: "school",
  Profile: "person",
};

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />,
        tabBarIcon: ({ color, size }) => <Ionicons name={icons[route.name]} size={size} color={color} />,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Planner" component={StudyPlannerScreen} />
      <Tab.Screen name="Tutors" component={TutorsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
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
