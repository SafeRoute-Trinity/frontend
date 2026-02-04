import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';
import type { TrustedContact } from '../../constants/mockData';

interface ContactCardProps {
  contact: TrustedContact;
  onCall?: () => void;
  onMore?: () => void;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 2,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  role: {
    fontSize: 13,
    color: colors.textMuted,
  },
  dot: {
    fontSize: 13,
    color: colors.textMuted,
    marginHorizontal: 4,
  },
  relationship: {
    fontSize: 13,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${colors.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
});

const ContactCard = ({ contact, onCall = undefined, onMore = undefined }: ContactCardProps) => (
  <View style={styles.container}>
    {contact.avatarUrl ? (
      <Image source={{ uri: contact.avatarUrl }} style={styles.avatar} />
    ) : (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarPlaceholderText}>{contact.name.charAt(0).toUpperCase()}</Text>
      </View>
    )}

    <View style={styles.info}>
      <Text style={styles.name}>{contact.name}</Text>
      <View style={styles.roleRow}>
        <Text style={styles.role}>{contact.role}</Text>
        <Text style={styles.dot}>•</Text>
        <Text style={styles.relationship}>{contact.relationship}</Text>
      </View>
    </View>

    <View style={styles.actions}>
      <Pressable
        style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
        onPress={onCall}
      >
        <Ionicons name="call" size={18} color={colors.textPrimary} />
      </Pressable>
      <Pressable
        style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
        onPress={onMore}
      >
        <Ionicons name="ellipsis-vertical" size={18} color={colors.textPrimary} />
      </Pressable>
    </View>
  </View>
);

export default ContactCard;
