import { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, TextInput, View, FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useAuth0 } from "../contexts/Auth0Context";
import * as Location from "expo-location";
import Mapbox, { Camera, PointAnnotation } from "@rnmapbox/maps";

// Initialize Mapbox with access token
const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
if (MAPBOX_ACCESS_TOKEN) {
  Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);
}

interface LocationData {
  latitude: number;
  longitude: number;
}

interface SearchResult {
  id: string;
  place_name: string;
  center: [number, number]; // [longitude, latitude]
}

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuth0();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressStartTimeRef = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MIN_ZOOM = 3;
  const MAX_ZOOM = 20;
  const ZOOM_STEP = 1;
  const LONG_PRESS_DURATION = 5000; // 5 seconds

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingLocation(true);
        setLocationError(null);

        // Request location permissions
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setLocationError("Location permission denied");
          setIsLoadingLocation(false);
          return;
        }

        // Get current location
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        setLocation({
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        });
      } catch (error) {
        console.error("Error getting location:", error);
        setLocationError("Failed to get location");
      } finally {
        setIsLoadingLocation(false);
      }
    })();
  }, []);


  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel + ZOOM_STEP, MAX_ZOOM);
    setZoomLevel(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel - ZOOM_STEP, MIN_ZOOM);
    setZoomLevel(newZoom);
  };

  const handleLongPressStart = () => {
    longPressStartTimeRef.current = Date.now();
    setLongPressProgress(0);

    // Update progress every 100ms
    longPressTimerRef.current = setInterval(() => {
      if (longPressStartTimeRef.current) {
        const elapsed = Date.now() - longPressStartTimeRef.current;
        const progress = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100);
        setLongPressProgress(progress);

        if (elapsed >= LONG_PRESS_DURATION) {
          // Navigate to health page
          router.push("/health");
          handleLongPressEnd();
        }
      }
    }, 100);
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearInterval(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartTimeRef.current = null;
    setLongPressProgress(0);
  };

  // Search for places using Mapbox Geocoding API
  const searchPlaces = async (query: string) => {
    if (!query.trim() || !MAPBOX_ACCESS_TOKEN) {
      setSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const encodedQuery = encodeURIComponent(query);
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_ACCESS_TOKEN}&limit=5`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.features) {
        setSearchResults(data.features.map((feature: any) => ({
          id: feature.id,
          place_name: feature.place_name,
          center: feature.center,
        })));
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input with debounce
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(searchQuery);
    }, 500); // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  // Handle location selection
  const handleSelectLocation = (result: SearchResult) => {
    const [longitude, latitude] = result.center;
    setSelectedLocation({ latitude, longitude });
    setZoomLevel(15);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearInterval(longPressTimerRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {/* Full Screen Map */}
      <View style={styles.mapContainer}>
        {isLoadingLocation ? (
          <View style={styles.mapPlaceholder}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.mapPlaceholderText}>Loading map...</Text>
          </View>
        ) : locationError ? (
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapErrorText}>{locationError}</Text>
          </View>
        ) : location ? (
          <Mapbox.MapView
            style={styles.map}
            styleURL={Mapbox.StyleURL.Dark}
            logoEnabled={false}
            attributionEnabled={false}
            zoomEnabled={true}
            scrollEnabled={true}
            pitchEnabled={true}
            rotateEnabled={true}
            compassEnabled={true}
            scaleBarEnabled={true}
            scaleBarPosition={{ bottom: 20, left: 20 }}
          >
            <Camera
              zoomLevel={zoomLevel}
              centerCoordinate={
                selectedLocation
                  ? [selectedLocation.longitude, selectedLocation.latitude]
                  : [location.longitude, location.latitude]
              }
              animationMode="easeTo"
              animationDuration={200}
              minZoomLevel={MIN_ZOOM}
              maxZoomLevel={MAX_ZOOM}
            />
            <Mapbox.UserLocation visible={true} />
            <PointAnnotation
              id="user-location"
              coordinate={[location.longitude, location.latitude]}
              title="Your Location"
            >
              <View style={styles.markerContainer}>
                <View style={styles.marker} />
              </View>
            </PointAnnotation>
            {selectedLocation && (
              <PointAnnotation
                id="selected-location"
                coordinate={[selectedLocation.longitude, selectedLocation.latitude]}
                title="Selected Location"
              >
                <View style={styles.markerContainer}>
                  <View style={styles.selectedMarker} />
                </View>
              </PointAnnotation>
            )}
          </Mapbox.MapView>
        ) : null}
      </View>

      {/* Top Header */}
      <View style={styles.topHeader}>
        <Pressable
          onPressIn={handleLongPressStart}
          onPressOut={handleLongPressEnd}
          style={styles.topHeaderPressable}
        >
          <Text style={styles.topHeaderTitle}>SafeRoute</Text>
          {longPressProgress > 0 && (
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${longPressProgress}%` }]} />
            </View>
          )}
        </Pressable>
      </View>

      {/* Search Box */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a place..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isSearching && (
            <ActivityIndicator size="small" color="#2563EB" style={styles.searchLoader} />
          )}
        </View>
        {searchResults.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.searchResultItem}
                  onPress={() => handleSelectLocation(item)}
                >
                  <Text style={styles.searchResultText}>{item.place_name}</Text>
                </Pressable>
              )}
              style={styles.searchResultsList}
            />
          </View>
        )}
      </View>

      {/* User Avatar */}
      <View style={styles.avatarContainer}>
        {isAuthenticated && user ? (
          <Pressable
            onPress={() => router.push("/profile")}
            style={styles.avatarButton}
          >
            {user.picture ? (
              <Image
                source={{ uri: user.picture }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {user.name?.charAt(0).toUpperCase() || "U"}
                </Text>
              </View>
            )}
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.loginAvatarButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginAvatarText}>Login</Text>
          </Pressable>
        )}
      </View>

      {/* Zoom Controls */}
      {location && (
        <View style={styles.zoomControls}>
          <Pressable
            style={({ pressed }) => [
              styles.zoomButton,
              pressed && styles.zoomButtonPressed,
              zoomLevel >= MAX_ZOOM && styles.zoomButtonDisabled,
            ]}
            onPress={handleZoomIn}
            disabled={zoomLevel >= MAX_ZOOM}
          >
            <Text style={styles.zoomButtonText}>+</Text>
          </Pressable>
          <View style={styles.zoomDivider} />
          <Pressable
            style={({ pressed }) => [
              styles.zoomButton,
              pressed && styles.zoomButtonPressed,
              zoomLevel <= MIN_ZOOM && styles.zoomButtonDisabled,
            ]}
            onPress={handleZoomOut}
            disabled={zoomLevel <= MIN_ZOOM}
          >
            <Text style={styles.zoomButtonText}>−</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1E293B",
  },
  mapPlaceholderText: {
    color: "#CBD5F5",
    fontSize: 14,
    marginTop: 8,
  },
  mapErrorText: {
    color: "#F87171",
    fontSize: 14,
    textAlign: "center",
    padding: 16,
  },
  avatarContainer: {
    position: "absolute",
    top: 110,
    right: 16,
    zIndex: 1001,
  },
  avatarButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  loginAvatarButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginAvatarText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  buttonPressed: {
    opacity: 0.85,
  },
  markerContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  selectedMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#059669",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  zoomControls: {
    position: "absolute",
    right: 16,
    bottom: 100,
    zIndex: 1000,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  zoomButton: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
  },
  zoomButtonPressed: {
    backgroundColor: "rgba(240, 240, 240, 0.95)",
  },
  zoomButtonDisabled: {
    opacity: 0.4,
  },
  zoomButtonText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1F2937",
    lineHeight: 28,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  topHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: "transparent",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: "center",
  },
  topHeaderPressable: {
    alignItems: "center",
    width: "100%",
  },
  topHeaderTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0, 0, 0, 0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressBarContainer: {
    marginTop: 8,
    width: 150,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 2,
  },
  searchContainer: {
    position: "absolute",
    top: 110,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
    padding: 0,
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchResultsContainer: {
    marginTop: 8,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    maxHeight: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  searchResultText: {
    fontSize: 14,
    color: "#1F2937",
  },
});
