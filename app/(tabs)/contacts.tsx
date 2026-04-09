import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
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
import { API_URL } from '../../config/api';
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
      // Only show full loading spinner on first load (no cached data yet)
      if (contacts.length === 0) setIsLoading(true);
      setError(null);
      const response = await fetchTrustedContacts(userId);
      setContacts(response.data);
    } catch (err: any) {
      console.log('Failed to load contacts:', err);
      setError(err.message || 'Failed to load contacts');
    } finally {
      setIsLoading(false);
    }
  }, [userId, contacts.length]);

  // Reload contacts every time the tab comes into focus (e.g. after adding a new one)
  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  const [callingContactId, setCallingContactId] = useState<string | null>(null);

  const handleCallContact = async (contactId: string) => {
    if (!userId) {
      Alert.alert('Error', 'User not authenticated');
      return;
    }
    if (callingContactId !== null) return;

    const contact = contacts.find((c) => c.contact_id === contactId);
    if (!contact) return;

    setCallingContactId(contactId);
    try {
      let lat = 0;
      let lon = 0;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
      }

      const resp = await fetch(`${API_URL}/v1/emergency/call`, {
        method: 'POST',
        headers: { accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          route_id: '00000000-0000-0000-0000-000000000000',
          lat,
          lon,
          trigger_type: 'manual',
          phone: contact.phone,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        let detail = text;
        try {
          const parsed = JSON.parse(text);
          if (typeof parsed?.detail === 'string') detail = parsed.detail;
          else if (parsed?.detail !== undefined) detail = JSON.stringify(parsed.detail);
          else detail = JSON.stringify(parsed);
        } catch {
          /* keep raw text */
        }
        throw new Error(`HTTP ${resp.status}: ${detail}`);
      }

      Alert.alert(
        '✅ Call Triggered',
        `${contact.name} is being contacted for emergency assistance.`
      );
    } catch (err: any) {
      const msg = typeof err?.message === 'string' ? err.message : JSON.stringify(err);
      Alert.alert('Failed to Trigger Call', msg || 'Failed to contact emergency contact');
    } finally {
      setCallingContactId(null);
    }
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
                    isCalling={callingContactId === contact.contact_id}
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
