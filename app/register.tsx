import { useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { auth0Config } from "../config/auth0";

export default function Register() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = (): boolean => {
    const errors: typeof fieldErrors = {};

    // Email validation
    if (!email) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Invalid email format";
    }

    // First name validation
    if (!firstName || firstName.trim().length === 0) {
      errors.firstName = "First name is required";
    }

    // Last name validation
    if (!lastName || lastName.trim().length === 0) {
      errors.lastName = "Last name is required";
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    }

    // Confirm password validation
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegister = async () => {
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      // Call Auth0 Database Connections API
      const response = await fetch(
        `https://${auth0Config.domain}/dbconnections/signup`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            client_id: auth0Config.clientId,
            email: email.trim(),
            password: password,
            connection: "Username-Password-Authentication",
            user_metadata: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              phone: phone.trim() || undefined,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();

        // Handle specific Auth0 error codes
        if (errorData.code === "invalid_signup") {
          throw new Error("This email is already registered");
        } else if (errorData.code === "invalid_password") {
          throw new Error(
            errorData.description || "Password does not meet requirements"
          );
        } else if (errorData.name === "PasswordStrengthError") {
          throw new Error(
            errorData.message || "Password does not meet strength requirements"
          );
        } else {
          throw new Error(
            errorData.description ||
              errorData.message ||
              "Registration failed. Please try again."
          );
        }
      }

      // Registration successful
      const data = await response.json();
      console.log("Registration successful:", data);

      // Show success message and redirect to login
      alert("Registration successful! Please log in with your credentials.");
      router.replace("/login");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
      console.error("Registration error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Sign up to get started with SafeRoute
          </Text>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, fieldErrors.email && styles.inputError]}
              placeholder="your.email@example.com"
              placeholderTextColor="#64748B"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setFieldErrors((prev) => ({ ...prev, email: undefined }));
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
            />
            {fieldErrors.email && (
              <Text style={styles.fieldErrorText}>{fieldErrors.email}</Text>
            )}
          </View>

          {/* First Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={[styles.input, fieldErrors.firstName && styles.inputError]}
              placeholder="John"
              placeholderTextColor="#64748B"
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                setFieldErrors((prev) => ({ ...prev, firstName: undefined }));
              }}
              autoCapitalize="words"
              autoComplete="name-given"
              editable={!isLoading}
            />
            {fieldErrors.firstName && (
              <Text style={styles.fieldErrorText}>{fieldErrors.firstName}</Text>
            )}
          </View>

          {/* Last Name */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={[styles.input, fieldErrors.lastName && styles.inputError]}
              placeholder="Doe"
              placeholderTextColor="#64748B"
              value={lastName}
              onChangeText={(text) => {
                setLastName(text);
                setFieldErrors((prev) => ({ ...prev, lastName: undefined }));
              }}
              autoCapitalize="words"
              autoComplete="name-family"
              editable={!isLoading}
            />
            {fieldErrors.lastName && (
              <Text style={styles.fieldErrorText}>{fieldErrors.lastName}</Text>
            )}
          </View>

          {/* Phone (Optional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="+1234567890"
              placeholderTextColor="#64748B"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
              editable={!isLoading}
            />
          </View>

          {/* Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={[styles.input, fieldErrors.password && styles.inputError]}
              placeholder="At least 8 characters"
              placeholderTextColor="#64748B"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              secureTextEntry={true}
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              editable={!isLoading}
              keyboardType="default"
            />
            {fieldErrors.password && (
              <Text style={styles.fieldErrorText}>{fieldErrors.password}</Text>
            )}
          </View>

          {/* Confirm Password */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password *</Text>
            <TextInput
              style={[
                styles.input,
                fieldErrors.confirmPassword && styles.inputError,
              ]}
              placeholder="Re-enter your password"
              placeholderTextColor="#64748B"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setFieldErrors((prev) => ({
                  ...prev,
                  confirmPassword: undefined,
                }));
              }}
              secureTextEntry={true}
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
              editable={!isLoading}
              keyboardType="default"
            />
            {fieldErrors.confirmPassword && (
              <Text style={styles.fieldErrorText}>
                {fieldErrors.confirmPassword}
              </Text>
            )}
          </View>

          {/* Register Button */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              isLoading && styles.buttonDisabled,
              pressed && !isLoading && styles.buttonPressed,
            ]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </Pressable>

          {/* Login Link */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <Pressable
              onPress={() => router.replace("/login")}
              disabled={isLoading}
            >
              <Text style={styles.loginLink}>Log in</Text>
            </Pressable>
          </View>

          {/* Cancel Button */}
          <Pressable
            style={({ pressed }) => [
              styles.button,
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
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
  errorContainer: {
    backgroundColor: "#7F1D1D",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 14,
    textAlign: "center",
  },
  inputContainer: {
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
  },
  inputError: {
    borderColor: "#DC2626",
  },
  fieldErrorText: {
    color: "#FCA5A5",
    fontSize: 12,
    marginTop: 4,
  },
  button: {
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    minHeight: 48,
  },
  primaryButton: {
    backgroundColor: "#2563EB",
    marginTop: 16,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#475569",
    marginTop: 8,
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
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  loginText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  loginLink: {
    color: "#2563EB",
    fontSize: 14,
    fontWeight: "600",
  },
});
