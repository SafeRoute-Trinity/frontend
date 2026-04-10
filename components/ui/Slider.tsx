import Slider from '@react-native-community/slider';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';

interface SliderComponentProps {
  value: number;
  onValueChange: (value: number) => void;
  onSlidingComplete?: (value: number) => void;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  showPercentage?: boolean;
  disabled?: boolean;
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.accent,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});

const SliderComponent = ({
  value,
  onValueChange,
  onSlidingComplete = undefined,
  label = undefined,
  min = 0,
  max = 100,
  step = 1,
  showPercentage = true,
  disabled = false,
}: SliderComponentProps) => (
  <View style={styles.container}>
    <View style={styles.labelRow}>
      {label && <Text style={styles.label}>{label}</Text>}
      {showPercentage && <Text style={styles.value}>{Math.round(value)}%</Text>}
    </View>
    <Slider
      style={styles.slider}
      value={value}
      onValueChange={onValueChange}
      onSlidingComplete={onSlidingComplete}
      minimumValue={min}
      maximumValue={max}
      step={step}
      disabled={disabled}
      minimumTrackTintColor={colors.accent}
      maximumTrackTintColor={colors.border}
      thumbTintColor={colors.textPrimary}
    />
  </View>
);

export default SliderComponent;
