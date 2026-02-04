import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ContactCard from '../../components/ui/ContactCard';
import SliderComponent from '../../components/ui/Slider';
import Toggle from '../../components/ui/Toggle';
import { mockContacts, STORAGE_KEYS } from '../../constants/mockData';
import { colors } from '../../constants/theme';
import { useAuth0 } from '../../contexts/Auth0Context';
import { storage } from '../../utils/storage';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonPressed: {
    backgroundColor: colors.surface,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  // User Profile Section
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: colors.accent,
  },
  avatarPlaceholderText: {
    fontSize: 40,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  memberSince: {
    fontSize: 14,
    color: colors.textMuted,
  },
  // Section Styles
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionAction: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  // Trusted Contacts
  contactsNote: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 18,
  },
  // Account Settings
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsIcon: {
    width: 24,
    alignItems: 'center',
  },
  settingsText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  settingsRowPressed: {
    opacity: 0.7,
  },
  logoutText: {
    color: colors.danger,
  },
  logoutIcon: {
    color: colors.danger,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

const Profile = () => {
  const router = useRouter();
  const { user, isAuthenticated, logout, isLoading: authLoading } = useAuth0();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Safety Preferences State
  const [safeRoutingMode, setSafeRoutingMode] = useState(true);
  const [riskSensitivity, setRiskSensitivity] = useState(75);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Load preferences from storage on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const storedSafeRouting = await storage.getItem(STORAGE_KEYS.SAFE_ROUTING_MODE);
        const storedRiskSensitivity = await storage.getItem(STORAGE_KEYS.RISK_SENSITIVITY);

        if (storedSafeRouting !== null) {
          setSafeRoutingMode(storedSafeRouting === 'true');
        }
        if (storedRiskSensitivity !== null) {
          setRiskSensitivity(parseInt(storedRiskSensitivity, 10));
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      } finally {
        setPreferencesLoaded(true);
      }
    };

    loadPreferences();
  }, []);

  // Save safe routing mode when changed
  const handleSafeRoutingChange = async (value: boolean) => {
    setSafeRoutingMode(value);
    try {
      await storage.setItem(STORAGE_KEYS.SAFE_ROUTING_MODE, value.toString());
    } catch (error) {
      console.error('Failed to save safe routing mode:', error);
    }
  };

  // Save risk sensitivity when sliding completes
  const handleRiskSensitivityComplete = async (value: number) => {
    try {
      await storage.setItem(STORAGE_KEYS.RISK_SENSITIVITY, Math.round(value).toString());
    } catch (error) {
      console.error('Failed to save risk sensitivity:', error);
    }
  };

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCallContact = (contactId: string) => {
    // TODO: Implement calling functionality
    console.log('Calling contact:', contactId);
  };

  const handleMoreContact = (contactId: string) => {
    // TODO: Implement more options menu
    console.log('More options for contact:', contactId);
  };

  // Format member since date
  const getMemberSinceDate = () =>
    // For now, return a placeholder. In production, this would come from user metadata
    'Member since Oct 2023';

  if (authLoading || !preferencesLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace('/login');
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Profile</Text>
          <Pressable
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
            onPress={() => {
              // TODO: Open settings modal
            }}
          >
            <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            {user.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <Pressable
              style={styles.editAvatarButton}
              onPress={() => {
                // TODO: Implement avatar edit
              }}
            >
              <Ionicons name="pencil" size={16} color={colors.textPrimary} />
            </Pressable>
          </View>
          <Text style={styles.userName}>{user.name || 'User'}</Text>
          <Text style={styles.memberSince}>{getMemberSinceDate()}</Text>
        </View>

        {/* Safety Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Safety Preferences</Text>
            <Pressable
              onPress={() => {
                /* TODO: Navigate to edit weights */
              }}
            >
              <Text style={styles.sectionAction}>Edit Weights</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            <Toggle
              value={safeRoutingMode}
              onValueChange={handleSafeRoutingChange}
              label="Safe Routing Mode"
              subtitle="Prioritize lit & populated paths"
              icon={<Ionicons name="shield-checkmark" size={20} color={colors.accent} />}
            />
            <View style={styles.cardDivider} />
            <SliderComponent
              value={riskSensitivity}
              onValueChange={setRiskSensitivity}
              onSlidingComplete={handleRiskSensitivityComplete}
              label="Risk Sensitivity"
              min={0}
              max={100}
              step={1}
              showPercentage
            />
          </View>
        </View>

        {/* Trusted Contacts Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trusted Contacts</Text>
            <Pressable
              onPress={() => {
                /* TODO: Add new contact */
              }}
            >
              <Text style={styles.sectionAction}>+ Add New</Text>
            </Pressable>
          </View>
          {mockContacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onCall={() => handleCallContact(contact.id)}
              onMore={() => handleMoreContact(contact.id)}
            />
          ))}
          <Text style={styles.contactsNote}>
            * These contacts will be notified automatically if you trigger an SOS or fail to reach
            your destination on time.
          </Text>
        </View>

        {/* Account Settings Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Account Settings</Text>
          </View>
          <View style={styles.card}>
            <Pressable
              style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
              onPress={() => {
                /* TODO: Navigate to personal info */
              }}
            >
              <View style={styles.settingsRowLeft}>
                <View style={styles.settingsIcon}>
                  <Ionicons name="person-outline" size={20} color={colors.textSecondary} />
                </View>
                <Text style={styles.settingsText}>Personal Information</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>

            <View style={styles.cardDivider} />

            <Pressable
              style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              <View style={styles.settingsRowLeft}>
                <View style={styles.settingsIcon}>
                  <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                </View>
                <Text style={[styles.settingsText, styles.logoutText]}>
                  {isLoggingOut ? 'Logging out...' : 'Log Out'}
                </Text>
              </View>
              {isLoggingOut && <ActivityIndicator size="small" color={colors.danger} />}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

export default Profile;
