import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth0 } from '../contexts/Auth0Context';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#2563EB',
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#2563EB',
  },
  profileImagePlaceholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    color: '#CBD5F5',
  },
  actionsSection: {
    width: '100%',
    maxWidth: 400,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  loginButton: {
    backgroundColor: '#2563EB',
  },
  logoutButton: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 20,
  },
});

const Profile = () => {
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth0();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      router.replace('/login');
    } catch (error) {
      // console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Not Logged In</Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.loginButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.profileSection}>
          {user.picture ? (
            <Image source={{ uri: user.picture }} style={styles.profileImage} />
          ) : (
            <View style={styles.profileImagePlaceholder}>
              <Text style={styles.profileImagePlaceholderText}>
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
          )}

          {user.name && <Text style={styles.userName}>{user.name}</Text>}

          {user.email && <Text style={styles.userEmail}>{user.email}</Text>}
        </View>

        <View style={styles.actionsSection}>
          <Pressable
            onPress={handleLogout}
            disabled={isLoggingOut}
            style={({ pressed }) => [
              styles.button,
              styles.logoutButton,
              isLoggingOut && styles.buttonDisabled,
              pressed && !isLoggingOut && styles.buttonPressed,
            ]}
          >
            {isLoggingOut ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Logout</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default Profile;
