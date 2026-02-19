import Mapbox, { Camera, LineLayer, PointAnnotation, ShapeSource } from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth0 } from '../../contexts/Auth0Context';
import { initializeMapbox, mapboxConfig } from '../../config/mapbox';

/* eslint-disable no-console */

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E293B',
  },
  mapPlaceholderText: {
    color: '#CBD5F5',
    fontSize: 14,
    marginTop: 8,
  },
  mapErrorText: {
    color: '#F87171',
    fontSize: 14,
    textAlign: 'center',
    padding: 16,
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 30,
    height: 30,
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  selectedMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#059669',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  startMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#16A34A',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
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
    backgroundColor: '#DC2626',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  routeTestContainer: {
    position: 'absolute',
    left: 16,
    bottom: 100,
    zIndex: 1000,
    alignItems: 'flex-start',
  },
  routeTestButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTestButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  clearRouteButton: {
    backgroundColor: '#DC2626',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  clearRouteButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  routeErrorText: {
    color: '#F87171',
    fontSize: 11,
    marginTop: 4,
    maxWidth: 200,
  },
  compassContainer: {
    position: 'absolute',
    right: 16,
    bottom: 160,
    zIndex: 1000,
  },
  compassIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
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
    position: 'absolute',
    right: 16,
    bottom: 210,
    zIndex: 1000,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
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
    position: 'absolute',
    right: 16,
    bottom: 60,
    zIndex: 1000,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 6,
    overflow: 'hidden',
    shadowColor: '#000',
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  zoomButtonPressed: {
    backgroundColor: 'rgba(240, 240, 240, 0.95)',
  },
  zoomButtonDisabled: {
    opacity: 0.4,
  },
  zoomButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    lineHeight: 24,
  },
  zoomDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  topHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'transparent',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: 'center',
  },
  topHeaderPressable: {
    alignItems: 'center',
    width: '100%',
  },
  topHeaderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressBarContainer: {
    marginTop: 8,
    width: 150,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 2,
  },
  searchContainer: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: '#000',
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
    color: '#1F2937',
    padding: 0,
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchResultsContainer: {
    marginTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  searchResultsList: {
    maxHeight: 200,
  },
  searchResultItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchResultText: {
    fontSize: 14,
    color: '#1F2937',
  },
  buttonPressed: {
    opacity: 0.85,
  },
  // Modal styles (used for map long-press report)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 420,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#0B1220',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLabel: {
    fontSize: 14,
    color: '#CBD5F5',
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: '#0B1220',
    borderRadius: 12,
    padding: 12,
    color: '#FFFFFF',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modalSubmitButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  modalSubmitButtonDisabled: {
    backgroundColor: '#374151',
  },
  modalSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  pillButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#0B1220',
    borderWidth: 1,
    borderColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillButtonSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  pillButtonText: {
    color: '#CBD5F5',
    fontSize: 14,
    fontWeight: '600',
  },
  pillButtonTextSelected: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

// Default location: Dublin, Ireland
const DEFAULT_LOCATION = {
  latitude: 53.3498,
  longitude: -6.2603,
};

const Index = () => {
  const router = useRouter();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const longPressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressStartTimeRef = useRef<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [routeData, setRouteData] = useState<any>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeStart, setRouteStart] = useState<[number, number] | null>(null);
  const [routeEnd, setRouteEnd] = useState<[number, number] | null>(null);
  const cameraRef = useRef<Camera>(null);
  const [centerCoordinate, setCenterCoordinate] = useState<[number, number] | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportLocation, setReportLocation] = useState<LocationData | null>(null);
  const [feedbackType, setFeedbackType] = useState<
    
  >('saf>(null);
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical' | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const { user } = useAuth0();

  const MIN_ZOOM = 3;
  const MAX_ZOOM = 20;
  const ZOOM_STEP = 1;
  const LONG_PRESS_DURATION = 5000; // 5 seconds

  // Handle long press on the map to report a location
  const handleMapLongPress = (e: any) => {
    try {
      // Mapbox onPress/longPress events include geometry.coordinates = [lng, lat]
      const coords = e?.geometry?.coordinates || e?.properties?.coordinate || null;
      if (coords && Array.isArray(coords) && coords.length >= 2) {
        const [longitude, latitude] = coords;
        setReportLocation({ latitude, longitude });
        setReportText('');
        setFeedbackType(null);
        setSeverity(null);
        setIsSubmittingReport(false);
        setShowReportModal(true);
      }
    } catch (err) {
      console.warn('Failed to read long press coordinates', err);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        setIsLoadingLocation(true);
        setLocationError(null);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationError('Location permission denied');
          setIsLoadingLocation(false);
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const { latitude, longitude } = currentLocation.coords;

        // Detect simulator default location (San Francisco area) and use Dublin instead
        const isSanFranciscoDefault =
          Math.abs(latitude - 37.7749) < 0.01 && Math.abs(longitude - -122.4194) < 0.01;

        const newLocation = isSanFranciscoDefault ? DEFAULT_LOCATION : { latitude, longitude };

        setLocation(newLocation);
        setCenterCoordinate([newLocation.longitude, newLocation.latitude]);
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationError('Failed to get location');
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

  const handleCenterOnLocation = () => {
    if (location && cameraRef.current) {
      const coord: [number, number] = [location.longitude, location.latitude];
      setCenterCoordinate(coord);
      setSelectedLocation(null);
      cameraRef.current.setCamera({
        centerCoordinate: coord,
        zoomLevel,
        animationDuration: 500,
      });
    }
  };

  const handleLongPressEnd = () => {
    if (longPressTimerRef.current) {
      clearInterval(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    longPressStartTimeRef.current = null;
    setLongPressProgress(0);
  };

  const handleLongPressStart = () => {
    longPressStartTimeRef.current = Date.now();
    setLongPressProgress(0);

    longPressTimerRef.current = setInterval(() => {
      if (longPressStartTimeRef.current) {
        const elapsed = Date.now() - longPressStartTimeRef.current;
        const progress = Math.min((elapsed / LONG_PRESS_DURATION) * 100, 100);
        setLongPressProgress(progress);

        if (elapsed >= LONG_PRESS_DURATION) {
          router.push('/health');
          handleLongPressEnd();
        }
      }
    }, 100);
  };

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
        setSearchResults(
          data.features.map((feature: any) => ({
            id: feature.id,
            place_name: feature.place_name,
            center: feature.center,
          }))
        );
      }
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(searchQuery);
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handleSelectLocation = (result: SearchResult) => {
    const [longitude, latitude] = result.center;
    const coord: [number, number] = [longitude, latitude];
    setSelectedLocation({ latitude, longitude });
    setZoomLevel(15);
    setCenterCoordinate(coord);
    setSearchQuery('');
    setSearchResults([]);
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: coord,
        zoomLevel: 15,
        animationDuration: 500,
      });
    }
  };

  const handleTestRoute = async () => {
    const startLat = 53.341878714221885;
    const startLon = -6.2522456843725545;
    const endLat = 53.34446845655061;
    const endLon = -6.259457236376844;

    const baseUrl = 'https://saferoutemap.duckdns.org/route';
    const url1 = `${baseUrl}?start=${startLat},${startLon}&end=${endLat},${endLon}&profile=foot-walking`;
    const url2 = `${baseUrl}?start=${startLat}%2C${startLon}&end=${endLat}%2C${endLon}&profile=foot-walking`;

    try {
      setIsLoadingRoute(true);
      setRouteError(null);

      let response = await fetch(url1);

      if (!response.ok && response.status === 404) {
        response = await fetch(url2);
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => response.statusText);
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();

      let finalRouteData: any;

      if (data.type === 'FeatureCollection') {
        finalRouteData = data;
      } else if (data.type === 'Feature') {
        finalRouteData = {
          type: 'FeatureCollection',
          features: [data],
        };
      } else if (data.geometry || data.coordinates) {
        finalRouteData = {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              geometry: data.geometry || {
                type: 'LineString',
                coordinates: data.coordinates || [],
              },
              properties: data.properties || {},
            },
          ],
        };
      } else {
        const routeGeometry = data.routes?.[0]?.geometry || data.geometry;
        if (routeGeometry) {
          finalRouteData = {
            type: 'FeatureCollection',
            features: [
              {
                type: 'Feature',
                geometry: routeGeometry,
                properties: {},
              },
            ],
          };
        } else {
          throw new Error('Unexpected response format');
        }
      }

      const firstFeature = finalRouteData.features?.[0];
      if (
        firstFeature?.geometry?.type === 'LineString' &&
        firstFeature.geometry.coordinates?.length > 0
      ) {
        const { coordinates } = firstFeature.geometry;
        const startCoord = coordinates[0];
        const endCoord = coordinates[coordinates.length - 1];

        setRouteStart(startCoord as [number, number]);
        setRouteEnd(endCoord as [number, number]);
      }

      setRouteData(finalRouteData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load route';
      setRouteError(errorMessage);
      setRouteData(null);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  useEffect(
    () => () => {
      if (longPressTimerRef.current) {
        clearInterval(longPressTimerRef.current);
      }
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    },
    []
  );

  const getCenterCoordinate = () => {
    if (centerCoordinate) return centerCoordinate;
    if (selectedLocation) return [selectedLocation.longitude, selectedLocation.latitude];
    if (location) return [location.longitude, location.latitude];
    return undefined;
  };

  const renderMapContent = () => {
    if (isLoadingLocation) {
      return (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.mapPlaceholderText}>Loading map...</Text>
        </View>
      );
    }

    if (locationError) {
      return (
        <View style={styles.mapPlaceholder}>
          <Text style={styles.mapErrorText}>{locationError}</Text>
        </View>
      );
    }

    if (location) {
      return (
        <Mapbox.MapView
          style={styles.map}
          styleURL={Mapbox.StyleURL.Dark}
          logoEnabled={false}
          attributionEnabled={false}
          onLongPress={handleMapLongPress}
          zoomEnabled
          scrollEnabled
          pitchEnabled
          rotateEnabled
          compassEnabled
          compassViewPosition={3}
          compassViewMargins={{ x: 12, y: 150 }}
          scaleBarEnabled
          scaleBarPosition={{ bottom: 20, left: 20 }}
        >
          <Camera
            ref={cameraRef}
            zoomLevel={zoomLevel}
            centerCoordinate={getCenterCoordinate()}
            animationMode="easeTo"
            animationDuration={500}
            minZoomLevel={MIN_ZOOM}
            maxZoomLevel={MAX_ZOOM}
          />
          <Mapbox.UserLocation visible />
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
          {routeData && (
            <ShapeSource id="routeSource" shape={routeData}>
              <LineLayer
                id="routeLine"
                style={{
                  lineColor: '#2563EB',
                  lineWidth: 4,
                  lineOpacity: 0.8,
                }}
              />
            </ShapeSource>
          )}
          {routeStart && (
            <PointAnnotation id="route-start" coordinate={routeStart} title="Route Start">
              <View style={styles.markerContainer}>
                <View style={styles.startMarker} />
              </View>
            </PointAnnotation>
          )}
          {routeEnd && (
            <PointAnnotation id="route-end" coordinate={routeEnd} title="Route End">
              <View style={styles.markerContainer}>
                <View style={styles.endMarker} />
              </View>
            </PointAnnotation>
          )}
          {/* Report marker placed when user long-presses the map */}
          {reportLocation && (
            <PointAnnotation
              id="reported-location"
              coordinate={[reportLocation.longitude, reportLocation.latitude]}
              title="Reported Location"
            >
              <View style={styles.markerContainer}>
                <View style={[styles.selectedMarker, { backgroundColor: '#EF4444' }]} />
              </View>
            </PointAnnotation>
          )}
        </Mapbox.MapView>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>{renderMapContent()}</View>

      {/* Top Header with long-press for health page */}
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
          {routeError && <Text style={styles.routeErrorText}>{routeError}</Text>}
          {routeData && (
            <Pressable
              style={({ pressed }) => [styles.clearRouteButton, pressed && styles.buttonPressed]}
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
          style={({ pressed }) => [styles.locationButton, pressed && styles.buttonPressed]}
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

      {/* Report Modal (map long-press) */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowReportModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowReportModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Report unsafe location</Text>
              <Pressable style={styles.modalCloseButton} onPress={() => setShowReportModal(false)}>
                <Text style={{ fontSize: 16 }}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.modalLabel}>
              {reportLocation
                ? `Location: ${reportLocation.latitude.toFixed(6)}, ${reportLocation.longitude.toFixed(6)}`
                : 'Location unknown'}
            </Text>
            {/* Feedback type selector */}
            <Text style={[styles.modalLabel, { marginTop: 8 }]}>Feedback Type</Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              <Pressable
                style={
                  feedbackType === 'safety_issue'
                    ? [styles.pillButton, styles.pillButtonSelected, { marginRight: 8 }]
                    : [styles.pillButton, { marginRight: 8 }]
                }
                onPress={() => setFeedbackType('safety_issue')}
              >
                <Text
                  style={
                    feedbackType === 'safety_issue'
                     
                     
                      ? styles.pillButtonTextSelected
                      : styles.pillButtonText
                  }
                >
                  Safety Issue
                </Text>
              </Pressable>
              <Pressable
                style={
                  feedbackType === 'route_quality'
                    ? [styles.pillButton, styles.pillButtonSelected, { marginRight: 8 }]
                    : [styles.pillButton, { marginRight: 8 }]
                }
                onPress={() => setFeedbackType('route_quality')}
              >
                <Text
                     
                     
                  style={
                    feedbackType === 'route_quality'
                      ? styles.pillButtonTextSelected
                      : styles.pillButtonText
                  }
                >
                  Route Quality
                </Text>
              </Pressable>
              <Pressable
                style={
                  feedbackType === 'other'
                    ? [styles.pillButton, styles.pillButtonSelected]
                    :
                  styles.
                    pillButton
                  
                
                }
                onPress={() => setFeedbackType('other')}
              >
                <Text
                  style={
                    feedbackType === 'other' ? styles.pillButtonTextSelected : styles.pillButtonText
                  }
                >
                  Other
                </Text>
              </Pressable>
            </View>

            {/* Severity 
                          selector */}
                         
                         ,
                        
            <Text style={styles.modalLabel}>Severity</Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {(['low', 'medium', 'high', 'critical'] as const).map((s, idx) => (
                <Pressable
                  key={
                   s}
                  
                  style={
                    severity === s
                      ? [
                          styles.pillButton,
                          styles.pillButtonSelected,
                          idx < 3 ? { marginRight: 8 } : {},
                        ]
                      : [styles.pillButton, idx < 3 ? { marginRight: 8 } : {}]
                  }
                  onPress={() => setSeverity(s)}
                >
                  <Text
                    style={severity === s ? styles.pillButtonTextSelected : styles.pillButtonText}
                  >
                    {s[0].toUpperCase() + s.slice(1)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.modalLabel, { marginTop: 4 }]}>Description</Text>
            <TextInput
              style={styles.modalInput}
                       
              placeholder="Describe the issue..."
              placeholderTextColor="#9CA3AF"
              multiline
              value={reportText}
              onChangeText={setReportText}
            />

            <Pressable
              style={
                isSubmittingReport
                  ? [styles.modalSubmitButton, styles.modalSubmitButtonDisabled]
                  : [
                      styles.modalSubmitButton,
                      (!feedbackType || !severity || reportText.trim() === '') &&
                        styles.modalSubmitButtonDisabled,
                    ]
              }
              onPress={async () => {
                if (!reportLocation) return;
                if (!feedbackType || !severity || reportText.trim() === '') {
                  return;
                }
                setIsSubmittingReport(true);
                const payload: any = {
                  user_id: user?.sub || 'anonymous',
                  route_id: '',
                  type: feedbackType,
                  severity,
                  location: {
                    latitude: reportLocation.latitude,
                    longitude: reportLocation.longitude,
                  },
                  description: reportText.trim(),
                  attachments: [],
                };

                try {
                  const resp = await fetch('http://127.0.0.1:20004/v1/feedback/submit', {
                    method: 'POST',
                    headers: {
                      accept: 'application/json',
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload),
                  });

                  if (!resp.ok) {
                    const text = await resp.text().catch(() => resp.statusText);
                    throw new Error(`HTTP ${resp.status}: ${text}`);
                  }
                
              

                  Alert.alert('Report submitted', '
                Thank you for your feedback.');
              
                } catch (err: any) {
                  console.warn('Failed to submit report', err);
                  Alert.alert('Submission failed', err?.message || 'Failed to submit report');
                } finally {
                  setIsSubmittingReport(false);
                  setShowReportModal(false);
                  setReportLocation(null);
                  setReportText('');
                  setFeedbackType(null);
                  setSeverity(null);
                }
              }}
              disabled={
                isSubmittingReport || !feedbackType || !severity || reportText.trim() === ''
              }
            >
              <Text style={styles.modalSubmitText}>
                {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default Index;
