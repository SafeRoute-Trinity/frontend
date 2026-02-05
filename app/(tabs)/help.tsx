import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import GradientBackground from '../../components/ui/GradientBackground';
import { colors } from '../../constants/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginLeft: 12,
  },
  scrollContent: {
    paddingVertical: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuItemPressed: {
    backgroundColor: colors.surface,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
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
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonPressed: {
    backgroundColor: colors.background,
  },
  modalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalInputFocused: {
    borderColor: colors.primary,
  },
  modalSubmitButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  modalSubmitButtonDisabled: {
    opacity: 0.5,
  },
  modalSubmitButtonPressed: {
    opacity: 0.8,
  },
  modalSubmitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

interface HelpMenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}

const HelpMenuItem = ({ icon, title, subtitle, onPress }: HelpMenuItemProps) => (
  <Pressable
    style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
    onPress={onPress}
  >
    <View style={styles.menuIconContainer}>
      <Ionicons name={icon} size={20} color={colors.textMuted} />
    </View>
    <View style={styles.menuTextContainer}>
      <Text style={styles.menuTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
  </Pressable>
);

const Help = () => {
  const router = useRouter();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [helpQuery, setHelpQuery] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [inputFocused, setInputFocused] = useState<'help' | 'feedback' | null>(null);

  const handleHelpCenter = () => {
    setShowHelpModal(true);
  };

  const handleSubmitQuery = () => {
    // TODO: Send query to SafeRoute mailbox
    setShowHelpModal(false);
    setHelpQuery('');
  };

  const handleSendFeedback = () => {
    setShowFeedbackModal(true);
  };

  const handleSubmitFeedback = () => {
    // TODO: Send feedback to SafeRoute mailbox
    setShowFeedbackModal(false);
    setFeedbackText('');
  };

  const handleTermsAndPrivacy = () => {
    Linking.openURL('https://saferoute.app/privacy');
  };

  const handleAppInfo = () => {
    // TODO: Show app info modal or navigate to about page
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Help</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <HelpMenuItem
            icon="help-circle-outline"
            title="Help center"
            subtitle="Get help, contact us"
            onPress={handleHelpCenter}
          />

          <HelpMenuItem
            icon="settings-outline"
            title="Send feedback"
            subtitle="Report technical issues"
            onPress={handleSendFeedback}
          />

          <HelpMenuItem
            icon="document-text-outline"
            title="Terms and Privacy Policy"
            onPress={handleTermsAndPrivacy}
          />

          <HelpMenuItem
            icon="information-circle-outline"
            title="App info"
            onPress={handleAppInfo}
          />
        </ScrollView>

        {/* Help Center Modal */}
        <Modal visible={showHelpModal} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowHelpModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Help Center</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalCloseButton,
                    pressed && styles.modalCloseButtonPressed,
                  ]}
                  onPress={() => setShowHelpModal(false)}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>

              <Text style={styles.modalLabel}>How can we help you?</Text>
              <TextInput
                style={[styles.modalInput, inputFocused === 'help' && styles.modalInputFocused]}
                placeholder="Describe your issue or question..."
                placeholderTextColor={colors.textMuted}
                value={helpQuery}
                onChangeText={setHelpQuery}
                onFocus={() => setInputFocused('help')}
                onBlur={() => setInputFocused(null)}
                multiline
                numberOfLines={5}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.modalSubmitButton,
                  !helpQuery.trim() && styles.modalSubmitButtonDisabled,
                  pressed && helpQuery.trim() && styles.modalSubmitButtonPressed,
                ]}
                onPress={handleSubmitQuery}
                disabled={!helpQuery.trim()}
              >
                <Text style={styles.modalSubmitButtonText}>Submit</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Send Feedback Modal */}
        <Modal visible={showFeedbackModal} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setShowFeedbackModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Send Feedback</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.modalCloseButton,
                    pressed && styles.modalCloseButtonPressed,
                  ]}
                  onPress={() => setShowFeedbackModal(false)}
                >
                  <Ionicons name="close" size={24} color={colors.textSecondary} />
                </Pressable>
              </View>

              <Text style={styles.modalLabel}>Share your feedback or report an issue</Text>
              <TextInput
                style={[styles.modalInput, inputFocused === 'feedback' && styles.modalInputFocused]}
                placeholder="Tell us what you think or describe any issues..."
                placeholderTextColor={colors.textMuted}
                value={feedbackText}
                onChangeText={setFeedbackText}
                onFocus={() => setInputFocused('feedback')}
                onBlur={() => setInputFocused(null)}
                multiline
                numberOfLines={5}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.modalSubmitButton,
                  !feedbackText.trim() && styles.modalSubmitButtonDisabled,
                  pressed && feedbackText.trim() && styles.modalSubmitButtonPressed,
                ]}
                onPress={handleSubmitFeedback}
                disabled={!feedbackText.trim()}
              >
                <Text style={styles.modalSubmitButtonText}>Submit</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </GradientBackground>
  );
};

export default Help;
