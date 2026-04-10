import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import GradientBackground from '../../components/ui/GradientBackground';
import { API_URL } from '../../config/api';
import { InputFocus, InputFocusType } from '../../constants/routes';
import { colors } from '../../constants/theme';
import { useAuth0 } from '../../contexts/Auth0Context';

type RecaptchaRef = { open: () => void };

const recaptchaModule: { default?: any } | null = (() => {
  try {
    return require('react-native-recaptcha-that-works');
  } catch {
    return null;
  }
})();

// Falls back to '' if the EAS secret is not set — treated as unavailable below.
const RECAPTCHA_SITE_KEY = process.env.EXPO_PUBLIC_RECAPTCHA_SITE_KEY ?? '';

const RecaptchaView = recaptchaModule?.default ?? null;
const IS_RECAPTCHA_AVAILABLE = Boolean(RecaptchaView) && Boolean(RECAPTCHA_SITE_KEY);

interface IHelpMenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
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
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  menuItemPressed: {
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  menuItemArrow: {
    marginLeft: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    color: colors.textPrimary,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalInputFocused: {
    borderColor: colors.accent,
  },
  modalSubmitButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  modalSubmitButtonDisabled: {
    backgroundColor: colors.border,
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  // Checkbox styles
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkboxIcon: {
    marginRight: 10,
  },
  checkboxText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    flexWrap: 'wrap',
  },
  checkboxLink: {
    color: colors.accent,
    textDecorationLine: 'underline',
  },
  // reCAPTCHA status
  recaptchaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: 8,
  },
  recaptchaStatusText: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 8,
  },
  recaptchaVerifiedText: {
    color: colors.accent,
  },
});

const HelpMenuItem = ({ icon, title, subtitle, onPress }: IHelpMenuItem) => (
  <Pressable
    style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
    onPress={onPress}
  >
    <View style={styles.menuItemIcon}>
      <Ionicons name={icon} size={22} color={colors.accent} />
    </View>
    <View style={styles.menuItemContent}>
      <Text style={styles.menuItemTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
    </View>
    <Ionicons
      name="chevron-forward"
      size={20}
      color={colors.textMuted}
      style={styles.menuItemArrow}
    />
  </Pressable>
);

const Help = () => {
  const router = useRouter();
  const { user } = useAuth0();
  const recaptchaRef = useRef<RecaptchaRef | null>(null);
  // const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  // const [helpQuery, setHelpQuery] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [inputFocused, setInputFocused] = useState<InputFocusType>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(
    IS_RECAPTCHA_AVAILABLE ? null : 'dev-bypass-token'
  );

  const handleOpenTerms = () => {
    Linking.openURL('https://saferoute-privacy-site.vercel.app/');
  };

  const handleAppInfo = () => {
    // TODO: Show app info modal
  };

  // const handleSubmitHelp = () => {
  //   if (helpQuery.trim()) {
  //     // TODO: Submit help query to backend
  //     setHelpQuery('');
  //     setShowHelpModal(false);
  //   }
  // };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || !privacyAccepted || !recaptchaToken) return;

    try {
      // const response = await fetch('http://10.0.2.2:20004/v1/system-feedback/submit', {
      const response = await fetch(`${API_URL}/v1/system-feedback/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user?.sub?.replace(/^auth0\|/, ''),
          email: user?.email,
          content: feedbackText.trim(),
          privacy_accepted: privacyAccepted,
          captcha_token: recaptchaToken,
          subject: 'App Feedback',
          user_agent: `${Platform.OS} ${Platform.Version}`,
        }),
      });

      if (response.ok) {
        Alert.alert('Thank you!', 'Your feedback has been submitted successfully.');
      } else {
        const errorData = await response.json().catch(() => null);
        let errorMessage = 'Failed to submit feedback. Please try again.';
        if (errorData?.detail) {
          errorMessage =
            typeof errorData.detail === 'string'
              ? errorData.detail
              : JSON.stringify(errorData.detail);
        }
        Alert.alert('Submission Failed', errorMessage);
      }
    } catch {
      Alert.alert('Network Error', 'Could not connect to the server. Please try again later.');
    } finally {
      setFeedbackText('');
      setPrivacyAccepted(false);
      setRecaptchaToken(null);
      setShowFeedbackModal(false);
    }
  };

  const handleCloseFeedbackModal = () => {
    setFeedbackText('');
    setPrivacyAccepted(false);
    setRecaptchaToken(IS_RECAPTCHA_AVAILABLE ? null : 'dev-bypass-token');
    setShowFeedbackModal(false);
  };

  const handleRecaptchaVerify = (token: string) => {
    setRecaptchaToken(token);
  };

  const handleRecaptchaExpire = () => {
    setRecaptchaToken(null);
  };

  const isSubmitEnabled = feedbackText.trim().length > 0 && privacyAccepted && !!recaptchaToken;
  const recaptchaStatusLabel = (() => {
    if (!IS_RECAPTCHA_AVAILABLE) {
      return 'reCAPTCHA unavailable in this build';
    }
    if (recaptchaToken) {
      return 'reCAPTCHA verified';
    }
    return 'reCAPTCHA verification required';
  })();
  const canVerifyBeforeSubmit =
    !recaptchaToken && feedbackText.trim() && privacyAccepted && IS_RECAPTCHA_AVAILABLE;
  const submitButtonLabel = canVerifyBeforeSubmit ? 'Verify & Submit' : 'Submit';

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
              onPress={() => router.navigate('/(tabs)/profile')}
            >
              <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={styles.headerTitle}>Help</Text>
          </View>

          {/* Help Menu */}
          <View style={styles.section}>
            <View style={styles.card}>
              {/* <HelpMenuItem
                icon="help-circle-outline"
                title="Help center"
                subtitle="Get help with using SafeRoute"
                onPress={() => setShowHelpModal(true)}
              />
              <View style={styles.cardDivider} /> */}
              <HelpMenuItem
                icon="chatbubble-outline"
                title="Send feedback"
                subtitle="Share your thoughts with us"
                onPress={() => setShowFeedbackModal(true)}
              />
              <View style={styles.cardDivider} />
              <HelpMenuItem
                icon="document-text-outline"
                title="Terms and Privacy Policy"
                subtitle="Read our terms of service"
                onPress={handleOpenTerms}
              />
              <View style={styles.cardDivider} />
              <HelpMenuItem
                icon="information-circle-outline"
                title="App info"
                subtitle="Version 1.0.0"
                onPress={handleAppInfo}
              />
            </View>
          </View>
        </ScrollView>

        {/* Help Center Modal */}
        {/* <Modal
          visible={showHelpModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowHelpModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowHelpModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Help Center</Text>
                <Pressable style={styles.modalCloseButton} onPress={() => setShowHelpModal(false)}>
                  <Ionicons name="close" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
              <Text style={styles.modalLabel}>How can we help you?</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  inputFocused === InputFocus.HELP && styles.modalInputFocused,
                ]}
                placeholder="Describe your issue or question..."
                placeholderTextColor={colors.textMuted}
                multiline
                value={helpQuery}
                onChangeText={setHelpQuery}
                onFocus={() => setInputFocused(InputFocus.HELP)}
                onBlur={() => setInputFocused(null)}
              />
              <Pressable
                style={[
                  styles.modalSubmitButton,
                  !helpQuery.trim() && styles.modalSubmitButtonDisabled,
                ]}
                onPress={handleSubmitHelp}
                disabled={!helpQuery.trim()}
              >
                <Text style={styles.modalSubmitText}>Submit</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal> */}

        {/* Feedback Modal */}
        <Modal
          visible={showFeedbackModal}
          transparent
          animationType="fade"
          onRequestClose={handleCloseFeedbackModal}
        >
          <Pressable style={styles.modalOverlay} onPress={handleCloseFeedbackModal}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Send Feedback</Text>
                <Pressable style={styles.modalCloseButton} onPress={handleCloseFeedbackModal}>
                  <Ionicons name="close" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
              <Text style={styles.modalLabel}>Share your feedback or report an issue</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  inputFocused === InputFocus.FEEDBACK && styles.modalInputFocused,
                ]}
                placeholder="Tell us what you think..."
                placeholderTextColor={colors.textMuted}
                multiline
                value={feedbackText}
                onChangeText={setFeedbackText}
                onFocus={() => setInputFocused(InputFocus.FEEDBACK)}
                onBlur={() => setInputFocused(null)}
              />

              {/* Privacy Policy Checkbox */}
              <Pressable
                style={styles.checkboxRow}
                onPress={() => setPrivacyAccepted(!privacyAccepted)}
              >
                <Ionicons
                  name={privacyAccepted ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={privacyAccepted ? colors.accent : colors.textMuted}
                  style={styles.checkboxIcon}
                />
                <Text style={styles.checkboxText}>
                  I read and accept the{' '}
                  <Text
                    style={styles.checkboxLink}
                    onPress={() => Linking.openURL('https://saferoute-privacy-site.vercel.app/')}
                  >
                    privacy policy
                  </Text>
                </Text>
              </Pressable>

              {/* reCAPTCHA Status */}
              <View style={styles.recaptchaStatus}>
                <Ionicons
                  name={recaptchaToken ? 'shield-checkmark' : 'shield-outline'}
                  size={18}
                  color={recaptchaToken ? colors.accent : colors.textMuted}
                />
                <Text
                  style={[
                    styles.recaptchaStatusText,
                    recaptchaToken && styles.recaptchaVerifiedText,
                  ]}
                >
                  {recaptchaStatusLabel}
                </Text>
              </View>

              <Pressable
                style={[
                  styles.modalSubmitButton,
                  !isSubmitEnabled && styles.modalSubmitButtonDisabled,
                ]}
                onPress={() => {
                  if (!recaptchaToken && IS_RECAPTCHA_AVAILABLE) {
                    recaptchaRef.current?.open();
                  } else {
                    handleSubmitFeedback();
                  }
                }}
                disabled={!feedbackText.trim() || !privacyAccepted}
              >
                <Text style={styles.modalSubmitText}>{submitButtonLabel}</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* reCAPTCHA WebView (invisible, renders off-screen until triggered) */}
        {RecaptchaView ? (
          <RecaptchaView
            ref={recaptchaRef}
            siteKey={RECAPTCHA_SITE_KEY}
            baseUrl={API_URL}
            onVerify={handleRecaptchaVerify}
            onExpire={handleRecaptchaExpire}
            onError={() => {
              Alert.alert('reCAPTCHA Error', 'Verification failed. Please try again.');
            }}
            size="invisible"
          />
        ) : null}
      </View>
    </GradientBackground>
  );
};

export default Help;
