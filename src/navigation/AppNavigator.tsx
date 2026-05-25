// Navigation setup using React Navigation
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';


import HomeScreen from '../screens/HomeScreen';
import EventsScreen from '../screens/EventsScreen';
import WinnersScreen from '../screens/WinnersScreen';
import RepositoryScreen from '../screens/RepositoryScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AuthScreen from '../screens/AuthScreen';
import { useUserStore } from '../store/userStore';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const user = useUserStore((state) => state.user);
  return (
    <NavigationContainer>
      {user ? (
        <Tab.Navigator>
          <Tab.Screen name="Home" component={HomeScreen} />
          <Tab.Screen name="Events" component={EventsScreen} />
          <Tab.Screen name="Winners" component={WinnersScreen} />
          <Tab.Screen name="Repository" component={RepositoryScreen} />
          <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
      ) : (
        <AuthScreen />
      )}
    </NavigationContainer>
  );
}
