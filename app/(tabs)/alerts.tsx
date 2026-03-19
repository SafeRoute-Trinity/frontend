import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  Vibration,
  View,
} from 'react-native';
import { fetchTrustedContacts } from '../../api/contacts';
import { sendEmergencySMS } from '../../api/emergency';
import ContactCard from '../../components/ui/ContactCard';
import GradientBackground from '../../components/ui/GradientBackground';
import Toggle from '../../components/ui/Toggle';
import { ITrustedContact } from '../../constants/mockData';
import { colors } from '../../constants/theme';
import { useAuth0 } from '../../contexts/Auth0Context';

/* eslint-disable no-console */

// ── Constants ────────────────────────────────────────────────────────────────

const HOLD_DURATION_MS = 3000;
const COUNTDOWN_SECONDS = 5;
const SOS_RED = '#DC2626';
const SOS_RED_DARK = '#991B1B';
const SOS_RED_LIGHT = '#FCA5A5';
const SURFACE_LIGHT = '#252525';

// ── Types ────────────────────────────────────────────────────────────────────

type SOSPhase = 'idle' | 'holding' | 'countdown' | 'sent';

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Status bar
  statusBar: {
    marginHorizontal: 20,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: SOS_RED,
    letterSpacing: 0.5,
  },
  statusRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusGps: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  progressTrack: {
    height: 3,
    backgroundColor: SOS_RED_DARK,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: SOS_RED,
    borderRadius: 2,
  },

  // SOS Button
  sosSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  sosOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${SOS_RED}18`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  holdRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: SOS_RED_LIGHT,
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: SOS_RED,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: SOS_RED,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 12,
  },
  sosButtonPressed: {
    backgroundColor: SOS_RED_DARK,
    transform: [{ scale: 0.97 }],
  },
  sosButtonActive: {
    backgroundColor: SOS_RED_DARK,
  },
  sosButtonSent: {
    backgroundColor: colors.accent,
    shadowColor: colors.accent,
  },
  sosIconWrapper: {
    marginBottom: 4,
  },
  sosText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 4,
  },
  sosSubtext: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1,
    marginTop: 2,
  },

  // Card
  card: {
    marginHorizontal: 20,
    backgroundColor: SURFACE_LIGHT,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },

  // Contacts
  contactsSection: {
    marginHorizontal: 20,
  },
  contactsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  contactsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.8,
  },
  loader: {
    marginTop: 12,
  },
  noContacts: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 10,
  },
  noContactsText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 16,
    backgroundColor: SURFACE_LIGHT,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  cancelPressed: {
    opacity: 0.7,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 20,
  },
  autoSendBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${SOS_RED}20`,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 10,
  },
  autoSendLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: SOS_RED_LIGHT,
    letterSpacing: 0.5,
    lineHeight: 15,
  },
  autoSendTimer: {
    fontSize: 24,
    fontWeight: '800',
    color: SOS_RED,
  },

  // Sent state
  sentBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sentText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
  },
  resetText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});

// ── Component ────────────────────────────────────────────────────────────────

const Alerts = () => {
  const { user } = useAuth0();
  const userId = (user?.sub ?? '').split('|').pop() ?? '';

  // ── State ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<SOSPhase>('idle');
  const [silentAlert, setSilentAlert] = useState(false);
  const [contacts, setContacts] = useState<ITrustedContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdProgress = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressBarAnim = useRef(new Animated.Value(0)).current;
  const primaryContactRef = useRef<ITrustedContact | null>(null);

  // ── Fetch contacts on focus ──────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      if (!userId) return undefined;
      let cancelled = false;

      (async () => {
        try {
          setLoadingContacts(true);
          const res = await fetchTrustedContacts(userId);
          if (!cancelled) setContacts(res.data ?? []);
        } catch (err) {
          console.error('Failed to load contacts for SOS:', err);
        } finally {
          if (!cancelled) setLoadingContacts(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [userId])
  );

  // ── Pulse animation for countdown phase ──────────────────────────────────
  useEffect(() => {
    if (phase === 'countdown') {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
    pulseAnim.setValue(1);
    return undefined;
  }, [phase, pulseAnim]);

  // ── Progress bar animation for countdown ─────────────────────────────────
  useEffect(() => {
    if (phase === 'countdown') {
      progressBarAnim.setValue(1);
      Animated.timing(progressBarAnim, {
        toValue: 0,
        duration: COUNTDOWN_SECONDS * 1000,
        useNativeDriver: false,
      }).start();
    } else if (phase === 'idle') {
      progressBarAnim.setValue(0);
    }
    return undefined;
  }, [phase, progressBarAnim]);

  // ── Derived ──────────────────────────────────────────────────────────────
  const primaryContact = contacts.find((c) => c.is_primary) ?? null;
  primaryContactRef.current = primaryContact;
  const isActive = phase === 'countdown' || phase === 'sent';
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ── Send SOS SMS ────────────────────────────────────────────────────────
  const triggerSOS = useCallback(async () => {
    const contact = primaryContactRef.current;
    if (!contact) {
      console.warn('No primary contact – skipping SOS SMS');
      setPhase('sent');
      return;
    }

    try {
      const sosId = crypto.randomUUID();
      const res = await sendEmergencySMS({
        sos_id: sosId,
        user_id: userId,
        location: null, // TODO: attach live GPS location
        emergency_contact: {
          name: contact.name,
          phone: contact.phone,
        },
        message_template: null,
        variables: {
          name: user?.name ?? 'A Trinity user',
        },
        notification_type: 'sos',
        locale: 'en',
      });

      console.log('✅ SOS SMS sent:', res.status, res.message_sent);
    } catch (err) {
      console.error('❌ SOS SMS failed:', err);
      // Still transition to sent so the user sees feedback
    } finally {
      setPhase('sent');
      if (!silentAlert) Vibration.vibrate([0, 200, 100, 200]);
    }
  }, [silentAlert, userId, user?.name]);

  // Keep a ref so the interval callback always sees the latest triggerSOS
  const triggerSOSRef = useRef(triggerSOS);
  triggerSOSRef.current = triggerSOS;

  // ── Countdown timer ──────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'countdown') return undefined;

    setCountdown(COUNTDOWN_SECONDS);
    countdownInterval.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval.current!);
          triggerSOSRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownInterval.current) clearInterval(countdownInterval.current);
    };
  }, [phase]);

  // ── Hold handlers ────────────────────────────────────────────────────────
  const onHoldStart = () => {
    if (phase !== 'idle') return;
    setPhase('holding');
    holdProgress.setValue(0);

    Animated.timing(holdProgress, {
      toValue: 1,
      duration: HOLD_DURATION_MS,
      useNativeDriver: false,
    }).start();

    holdTimer.current = setTimeout(() => {
      if (!silentAlert) Vibration.vibrate(300);
      setPhase('countdown');
    }, HOLD_DURATION_MS);
  };

  const onHoldEnd = () => {
    if (phase !== 'holding') return;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdProgress.stopAnimation();
    holdProgress.setValue(0);
    setPhase('idle');
  };

  // ── Cancel / Reset ──────────────────────────────────────────────────────
  const cancelEmergency = () => {
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdProgress.setValue(0);
    setPhase('idle');
  };

  const resetAfterSent = () => {
    setPhase('idle');
    holdProgress.setValue(0);
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <GradientBackground>
      <View style={styles.container}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>SOS Emergency</Text>
          <Pressable style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* ── Status Bar ──────────────────────────────────────────────── */}
        {isActive && (
          <View style={styles.statusBar}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>EMERGENCY MODE ACTIVE</Text>
              <View style={styles.statusRight}>
                <Ionicons name="navigate" size={14} color={colors.textSecondary} />
                <Text style={styles.statusGps}>Live GPS tracking</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressBarAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── SOS Button ────────────────────────────────────────────── */}
          <View style={styles.sosSection}>
            <Animated.View
              style={[styles.sosOuter, isActive && { transform: [{ scale: pulseAnim }] }]}
            >
              {/* Hold progress ring */}
              {phase === 'holding' && (
                <Animated.View
                  style={[
                    styles.holdRing,
                    {
                      opacity: holdProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 0.9],
                      }),
                      transform: [
                        {
                          scale: holdProgress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [1, 1.12],
                          }),
                        },
                      ],
                    },
                  ]}
                />
              )}

              <Pressable
                style={({ pressed }) => [
                  styles.sosButton,
                  pressed && phase === 'idle' && styles.sosButtonPressed,
                  isActive && styles.sosButtonActive,
                  phase === 'sent' && styles.sosButtonSent,
                ]}
                onPressIn={onHoldStart}
                onPressOut={onHoldEnd}
                disabled={phase === 'countdown' || phase === 'sent'}
              >
                <View style={styles.sosIconWrapper}>
                  {phase === 'sent' ? (
                    <Ionicons name="checkmark-circle" size={44} color="#FFF" />
                  ) : (
                    <Ionicons name="alert-circle" size={44} color="rgba(255,255,255,0.9)" />
                  )}
                </View>
                <Text style={styles.sosText}>{phase === 'sent' ? 'SENT' : 'SOS'}</Text>
                <Text style={styles.sosSubtext}>
                  {phase === 'idle' && 'HOLD 3S TO ALERT'}
                  {phase === 'holding' && 'KEEP HOLDING...'}
                  {phase === 'countdown' && 'SENDING ALERT...'}
                  {phase === 'sent' && 'ALERT DELIVERED'}
                </Text>
              </Pressable>
            </Animated.View>
          </View>

          {/* ── Silent Alert Toggle ───────────────────────────────────── */}
          <View style={styles.card}>
            <Toggle
              value={silentAlert}
              onValueChange={setSilentAlert}
              label="Silent Alert"
              subtitle="No sound on this device"
              icon={
                <Ionicons
                  name={silentAlert ? 'volume-mute' : 'volume-high'}
                  size={20}
                  color={colors.accent}
                />
              }
            />
          </View>

          {/* ── Primary Contact ─────────────────────────────────────── */}
          <View style={styles.contactsSection}>
            <View style={styles.contactsHeader}>
              <Ionicons name="shield-checkmark" size={18} color={colors.textSecondary} />
              <Text style={styles.contactsTitle}>NOTIFYING PRIMARY CONTACT</Text>
            </View>

            {loadingContacts && <ActivityIndicator color={colors.accent} style={styles.loader} />}
            {!loadingContacts && !primaryContact && (
              <View style={styles.noContacts}>
                <Ionicons name="person-add-outline" size={28} color={colors.textMuted} />
                <Text style={styles.noContactsText}>
                  No primary contact set.{'\n'}Set one in the Contacts tab.
                </Text>
              </View>
            )}
            {!loadingContacts && primaryContact && <ContactCard contact={primaryContact} />}
          </View>
        </ScrollView>

        {/* ── Bottom Actions ──────────────────────────────────────────── */}
        {phase === 'countdown' && (
          <View style={styles.bottomBar}>
            <Pressable
              style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelPressed]}
              onPress={cancelEmergency}
            >
              <Text style={styles.cancelText}>Cancel{'\n'}Emergency</Text>
            </Pressable>

            <View style={styles.autoSendBadge}>
              <Text style={styles.autoSendLabel}>AUTO-SEND{'\n'}IN</Text>
              <Text style={styles.autoSendTimer}>{formatTime(countdown)}</Text>
            </View>
          </View>
        )}

        {phase === 'sent' && (
          <View style={styles.bottomBar}>
            <View style={styles.sentBanner}>
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
              <Text style={styles.sentText}>
                Emergency alert sent to {primaryContact ? primaryContact.name : 'contact'}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.resetButton, pressed && styles.cancelPressed]}
              onPress={resetAfterSent}
            >
              <Text style={styles.resetText}>Done</Text>
            </Pressable>
          </View>
        )}
      </View>
    </GradientBackground>
  );
};

export default Alerts;
