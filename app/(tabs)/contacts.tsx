import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { fetchTrustedContacts, replaceTrustedContacts } from '../../api/contacts';
import ContactCard from '../../components/ui/ContactCard';
import GradientBackground from '../../components/ui/GradientBackground';
import { ITrustedContact } from '../../constants/mockData';
import { colors } from '../../constants/theme';
import { useAuth0 } from '../../contexts/Auth0Context';

/* eslint-disable no-console */

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
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  headerButtonPlaceholder: {
    width: 40,
    height: 40,
  },
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
  contactsNote: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 18,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 8,
  },
  addButtonPressed: {
    opacity: 0.8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: colors.danger,
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
});

const Contacts = () => {
  const router = useRouter();
  const { user } = useAuth0();
  const [contacts, setContacts] = useState<ITrustedContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Backend stores user_id without the "auth0|" prefix
  const userId = (user?.sub ?? '').split('|').pop() ?? '';

  const loadContacts = useCallback(async () => {
    if (!userId) return;
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetchTrustedContacts(userId);
      setContacts(response.data);
    } catch (err: any) {
      console.error('Failed to load contacts:', err);
      setError(err.message || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Reload contacts every time the tab comes into focus (e.g. after adding a new one)
  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  const handleCallContact = (_contactId: string) => {
    // TODO: Implement calling functionality
  };

  const handleRemoveContact = (contact: ITrustedContact) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contact.name} from your trusted contacts?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const remaining = contacts
                .filter((c) => c.contact_id !== contact.contact_id)
                .map((c) => ({
                  name: c.name,
                  phone: c.phone,
                  relationship: c.relationship,
                  is_primary: c.is_primary,
                }));
              const response = await replaceTrustedContacts(userId, remaining);
              setContacts(response.contacts);
            } catch (err: any) {
              console.error('Failed to remove contact:', err);
              Alert.alert('Error', err.message || 'Failed to remove contact');
            }
          },
        },
      ]
    );
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerButtonPlaceholder} />
              <Text style={styles.headerTitle}>Contacts</Text>
              <View style={styles.headerButtonPlaceholder} />
            </View>

            {error && (
              <>
                <Text style={styles.errorText}>{error}</Text>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  <Pressable style={styles.retryButton} onPress={loadContacts}>
                    <Text style={styles.retryText}>Tap to Retry</Text>
                  </Pressable>
                </View>
              </>
            )}

            {/* Trusted Contacts */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Trusted Contacts</Text>
                <Pressable onPress={() => router.push('/(tabs)/add-contact')}>
                  <Text style={styles.sectionAction}>+ Add New</Text>
                </Pressable>
              </View>

              {contacts.length === 0 && !error ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                  <Text style={styles.emptyText}>
                    No trusted contacts yet.{'\n'}Add someone to notify during emergencies.
                  </Text>
                </View>
              ) : (
                contacts.map((contact) => (
                  <ContactCard
                    key={contact.contact_id}
                    contact={contact}
                    onCall={() => handleCallContact(contact.contact_id)}
                    onRemove={() => handleRemoveContact(contact)}
                  />
                ))
              )}

              {contacts.length > 0 && (
                <Text style={styles.contactsNote}>
                  * These contacts will be notified automatically if you trigger an SOS or fail to
                  reach your destination on time.
                </Text>
              )}
            </View>

            {/* Add Contact Button */}
            <Pressable
              style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
              onPress={() => router.push('/(tabs)/add-contact')}
            >
              <Ionicons name="person-add" size={20} color={colors.textPrimary} />
              <Text style={styles.addButtonText}>Add New Contact</Text>
            </Pressable>
          </ScrollView>
        )}
      </View>
    </GradientBackground>
  );
};

export default Contacts;
