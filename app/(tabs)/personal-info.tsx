import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import GradientBackground from '../../components/ui/GradientBackground';
import { colors } from '../../constants/theme';
import { useAuth0 } from '../../contexts/Auth0Context';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldContainerLast: {
    marginBottom: 0,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldValue: {
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldInput: {
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldInputFocused: {
    borderColor: colors.primary,
  },
  fieldReadOnly: {
    opacity: 0.6,
  },
  fieldHelper: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
  },
  timestampRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  timestampLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  timestampValue: {
    fontSize: 14,
    color: colors.textMuted,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

const PersonalInfo = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth0();

  // Editable fields
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isSaving, setIsSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Mock timestamps - in production these would come from user metadata/API
  const createdAt = 'October 15, 2023';
  const updatedAt = 'January 28, 2025';
  const lastLogin = 'February 4, 2025';

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // TODO: Call API to update user info
      // await api.put('/users/me', { name, phone });

      // Simulate API call
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 1000);
      });

      router.back();
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges = name !== (user?.name || '') || phone !== (user?.phone || '');

  if (authLoading) {
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
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Editable Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.card}>
            {/* Email - Read Only */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={[styles.fieldValue, styles.fieldReadOnly]}>{user.email || 'N/A'}</Text>
              <Text style={styles.fieldHelper}>Email cannot be changed</Text>
            </View>

            {/* Name - Editable */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={[styles.fieldInput, focusedField === 'name' && styles.fieldInputFocused]}
                value={name}
                onChangeText={setName}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                placeholder="Enter your name"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
              />
            </View>

            {/* Phone - Editable */}
            <View style={[styles.fieldContainer, styles.fieldContainerLast]}>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <TextInput
                style={[styles.fieldInput, focusedField === 'phone' && styles.fieldInputFocused]}
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />
              <Text style={styles.fieldHelper}>Used for emergency contacts and SOS alerts</Text>
            </View>
          </View>
        </View>

        {/* Account Timestamps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Activity</Text>
          <View style={styles.card}>
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Account Created</Text>
              <Text style={styles.timestampValue}>{createdAt}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Last Updated</Text>
              <Text style={styles.timestampValue}>{updatedAt}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>Last Login</Text>
              <Text style={styles.timestampValue}>{lastLogin}</Text>
            </View>
          </View>
        </View>

        {/* User ID - For reference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account ID</Text>
          <View style={styles.card}>
            <View style={[styles.fieldContainer, styles.fieldContainerLast]}>
              <Text style={[styles.fieldValue, styles.fieldReadOnly]}>{user.sub || 'N/A'}</Text>
              <Text style={styles.fieldHelper}>Your unique account identifier</Text>
            </View>
          </View>
        </View>

        {/* Save Button */}
        {hasChanges && (
          <Pressable
            style={({ pressed }) => [
              styles.saveButton,
              isSaving && styles.saveButtonDisabled,
              pressed && styles.saveButtonPressed,
            ]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </Pressable>
        )}
      </ScrollView>
    </GradientBackground>
  );
};

export default PersonalInfo;
