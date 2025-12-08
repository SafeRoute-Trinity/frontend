import { useEffect, useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, KeyboardAvoidingView, Platform } from "react-native";
import { useAuth0 } from "../contexts/Auth0Context";

export default function Login() {
  const { nativeLogin, isLoading, error: auth0Error, isAuthenticated, user } = useAuth0();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      setError(null);

      // Basic validation
      if (!email || !password) {
        setError("Please enter both email and password");
        return;
      }

      await nativeLogin(email, password);
      // Navigation will happen automatically when isAuthenticated changes
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      console.error("Login failed:", err);
    }
  };

  const handleRegister = () => {
    // Navigate to custom registration page
    router.push("/register");
  };

  // Navigate to home when authentication succeeds
  useEffect(() => {
    console.log('🔍 Login page - Auth state:', { isAuthenticated, hasUser: !!user, userEmail: user?.email });
    if (isAuthenticated && user) {
      console.log('🚀 Redirecting to homepage...');
      router.replace("/");
    }
  }, [isAuthenticated, user, router]);

  // If already authenticated, show loading
  if (isAuthenticated && user) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Redirecting...</Text>
      </View>
    );
  }

  const displayError = error || auth0Error?.message;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Login to SafeRoute</Text>
        <Text style={styles.subtitle}>
          Sign in with your email and password
        </Text>

        {displayError && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {displayError}
            </Text>
          </View>
        )}

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="your.email@example.com"
            placeholderTextColor="#64748B"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!isLoading}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#64748B"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={true}
            autoCapitalize="none"
            autoComplete="password"
            editable={!isLoading}
          />
        </View>

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
          <Text style={styles.registerButtonText}>Register</Text>
        </Pressable>

        <Text style={styles.helperText}>
          New to SafeRoute? Create an account to get started with personalized safety features.
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
    </KeyboardAvoidingView>
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
  inputContainer: {
    width: "100%",
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#CBD5F5",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#0F172A",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    color: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#475569",
    width: "100%",
  },
  loadingText: {
    color: "#CBD5F5",
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
});

