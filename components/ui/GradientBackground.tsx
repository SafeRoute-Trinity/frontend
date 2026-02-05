import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { colors } from '../../constants/theme';

interface GradientBackgroundProps {
  children: React.ReactNode;
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
});

const GradientBackground = ({ children }: GradientBackgroundProps) => (
  <LinearGradient
    colors={[colors.gradientStart, colors.gradientMiddle, colors.gradientEnd]}
    locations={[0, 0.5, 1]}
    style={styles.gradient}
  >
    {children}
  </LinearGradient>
);

export default GradientBackground;
