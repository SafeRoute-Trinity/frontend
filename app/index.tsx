import Mapbox, { Camera, LineLayer, PointAnnotation, ShapeSource } from "@rnmapbox/maps";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { initializeMapbox, mapboxConfig } from "../config/mapbox";
import { useAuth0 } from "../contexts/Auth0Context";

// Initialize Mapbox with access token
const MAPBOX_ACCESS_TOKEN = mapboxConfig.accessToken;
if (MAPBOX_ACCESS_TOKEN) {
  // Use initializeMapbox() with the already-imported Mapbox instance
  initializeMapbox(Mapbox);
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
  const { isAuthenticated, user, logout } = useAuth0();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const longPressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressStartTimeRef = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [routeData, setRouteData] = useState<any>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeStart, setRouteStart] = useState<[number, number] | null>(null); // [longitude, latitude]
  const [routeEnd, setRouteEnd] = useState<[number, number] | null>(null); // [longitude, latitude]
  const cameraRef = useRef<Camera>(null);
  const [centerCoordinate, setCenterCoordinate] = useState<[number, number] | null>(null);

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

        const newLocation = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        };
        setLocation(newLocation);
        setCenterCoordinate([newLocation.longitude, newLocation.latitude]);
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

  // Center map on current location
  const handleCenterOnLocation = () => {
    if (location && cameraRef.current) {
      const coord: [number, number] = [location.longitude, location.latitude];
      setCenterCoordinate(coord);
      setSelectedLocation(null); // Clear any selected location
      // Use camera ref to programmatically move the camera
      cameraRef.current.setCamera({
        centerCoordinate: coord,
        zoomLevel: zoomLevel,
        animationDuration: 500,
      });
    }
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
    const coord: [number, number] = [longitude, latitude];
    setSelectedLocation({ latitude, longitude });
    setZoomLevel(15);
    setCenterCoordinate(coord); // Update center coordinate to trigger camera movement
    setSearchQuery("");
    setSearchResults([]);
    // Use camera ref to programmatically move the camera
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: coord,
        zoomLevel: 15,
        animationDuration: 500,
      });
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      setShowAccountMenu(false);
      router.push("/");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Handle switch account
  const handleSwitchAccount = async () => {
    try {
      setIsLoggingOut(true);
      setShowAccountMenu(false);

      // Clear local storage and Auth0 session
      await logout();

      // Navigate to login and force show login form
      router.push("/login?forceLogin=true");
    } catch (error) {
      console.error("Switch account failed:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Test OpenRouter API
  const handleTestRoute = async () => {
    // Build URL with properly formatted coordinates (no spaces after comma)
    const startLat = 53.341878714221885;
    const startLon = -6.2522456843725545;
    const endLat = 53.34446845655061;
    const endLon = -6.259457236376844;
    
    // Try different URL formats in case the API expects a specific format
    const baseUrl = "https://saferoutemap.duckdns.org/route";
    const url1 = `${baseUrl}?start=${startLat},${startLon}&end=${endLat},${endLon}&profile=foot-walking`;
    const url2 = `${baseUrl}?start=${startLat}%2C${startLon}&end=${endLat}%2C${endLon}&profile=foot-walking`;
    
    try {
      setIsLoadingRoute(true);
      setRouteError(null);
      
      // Try first URL format
      let response = await fetch(url1);
      
      // If 404, try second format
      if (!response.ok && response.status === 404) {
        console.log("Trying alternative URL format...");
        response = await fetch(url2);
      }
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }
      
      const data = await response.json();
      
      // The response should be in Mapbox-compatible GeoJSON format
      // Based on the expected response, it's already a FeatureCollection
      let finalRouteData: any;
      
      if (data.type === "FeatureCollection") {
        finalRouteData = data;
      } else if (data.type === "Feature") {
        // Wrap single Feature in FeatureCollection
        finalRouteData = {
          type: "FeatureCollection",
          features: [data],
        };
      } else if (data.geometry || data.coordinates) {
        // If it has geometry/coordinates, wrap it in a Feature
        finalRouteData = {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: data.geometry || {
              type: "LineString",
              coordinates: data.coordinates || [],
            },
            properties: data.properties || {},
          }],
        };
      } else {
        // Try to extract route from common formats
        const routeGeometry = data.routes?.[0]?.geometry || data.geometry;
        if (routeGeometry) {
          finalRouteData = {
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              geometry: routeGeometry,
              properties: {},
            }],
          };
        } else {
          throw new Error("Unexpected response format");
        }
      }
      
      // Extract start and end coordinates from the route
      const firstFeature = finalRouteData.features?.[0];
      if (firstFeature?.geometry?.type === "LineString" && firstFeature.geometry.coordinates?.length > 0) {
        const coordinates = firstFeature.geometry.coordinates;
        const startCoord = coordinates[0]; // [longitude, latitude]
        const endCoord = coordinates[coordinates.length - 1]; // [longitude, latitude]
        
        setRouteStart(startCoord as [number, number]);
        setRouteEnd(endCoord as [number, number]);
      }
      
      setRouteData(finalRouteData);
    } catch (error) {
      console.error("Route API error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to load route";
      setRouteError(errorMessage);
      setRouteData(null);
    } finally {
      setIsLoadingRoute(false);
    }
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
            compassViewPosition={3}
            compassViewMargins={{ x: 12, y: 150 }}
            scaleBarEnabled={true}
            scaleBarPosition={{ bottom: 20, left: 20 }}
          >
            <Camera
              ref={cameraRef}
              zoomLevel={zoomLevel}
              centerCoordinate={
                centerCoordinate ||
                (selectedLocation
                  ? [selectedLocation.longitude, selectedLocation.latitude]
                  : location
                  ? [location.longitude, location.latitude]
                  : undefined)
              }
              animationMode="easeTo"
              animationDuration={500}
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
            {/* Route Line */}
            {routeData && (
              <ShapeSource id="routeSource" shape={routeData}>
                <LineLayer
                  id="routeLine"
                  style={{
                    lineColor: "#2563EB",
                    lineWidth: 4,
                    lineOpacity: 0.8,
                  }}
                />
              </ShapeSource>
            )}
            {/* Start Marker */}
            {routeStart && (
              <PointAnnotation
                id="route-start"
                coordinate={routeStart}
                title="Route Start"
              >
                <View style={styles.markerContainer}>
                  <View style={styles.startMarker} />
                </View>
              </PointAnnotation>
            )}
            {/* End Marker */}
            {routeEnd && (
              <PointAnnotation
                id="route-end"
                coordinate={routeEnd}
                title="Route End"
              >
                <View style={styles.markerContainer}>
                  <View style={styles.endMarker} />
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
            onPress={() => setShowAccountMenu(true)}
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
          <>
            <Pressable
              style={({ pressed }) => [
                styles.loginAvatarButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.loginAvatarText}>Login</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.healthButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.push("/health")}
            >
              <Text style={styles.healthButtonText}>Health</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* Account Menu Modal */}
      <Modal
        visible={showAccountMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAccountMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAccountMenu(false)}
        >
          <View style={styles.menuContainer}>
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={() => {
                setShowAccountMenu(false);
                router.push("/profile");
              }}
            >
              <Text style={styles.menuItemIcon}>👤</Text>
              <Text style={styles.menuItemText}>View Profile</Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={handleSwitchAccount}
              disabled={isLoggingOut}
            >
              <Text style={styles.menuItemIcon}>🔄</Text>
              <Text style={styles.menuItemText}>
                {isLoggingOut ? "Switching..." : "Switch Account"}
              </Text>
            </Pressable>
            <View style={styles.menuDivider} />
            <Pressable
              style={({ pressed }) => [
                styles.menuItem,
                pressed && styles.menuItemPressed,
              ]}
              onPress={handleLogout}
              disabled={isLoggingOut}
            >
              <Text style={styles.menuItemIcon}>🚪</Text>
              <Text style={[styles.menuItemText, styles.logoutText]}>
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Text>
            </Pressable>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Route Test Button */}
      {location && (
        <View style={styles.routeTestContainer}>
          <Pressable
            style={({ pressed }) => [
              styles.routeTestButton,
              pressed && styles.buttonPressed,
              isLoadingRoute && styles.zoomButtonDisabled,
            ]}
            onPress={handleTestRoute}
            disabled={isLoadingRoute}
          >
            {isLoadingRoute ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.routeTestButtonText}>Test Route</Text>
            )}
          </Pressable>
          {routeError && (
            <Text style={styles.routeErrorText}>{routeError}</Text>
          )}
          {routeData && (
            <Pressable
              style={({ pressed }) => [
                styles.clearRouteButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => {
                setRouteData(null);
                setRouteError(null);
                setRouteStart(null);
                setRouteEnd(null);
              }}
            >
              <Text style={styles.clearRouteButtonText}>Clear Route</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Current Location Button */}
      {location && (
        <Pressable
          style={({ pressed }) => [
            styles.locationButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleCenterOnLocation}
        >
          <Text style={styles.locationButtonIcon}>🔵</Text>
        </Pressable>
      )}

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
    alignItems: "flex-end",
  },
  avatarWithMenu: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuIcon: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    lineHeight: 20,
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
  healthButton: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#6B7280",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  healthButtonText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "500",
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
  startMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#16A34A",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  endMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  routeTestContainer: {
    position: "absolute",
    left: 16,
    bottom: 100,
    zIndex: 1000,
    alignItems: "flex-start",
  },
  routeTestButton: {
    backgroundColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  routeTestButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  clearRouteButton: {
    backgroundColor: "#DC2626",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clearRouteButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  routeErrorText: {
    color: "#F87171",
    fontSize: 11,
    marginTop: 4,
    maxWidth: 200,
  },
  compassContainer: {
    position: "absolute",
    right: 16,
    bottom: 160,
    zIndex: 1000,
  },
  compassIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  compassText: {
    fontSize: 20,
  },
  locationButton: {
    position: "absolute",
    right: 16,
    bottom: 210,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationButtonIcon: {
    fontSize: 20,
  },
  zoomControls: {
    position: "absolute",
    right: 16,
    bottom: 60,
    zIndex: 1000,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 6,
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
    width: 40,
    height: 40,
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
    fontSize: 20,
    fontWeight: "600",
    color: "#1F2937",
    lineHeight: 24,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 110,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
    overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  menuItemPressed: {
    backgroundColor: "#F3F4F6",
  },
  menuItemIcon: {
    fontSize: 18,
  },
  menuItemText: {
    fontSize: 16,
    color: "#1F2937",
    fontWeight: "500",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  logoutText: {
    color: "#DC2626",
  },
});
