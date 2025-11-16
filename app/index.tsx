import { Text, View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useAuth0 } from "../contexts/Auth0Context";

export default function Index() {
  const { user, isLoading, isAuthenticated, login, logout, error } = useAuth0();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isAuthenticated ? (
        <View style={styles.content}>
          <Text style={styles.title}>Welcome Back!</Text>
          {user?.name && (
            <Text style={styles.userInfo}>Name: {user.name}</Text>
          )}
          {user?.email && (
            <Text style={styles.userInfo}>Email: {user.email}</Text>
          )}
          {user?.picture && (
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>Avatar Set</Text>
            </View>
          )}
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <Text style={styles.title}>SafeRoute</Text>
          <Text style={styles.subtitle}>Please login to continue</Text>
          <TouchableOpacity style={styles.loginButton} onPress={login}>
            <Text style={styles.buttonText}>Login</Text>
          </TouchableOpacity>
          {error && (
            <Text style={styles.errorText}>
              Error: {error.message || "Login failed"}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  subtitle: {
    fontSize: 18,
    color: "#666",
    marginBottom: 30,
  },
  userInfo: {
    fontSize: 16,
    color: "#333",
    marginBottom: 10,
    textAlign: "center",
  },
  avatarContainer: {
    marginVertical: 20,
    padding: 10,
    backgroundColor: "#e0e0e0",
    borderRadius: 8,
  },
  avatarText: {
    color: "#666",
  },
  loginButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
  },
  logoutButton: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
    marginTop: 30,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  errorText: {
    color: "#FF3B30",
    marginTop: 20,
    textAlign: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#666",
  },
});
