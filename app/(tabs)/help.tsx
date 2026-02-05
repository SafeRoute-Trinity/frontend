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
import { InputFocusType } from '../../constants/routes';
import { colors } from '../../constants/theme';

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
    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={styles.menuItemArrow} />
  </Pressable>
);

const Help = () => {
  const router = useRouter();
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [helpQuery, setHelpQuery] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [inputFocused, setInputFocused] = useState<InputFocusType>(null);

  const handleOpenTerms = () => {
    Linking.openURL('https://saferoute.app/terms');
  };

  const handleAppInfo = () => {
    // TODO: Show app info modal
    console.log('App info pressed');
  };

  const handleSubmitHelp = () => {
    if (helpQuery.trim()) {
      // TODO: Submit help query to backend
      console.log('Help query submitted:', helpQuery);
      setHelpQuery('');
      setShowHelpModal(false);
    }
  };

  const handleSubmitFeedback = () => {
    if (feedbackText.trim()) {
      // TODO: Submit feedback to backend
      console.log('Feedback submitted:', feedbackText);
      setFeedbackText('');
      setShowFeedbackModal(false);
    }
  };

  return (
    <GradientBackground>
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
            <Text style={styles.headerTitle}>Help</Text>
          </View>

          {/* Help Menu */}
          <View style={styles.section}>
            <View style={styles.card}>
              <HelpMenuItem
                icon="help-circle-outline"
                title="Help center"
                subtitle="Get help with using SafeRoute"
                onPress={() => setShowHelpModal(true)}
              />
              <View style={styles.cardDivider} />
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
        <Modal
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
                style={[styles.modalInput, inputFocused === 'help' && styles.modalInputFocused]}
                placeholder="Describe your issue or question..."
                placeholderTextColor={colors.textMuted}
                multiline
                value={helpQuery}
                onChangeText={setHelpQuery}
                onFocus={() => setInputFocused('help')}
                onBlur={() => setInputFocused(null)}
              />
              <Pressable
                style={[styles.modalSubmitButton, !helpQuery.trim() && styles.modalSubmitButtonDisabled]}
                onPress={handleSubmitHelp}
                disabled={!helpQuery.trim()}
              >
                <Text style={styles.modalSubmitText}>Submit</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Feedback Modal */}
        <Modal
          visible={showFeedbackModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFeedbackModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowFeedbackModal(false)}>
            <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Send Feedback</Text>
                <Pressable style={styles.modalCloseButton} onPress={() => setShowFeedbackModal(false)}>
                  <Ionicons name="close" size={20} color={colors.textPrimary} />
                </Pressable>
              </View>
              <Text style={styles.modalLabel}>Share your feedback or report an issue</Text>
              <TextInput
                style={[styles.modalInput, inputFocused === 'feedback' && styles.modalInputFocused]}
                placeholder="Tell us what you think..."
                placeholderTextColor={colors.textMuted}
                multiline
                value={feedbackText}
                onChangeText={setFeedbackText}
                onFocus={() => setInputFocused('feedback')}
                onBlur={() => setInputFocused(null)}
              />
              <Pressable
                style={[styles.modalSubmitButton, !feedbackText.trim() && styles.modalSubmitButtonDisabled]}
                onPress={handleSubmitFeedback}
                disabled={!feedbackText.trim()}
              >
                <Text style={styles.modalSubmitText}>Submit</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </GradientBackground>
  );
};

export default Help;
