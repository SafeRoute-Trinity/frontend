import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '../../constants/theme';

const MapIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="map" size={size} color={color} />
);

const AlertsIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="notifications" size={size} color={color} />
);

const ProfileIcon = ({ color, size }: { color: string; size: number }) => (
  <Ionicons name="person" size={size} color={color} />
);

const TabLayout = () => (
  <Tabs
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        height: 60,
        paddingBottom: 8,
        paddingTop: 8,
      },
      tabBarActiveTintColor: colors.accent,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '600',
      },
    }}
  >
    <Tabs.Screen
      name="index"
      options={{
        title: 'Map',
        tabBarIcon: MapIcon,
      }}
    />
    <Tabs.Screen
      name="alerts"
      options={{
        title: 'Alerts',
        tabBarIcon: AlertsIcon,
      }}
    />
    <Tabs.Screen
      name="profile"
      options={{
        title: 'Profile',
        tabBarIcon: ProfileIcon,
      }}
    />
    <Tabs.Screen
      name="personal-info"
      options={{
        href: null, // Hide from tab bar
      }}
    />
    <Tabs.Screen
      name="help"
      options={{
        href: null, // Hide from tab bar
      }}
    />
  </Tabs>
);

export default TabLayout;
