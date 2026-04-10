import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../../constants/theme';

interface ISegmentedToggle {
  options: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  label?: string;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 4,
  },
  option: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: colors.surface,
  },
  optionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textMuted,
  },
  optionTextSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
});

const SegmentedToggle = ({ options, selectedIndex, onSelect, label }: ISegmentedToggle) => (
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
