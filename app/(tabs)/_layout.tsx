import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { TabNames } from '../../constants/routes';
import { colors } from '../../constants/theme';

interface IIcon {
  color: string;
  size: number;
}

const MapIcon = ({ color, size }: IIcon) => <Ionicons name="map" size={size} color={color} />;

const AlertsIcon = ({ color, size }: IIcon) => (
  <Ionicons name="notifications" size={size} color={color} />
);

const ProfileIcon = ({ color, size }: IIcon) => (
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
      name={TabNames.INDEX}
      options={{
        title: 'Map',
        tabBarIcon: MapIcon,
      }}
    />
    <Tabs.Screen
      name={TabNames.ALERTS}
      options={{
        title: 'Alerts',
        tabBarIcon: AlertsIcon,
      }}
    />
    <Tabs.Screen
      name={TabNames.PROFILE}
      options={{
        title: 'Profile',
        tabBarIcon: ProfileIcon,
      }}
    />
    <Tabs.Screen
      name={TabNames.PERSONAL_INFO}
      options={{
        href: null,
      }}
    />
    <Tabs.Screen
      name={TabNames.HELP}
      options={{
        href: null,
      }}
    />
  </Tabs>
);

export default TabLayout;
