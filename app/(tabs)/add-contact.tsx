import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { upsertTrustedContact } from '../../api/contacts';
import GradientBackground from '../../components/ui/GradientBackground';
import { borderRadius, colors, spacing } from '../../constants/theme';
import { useAuth0 } from '../../contexts/Auth0Context';

const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Partner', 'Other'];

const COUNTRY_CODES = [
  { code: '+1', label: '🇺🇸 +1', country: 'US' },
  { code: '+1', label: '🇨🇦 +1', country: 'CA' },
  { code: '+44', label: '🇬🇧 +44', country: 'UK' },
  { code: '+91', label: '🇮🇳 +91', country: 'IN' },
  { code: '+61', label: '🇦🇺 +61', country: 'AU' },
  { code: '+49', label: '🇩🇪 +49', country: 'DE' },
  { code: '+33', label: '🇫🇷 +33', country: 'FR' },
  { code: '+81', label: '🇯🇵 +81', country: 'JP' },
  { code: '+86', label: '🇨🇳 +86', country: 'CN' },
  { code: '+52', label: '🇲🇽 +52', country: 'MX' },
  { code: '+55', label: '🇧🇷 +55', country: 'BR' },
  { code: '+82', label: '🇰🇷 +82', country: 'KR' },
  { code: '+39', label: '🇮🇹 +39', country: 'IT' },
  { code: '+34', label: '🇪🇸 +34', country: 'ES' },
  { code: '+353', label: '🇮🇪 +353', country: 'IE' },
  { code: '+971', label: '🇦🇪 +971', country: 'AE' },
];

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
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
  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  cameraButton: {
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
  importText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: '500',
  },
  // Form
  formSection: {
    paddingHorizontal: 20,
    gap: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  inputError: {
    borderColor: colors.danger,
  },
  fieldErrorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
  },
  // Relationship Dropdown
  dropdownButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  dropdownPlaceholder: {
    color: colors.textMuted,
  },
  dropdownList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
  },
  dropdownItemSelected: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
  },
  dropdownItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownItemText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  dropdownItemTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.border,
  },
  // Phone Number
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countryCode: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countryCodeText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  countryPickerList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    overflow: 'hidden',
  },
  countryPickerScroll: {
    maxHeight: 200,
  },
  phoneInput: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.textPrimary,
  },
  // Notify Toggle
  notifyCard: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  notifyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  notifyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifyTextContainer: {
    flex: 1,
  },
  notifyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  notifySubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 16,
  },
  // Save Button
  saveButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  saveButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.md,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

/* eslint-disable no-console */

const AddContact = () => {
  const router = useRouter();
  const { user } = useAuth0();

  const [fullName, setFullName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState(COUNTRY_CODES[0]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [isPrimary, setIsPrimary] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Backend stores user_id without the "auth0|" prefix
  const userId = (user?.sub ?? '').split('|').pop() ?? '';

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim()) {
      errors.fullName = 'Full name is required';
    }

    if (!relationship) {
      errors.relationship = 'Please select a relationship';
    }

    if (!phoneNumber.trim()) {
      errors.phoneNumber = 'Phone number is required';
    } else if (phoneNumber.replace(/\D/g, '').length < 7) {
      errors.phoneNumber = 'Please enter a valid phone number';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveContact = async (asPrimary: boolean) => {
    if (!userId) {
      Alert.alert('Error', 'You must be logged in to add a contact.');
      return;
    }
    try {
      setIsSaving(true);
      const phone = `${countryCode.code}${phoneNumber.replace(/\D/g, '')}`;
      await upsertTrustedContact(userId, {
        name: fullName.trim(),
        phone,
        relationship: relationship || null,
        is_primary: asPrimary,
      });
      Alert.alert('Contact Saved', `${fullName} has been added as a trusted contact.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      console.error('Failed to save contact:', err);
      const msg = err.message || '';
      Alert.alert('Error', msg || 'Failed to save contact. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (!validateForm()) return;
    saveContact(isPrimary);
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable
              style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>Add Contact</Text>
          </View>

          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="image-outline" size={40} color={colors.textMuted} />
              </View>
              <Pressable style={styles.cameraButton}>
                <Ionicons name="camera" size={16} color={colors.textPrimary} />
              </Pressable>
            </View>
            <Pressable>
              <Text style={styles.importText}>Import from phone contacts</Text>
            </Pressable>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            {/* Full Name */}
            <View>
              <Text style={styles.fieldLabel}>Full Name</Text>
              <TextInput
                style={[styles.input, fieldErrors.fullName && styles.inputError]}
                placeholder="e.g. Alex Johnson"
                placeholderTextColor={colors.textMuted}
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  if (fieldErrors.fullName) {
                    setFieldErrors((prev) => ({ ...prev, fullName: '' }));
                  }
                }}
                autoCapitalize="words"
              />
              {fieldErrors.fullName ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.fullName}</Text>
              ) : null}
            </View>

            {/* Relationship */}
            <View>
              <Text style={styles.fieldLabel}>Relationship</Text>
              <Pressable
                style={[styles.dropdownButton, fieldErrors.relationship && styles.inputError]}
                onPress={() => {
                  setShowDropdown(!showDropdown);
                  setShowCountryPicker(false);
                }}
              >
                <Text
                  style={[styles.dropdownButtonText, !relationship && styles.dropdownPlaceholder]}
                >
                  {relationship || 'Select relationship'}
                </Text>
                <Ionicons
                  name={showDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
              {fieldErrors.relationship ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.relationship}</Text>
              ) : null}
              {showDropdown && (
                <View style={styles.dropdownList}>
                  {RELATIONSHIPS.map((item, index) => (
                    <View key={item}>
                      {index > 0 && <View style={styles.dropdownDivider} />}
                      <Pressable
                        style={({ pressed }) => [
                          styles.dropdownItem,
                          relationship === item && styles.dropdownItemSelected,
                          pressed && styles.dropdownItemPressed,
                        ]}
                        onPress={() => {
                          setRelationship(item);
                          setShowDropdown(false);
                          if (fieldErrors.relationship) {
                            setFieldErrors((prev) => ({ ...prev, relationship: '' }));
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.dropdownItemText,
                            relationship === item && styles.dropdownItemTextSelected,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Phone Number */}
            <View>
              <Text style={styles.fieldLabel}>Phone Number</Text>
              <View style={styles.phoneRow}>
                <Pressable
                  style={styles.countryCode}
                  onPress={() => {
                    setShowCountryPicker(!showCountryPicker);
                    setShowDropdown(false);
                  }}
                >
                  <Text style={styles.countryCodeText}>{countryCode.label}</Text>
                  <Ionicons
                    name={showCountryPicker ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={colors.textMuted}
                  />
                </Pressable>
                <TextInput
                  style={[styles.phoneInput, fieldErrors.phoneNumber && styles.inputError]}
                  placeholder="(555) 000-0000"
                  placeholderTextColor={colors.textMuted}
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    if (fieldErrors.phoneNumber) {
                      setFieldErrors((prev) => ({ ...prev, phoneNumber: '' }));
                    }
                  }}
                  keyboardType="phone-pad"
                />
              </View>
              {showCountryPicker && (
                <View style={styles.countryPickerList}>
                  <ScrollView
                    nestedScrollEnabled
                    style={styles.countryPickerScroll}
                    showsVerticalScrollIndicator
                  >
                    {COUNTRY_CODES.map((item, index) => (
                      <View key={`${item.country}-${item.code}`}>
                        {index > 0 && <View style={styles.dropdownDivider} />}
                        <Pressable
                          style={({ pressed }) => [
                            styles.dropdownItem,
                            countryCode.country === item.country && styles.dropdownItemSelected,
                            pressed && styles.dropdownItemPressed,
                          ]}
                          onPress={() => {
                            setCountryCode(item);
                            setShowCountryPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              countryCode.country === item.country &&
                                styles.dropdownItemTextSelected,
                            ]}
                          >
                            {item.label} ({item.country})
                          </Text>
                        </Pressable>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}
              {fieldErrors.phoneNumber ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.phoneNumber}</Text>
              ) : null}
            </View>

            {/* Notify on SOS Toggle */}
            <View style={styles.notifyCard}>
              <View style={styles.notifyLeft}>
                <View style={styles.notifyIconContainer}>
                  <Ionicons name="shield-checkmark" size={20} color={colors.accent} />
                </View>
                <View style={styles.notifyTextContainer}>
                  <Text style={styles.notifyTitle}>Set as Primary Contact</Text>
                  <Text style={styles.notifySubtitle}>
                    Primary contact is notified first during SOS
                  </Text>
                </View>
              </View>
              <Switch
                value={isPrimary}
                onValueChange={setIsPrimary}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.textPrimary}
              />
            </View>

            {/* Save Button */}
            <View style={styles.saveButtonContainer}>
              <Pressable
                style={({ pressed }) => [
                  styles.saveButton,
                  pressed && styles.saveButtonPressed,
                  isSaving && { opacity: 0.6 },
                ]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Ionicons name="person-add" size={20} color={colors.textPrimary} />
                )}
                <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save Contact'}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    </GradientBackground>
  );
};

export default AddContact;
