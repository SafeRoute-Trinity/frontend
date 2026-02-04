import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors } from '../../constants/theme';

interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  subtitle?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: `${colors.accent}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
});

const Toggle = ({
  value,
  onValueChange,
  label = undefined,
  subtitle = undefined,
  disabled = false,
  icon = undefined,
}: ToggleProps) => (
  <View style={styles.container}>
    <View style={styles.leftContent}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <View style={styles.textContainer}>
        {label && <Text style={styles.label}>{label}</Text>}
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
      trackColor={{ false: colors.border, true: colors.accent }}
      thumbColor={colors.textPrimary}
      ios_backgroundColor={colors.border}
    />
  </View>
);

export default Toggle;
