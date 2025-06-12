// src/navigation/AppNavigator.js - With Biometric Screens
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { UI_CONFIG } from '../utils/constants';

// Import screens
import AuthScreen from '../screens/AuthScreen';
import BiometricLoginScreen from '../screens/BiometricLoginScreen';
import BiometricRegisterScreen from '../screens/BiometricRegisterScreen';
import ChatListScreen from '../screens/ChatListScreen';
import ChatScreen from '../screens/ChatScreen';
import ProfileScreen from '../screens/ProfileScreen';
import UserSearchScreen from '../screens/UserSearchScreen';
import InvitationsScreen from '../screens/InvitationsScreen';
import GroupChatScreen from '../screens/GroupChatScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function ChatTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          
          if (route.name === 'Chats') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }
          
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: UI_CONFIG.COLORS.PRIMARY,
        tabBarInactiveTintColor: 'gray',
        headerShown: false
      })}
    >
      <Tab.Screen name="Chats" component={ChatListScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // Or loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <>
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen 
            name="BiometricLogin" 
            component={BiometricLoginScreen}
            options={{
              presentation: 'modal'
            }}
          />
          <Stack.Screen 
            name="BiometricRegister" 
            component={BiometricRegisterScreen}
            options={{
              presentation: 'modal'
            }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Main" component={ChatTabs} />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen 
            name="UserSearch" 
            component={UserSearchScreen}
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen 
            name="Invitations" 
            component={InvitationsScreen}
            options={{
              headerShown: false
            }}  
          />
          <Stack.Screen 
            name="GroupChat" 
            component={GroupChatScreen}
            options={{
              headerShown: false
            }}
          />
          <Stack.Screen 
            name="BiometricRegister" 
            component={BiometricRegisterScreen}
            options={{
              presentation: 'modal'
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}