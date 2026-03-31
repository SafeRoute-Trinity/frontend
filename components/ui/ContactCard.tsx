import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ITrustedContact } from '../../constants/mockData';
import { colors } from '../../constants/theme';

interface IContactCard {
  contact: ITrustedContact;
  onCall?: () => void;
  onRemove?: () => void;
  isCalling?: boolean;
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  primaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  detailText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  dot: {
    fontSize: 13,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.primary}30`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  menuButton: {
    width: 28,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    position: 'absolute',
    right: 0,
    top: '100%',
    marginTop: 4,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    minWidth: 160,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  menuItemPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.danger,
  },
});

const ContactCard = ({ contact, onCall, onRemove, isCalling = false }: IContactCard) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarPlaceholderText}>{contact.name.charAt(0).toUpperCase()}</Text>
        </View>

        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {contact.name}
          </Text>
          <View style={styles.subtitleRow}>
            {contact.is_primary && (
              <View style={styles.primaryBadge}>
                <Ionicons name="star" size={10} color={colors.accent} />
                <Text style={styles.primaryBadgeText}>PRIMARY</Text>
              </View>
            )}
            {contact.relationship ? (
              <>
                <Text style={styles.detailText}>{contact.relationship}</Text>
                <Text style={styles.dot}>•</Text>
              </>
            ) : null}
            <Text style={styles.detailText}>{contact.phone}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
            onPress={onCall}
            disabled={isCalling}
          >
            {isCalling ? (
              <ActivityIndicator size="small" color={colors.textPrimary} />
            ) : (
              <Ionicons name="call" size={16} color={colors.textPrimary} />
            )}
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuButton, pressed && styles.actionButtonPressed]}
            onPress={() => setShowMenu(!showMenu)}
          >
            <Ionicons name="ellipsis-vertical" size={16} color={colors.textMuted} />
          </Pressable>
        </View>
      </View>

      {showMenu && (
        <View style={styles.menu}>
          <Pressable
            style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
            onPress={() => {
              setShowMenu(false);
              onRemove?.();
            }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.menuItemText}>Remove Contact</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default ContactCard;
