import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../constants/theme';

interface IGradientBackground {
  children: ReactNode;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.gradientMiddle,
  },
  overlayTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.gradientStart,
    opacity: 0.42,
  },
  overlayBottom: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.gradientEnd,
    opacity: 0.38,
  },
});

const GradientBackground = ({ children }: IGradientBackground) => (
  <View style={styles.container}>
    <View pointerEvents="none" style={styles.overlayTop} />
    <View pointerEvents="none" style={styles.overlayBottom} />
    {children}
  </View>
);

export default GradientBackground;
