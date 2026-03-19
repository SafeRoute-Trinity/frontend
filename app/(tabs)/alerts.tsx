import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import GradientBackground from '../../components/ui/GradientBackground';
import { colors } from '../../constants/theme';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});

const Alerts = () => (
  <GradientBackground>
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="notifications-outline" size={40} color={colors.textSecondary} />
      </View>
      <Text style={styles.title}>Alerts</Text>
      <Text style={styles.subtitle}>
        Safety alerts and notifications will appear here. This feature is coming soon.
      </Text>
    </View>
  </GradientBackground>
);

export default Alerts;
