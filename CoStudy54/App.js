import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import LoginScreen from "./screens/LoginScreen";
import MainTabs from "./screens/MainTabs";
import BecomeTutorScreen from "./screens/BecomeTutorScreen";
import AdminReviewScreen from "./screens/AdminReviewScreen";
import AdminVettingScreen from "./screens/AdminVettingScreen";
import SettingsScreen from "./screens/SettingsScreen";
import VettingTestScreen from "./screens/VettingTestScreen";
import StudyPlannerScreen from "./screens/StudyPlannerScreen";
import StudyTimerScreen from "./screens/StudyTimerScreen";
import ChatScreen from "./screens/ChatScreen";
import FindPeopleScreen from "./screens/FindPeopleScreen";
import InvitesScreen from "./screens/InvitesScreen";
import TutorSessionsScreen from "./screens/TutorSessionsScreen";
import SessionChatScreen from "./screens/SessionChatScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="BecomeTutor" component={BecomeTutorScreen} />
          <Stack.Screen name="AdminReview" component={AdminReviewScreen} />
          <Stack.Screen name="AdminVetting" component={AdminVettingScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="VettingTest" component={VettingTestScreen} />
          <Stack.Screen name="StudyPlanner" component={StudyPlannerScreen} />
          <Stack.Screen name="StudyTimer" component={StudyTimerScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="FindPeople" component={FindPeopleScreen} />
          <Stack.Screen name="Invites" component={InvitesScreen} />
          <Stack.Screen name="TutorSessions" component={TutorSessionsScreen} />
          <Stack.Screen name="SessionChat" component={SessionChatScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
