import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { TouchableOpacity, View } from 'react-native';
import { PieChart, TrendingUp, TrendingDown, Menu } from 'lucide-react-native';
import Colors from '@/constants/colors';
import SlideMenu from '@/components/SlideMenu';

export default function TabLayout() {
  const [menuVisible, setMenuVisible] = useState(false);
  
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primaryDark,
          tabBarInactiveTintColor: Colors.lightText,
          tabBarStyle: {
            backgroundColor: Colors.secondary,
            borderTopColor: Colors.border,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginBottom: 5,
          },
          headerStyle: {
            backgroundColor: Colors.secondary,
            borderBottomColor: Colors.border,
            borderBottomWidth: 1,
          },
          headerTitleStyle: {
            color: Colors.text,
            fontWeight: 'bold',
          },
          headerRight: () => (
            <TouchableOpacity
              style={{ marginRight: 15 }}
              onPress={() => setMenuVisible(true)}
            >
              <Menu size={24} color={Colors.text} />
            </TouchableOpacity>
          ),
        }}
      >
        <Tabs.Screen
          name="income"
          options={{
            title: 'Inkomen',
            tabBarIcon: ({ color }) => <TrendingUp size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: 'Overzicht',
            tabBarIcon: ({ color }) => <PieChart size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            title: 'Uitgaven',
            tabBarIcon: ({ color }) => <TrendingDown size={24} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="bank-statement"
          options={{
            href: null, // Hide from tab bar
          }}
        />
      </Tabs>
      
      <SlideMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
      />
    </>
  );
}