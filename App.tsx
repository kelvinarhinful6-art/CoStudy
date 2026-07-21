import React from "react";
import { View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { RootStackParamList } from "./types";
import LoginScreen from "./screens/LoginScreen";
import MainTabs from "./screens/MainTabs";
import BecomeTutorScreen from "./screens/BecomeTutorScreen";
import AdminReviewScreen from "./screens/AdminReviewScreen";
import AdminVettingScreen from "./screens/AdminVettingScreen";
import StudyTimerScreen from "./screens/StudyTimerScreen";
import LoadingScreen from "./screens/LoadingScreen";
import ChatScreen from "./screens/ChatScreen";
import FindPeopleScreen from "./screens/FindPeopleScreen";
import InvitesScreen from "./screens/InvitesScreen";
import TutorSessionsScreen from "./screens/TutorSessionsScreen";
import SessionChatScreen from "./screens/SessionChatScreen";
import ReviewScreen from "./screens/ReviewScreen";
import MySessionsScreen from "./screens/MySessionsScreen";
import AnalyticsScreen from "./screens/AnalyticsScreen";
import NotificationsScreen from "./screens/NotificationsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setTimeout(() => setIsLoading(false), 2500); // Show loading for 2.5 seconds
  }, []);

  if (isLoading) return <LoadingScreen />;
  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#0b3a4a' }}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="BecomeTutor" component={BecomeTutorScreen} />
            <Stack.Screen name="AdminReview" component={AdminReviewScreen} />
            <Stack.Screen name="AdminVetting" component={AdminVettingScreen} />
            <Stack.Screen name="StudyTimer" component={StudyTimerScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="FindPeople" component={FindPeopleScreen} />
            <Stack.Screen name="Invites" component={InvitesScreen} />
            <Stack.Screen name="TutorSessions" component={TutorSessionsScreen} />
            <Stack.Screen name="SessionChat" component={SessionChatScreen} />
            <Stack.Screen name="Review" component={ReviewScreen} />
            <Stack.Screen name="MySessions" component={MySessionsScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}
