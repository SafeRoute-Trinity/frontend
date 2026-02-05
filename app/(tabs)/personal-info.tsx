import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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
import { Routes } from '../../constants/routes';
import { colors } from '../../constants/theme';
import { useAuth0 } from '../../contexts/Auth0Context';

interface IInfoField {
  label: string;
  value: string;
  editable?: boolean;
  onChangeText?: (text: string) => void;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginLeft: 12,
  },
  section: {
    paddingHorizontal: 20,
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
    backgroundColor: colors.background,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldValueEditable: {
    borderColor: colors.accent,
  },
  fieldValueDisabled: {
    color: colors.textSecondary,
  },
  timestampContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  timestampContainerLast: {
    borderBottomWidth: 0,
  },
  timestampLabel: {
    fontSize: 14,
    color: colors.textMuted,
  },
  timestampValue: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  accountIdContainer: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 16,
  },
  accountIdLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 4,
  },
  accountIdValue: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 24,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: colors.border,
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
  },
});

const InfoField = ({ label, value, editable, onChangeText }: IInfoField) => (
  <View style={styles.fieldContainer}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {editable && onChangeText ? (
      <TextInput
        style={[styles.fieldValue, styles.fieldValueEditable]}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={colors.textMuted}
      />
    ) : (
      <Text style={[styles.fieldValue, styles.fieldValueDisabled]}>{value}</Text>
    )}
  </View>
);

const PersonalInfo = () => {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth0();
  const [name, setName] = useState<string | undefined>(undefined);
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
    }
  }, [user]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const hasChanges = name !== user?.name || phone !== user?.phone;

  const handleSave = async () => {
    if (!hasChanges) return;
    setIsSaving(true);
    // Simulate API call
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 1000);
    });
    // TODO: Implement actual save logic
    setIsSaving(false);
  };

  if (authLoading) {
    return (
      <GradientBackground>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </GradientBackground>
    );
  }

  if (!isAuthenticated || !user) {
    router.replace(Routes.LOGIN);
    return null;
  }

  return (
    <GradientBackground>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>Personal Information</Text>
          </View>

          {/* Contact Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.card}>
              <InfoField label="Email" value={user.email ?? 'Not provided'} editable={false} />
              <InfoField label="Full Name" value={name ?? ''} editable onChangeText={setName} />
              <View style={styles.fieldContainerLast}>
                <InfoField label="Phone" value={phone ?? ''} editable onChangeText={setPhone} />
              </View>
            </View>
          </View>

          {/* Account Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account Information</Text>
            <View style={styles.card}>
              <View style={styles.timestampContainer}>
                <Text style={styles.timestampLabel}>Account created</Text>
                <Text style={styles.timestampValue}>{formatDate(user.created_at)}</Text>
              </View>
              <View style={styles.timestampContainer}>
                <Text style={styles.timestampLabel}>Last updated</Text>
                <Text style={styles.timestampValue}>{formatDate(user.updated_at)}</Text>
              </View>
              <View style={[styles.timestampContainer, styles.timestampContainerLast]}>
                <Text style={styles.timestampLabel}>Last login</Text>
                <Text style={styles.timestampValue}>{formatDate(user.last_login)}</Text>
              </View>
            </View>
          </View>

          {/* Account ID */}
          <View style={styles.accountIdContainer}>
            <Text style={styles.accountIdLabel}>Account ID</Text>
            <Text style={styles.accountIdValue}>{user.sub}</Text>
          </View>
        </ScrollView>

        {/* Save Button */}
        {hasChanges && (
          <Pressable
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Changes'}</Text>
          </Pressable>
        )}
      </View>
    </GradientBackground>
  );
};

export default PersonalInfo;
