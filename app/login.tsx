import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth0 } from "../contexts/Auth0Context";

export default function Login() {
  const { login, logout, isLoading, error, isAuthenticated, user } = useAuth0();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Check if we should force login (e.g., when switching accounts)
  const shouldForceLogin = params.forceLogin === "true";

  const handleLogin = async () => {
    try {
      await login(false, shouldForceLogin);
      // Navigation will happen automatically when isAuthenticated changes
    } catch (err) {
      // Error is handled by the context
      console.error("Login failed:", err);
    }
  };

  const handleRegister = async () => {
    try {
      await login(true, shouldForceLogin); // Show signup page
      // Navigation will happen automatically when isAuthenticated changes
    } catch (err) {
      // Error is handled by the context
      console.error("Registration failed:", err);
    }
  };

  // Navigate to home when authentication succeeds
  useEffect(() => {
    if (isAuthenticated && user) {
      router.replace("/");
    }
  }, [isAuthenticated, user, router]);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      // User will be logged out, component will re-render showing login form
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // If already authenticated, show user info
  if (isAuthenticated && user) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Logged In</Text>
          <Text style={styles.subtitle}>Welcome back!</Text>
          {user.name && (
            <Text style={styles.userName}>{user.name}</Text>
          )}
          {user.email && (
            <Text style={styles.userEmail}>{user.email}</Text>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
          >
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.logoutButton,
              isLoggingOut && styles.buttonDisabled,
              pressed && !isLoggingOut && styles.buttonPressed,
            ]}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.logoutButtonText}>Logout</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Login to SafeRoute</Text>
        <Text style={styles.subtitle}>
          Sign in with Auth0 to access full features
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {error.message || "Login failed, please try again"}
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.primaryButton,
            (isLoading || isAuthenticated) && styles.buttonDisabled,
            pressed && !isLoading && !isAuthenticated && styles.buttonPressed,
          ]}
          onPress={handleLogin}
          disabled={isLoading || isAuthenticated}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Login</Text>
          )}
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.registerButton,
            (isLoading || isAuthenticated) && styles.buttonDisabled,
            pressed && !isLoading && !isAuthenticated && styles.buttonPressed,
          ]}
          onPress={handleRegister}
          disabled={isLoading || isAuthenticated}
        >
          {isLoading ? (
            <ActivityIndicator color="#2563EB" />
          ) : (
            <Text style={styles.registerButtonText}>Register</Text>
          )}
        </Pressable>

        <Text style={styles.helperText}>
          Auth0 provides secure authentication for both login and registration
        </Text>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.secondaryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.back()}
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#CBD5F5",
    marginBottom: 24,
    textAlign: "center",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#F8FAFC",
    marginBottom: 8,
    textAlign: "center",
  },
  userEmail: {
    fontSize: 14,
    color: "#94A3B8",
    marginBottom: 24,
    textAlign: "center",
  },
  errorContainer: {
    backgroundColor: "#7F1D1D",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: "100%",
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 14,
    textAlign: "center",
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#475569",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    backgroundColor: "#1D4ED8",
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#CBD5F5",
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    backgroundColor: "#DC2626",
    marginTop: 8,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#475569",
  },
  dividerText: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    paddingHorizontal: 12,
  },
  registerButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#2563EB",
  },
  registerButtonText: {
    color: "#2563EB",
    fontSize: 16,
    fontWeight: "600",
  },
  helperText: {
    color: "#64748B",
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
    marginBottom: 16,
    lineHeight: 16,
  },
});

