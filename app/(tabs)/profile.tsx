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
import GradientBackground from '../../components/ui/GradientBackground';
import SegmentedToggle from '../../components/ui/SegmentedToggle';
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
  headerPlaceholder: {
    width: 40,
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

  // Preferences State
  const [voiceGuidance, setVoiceGuidance] = useState(true);
  const [useKilometers, setUseKilometers] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Load preferences from storage on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const storedVoiceGuidance = await storage.getItem(STORAGE_KEYS.VOICE_GUIDANCE);
        const storedUnits = await storage.getItem(STORAGE_KEYS.UNITS);

        if (storedVoiceGuidance !== null) {
          setVoiceGuidance(storedVoiceGuidance === 'true');
        }
        if (storedUnits !== null) {
          setUseKilometers(storedUnits === 'km');
        }
      } finally {
        setPreferencesLoaded(true);
      }
    };

    loadPreferences();
  }, []);

  // Save voice guidance when changed
  const handleVoiceGuidanceChange = async (value: boolean) => {
    setVoiceGuidance(value);
    await storage.setItem(STORAGE_KEYS.VOICE_GUIDANCE, value.toString());
  };

  // Save units when changed
  const handleUnitsChange = async (useKm: boolean) => {
    setUseKilometers(useKm);
    await storage.setItem(STORAGE_KEYS.UNITS, useKm ? 'km' : 'mi');
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
    <GradientBackground>
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
          <View style={styles.headerPlaceholder} />
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

        {/* Preferences Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Preferences</Text>
          </View>
          <View style={styles.card}>
            <SegmentedToggle
              label="Voice Guidance"
              options={['No', 'Yes']}
              selectedIndex={voiceGuidance ? 1 : 0}
              onSelect={(index) => handleVoiceGuidanceChange(index === 1)}
            />
            <View style={styles.cardDivider} />
            <SegmentedToggle
              label="Distance Units"
              options={['Mile', 'km']}
              selectedIndex={useKilometers ? 1 : 0}
              onSelect={(index) => handleUnitsChange(index === 1)}
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
              onPress={() => router.push('/(tabs)/personal-info')}
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
              onPress={() => router.push('/(tabs)/help')}
            >
              <View style={styles.settingsRowLeft}>
                <View style={styles.settingsIcon}>
                  <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
                </View>
                <Text style={styles.settingsText}>Help</Text>
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
    </GradientBackground>
  );
};

export default Profile;
