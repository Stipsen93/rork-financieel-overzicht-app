import React, { useState } from 'react';
import { Tabs } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { PieChart, TrendingUp, TrendingDown, Menu } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import SlideMenu from '@/components/SlideMenu';

export default function TabLayout() {
  const [menuVisible, setMenuVisible] = useState(false);
  const insets = useSafeAreaInsets();
  
  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primaryDark,
          tabBarInactiveTintColor: Colors.lightText,
          tabBarStyle: {
            backgroundColor: Colors.secondary,
            borderTopColor: Colors.border,
            height: 80 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
            paddingTop: 10,
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
          headerTitle: ({ children }) => (
            <Text style={{ color: Colors.text, fontWeight: 'bold', fontSize: 17 }}>
              {children}
            </Text>
          ),
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
          name="preferences"
          options={{
            title: 'Voorkeuren',
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'API Sleutel',
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="bank-statement"
          options={{
            title: 'Bankafschrift',
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="backup"
          options={{
            title: 'Back-up',
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="reset"
          options={{
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="vat-declaration"
          options={{
            title: 'BTW Aangifte',
            href: null, // Hide from tab bar
          }}
        />
        <Tabs.Screen
          name="income-tax"
          options={{
            title: 'Inkomsten Belasting',
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