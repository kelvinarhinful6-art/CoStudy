import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";
import HomeScreen from "./HomeScreen";
import GroupsScreen from "./GroupsScreen";
import TutorsScreen from "./TutorsScreen";
import ProfileScreen from "./ProfileScreen";

const Tab = createBottomTabNavigator();
const icons = { Home: "home", Groups: "people", Tutors: "school", Profile: "person" };

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#ffffff",
        tabBarInactiveTintColor: "rgba(255,255,255,0.6)",
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (<BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />),
        tabBarIcon: ({ color, size }) => (<Ionicons name={icons[route.name]} size={size} color={color} />),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Groups" component={GroupsScreen} />
      <Tab.Screen name="Tutors" component={TutorsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: { position: "absolute", borderTopWidth: 0, backgroundColor: "transparent", elevation: 0, height: 64, paddingBottom: 8, paddingTop: 8 },
});
