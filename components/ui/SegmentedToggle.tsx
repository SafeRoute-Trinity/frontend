import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';

interface SegmentedToggleProps {
  options: [string, string];
  selectedIndex: number;
  onSelect: (index: number) => void;
  label?: string;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.border,
    borderRadius: 20,
    padding: 3,
  },
  option: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 17,
    minWidth: 56,
    alignItems: 'center',
  },
  optionSelected: {
    backgroundColor: colors.textPrimary,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.background,
  },
});

const SegmentedToggle = ({
  options,
  selectedIndex,
  onSelect,
  label = undefined,
}: SegmentedToggleProps) => (
  <View style={styles.container}>
    {label && <Text style={styles.label}>{label}</Text>}
    <View style={styles.toggleContainer}>
      {options.map((option, index) => (
        <Pressable
          key={option}
          style={[styles.option, selectedIndex === index && styles.optionSelected]}
          onPress={() => onSelect(index)}
        >
          <Text style={[styles.optionText, selectedIndex === index && styles.optionTextSelected]}>
            {option}
          </Text>
        </Pressable>
      ))}
    </View>
  </View>
);

export default SegmentedToggle;
