import Mapbox, {
  Camera,
  CircleLayer,
  FillLayer,
  LineLayer,
  PointAnnotation,
  ShapeSource,
} from '@rnmapbox/maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { checkHighRiskAlert, type HighRiskAlertResponse } from '../../api/high-risk-alert';
import { coreEndpoints } from '../../config/core-endpoints';
import { initializeMapbox, mapboxConfig } from '../../config/mapbox';
import { useAuth0 } from '../../contexts/Auth0Context';
import { storage } from '../../utils/storage';

/* eslint-disable no-console */

// Initialize Mapbox with access token
const MAPBOX_ACCESS_TOKEN = mapboxConfig.accessToken;
if (MAPBOX_ACCESS_TOKEN) {
  // Use initializeMapbox() with the already-imported Mapbox instance
  initializeMapbox(Mapbox);
}

// Feedback submit endpoint - configurable via EXPO_PUBLIC_FEEDBACK_SUBMIT_URL
const FEEDBACK_SUBMIT_URL =
  coreEndpoints.feedbackSubmitUrl || 'http://127.0.0.1:20004/v1/feedback/submit';

const ensureHttpsForRemote = (url: string) => {
  if (url.startsWith('http://localhost') || url.startsWith('http://127.0.0.1')) {
    return url;
  }
  return url.replace(/^http:\/\//, 'https://');
};

const getServiceBaseUrlFromHealthUrl = (healthUrl: string) => {
  const normalized = ensureHttpsForRemote(healthUrl).replace(/\/$/, '');
  return normalized.replace(/\/health(?:\/[^/]+)?$/, '');
};

const buildRouteApiUrlFromHealth = (healthUrl?: string) => {
  if (!healthUrl) {
    return null;
  }
  const baseUrl = getServiceBaseUrlFromHealthUrl(healthUrl);
  return `${baseUrl}/v1/routes/calculate`;
};

const buildTransitApiUrlFromHealth = (healthUrl?: string) => {
  if (!healthUrl) {
    return null;
  }
  const baseUrl = getServiceBaseUrlFromHealthUrl(healthUrl);
  return `${baseUrl}/v1/transit/plan`;
};

const routingHealthUrl = coreEndpoints.routingServiceHealthUrl;
const derivedRoutingCalculateUrl = buildRouteApiUrlFromHealth(routingHealthUrl);
const derivedTransitPlanUrl = buildTransitApiUrlFromHealth(routingHealthUrl);

const ROUTE_API_URL =
  derivedRoutingCalculateUrl ||
  (coreEndpoints.backendBaseUrl
    ? `${ensureHttpsForRemote(coreEndpoints.backendBaseUrl).replace(/\/$/, '')}/v1/routes/calculate`
    : 'https://saferoutemap.duckdns.org/api/route');
// const USE_V1_ROUTE_API = ROUTE_API_URL.includes('/v1/routes/calculate');
const buildTransitApiCandidates = () => {
  const backendTransitUrl = coreEndpoints.backendBaseUrl
    ? `${ensureHttpsForRemote(coreEndpoints.backendBaseUrl).replace(/\/$/, '')}/v1/transit/plan`
    : null;

  const candidates = [
    'https://saferoutemap.duckdns.org/v1/transit/plan',
    coreEndpoints.transitPlanUrl,
    derivedTransitPlanUrl,
    backendTransitUrl,
  ].filter((item): item is string => Boolean(item));

  return Array.from(new Set(candidates));
};

// const TRANSIT_API_CANDIDATES = buildTransitApiCandidates();

interface LocationData {
  latitude: number;
  longitude: number;
}

interface SearchResult {
  id: string;
  place_name: string;
  center?: [number, number] | null; // [longitude, latitude]
  provider?: 'mapbox' | 'google' | 'osm' | 'local';
  place_id?: string;
}

type TransportMode = 'walking' | 'public_transit';

interface TransitLeg {
  mode: 'walk' | 'transit';
  route_id?: string | null;
  from_stop_id?: string | null;
  to_stop_id?: string | null;
  trip_id?: string | null;
  vehicle_type?: string | null;
  duration_s: number;
  distance_m?: number | null;
  coordinates?: [number, number][] | null;
}

interface TransitItinerary {
  duration_s: number;
  transfers: number;
  walking_duration_s: number;
  transit_duration_s: number;
  legs: TransitLeg[];
}

interface TransitPlanResponse {
  itineraries?: TransitItinerary[];
}

interface TransitJourneyStep {
  id: string;
  mode: 'walk' | 'transit';
  route_id?: string | null;
  from_stop_id?: string | null;
  to_stop_id?: string | null;
  duration_s: number;
  distance_m: number | null;
}

interface SelectedRouteSegment {
  featureId: string;
  title: string;
  detail: string;
  durationLabel: string | null;
  distanceLabel: string | null;
}

const RECENT_DESTINATIONS_STORAGE_KEY = 'recent_destinations_v1';
const CURRENT_LOCATION_RESULT_ID = 'local-current-location';
const HIGH_RISK_ALERT_TITLE = 'High-Risk Area Alert';
const HIGH_RISK_BANNER_MESSAGE = 'You are entering a high-risk area. Please stay alert.';
const HIGH_RISK_ALERT_RADIUS_METERS = 30;

const isSearchResult = (value: unknown): value is SearchResult => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const maybe = value as Partial<SearchResult>;
  return (
    typeof maybe.id === 'string' &&
    typeof maybe.place_name === 'string' &&
    Array.isArray(maybe.center) &&
    maybe.center.length >= 2 &&
    typeof maybe.center[0] === 'number' &&
    typeof maybe.center[1] === 'number'
  );
};

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
  // Location permission screen styles
  permissionScreen: {
    flex: 1,
    backgroundColor: '#1A2332',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  permissionImageContainer: {
    width: 220,
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 40,
  },
  permissionImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionDescription: {
    fontSize: 15,
    color: '#8A95A8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 60,
    paddingHorizontal: 8,
  },
  permissionButton: {
    width: '100%',
    backgroundColor: '#4A8B7F',
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  permissionButtonPressed: {
    backgroundColor: '#3D7468',
  },
  permissionButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  topRightControls: {
    position: 'absolute',
    right: 16,
    top: 220,
    zIndex: 1000,
    gap: 10,
  },
  locationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sosButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  sosButtonPressed: {
    backgroundColor: '#B91C1C',
  },
  sosButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  zoomControlsFixed: {
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
  userMarkerContainer: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userMarkerAccuracy: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(37, 99, 235, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.5)',
  },
  userMarkerHeadingWrapper: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  userMarkerHeadingTriangle: {
    marginTop: 2,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#0B1220',
  },
  userMarkerRing: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    bottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  userMarkerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563EB',
  },
  selectedMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#059669',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  mapSelectionMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
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
  routeInfoCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.9)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    minWidth: 120,
  },
  routeInfoLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  routeInfoValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  itineraryCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 230,
    maxWidth: 300,
  },
  itineraryStepRow: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  itineraryStepRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  itineraryStepTitle: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
  },
  itineraryStepDetail: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  selectedSegmentCard: {
    backgroundColor: 'rgba(2, 6, 23, 0.94)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    minWidth: 230,
    maxWidth: 300,
  },
  selectedSegmentTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
  },
  selectedSegmentDetail: {
    color: '#CBD5E1',
    fontSize: 11,
    marginTop: 4,
  },
  selectedSegmentMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
  },
  routeErrorText: {
    color: '#F87171',
    fontSize: 11,
    marginTop: 4,
    maxWidth: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 4,
    borderRadius: 4,
  },
  riskZoneStatusBanner: {
    position: 'absolute',
    top: 156,
    left: 16,
    right: 16,
    zIndex: 1000,
    backgroundColor: 'rgba(127, 29, 29, 0.9)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(254, 202, 202, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  riskZoneStatusBannerSafe: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderColor: 'rgba(148, 163, 184, 0.35)',
  },
  riskZoneStatusBannerAlert: {
    backgroundColor: 'rgba(127, 29, 29, 0.92)',
    borderColor: 'rgba(254, 202, 202, 0.35)',
  },
  riskZoneStatusText: {
    color: '#FEE2E2',
    fontSize: 12,
    fontWeight: '600',
  },
  riskZoneStatusTextSafe: {
    color: '#E2E8F0',
  },
  mapControlsContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '50%',
    transform: [{ translateY: -20 }],
    zIndex: 1001,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  controlRoundButton: {
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
  controlRoundButtonActive: {
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: 'rgba(147, 197, 253, 0.8)',
  },
  controlIconText: {
    fontSize: 20,
  },
  centerLocationIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLocationRing: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.04)',
  },
  centerLocationArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#2563EB',
    transform: [{ translateY: -1 }],
  },
  navModeIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navModeOuterRing: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#2563EB',
    backgroundColor: 'rgba(37, 99, 235, 0.03)',
  },
  navModeTopTick: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2563EB',
  },
  navModeLeftTick: {
    position: 'absolute',
    left: 1,
    width: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2563EB',
  },
  navModeRightTick: {
    position: 'absolute',
    right: 1,
    width: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2563EB',
  },
  navModeBottomTick: {
    position: 'absolute',
    bottom: 1,
    width: 4,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#2563EB',
  },
  navModeArrow: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#2563EB',
    transform: [{ rotate: '-45deg' }],
  },
  zoomControls: {
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
  searchWrapper: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    zIndex: 1000,
    alignItems: 'stretch',
  },
  routeInputsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeInputsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
  routeInputsCardMain: {
    flex: 1,
  },
  routeInputTrigger: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  routeInputDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  routeSwitchButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.18,
    shadowRadius: 2.5,
    elevation: 4,
  },
  routeSwitchButtonDisabled: {
    opacity: 0.6,
  },
  clearRouteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 2.5,
    elevation: 4,
  },
  clearRouteButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748B',
    lineHeight: 18,
  },
  routeSwitchButtonIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2563EB',
    lineHeight: 22,
  },
  transportModeContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 1000,
  },
  plannerPanel: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  transportModeCard: {
    flexDirection: 'row',
    backgroundColor: '#0B1220',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    padding: 4,
  },
  transportModeButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportModeButtonActive: {
    backgroundColor: '#2563EB',
  },
  transportModeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#CBD5E1',
  },
  transportModeButtonTextActive: {
    color: '#FFFFFF',
  },
  plannerBody: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  plannerSectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  plannerPrimaryValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  plannerMetaLine: {
    color: '#CBD5E1',
    fontSize: 12,
    marginTop: 4,
  },
  plannerEmptyText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  plannerStepList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 8,
  },
  destinationTrigger: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  destinationTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  destinationTriggerText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  destinationTriggerPlaceholder: {
    color: '#6B7280',
  },
  destinationOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 100,
  },
  destinationSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    maxHeight: '60%',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 8,
  },
  destinationInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  destinationSection: {
    marginTop: 12,
    minHeight: 80,
  },
  destinationSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 8,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#6B7280',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
    padding: 0,
  },
  searchLoader: {
    marginLeft: 8,
  },
  searchResultsList: {
    maxHeight: 260,
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
  emptyDestinationText: {
    color: '#6B7280',
    fontSize: 13,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  mapPointOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  mapPointSheet: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  mapPointTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  mapPointSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  mapPointActionButton: {
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  mapPointStartButton: {
    backgroundColor: '#16A34A',
  },
  mapPointEndButton: {
    backgroundColor: '#DC2626',
  },
  mapPointReportButton: {
    backgroundColor: '#2563EB',
  },
  mapPointCancelButton: {
    backgroundColor: '#1E293B',
    marginBottom: 0,
  },
  mapPointActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles (used for reporting unsafe locations)
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

const normalizeHeadingDegrees = (heading: number) => ((heading % 360) + 360) % 360;
const getHeadingDeltaDegrees = (from: number, to: number) => {
  const delta = Math.abs(normalizeHeadingDegrees(from) - normalizeHeadingDegrees(to));
  return Math.min(delta, 360 - delta);
};

const isSimulatorDefaultSanFrancisco = (latitude: number, longitude: number) =>
  Math.abs(latitude - 37.7749) < 0.01 && Math.abs(longitude - -122.4194) < 0.01;

const normalizeLocationForMap = (latitude: number, longitude: number): LocationData => {
  if (isSimulatorDefaultSanFrancisco(latitude, longitude)) {
    return DEFAULT_LOCATION;
  }
  return { latitude, longitude };
};

const extractHeadingDegrees = (heading: Location.LocationHeadingObject): number | null => {
  const { trueHeading } = heading;
  if (typeof trueHeading === 'number' && Number.isFinite(trueHeading) && trueHeading >= 0) {
    return normalizeHeadingDegrees(trueHeading);
  }

  const magneticHeading = heading.magHeading;
  if (
    typeof magneticHeading === 'number' &&
    Number.isFinite(magneticHeading) &&
    magneticHeading >= 0
  ) {
    return normalizeHeadingDegrees(magneticHeading);
  }

  return null;
};

const formatRouteApiErrorValue = (value: unknown): string | null => {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (!item || typeof item !== 'object') {
          return formatRouteApiErrorValue(item);
        }

        const record = item as Record<string, unknown>;
        const loc = Array.isArray(record.loc)
          ? record.loc.map((segment) => String(segment)).join('.')
          : null;
        const msg = formatRouteApiErrorValue(record.msg);
        const detail = formatRouteApiErrorValue(record.detail);
        const message = formatRouteApiErrorValue(record.message);
        const fallback = formatRouteApiErrorValue(record.errors);

        if (loc && (msg || detail || message)) {
          return `${loc}: ${msg || detail || message}`;
        }

        return msg || detail || message || fallback;
      })
      .filter((item): item is string => Boolean(item));

    return parts.length > 0 ? parts.join(' | ') : null;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return (
      formatRouteApiErrorValue(record.detail) ||
      formatRouteApiErrorValue(record.message) ||
      formatRouteApiErrorValue(record.errors) ||
      null
    );
  }

  return null;
};

const DUBLIN_BBOX = {
  minLongitude: -6.65,
  minLatitude: 53.12,
  maxLongitude: -5.9,
  maxLatitude: 53.55,
};

const isWithinDublin = (longitude: number, latitude: number) =>
  longitude >= DUBLIN_BBOX.minLongitude &&
  longitude <= DUBLIN_BBOX.maxLongitude &&
  latitude >= DUBLIN_BBOX.minLatitude &&
  latitude <= DUBLIN_BBOX.maxLatitude;

const OSM_PHOTON_SEARCH_URL = 'https://photon.komoot.io/api';
const OSM_NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const OSM_NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const OSM_MAX_RESULTS = 20;
const OSM_SEARCH_EXPAND_THRESHOLD = 12;
const OSM_DEFAULT_COUNTRY_CODE = 'ie';
const OSM_CONTACT_EMAIL = 'support@saferoute.app';
const SEARCH_DEBOUNCE_MS = 320;
const MIN_SEARCH_QUERY_LENGTH = 2;

const buildQueryString = (
  params: Record<string, string | number | boolean | null | undefined>
): string =>
  Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

const dedupeLabelParts = (parts: unknown[]): string[] => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  parts.forEach((part) => {
    if (typeof part !== 'string') {
      return;
    }
    const trimmed = part.trim();
    if (!trimmed) {
      return;
    }
    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    deduped.push(trimmed);
  });

  return deduped;
};

const scoreOpenStreetResult = (category: unknown, type: unknown): number => {
  const normalizedCategory = typeof category === 'string' ? category.toLowerCase() : '';
  const normalizedType = typeof type === 'string' ? type.toLowerCase() : '';

  if (
    [
      'amenity',
      'building',
      'tourism',
      'office',
      'shop',
      'leisure',
      'railway',
      'public_transport',
      'historic',
      'healthcare',
      'education',
    ].includes(normalizedCategory)
  ) {
    return 0;
  }

  if (
    ['university', 'college', 'school', 'hospital', 'library', 'museum'].includes(normalizedType)
  ) {
    return 0;
  }

  if (
    normalizedCategory === 'highway' ||
    ['street', 'road', 'residential', 'route', 'unclassified'].includes(normalizedType)
  ) {
    return 3;
  }

  if (['boundary', 'place', 'landuse'].includes(normalizedCategory)) {
    return 2;
  }

  return 1;
};

const getNominatimSearchLabel = (item: any): string => {
  const address = item?.address && typeof item.address === 'object' ? item.address : {};
  const primary =
    (typeof item?.name === 'string' && item.name) ||
    (typeof address?.amenity === 'string' && address.amenity) ||
    (typeof address?.building === 'string' && address.building) ||
    (typeof address?.office === 'string' && address.office) ||
    (typeof address?.tourism === 'string' && address.tourism) ||
    (typeof address?.railway === 'string' && address.railway) ||
    (typeof address?.road === 'string' && address.road) ||
    (typeof item?.display_name === 'string' ? item.display_name.split(',')[0] : '');

  const locality =
    (typeof address?.city === 'string' && address.city) ||
    (typeof address?.town === 'string' && address.town) ||
    (typeof address?.village === 'string' && address.village) ||
    (typeof address?.suburb === 'string' && address.suburb) ||
    (typeof address?.county === 'string' && address.county) ||
    '';

  const postcode = typeof address?.postcode === 'string' ? address.postcode : '';
  const country =
    (typeof address?.country === 'string' && address.country) ||
    (typeof item?.display_name === 'string' && item.display_name.includes('Ireland')
      ? 'Ireland'
      : '');

  const parts = dedupeLabelParts([primary, locality, postcode, country]);
  if (parts.length > 0) {
    return parts.join(', ');
  }
  return typeof item?.display_name === 'string' && item.display_name.trim().length > 0
    ? item.display_name
    : 'Unknown place';
};

const getPhotonSearchLabel = (feature: any): string => {
  const properties =
    feature?.properties && typeof feature.properties === 'object' ? feature.properties : {};
  const primary =
    (typeof properties?.name === 'string' && properties.name) ||
    (typeof properties?.street === 'string' && properties.street) ||
    (typeof properties?.city === 'string' && properties.city) ||
    '';
  const street = typeof properties?.street === 'string' ? properties.street : '';
  const locality =
    (typeof properties?.city === 'string' && properties.city) ||
    (typeof properties?.county === 'string' && properties.county) ||
    (typeof properties?.district === 'string' && properties.district) ||
    '';
  const postcode = typeof properties?.postcode === 'string' ? properties.postcode : '';
  const country = typeof properties?.country === 'string' ? properties.country : '';

  const parts = dedupeLabelParts([primary, street, locality, postcode, country]);
  if (parts.length > 0) {
    return parts.join(', ');
  }
  return 'Unknown place';
};

type RankedSearchResult = {
  rank: number;
  order: number;
  result: SearchResult;
};

const searchPlacesWithOpenStreet = async (query: string): Promise<SearchResult[]> => {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return [];
  }

  const viewbox = `${DUBLIN_BBOX.minLongitude},${DUBLIN_BBOX.maxLatitude},${DUBLIN_BBOX.maxLongitude},${DUBLIN_BBOX.minLatitude}`;
  const resultsById = new Map<string, RankedSearchResult>();
  let insertionOrder = 0;

  const addRankedResult = (candidate: SearchResult, rank: number) => {
    if (!candidate.id || !candidate.center || candidate.center.length < 2) {
      return;
    }
    if (!isWithinDublin(candidate.center[0], candidate.center[1])) {
      return;
    }

    const existing = resultsById.get(candidate.id);
    if (!existing || rank < existing.rank) {
      resultsById.set(candidate.id, {
        rank,
        order: insertionOrder,
        result: candidate,
      });
      insertionOrder += 1;
    }
  };

  try {
    const photonUrl = `${OSM_PHOTON_SEARCH_URL}?${buildQueryString({
      q: normalizedQuery,
      lat: DEFAULT_LOCATION.latitude,
      lon: DEFAULT_LOCATION.longitude,
      lang: 'en',
      limit: 12,
    })}`;
    const response = await fetch(photonUrl);
    if (response.ok) {
      const data = await response.json();
      const features = Array.isArray(data?.features) ? data.features : [];
      features.forEach((feature: any, index: number) => {
        const coordinates = feature?.geometry?.coordinates;
        if (!Array.isArray(coordinates) || coordinates.length < 2) {
          return;
        }
        const [longitude, latitude] = coordinates;
        if (
          typeof longitude !== 'number' ||
          !Number.isFinite(longitude) ||
          typeof latitude !== 'number' ||
          !Number.isFinite(latitude)
        ) {
          return;
        }

        const properties =
          feature?.properties && typeof feature.properties === 'object' ? feature.properties : {};
        const osmType =
          typeof properties?.osm_type === 'string' && properties.osm_type
            ? properties.osm_type
            : 'unknown';
        const osmId =
          (typeof properties?.osm_id === 'number' && String(properties.osm_id)) ||
          (typeof properties?.osm_id === 'string' && properties.osm_id) ||
          null;
        const fallbackId = `${longitude.toFixed(6)}-${latitude.toFixed(6)}-${index}`;
        const id = `osm-photon-${osmType}-${osmId || fallbackId}`;
        const label = getPhotonSearchLabel(feature);
        const rank = scoreOpenStreetResult(properties?.osm_key, properties?.type);

        addRankedResult(
          {
            id,
            place_name: label,
            center: [longitude, latitude],
            provider: 'osm',
            place_id: osmId ? `${osmType}:${osmId}` : undefined,
          },
          rank
        );
      });
    }
  } catch {
    // Ignore photon failures; Nominatim fallback below.
  }

  if (resultsById.size < OSM_SEARCH_EXPAND_THRESHOLD) {
    const lowercaseQuery = normalizedQuery.toLowerCase();
    const nominatimQueries = lowercaseQuery.includes('dublin')
      ? [normalizedQuery]
      : [normalizedQuery, `${normalizedQuery} Dublin`];

    const nominatimResponses = await Promise.all(
      nominatimQueries.map(async (textQuery) => {
        const url = `${OSM_NOMINATIM_SEARCH_URL}?${buildQueryString({
          q: textQuery,
          format: 'jsonv2',
          addressdetails: 1,
          limit: 12,
          countrycodes: OSM_DEFAULT_COUNTRY_CODE,
          bounded: 1,
          viewbox,
          'accept-language': 'en',
          email: OSM_CONTACT_EMAIL,
        })}`;

        try {
          const response = await fetch(url);
          if (!response.ok) {
            return [] as any[];
          }
          const data = await response.json();
          return Array.isArray(data) ? data : [];
        } catch {
          return [] as any[];
        }
      })
    );

    nominatimResponses.forEach((items) => {
      items.forEach((item: any, index: number) => {
        const longitude = Number.parseFloat(String(item?.lon));
        const latitude = Number.parseFloat(String(item?.lat));
        if (
          !Number.isFinite(longitude) ||
          !Number.isFinite(latitude) ||
          !isWithinDublin(longitude, latitude)
        ) {
          return;
        }

        const placeId =
          (typeof item?.place_id === 'number' && String(item.place_id)) ||
          (typeof item?.place_id === 'string' && item.place_id) ||
          null;
        const id = `osm-nominatim-${placeId || `${longitude.toFixed(6)}-${latitude.toFixed(6)}-${index}`}`;
        const label = getNominatimSearchLabel(item);
        const rank = scoreOpenStreetResult(item?.category, item?.type);
        addRankedResult(
          {
            id,
            place_name: label,
            center: [longitude, latitude],
            provider: 'osm',
            place_id: placeId || undefined,
          },
          rank
        );
      });
    });
  }

  const normalizedQueryLower = normalizedQuery.toLowerCase();
  return Array.from(resultsById.values())
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      const aMatchesQuery = a.result.place_name.toLowerCase().includes(normalizedQueryLower)
        ? 0
        : 1;
      const bMatchesQuery = b.result.place_name.toLowerCase().includes(normalizedQueryLower)
        ? 0
        : 1;
      if (aMatchesQuery !== bMatchesQuery) {
        return aMatchesQuery - bMatchesQuery;
      }
      return a.order - b.order;
    })
    .slice(0, OSM_MAX_RESULTS)
    .map((item) => item.result);
};

const resolveSearchResultCoordinates = async (
  result: SearchResult
): Promise<[number, number] | null> => {
  if (
    Array.isArray(result.center) &&
    result.center.length >= 2 &&
    typeof result.center[0] === 'number' &&
    typeof result.center[1] === 'number'
  ) {
    return [result.center[0], result.center[1]];
  }

  return null;
};

const formatCoordinateLabel = (coordinate: [number, number]): string =>
  `${coordinate[1].toFixed(5)}, ${coordinate[0].toFixed(5)}`;

const CenterLocationIcon = ({ color = '#2563EB' }: { color?: string }) => (
  <View style={styles.centerLocationIcon}>
    <View style={[styles.centerLocationRing, { borderColor: color }]} />
    <View style={[styles.centerLocationArrow, { borderBottomColor: color }]} />
  </View>
);

const NavigationModeIcon = ({ color = '#2563EB' }: { color?: string }) => (
  <View style={styles.navModeIcon}>
    <View style={[styles.navModeOuterRing, { borderColor: color }]} />
    <View style={[styles.navModeTopTick, { backgroundColor: color }]} />
    <View style={[styles.navModeLeftTick, { backgroundColor: color }]} />
    <View style={[styles.navModeRightTick, { backgroundColor: color }]} />
    <View style={[styles.navModeBottomTick, { backgroundColor: color }]} />
    <View style={[styles.navModeArrow, { borderColor: color }]} />
  </View>
);

const fetchOpenStreetPlaceNameForCoordinate = async (
  coordinate: [number, number]
): Promise<string | null> => {
  const [longitude, latitude] = coordinate;
  const url = `${OSM_NOMINATIM_REVERSE_URL}?${buildQueryString({
    format: 'jsonv2',
    lat: latitude,
    lon: longitude,
    zoom: 18,
    addressdetails: 1,
    'accept-language': 'en',
    email: OSM_CONTACT_EMAIL,
  })}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const address = data?.address && typeof data.address === 'object' ? data.address : {};

    const primary =
      (typeof data?.name === 'string' && data.name) ||
      (typeof address?.amenity === 'string' && address.amenity) ||
      (typeof address?.building === 'string' && address.building) ||
      (typeof address?.office === 'string' && address.office) ||
      (typeof address?.tourism === 'string' && address.tourism) ||
      (typeof address?.railway === 'string' && address.railway) ||
      (typeof address?.road === 'string' && address.road) ||
      '';

    const locality =
      (typeof address?.city === 'string' && address.city) ||
      (typeof address?.town === 'string' && address.town) ||
      (typeof address?.village === 'string' && address.village) ||
      (typeof address?.suburb === 'string' && address.suburb) ||
      (typeof address?.county === 'string' && address.county) ||
      '';

    const postcode = typeof address?.postcode === 'string' ? address.postcode : '';
    const country = typeof address?.country === 'string' ? address.country : '';

    const parts = dedupeLabelParts([primary, locality, postcode, country]);
    if (parts.length > 0) {
      return parts.join(', ');
    }

    if (typeof data?.display_name === 'string' && data.display_name.trim().length > 0) {
      return data.display_name;
    }
  } catch {
    return null;
  }

  return null;
};

const extractCoordinateFromMapPressEvent = (event: any): [number, number] | null => {
  const isCoordinatePair = (value: unknown): value is [number, number] =>
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1]);

  const directCoordinate = event?.geometry?.coordinates;
  if (isCoordinatePair(directCoordinate)) {
    return [directCoordinate[0], directCoordinate[1]];
  }

  const featureCoordinate = event?.features?.[0]?.geometry?.coordinates;
  if (isCoordinatePair(featureCoordinate)) {
    return [featureCoordinate[0], featureCoordinate[1]];
  }

  const propertyCoordinate = event?.properties?.coordinate;
  if (isCoordinatePair(propertyCoordinate)) {
    return [propertyCoordinate[0], propertyCoordinate[1]];
  }

  return null;
};

const isMapGestureActive = (event: any): boolean => {
  if (typeof event?.gestures?.isGestureActive === 'boolean') {
    return event.gestures.isGestureActive;
  }
  if (typeof event?.properties?.gestures?.isGestureActive === 'boolean') {
    return event.properties.gestures.isGestureActive;
  }
  return false;
};

const toLngLatCoordinate = (value: unknown): [number, number] | null => {
  if (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    Number.isFinite(value[0]) &&
    typeof value[1] === 'number' &&
    Number.isFinite(value[1])
  ) {
    return [value[0], value[1]];
  }

  if (value && typeof value === 'object') {
    const maybe = value as Record<string, unknown>;
    if (
      typeof maybe.longitude === 'number' &&
      Number.isFinite(maybe.longitude) &&
      typeof maybe.latitude === 'number' &&
      Number.isFinite(maybe.latitude)
    ) {
      return [maybe.longitude, maybe.latitude];
    }
    if (
      typeof maybe.lng === 'number' &&
      Number.isFinite(maybe.lng) &&
      typeof maybe.lat === 'number' &&
      Number.isFinite(maybe.lat)
    ) {
      return [maybe.lng, maybe.lat];
    }
  }

  return null;
};

const extractCenterFromCameraEvent = (event: any): [number, number] | null =>
  toLngLatCoordinate(event?.properties?.center) ??
  toLngLatCoordinate(event?.properties?.centerCoordinate) ??
  toLngLatCoordinate(event?.centerCoordinate) ??
  null;

const extractZoomFromCameraEvent = (event: any): number | null => {
  const zoomCandidates = [
    event?.properties?.zoom,
    event?.properties?.zoomLevel,
    event?.zoom,
    event?.zoomLevel,
  ];
  const firstValidZoom = zoomCandidates.find(
    (candidate) => typeof candidate === 'number' && Number.isFinite(candidate)
  );
  return typeof firstValidZoom === 'number' ? firstValidZoom : null;
};

type MapboxRouteResult = {
  coordinates: [number, number][];
  durationSeconds: number;
  distanceMeters: number;
};

type NormalizedRoutingResult = {
  coordinates: [number, number][];
  distanceMeters: number | null;
  durationSeconds: number | null;
  routeId: string;
  safetyScore: number | null;
};

const fetchMapboxDirectionsRoute = async (
  start: [number, number],
  end: [number, number]
): Promise<MapboxRouteResult | null> => {
  if (!MAPBOX_ACCESS_TOKEN) {
    return null;
  }

  const [startLng, startLat] = start;
  const [endLng, endLat] = end;
  const directionsUrl =
    `https://api.mapbox.com/directions/v5/mapbox/walking/` +
    `${startLng},${startLat};${endLng},${endLat}` +
    `?alternatives=false&geometries=geojson&overview=full&steps=false&access_token=${MAPBOX_ACCESS_TOKEN}`;

  try {
    const response = await fetch(directionsUrl);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const primaryRoute = data?.routes?.[0];
    const coordinates = primaryRoute?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) {
      return null;
    }
    const durationSeconds =
      typeof primaryRoute?.duration === 'number' && Number.isFinite(primaryRoute.duration)
        ? primaryRoute.duration
        : 0;
    const distanceMeters =
      typeof primaryRoute?.distance === 'number' && Number.isFinite(primaryRoute.distance)
        ? primaryRoute.distance
        : 0;
    return {
      coordinates: coordinates as [number, number][],
      durationSeconds,
      distanceMeters,
    };
  } catch {
    return null;
  }
};

const createRouteFeatureCollection = (
  coordinates: [number, number][],
  properties: Record<string, unknown>
) => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        feature_id: 'feature-0',
        ...properties,
      },
      geometry: {
        type: 'LineString',
        coordinates,
      },
    },
  ],
});

const isValidCoordinatePair = (value: unknown): value is [number, number] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === 'number' &&
  Number.isFinite(value[0]) &&
  typeof value[1] === 'number' &&
  Number.isFinite(value[1]);

const areCoordinatesNearlyEqual = (
  a: [number, number],
  b: [number, number],
  epsilon = 1e-6
): boolean => Math.abs(a[0] - b[0]) <= epsilon && Math.abs(a[1] - b[1]) <= epsilon;

const coordDistanceMeters = (a: [number, number], b: [number, number]): number => {
  const [lon1, lat1] = a;
  const [lon2, lat2] = b;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const lat1Rad = toRadians(lat1);
  const lat2Rad = toRadians(lat2);
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * 6371000 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
};

const sanitizeRouteCoordinates = (inputCoordinates: [number, number][]): [number, number][] => {
  if (inputCoordinates.length < 2) {
    return inputCoordinates;
  }

  const deduped: [number, number][] = [];
  inputCoordinates.forEach((coord) => {
    if (deduped.length === 0 || coordDistanceMeters(deduped[deduped.length - 1], coord) > 0.3) {
      deduped.push(coord);
    }
  });

  if (deduped.length < 3) {
    return deduped;
  }

  const loopPruned = [...deduped];
  let changed = true;
  while (changed && loopPruned.length >= 4) {
    changed = false;
    for (let i = 0; i < loopPruned.length - 3; i += 1) {
      let removed = false;
      const maxJ = Math.min(loopPruned.length - 1, i + 10);
      for (let j = maxJ; j >= i + 2; j -= 1) {
        const closureDistance = coordDistanceMeters(loopPruned[i], loopPruned[j]);
        if (closureDistance <= 6) {
          let loopDistance = 0;
          for (let k = i; k < j; k += 1) {
            loopDistance += coordDistanceMeters(loopPruned[k], loopPruned[k + 1]);
          }
          if (loopDistance <= 120 && loopDistance > closureDistance + 1) {
            loopPruned.splice(i + 1, j - i - 1);
            changed = true;
            removed = true;
            break;
          }
        }
      }
      if (removed) {
        break;
      }
    }
  }

  const spikePruned: [number, number][] = [];
  loopPruned.forEach((coord) => {
    spikePruned.push(coord);
    while (
      spikePruned.length >= 3 &&
      coordDistanceMeters(
        spikePruned[spikePruned.length - 1],
        spikePruned[spikePruned.length - 3]
      ) <= 1
    ) {
      spikePruned.splice(spikePruned.length - 2, 2);
    }
  });

  if (spikePruned.length < 3) {
    return spikePruned;
  }

  const revisitThresholdMeters = 8;
  const revisitCollapsed = [...spikePruned];
  let changedByRevisit = true;
  while (changedByRevisit && revisitCollapsed.length >= 3) {
    changedByRevisit = false;
    let i = 2;
    while (i < revisitCollapsed.length) {
      let revisitIndex = -1;
      for (let j = 0; j < i - 1; j += 1) {
        if (
          coordDistanceMeters(revisitCollapsed[j], revisitCollapsed[i]) <= revisitThresholdMeters
        ) {
          revisitIndex = j;
          break;
        }
      }

      if (revisitIndex >= 0 && i - revisitIndex > 1) {
        revisitCollapsed.splice(revisitIndex + 1, i - revisitIndex - 1);
        changedByRevisit = true;
        i = Math.max(2, revisitIndex + 1);
      } else {
        i += 1;
      }
    }
  }

  return revisitCollapsed;
};

function extractCoordinatesFromRouteGeometry(geometryPayload: unknown): [number, number][] {
  let parsed: any = geometryPayload;

  if (typeof geometryPayload === 'string') {
    try {
      parsed = JSON.parse(geometryPayload);
    } catch {
      return [];
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return [];
  }

  if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
    const coordinates: [number, number][] = [];
    parsed.features.forEach((feature: any) => {
      const featureType =
        typeof feature?.properties?.type === 'string' ? feature.properties.type.toLowerCase() : '';
      if (featureType === 'connector') {
        return;
      }

      const featureCoordinates = extractCoordinatesFromRouteGeometry(feature);
      if (featureCoordinates.length === 0) {
        return;
      }
      if (
        coordinates.length > 0 &&
        areCoordinatesNearlyEqual(coordinates[coordinates.length - 1], featureCoordinates[0])
      ) {
        coordinates.push(...featureCoordinates.slice(1));
        return;
      }
      coordinates.push(...featureCoordinates);
    });
    return coordinates;
  }

  if (parsed.type === 'Feature') {
    const featureType =
      typeof parsed?.properties?.type === 'string' ? parsed.properties.type.toLowerCase() : '';
    if (featureType === 'connector') {
      return [];
    }
    return extractCoordinatesFromRouteGeometry(parsed.geometry);
  }

  if (parsed.type === 'LineString' && Array.isArray(parsed.coordinates)) {
    return sanitizeRouteCoordinates(
      parsed.coordinates
        .filter(isValidCoordinatePair)
        .map((coordinate: [number, number]) => [coordinate[0], coordinate[1]])
    );
  }

  if (parsed.type === 'MultiLineString' && Array.isArray(parsed.coordinates)) {
    return sanitizeRouteCoordinates(
      parsed.coordinates.flatMap((lineCoordinates: unknown) =>
        Array.isArray(lineCoordinates)
          ? lineCoordinates
              .filter(isValidCoordinatePair)
              .map((coordinate: [number, number]) => [coordinate[0], coordinate[1]])
          : []
      )
    );
  }

  return [];
}

const getTransitLegCoordinates = (leg: TransitLeg): [number, number][] => {
  if (!Array.isArray(leg.coordinates)) {
    return [];
  }

  return sanitizeRouteCoordinates(
    leg.coordinates.filter(isValidCoordinatePair).map((coord) => [coord[0], coord[1]])
  );
};

const getTransitTransportMode = (leg: TransitLeg): string => {
  if (leg.mode === 'walk') {
    return 'walking';
  }

  const vehicleType = (leg.vehicle_type || '').toUpperCase();
  if (vehicleType === 'BUS') {
    return 'transit_bus';
  }
  if (vehicleType === 'TRAM' || vehicleType === 'LIGHT_RAIL') {
    return 'transit_tram';
  }
  return 'public_transit';
};

const createTransitFeatureCollectionFromItinerary = (itinerary: TransitItinerary) => {
  const features = itinerary.legs
    .map((leg, legIndex) => {
      const coordinates = getTransitLegCoordinates(leg);
      if (coordinates.length < 2) {
        return null;
      }

      return {
        type: 'Feature',
        properties: {
          feature_id: `feature-${legIndex}`,
          mode: leg.mode,
          transport_mode: getTransitTransportMode(leg),
          leg_index: legIndex,
          route_id: leg.route_id || null,
          vehicle_type: leg.vehicle_type || null,
          from_stop_id: leg.from_stop_id || null,
          to_stop_id: leg.to_stop_id || null,
          duration_s: leg.duration_s,
          distance_m: leg.distance_m ?? null,
        },
        geometry: {
          type: 'LineString',
          coordinates,
        },
      };
    })
    .filter((feature): feature is NonNullable<typeof feature> => feature !== null);

  if (features.length === 0) {
    return null;
  }

  return {
    type: 'FeatureCollection',
    features,
  };
};

const ROUTE_LINE_COLORS = {
  walking: '#22C55E',
  transitBus: '#F59E0B',
  transitTram: '#06B6D4',
  transitDefault: '#3B82F6',
  fallback: '#2563EB',
};

const withTransportModeInRouteData = (featureCollection: any, fallbackMode: TransportMode) => {
  if (
    !featureCollection ||
    featureCollection.type !== 'FeatureCollection' ||
    !Array.isArray(featureCollection.features)
  ) {
    return featureCollection;
  }

  const features = featureCollection.features.map((feature: any, featureIndex: number) => {
    const existingProperties =
      feature?.properties && typeof feature.properties === 'object' ? feature.properties : {};
    let existingMode: string = fallbackMode;
    if (typeof existingProperties.transport_mode === 'string') {
      existingMode = existingProperties.transport_mode;
    } else if (typeof existingProperties.mode === 'string') {
      existingMode = existingProperties.mode;
    }
    const featureId =
      typeof existingProperties.feature_id === 'string'
        ? existingProperties.feature_id
        : `feature-${featureIndex}`;

    return {
      ...feature,
      properties: {
        ...existingProperties,
        feature_id: featureId,
        transport_mode: existingMode,
      },
    };
  });

  return {
    ...featureCollection,
    features,
  };
};

const ROUTE_LINE_COLOR_EXPRESSION: unknown[] = [
  'match',
  ['coalesce', ['get', 'transport_mode'], ['get', 'mode'], 'walking'],
  'walking',
  ROUTE_LINE_COLORS.walking,
  'walk',
  ROUTE_LINE_COLORS.walking,
  'transit_bus',
  ROUTE_LINE_COLORS.transitBus,
  'transit_tram',
  ROUTE_LINE_COLORS.transitTram,
  'public_transit',
  ROUTE_LINE_COLORS.transitDefault,
  'transit',
  ROUTE_LINE_COLORS.transitDefault,
  'transit_preview',
  ROUTE_LINE_COLORS.transitDefault,
  ROUTE_LINE_COLORS.fallback,
];

const EARTH_RADIUS_METERS = 6371000;
const AVERAGE_WALKING_SPEED_METERS_PER_SECOND = 1.39;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
const toDegrees = (radians: number) => (radians * 180) / Math.PI;

const getBearingDegrees = (from: [number, number], to: [number, number]): number => {
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const fromLatRad = toRadians(fromLat);
  const toLatRad = toRadians(toLat);
  const deltaLngRad = toRadians(toLng - fromLng);

  const y = Math.sin(deltaLngRad) * Math.cos(toLatRad);
  const x =
    Math.cos(fromLatRad) * Math.sin(toLatRad) -
    Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(deltaLngRad);

  return normalizeHeadingDegrees(toDegrees(Math.atan2(y, x)));
};

const getSegmentDistanceMeters = (from: [number, number], to: [number, number]): number => {
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const fromLatRad = toRadians(fromLat);
  const toLatRad = toRadians(toLat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(fromLatRad) * Math.cos(toLatRad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

const projectCoordinateByMeters = (
  origin: [number, number],
  distanceMeters: number,
  bearingDegrees: number
): [number, number] => {
  const [lng, lat] = origin;
  const angularDistance = distanceMeters / EARTH_RADIUS_METERS;
  const bearingRad = toRadians(bearingDegrees);
  const latRad = toRadians(lat);
  const lngRad = toRadians(lng);

  const projectedLatRad = Math.asin(
    Math.sin(latRad) * Math.cos(angularDistance) +
      Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );
  const projectedLngRad =
    lngRad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad),
      Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(projectedLatRad)
    );

  return [toDegrees(projectedLngRad), toDegrees(projectedLatRad)];
};

const buildUserLocationFeatureCollection = (
  coordinate: [number, number],
  headingDegrees: number
) => {
  const heading = normalizeHeadingDegrees(headingDegrees);
  const tip = projectCoordinateByMeters(coordinate, 22, heading);
  const neck = projectCoordinateByMeters(coordinate, 10, heading);
  const baseLeft = projectCoordinateByMeters(coordinate, 7.5, heading + 155);
  const baseRight = projectCoordinateByMeters(coordinate, 7.5, heading - 155);

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: coordinate,
        },
        properties: {
          kind: 'user-dot',
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [[tip, baseLeft, neck, baseRight, tip]],
        },
        properties: {
          kind: 'user-heading',
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: [coordinate, tip],
        },
        properties: {
          kind: 'user-heading-line',
        },
      },
    ],
  };
};

const getLineStringDistanceMeters = (coordinates: unknown): number => {
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return 0;
  }

  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i += 1) {
    const previous = coordinates[i - 1];
    const current = coordinates[i];
    if (
      Array.isArray(previous) &&
      Array.isArray(current) &&
      previous.length >= 2 &&
      current.length >= 2 &&
      typeof previous[0] === 'number' &&
      typeof previous[1] === 'number' &&
      typeof current[0] === 'number' &&
      typeof current[1] === 'number'
    ) {
      totalDistance += getSegmentDistanceMeters(
        [previous[0], previous[1]],
        [current[0], current[1]]
      );
    }
  }

  return totalDistance;
};

const getRouteDistanceMeters = (featureCollection: any): number | null => {
  const features = Array.isArray(featureCollection?.features) ? featureCollection.features : [];
  const totalGeometryDistance = features.reduce((featureAcc: number, feature: any) => {
    const geometry = feature?.geometry;
    if (!geometry) {
      return featureAcc;
    }

    if (geometry.type === 'LineString') {
      return featureAcc + getLineStringDistanceMeters(geometry.coordinates);
    }

    if (geometry.type === 'MultiLineString' && Array.isArray(geometry.coordinates)) {
      const multiLineDistance = geometry.coordinates.reduce(
        (lineAcc: number, lineCoordinates: unknown) =>
          lineAcc + getLineStringDistanceMeters(lineCoordinates),
        0
      );
      return featureAcc + multiLineDistance;
    }

    return featureAcc;
  }, 0);

  if (totalGeometryDistance > 0) {
    return totalGeometryDistance;
  }

  const summaryDistanceMeters = featureCollection?.properties?.summary?.distance_meters;
  if (
    typeof summaryDistanceMeters === 'number' &&
    Number.isFinite(summaryDistanceMeters) &&
    summaryDistanceMeters > 0
  ) {
    return summaryDistanceMeters;
  }

  const firstFeature = features[0];
  const featureDistanceMeters = firstFeature?.properties?.distance_m;
  if (
    typeof featureDistanceMeters === 'number' &&
    Number.isFinite(featureDistanceMeters) &&
    featureDistanceMeters > 0
  ) {
    return featureDistanceMeters;
  }

  return null;
};

const getRouteDurationSeconds = (featureCollection: any): number | null => {
  const distanceMeters = getRouteDistanceMeters(featureCollection);
  if (distanceMeters && distanceMeters > 0) {
    return distanceMeters / AVERAGE_WALKING_SPEED_METERS_PER_SECOND;
  }

  const feature = featureCollection?.features?.[0];
  if (!feature) {
    return null;
  }

  const fallbackDurationSeconds = feature?.properties?.duration_s ?? feature?.properties?.duration;
  if (
    typeof fallbackDurationSeconds === 'number' &&
    Number.isFinite(fallbackDurationSeconds) &&
    fallbackDurationSeconds > 0
  ) {
    return fallbackDurationSeconds;
  }

  return null;
};

const formatWalkingDuration = (durationSeconds: number | null): string | null => {
  if (!durationSeconds || durationSeconds <= 0) {
    return null;
  }

  const totalMinutes = Math.max(1, Math.round(durationSeconds / 60));
  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) {
    return `${hours} h`;
  }

  return `${hours} h ${minutes} min`;
};

const formatDistance = (distanceMeters: number | null): string | null => {
  if (!distanceMeters || distanceMeters <= 0) {
    return null;
  }
  if (distanceMeters >= 1000) {
    const kilometers = distanceMeters / 1000;
    return `${kilometers.toFixed(kilometers >= 10 ? 0 : 1)} km`;
  }
  return `${Math.round(distanceMeters)} m`;
};

const normalizeDistance = (distanceMeters: number | null | undefined): number | null => {
  if (
    typeof distanceMeters !== 'number' ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters <= 0
  ) {
    return null;
  }
  return distanceMeters;
};

const buildTransitJourneySteps = (itinerary: TransitItinerary | null): TransitJourneyStep[] => {
  if (!itinerary?.legs?.length) {
    return [];
  }

  const steps: TransitJourneyStep[] = [];

  itinerary.legs.forEach((leg) => {
    const distance = normalizeDistance(leg.distance_m);
    const lastStep = steps[steps.length - 1];

    if (lastStep && lastStep.mode === 'walk' && leg.mode === 'walk') {
      lastStep.duration_s += leg.duration_s;
      if (distance !== null) {
        lastStep.distance_m = (lastStep.distance_m ?? 0) + distance;
      }
      return;
    }

    const stepId = `${leg.mode}-${leg.route_id ?? 'walk'}-${leg.from_stop_id ?? 'na'}-${
      leg.to_stop_id ?? 'na'
    }-${steps.length + 1}`;

    steps.push({
      id: stepId,
      mode: leg.mode,
      route_id: leg.route_id ?? null,
      from_stop_id: leg.from_stop_id ?? null,
      to_stop_id: leg.to_stop_id ?? null,
      duration_s: leg.duration_s,
      distance_m: distance,
    });
  });

  return steps;
};

const getTransitStepTitle = (step: TransitJourneyStep, index: number): string => {
  const fallbackMinutes = `${Math.max(1, Math.round(step.duration_s / 60))} min`;
  const durationLabel = formatWalkingDuration(step.duration_s) || fallbackMinutes;
  if (step.mode === 'walk') {
    return `Step ${index + 1}: Walk (${durationLabel})`;
  }
  return `Step ${index + 1}: Take ${step.route_id || 'Transit'} (${durationLabel})`;
};

const getTransitStepDetail = (step: TransitJourneyStep): string => {
  const distanceLabel = formatDistance(step.distance_m);
  if (step.mode === 'walk') {
    return distanceLabel ? `Distance: ${distanceLabel}` : 'Walking segment';
  }
  const fromStop = step.from_stop_id || 'Board stop';
  const toStop = step.to_stop_id || 'Alight stop';
  return distanceLabel ? `${fromStop} -> ${toStop} · ${distanceLabel}` : `${fromStop} -> ${toStop}`;
};

function getNumberFromProperty(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function getStringFromProperty(value: unknown): string | null {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }
  return null;
}

const normalizeRoutingResponse = (data: any): NormalizedRoutingResult | null => {
  if (!data || typeof data !== 'object') {
    return null;
  }

  if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) {
    const coordinates = extractCoordinatesFromRouteGeometry(data);
    if (coordinates.length < 2) {
      return null;
    }

    return {
      coordinates,
      distanceMeters:
        getNumberFromProperty(data?.properties?.summary?.distance_meters) ??
        getNumberFromProperty(data?.summary?.distance_meters),
      durationSeconds:
        getNumberFromProperty(data?.properties?.summary?.duration_seconds) ??
        getNumberFromProperty(data?.summary?.duration_seconds),
      routeId: getStringFromProperty(data?.route_id) || '',
      safetyScore: getNumberFromProperty(data?.safety_score),
    };
  }

  const primaryRoute =
    Array.isArray(data?.routes) && data.routes.length > 0
      ? data.routes.find((route: any) => route.is_primary) || data.routes[0]
      : data;

  const coordinates = extractCoordinatesFromRouteGeometry(
    primaryRoute?.geometry ?? primaryRoute?.route_geometry ?? primaryRoute?.path ?? data?.geometry
  );

  if (coordinates.length < 2) {
    const waypoints = Array.isArray(primaryRoute?.waypoints) ? primaryRoute.waypoints : [];
    const waypointCoordinates = waypoints
      .filter((wp: any) => typeof wp?.lon === 'number' && typeof wp?.lat === 'number')
      .map((wp: any) => [wp.lon, wp.lat] as [number, number]);

    if (waypointCoordinates.length < 2) {
      return null;
    }

    return {
      coordinates: waypointCoordinates,
      distanceMeters:
        getNumberFromProperty(primaryRoute?.distance_m) ??
        getNumberFromProperty(primaryRoute?.distance) ??
        getNumberFromProperty(data?.distance_m) ??
        getNumberFromProperty(data?.distance),
      durationSeconds:
        getNumberFromProperty(primaryRoute?.duration_s) ??
        getNumberFromProperty(primaryRoute?.duration) ??
        getNumberFromProperty(data?.duration_s) ??
        getNumberFromProperty(data?.duration),
      routeId:
        getStringFromProperty(primaryRoute?.route_id) ||
        getStringFromProperty(data?.route_id) ||
        '',
      safetyScore:
        getNumberFromProperty(primaryRoute?.safety_score) ??
        getNumberFromProperty(data?.safety_score),
    };
  }

  return {
    coordinates,
    distanceMeters:
      getNumberFromProperty(primaryRoute?.distance_m) ??
      getNumberFromProperty(primaryRoute?.distance) ??
      getNumberFromProperty(data?.distance_m) ??
      getNumberFromProperty(data?.distance),
    durationSeconds:
      getNumberFromProperty(primaryRoute?.duration_s) ??
      getNumberFromProperty(primaryRoute?.duration) ??
      getNumberFromProperty(data?.duration_s) ??
      getNumberFromProperty(data?.duration),
    routeId:
      getStringFromProperty(primaryRoute?.route_id) || getStringFromProperty(data?.route_id) || '',
    safetyScore:
      getNumberFromProperty(primaryRoute?.safety_score) ??
      getNumberFromProperty(data?.safety_score),
  };
};

const buildSelectedRouteSegment = (properties: Record<string, unknown>): SelectedRouteSegment => {
  const featureId = getStringFromProperty(properties.feature_id) || 'feature-0';
  const transportMode = getStringFromProperty(properties.transport_mode) || 'walking';
  const lineName = getStringFromProperty(properties.route_id);
  const vehicleType = getStringFromProperty(properties.vehicle_type);
  const fromStop = getStringFromProperty(properties.from_stop_id);
  const toStop = getStringFromProperty(properties.to_stop_id);
  const durationLabel = formatWalkingDuration(getNumberFromProperty(properties.duration_s));
  const distanceLabel = formatDistance(getNumberFromProperty(properties.distance_m));

  if (transportMode === 'transit_bus') {
    return {
      featureId,
      title: lineName ? `Bus ${lineName}` : 'Bus Segment',
      detail: fromStop && toStop ? `${fromStop} -> ${toStop}` : 'Bus transit segment',
      durationLabel,
      distanceLabel,
    };
  }

  if (transportMode === 'transit_tram') {
    return {
      featureId,
      title: lineName ? `Tram ${lineName}` : 'Tram Segment',
      detail: fromStop && toStop ? `${fromStop} -> ${toStop}` : 'Tram transit segment',
      durationLabel,
      distanceLabel,
    };
  }

  if (transportMode === 'public_transit' || transportMode === 'transit') {
    let title = 'Transit Segment';
    if (vehicleType && lineName) {
      title = `${vehicleType} ${lineName}`;
    } else if (lineName) {
      title = `Transit ${lineName}`;
    }
    return {
      featureId,
      title,
      detail: fromStop && toStop ? `${fromStop} -> ${toStop}` : 'Public transit segment',
      durationLabel,
      distanceLabel,
    };
  }

  return {
    featureId,
    title: 'Walking Segment',
    detail: 'Walk this part of the route',
    durationLabel,
    distanceLabel,
  };
};

const Index = () => {
  const router = useRouter();
  const [location, setLocation] = useState<LocationData | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(true);
  const [locationRetry, setLocationRetry] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [isNavigationMode, setIsNavigationMode] = useState(false);
  const [longPressProgress, setLongPressProgress] = useState(0);
  const longPressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const longPressStartTimeRef = useRef<number | null>(null);
  const [startQuery, setStartQuery] = useState('');
  const [destQuery, setDestQuery] = useState('');
  const [isDestinationOverlayVisible, setIsDestinationOverlayVisible] = useState(false);
  const [activeSearchField, setActiveSearchField] = useState<'start' | 'destination'>(
    'destination'
  );
  const [recentDestinations, setRecentDestinations] = useState<SearchResult[]>([]);
  const [recentDestinationsLoaded, setRecentDestinationsLoaded] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestIdRef = useRef(0);
  const destInputRef = useRef<TextInput>(null);
  const [selectedTransportMode, setSelectedTransportMode] = useState<TransportMode>('walking');
  const [routeData, setRouteData] = useState<any>(null);
  const [walkingRouteDistanceMeters, setWalkingRouteDistanceMeters] = useState<number | null>(null);
  const [walkingRouteDurationSeconds, setWalkingRouteDurationSeconds] = useState<number | null>(
    null
  );
  const [selectedRouteSegment, setSelectedRouteSegment] = useState<SelectedRouteSegment | null>(
    null
  );
  const [transitItinerary, setTransitItinerary] = useState<TransitItinerary | null>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeStart, setRouteStart] = useState<[number, number] | null>(null);
  const [routeEnd, setRouteEnd] = useState<[number, number] | null>(null);
  const [mapSelectionCoordinate, setMapSelectionCoordinate] = useState<[number, number] | null>(
    null
  );
  const [mapSelectionLabel, setMapSelectionLabel] = useState('');
  const [isMapPointModalVisible, setIsMapPointModalVisible] = useState(false);
  const cameraRef = useRef<Camera>(null);
  const centerCoordinateRef = useRef<[number, number] | null>(null);
  const mapSelectionLookupRef = useRef(0);
  const routeFeaturePressTimestampRef = useRef(0);
  const mapLongPressTimestampRef = useRef(0);
  const isMapDraggingRef = useRef(false);
  const lastMapDragFinishedAtRef = useRef(0);
  const zoomLevelRef = useRef(15);
  const isNavigationModeRef = useRef(false);
  const navigationHeadingRef = useRef<number | null>(null);
  const navigationCoordinateRef = useRef<[number, number] | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportText, setReportText] = useState('');
  const [reportLocation, setReportLocation] = useState<LocationData | null>(null);
  const [feedbackType, setFeedbackType] = useState<
    'safety_issue' | 'route_quality' | 'other' | null
  >(null);
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical' | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [isHighRiskArea, setIsHighRiskArea] = useState(false);
  const [isCheckingHighRisk, setIsCheckingHighRisk] = useState(false);
  const [highRiskStatusText, setHighRiskStatusText] = useState('Waiting for your location...');
  const activeDangerZoneIdsRef = useRef<string[]>([]);
  const isInsideHighRiskAreaRef = useRef(false);
  const highRiskRequestIdRef = useRef(0);
  const { user } = useAuth0();

  const MIN_ZOOM = 3;
  const MAX_ZOOM = 20;
  const ZOOM_STEP = 1;
  const ZOOM_BUTTON_ANIMATION_DURATION_MS = 120;
  const SEARCH_RESULT_PREVIEW_ZOOM = 12;
  const SEARCH_RESULT_MIN_ZOOM_OUT_DELTA = 1;
  const SEARCH_RESULT_FLYTO_DURATION_MS = 800;
  const ZOOM_SYNC_EPSILON = 0.05;
  const NAVIGATION_MIN_ZOOM = 16;
  const NAVIGATION_PITCH = 48;
  const NAVIGATION_HEADING_EPSILON = 2;
  const NAVIGATION_POSITION_EPSILON_METERS = 0.8;
  const NAVIGATION_CAMERA_ANIMATION_DURATION_MS = 220;
  const MAP_PRESS_AFTER_DRAG_BLOCK_MS = 650;
  const LONG_PRESS_DURATION = 5000; // 5 seconds

  const effectiveHeading = userHeading;

  const clampZoomLevel = (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
  const syncZoomLevel = (nextZoom: number) => {
    const clamped = clampZoomLevel(nextZoom);
    zoomLevelRef.current = clamped;
    setZoomLevel((prev) => (Math.abs(prev - clamped) < 0.0001 ? prev : clamped));
    return clamped;
  };

  const setCenterCoordinateRef = (coordinate: [number, number]) => {
    centerCoordinateRef.current = coordinate;
  };

  useEffect(() => {
    isNavigationModeRef.current = isNavigationMode;
  }, [isNavigationMode]);

  const handleActiveQueryChange = (text: string) => {
    if (activeSearchField === 'start') {
      setStartQuery(text);
      return;
    }
    setDestQuery(text);
  };

  const openDestinationOverlay = (field: 'start' | 'destination' = 'destination') => {
    setActiveSearchField(field);
    setIsDestinationOverlayVisible(true);
    setTimeout(() => {
      destInputRef.current?.focus();
    }, 0);
  };

  const closeDestinationOverlay = () => {
    setIsDestinationOverlayVisible(false);
    searchRequestIdRef.current += 1;
    setIsSearching(false);
    startTransition(() => {
      setSearchResults([]);
    });
  };

  const closeMapPointModal = () => {
    setIsMapPointModalVisible(false);
    setMapSelectionCoordinate(null);
    setMapSelectionLabel('');
    mapSelectionLookupRef.current += 1;
  };

  const openMapPointModalForCoordinate = (coordinate: [number, number]) => {
    const fallbackLabel = formatCoordinateLabel(coordinate);
    setMapSelectionCoordinate(coordinate);
    setMapSelectionLabel(fallbackLabel);
    setIsMapPointModalVisible(true);

    const lookupId = mapSelectionLookupRef.current + 1;
    mapSelectionLookupRef.current = lookupId;

    fetchOpenStreetPlaceNameForCoordinate(coordinate)
      .then((resolvedLabel) => {
        if (mapSelectionLookupRef.current !== lookupId || !resolvedLabel) {
          return;
        }
        setMapSelectionLabel(resolvedLabel);
      })
      .catch(() => {
        // Keep fallback coordinate label.
      });
  };

  const handleMapPress = (event: any) => {
    const now = Date.now();
    if (
      isMapDraggingRef.current ||
      now - lastMapDragFinishedAtRef.current < MAP_PRESS_AFTER_DRAG_BLOCK_MS
    ) {
      return;
    }
    if (now - routeFeaturePressTimestampRef.current < 250) {
      return;
    }
    if (now - mapLongPressTimestampRef.current < 700) {
      return;
    }

    const coordinate = extractCoordinateFromMapPressEvent(event);
    if (!coordinate) {
      return;
    }

    openMapPointModalForCoordinate(coordinate);
  };

  const handleMapCameraChanged = (event: any) => {
    if (!isMapGestureActive(event)) {
      return;
    }
    isMapDraggingRef.current = true;

    const nextCenter = extractCenterFromCameraEvent(event);
    if (nextCenter) {
      setCenterCoordinateRef(nextCenter);
    }

    const nextZoom = extractZoomFromCameraEvent(event);
    if (nextZoom !== null && Math.abs(zoomLevelRef.current - nextZoom) >= ZOOM_SYNC_EPSILON) {
      zoomLevelRef.current = clampZoomLevel(nextZoom);
    }
  };

  const handleMapIdle = (event: any) => {
    if (!isMapDraggingRef.current) {
      return;
    }
    isMapDraggingRef.current = false;
    lastMapDragFinishedAtRef.current = Date.now();

    const settledCenter = extractCenterFromCameraEvent(event);
    if (settledCenter) {
      setCenterCoordinateRef(settledCenter);
    }
    const settledZoom = extractZoomFromCameraEvent(event);
    if (settledZoom !== null) {
      syncZoomLevel(settledZoom);
    }
  };

  // Handle long press on the map: open the same point menu as tap
  const handleMapLongPress = (e: any) => {
    try {
      mapLongPressTimestampRef.current = Date.now();
      const coordinate = extractCoordinateFromMapPressEvent(e);
      if (!coordinate) {
        return;
      }
      openMapPointModalForCoordinate(coordinate);
    } catch (err) {
      console.warn('Failed to read long press coordinates', err);
    }
  };

  const handleZoomIn = () => {
    const nextZoom = syncZoomLevel(zoomLevelRef.current + ZOOM_STEP);
    cameraRef.current?.setCamera({
      zoomLevel: nextZoom,
      animationMode: 'easeTo',
      animationDuration: ZOOM_BUTTON_ANIMATION_DURATION_MS,
    });
  };

  const handleZoomOut = () => {
    const nextZoom = syncZoomLevel(zoomLevelRef.current - ZOOM_STEP);
    cameraRef.current?.setCamera({
      zoomLevel: nextZoom,
      animationMode: 'easeTo',
      animationDuration: ZOOM_BUTTON_ANIMATION_DURATION_MS,
    });
  };

  const handleCenterOnLocation = () => {
    if (location && cameraRef.current) {
      const coord: [number, number] = [location.longitude, location.latitude];
      setCenterCoordinateRef(coord);

      if (isNavigationModeRef.current) {
        isNavigationModeRef.current = false;
        setIsNavigationMode(false);
        navigationHeadingRef.current = null;
        navigationCoordinateRef.current = null;
        cameraRef.current.setCamera({
          centerCoordinate: coord,
          zoomLevel: zoomLevelRef.current,
          heading: 0,
          pitch: 0,
          animationMode: 'easeTo',
          animationDuration: 320,
        });
        return;
      }

      const nextHeading = normalizeHeadingDegrees(
        effectiveHeading ?? navigationHeadingRef.current ?? 0
      );
      const targetZoom = syncZoomLevel(Math.max(zoomLevelRef.current, NAVIGATION_MIN_ZOOM));
      isNavigationModeRef.current = true;
      setIsNavigationMode(true);
      navigationHeadingRef.current = nextHeading;
      navigationCoordinateRef.current = coord;
      cameraRef.current.setCamera({
        centerCoordinate: coord,
        zoomLevel: targetZoom,
        heading: nextHeading,
        pitch: NAVIGATION_PITCH,
        animationMode: 'easeTo',
        animationDuration: 320,
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

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const rawRecentDestinations = await storage.getItem(RECENT_DESTINATIONS_STORAGE_KEY);
        if (!rawRecentDestinations) {
          return;
        }
        const parsed = JSON.parse(rawRecentDestinations);
        if (!Array.isArray(parsed)) {
          return;
        }
        const validRecentDestinations = parsed.filter(isSearchResult).slice(0, 5);
        if (mounted) {
          setRecentDestinations(validRecentDestinations);
        }
      } catch (error) {
        console.warn('Failed to load recent destinations from client storage', error);
      } finally {
        if (mounted) {
          setRecentDestinationsLoaded(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!recentDestinationsLoaded) {
      return;
    }
    storage
      .setItem(RECENT_DESTINATIONS_STORAGE_KEY, JSON.stringify(recentDestinations))
      .catch((error) => {
        console.warn('Failed to persist recent destinations to client storage', error);
      });
  }, [recentDestinations, recentDestinationsLoaded]);

  useEffect(() => {
    if (isLoadingLocation) {
      setHighRiskStatusText('Getting your location...');
      return;
    }

    if (locationError) {
      setHighRiskStatusText(`Location unavailable: ${locationError}.`);
      return;
    }

    if (!location) {
      setHighRiskStatusText('Waiting for your location...');
      return;
    }

    if (isCheckingHighRisk) {
      setHighRiskStatusText('Checking nearby high-risk roads...');
    }
  }, [isCheckingHighRisk, isLoadingLocation, location, locationError]);

  useEffect(() => {
    let mounted = true;
    let positionSubscription: Location.LocationSubscription | null = null;
    let headingSubscription: Location.LocationSubscription | null = null;
    let previousCoordinateForCourse: [number, number] | null = null;
    let lastCourseHeadingSetAt = 0;

    const applyLocation = (latitude: number, longitude: number) => {
      if (!mounted) {
        return;
      }
      const nextLocation = normalizeLocationForMap(latitude, longitude);
      const nextCoordinate: [number, number] = [nextLocation.longitude, nextLocation.latitude];
      setLocation(nextLocation);
      setRouteStart((prev) => prev ?? nextCoordinate);
      setStartQuery((prev) => (prev.trim().length > 0 ? prev : 'Current Location'));
      if (!centerCoordinateRef.current) {
        setCenterCoordinateRef(nextCoordinate);
      }
    };

    const applyHeadingFromCoords = (coords: Location.LocationObjectCoords) => {
      const { latitude, longitude, heading } = coords;
      const currentCoordinate: [number, number] = [longitude, latitude];

      if (typeof heading === 'number' && Number.isFinite(heading) && heading >= 0) {
        setUserHeading(normalizeHeadingDegrees(heading));
        previousCoordinateForCourse = currentCoordinate;
        return;
      }

      if (!previousCoordinateForCourse) {
        previousCoordinateForCourse = currentCoordinate;
        return;
      }

      const movedMeters = getSegmentDistanceMeters(previousCoordinateForCourse, currentCoordinate);
      if (movedMeters < 1.5) {
        return;
      }

      const bearing = getBearingDegrees(previousCoordinateForCourse, currentCoordinate);
      previousCoordinateForCourse = currentCoordinate;
      lastCourseHeadingSetAt = Date.now();
      setUserHeading(bearing);
    };

    (async () => {
      try {
        setIsLoadingLocation(true);
        setLocationError(null);

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          if (mounted) {
            setLocationError('Location permission denied');
            setIsLoadingLocation(false);
          }
          return;
        }

        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        applyLocation(currentLocation.coords.latitude, currentLocation.coords.longitude);
        applyHeadingFromCoords(currentLocation.coords);

        positionSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 2,
            timeInterval: 1500,
          },
          (position) => {
            applyLocation(position.coords.latitude, position.coords.longitude);
            applyHeadingFromCoords(position.coords);
          }
        );

        headingSubscription = await Location.watchHeadingAsync((heading) => {
          if (!mounted) {
            return;
          }
          const nextHeading = extractHeadingDegrees(heading);
          if (nextHeading !== null) {
            if (Date.now() - lastCourseHeadingSetAt < 3000) {
              return;
            }
            setUserHeading(nextHeading);
          }
        });
      } catch (error) {
        console.error('Error getting location:', error);
        if (mounted) {
          setLocationError('Failed to get location');
        }
      } finally {
        if (mounted) {
          setIsLoadingLocation(false);
        }
      }
    })();

    return () => {
      mounted = false;
      positionSubscription?.remove();
      headingSubscription?.remove();
    };
  }, [locationRetry]);

  useEffect(() => {
    if (!isNavigationModeRef.current || !location || !cameraRef.current) {
      return;
    }

    const coordinate: [number, number] = [location.longitude, location.latitude];
    const heading = normalizeHeadingDegrees(effectiveHeading ?? 0);
    const previousHeading = navigationHeadingRef.current;
    const previousCoordinate = navigationCoordinateRef.current;
    const headingDelta =
      previousHeading === null
        ? Number.POSITIVE_INFINITY
        : getHeadingDeltaDegrees(previousHeading, heading);
    const movedMeters =
      previousCoordinate === null
        ? Number.POSITIVE_INFINITY
        : getSegmentDistanceMeters(previousCoordinate, coordinate);

    if (
      headingDelta < NAVIGATION_HEADING_EPSILON &&
      movedMeters < NAVIGATION_POSITION_EPSILON_METERS
    ) {
      return;
    }

    navigationHeadingRef.current = heading;
    navigationCoordinateRef.current = coordinate;
    setCenterCoordinateRef(coordinate);
    cameraRef.current.setCamera({
      centerCoordinate: coordinate,
      zoomLevel: Math.max(zoomLevelRef.current, NAVIGATION_MIN_ZOOM),
      heading,
      pitch: NAVIGATION_PITCH,
      animationMode: 'easeTo',
      animationDuration: NAVIGATION_CAMERA_ANIMATION_DURATION_MS,
    });
  }, [
    isNavigationMode,
    location,
    effectiveHeading,
    NAVIGATION_CAMERA_ANIMATION_DURATION_MS,
    NAVIGATION_HEADING_EPSILON,
    NAVIGATION_MIN_ZOOM,
    NAVIGATION_PITCH,
    NAVIGATION_POSITION_EPSILON_METERS,
  ]);

  const searchPlaces = async (query: string) => {
    const normalizedQuery = query.trim();
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;

    if (!normalizedQuery || normalizedQuery.length < MIN_SEARCH_QUERY_LENGTH) {
      setIsSearching(false);
      startTransition(() => {
        setSearchResults([]);
      });
      return;
    }

    if (normalizedQuery === 'Current Location') {
      setIsSearching(false);
      startTransition(() => {
        setSearchResults([]);
      });
      return;
    }

    try {
      setIsSearching(true);
      const results = await searchPlacesWithOpenStreet(normalizedQuery);
      if (searchRequestIdRef.current === requestId) {
        startTransition(() => {
          setSearchResults(results);
        });
      }
    } catch {
      if (searchRequestIdRef.current === requestId) {
        startTransition(() => {
          setSearchResults([]);
        });
      }
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setIsSearching(false);
      }
    }
  };

  const activeQuery = activeSearchField === 'start' ? startQuery : destQuery;
  const deferredActiveQuery = useDeferredValue(activeQuery);

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmedQuery = deferredActiveQuery.trim();
    if (
      !isDestinationOverlayVisible ||
      !trimmedQuery ||
      trimmedQuery.length < MIN_SEARCH_QUERY_LENGTH
    ) {
      searchRequestIdRef.current += 1;
      setIsSearching(false);
      startTransition(() => {
        setSearchResults([]);
      });
    } else {
      searchTimeoutRef.current = setTimeout(() => {
        searchPlaces(deferredActiveQuery);
      }, SEARCH_DEBOUNCE_MS);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [deferredActiveQuery, isDestinationOverlayVisible]);

  useEffect(() => {
    if (!location) {
      return undefined;
    }

    let isCancelled = false;
    const requestId = highRiskRequestIdRef.current + 1;
    highRiskRequestIdRef.current = requestId;
    setIsCheckingHighRisk(true);

    const buildRiskStatusText = (payload: HighRiskAlertResponse) => {
      if (!payload.in_high_risk_area || payload.matches.length === 0) {
        return `No high-risk area detected within ${payload.radius_m}m.`;
      }

      const nearestDistance = Math.min(...payload.matches.map((match) => match.distance_m));
      return `High-risk area detected within ${payload.radius_m}m. ${payload.matches.length} nearby segment(s), nearest ${nearestDistance.toFixed(1)}m.`;
    };

    const runHighRiskCheck = async () => {
      try {
        const result = await checkHighRiskAlert({
          lat: location.latitude,
          lng: location.longitude,
          radius_m: HIGH_RISK_ALERT_RADIUS_METERS,
        });

        if (isCancelled || highRiskRequestIdRef.current !== requestId) {
          return;
        }

        const nextZoneIds = result.matches.map((match) => String(match.id));
        const previousZoneIds = activeDangerZoneIdsRef.current;
        const wasInsideHighRiskArea = isInsideHighRiskAreaRef.current;
        const isInsideHighRiskArea = result.in_high_risk_area;

        if (!wasInsideHighRiskArea && isInsideHighRiskArea) {
          console.log('[HighRiskAlert] entered high-risk area', {
            location,
            enteredZoneIds: nextZoneIds,
          });
          // High-risk alert popup — disabled until endpoint is stable
          // Alert.alert(HIGH_RISK_ALERT_TITLE, HIGH_RISK_BANNER_MESSAGE);
        }

        if (wasInsideHighRiskArea && !isInsideHighRiskArea) {
          console.log('[HighRiskAlert] left high-risk area', {
            location,
            exitedZoneIds: previousZoneIds,
          });
        }

        setIsHighRiskArea(isInsideHighRiskArea);
        setHighRiskStatusText(buildRiskStatusText(result));
        activeDangerZoneIdsRef.current = nextZoneIds;
        isInsideHighRiskAreaRef.current = isInsideHighRiskArea;
        setIsCheckingHighRisk(false);
      } catch (error) {
        if (isCancelled || highRiskRequestIdRef.current !== requestId) {
          return;
        }

        console.warn('[HighRiskAlert] failed to check current location', error);
        setIsHighRiskArea(false);
        // setHighRiskStatusText('Monitoring unavailable.');
        setIsCheckingHighRisk(false);
      }
    };

    runHighRiskCheck();

    return () => {
      isCancelled = true;
    };
  }, [location]);

  async function handleGetRoute(
    destinationOverride?: [number, number],
    modeOverride?: TransportMode,
    startOverride?: [number, number]
  ) {
    if (isLoadingRoute) {
      return;
    }

    const transportMode = modeOverride ?? selectedTransportMode;
    const startCoord: [number, number] | null =
      startOverride ?? routeStart ?? (location ? [location.longitude, location.latitude] : null);
    const endCoord = destinationOverride ?? routeEnd;

    console.log('[Routing] handleGetRoute called', {
      transportMode,
      startOverride,
      destinationOverride,
      routeStart,
      routeEnd,
      resolvedStart: startCoord,
      resolvedDestination: endCoord,
    });

    if (!startCoord || !endCoord) {
      console.log('[Routing] skipped request because start or destination is missing', {
        resolvedStart: startCoord,
        resolvedDestination: endCoord,
      });
      setRouteError('Please select both start and end locations');
      return;
    }

    if (!routeStart) {
      setRouteStart(startCoord);
    }

    try {
      setIsLoadingRoute(true);
      setRouteError(null);
      setRouteData(null);
      setSelectedRouteSegment(null);
      setTransitItinerary(null);

      const fetchAndSetWalkingRoute = async () => {
        const payload = {
          origin: {
            lat: startCoord[1],
            lon: startCoord[0],
          },
          destination: {
            lat: endCoord[1],
            lon: endCoord[0],
          },
          user_id: user?.sub || 'anonymous',
          preferences: {
            transport_mode: 'walking',
            optimize_for: 'safety',
          },
        };

        console.log('Routing via URL:', ROUTE_API_URL);
        console.log('[Routing] request body', payload);
        const response = await fetch(ROUTE_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        console.log('[Routing] response.status', response.status);
        console.log('[Routing] response.ok', response.ok);

        const responseClone = response.clone();
        const data = await response.json().catch(async () => {
          const rawText = await responseClone.text().catch(() => '');
          return rawText || null;
        });
        console.log('[Routing] response body', data);

        if (!response.ok) {
          const errorDetail =
            formatRouteApiErrorValue(
              typeof data === 'object' && data !== null ? (data as Record<string, unknown>) : data
            ) ||
            response.statusText ||
            `HTTP ${response.status}`;

          console.warn('[Routing] route API error detail', {
            status: response.status,
            ok: response.ok,
            detail:
              typeof data === 'object' && data !== null
                ? {
                    detail: (data as Record<string, unknown>).detail,
                    message: (data as Record<string, unknown>).message,
                    errors: (data as Record<string, unknown>).errors,
                  }
                : data,
          });

          throw new Error(errorDetail);
        }

        if (data?.type === 'FeatureCollection' && Array.isArray(data.features)) {
          console.log('[Routing] received FeatureCollection response');
          setRouteData(withTransportModeInRouteData(data, 'walking'));
          return;
        }

        const normalizedRoute = normalizeRoutingResponse(data);
        const mapboxRoute =
          !normalizedRoute || normalizedRoute.coordinates.length < 2
            ? await fetchMapboxDirectionsRoute(startCoord, endCoord)
            : null;
        const coordinates =
          normalizedRoute && normalizedRoute.coordinates.length >= 2
            ? normalizedRoute.coordinates
            : (mapboxRoute?.coordinates ?? []);

        if (coordinates.length < 2) {
          console.log('[Routing] response format mismatch', {
            expected: 'FeatureCollection or object with routes/geometry/path/waypoints',
            receivedKeys: data && typeof data === 'object' ? Object.keys(data) : [],
          });
          throw new Error('Route response does not include usable coordinates');
        }

        const nextRouteData = withTransportModeInRouteData(
          createRouteFeatureCollection(coordinates, {
            route_id: normalizedRoute?.routeId || '',
            distance_m: normalizedRoute?.distanceMeters ?? mapboxRoute?.distanceMeters,
            duration_s: normalizedRoute?.durationSeconds ?? mapboxRoute?.durationSeconds,
            safety_score: normalizedRoute?.safetyScore ?? null,
            source: 'saferoute_algorithm',
            transport_mode: 'walking',
          }),
          'walking'
        );

        console.log('[Routing] writing routeData', {
          coordinateCount: coordinates.length,
          distance_m: normalizedRoute?.distanceMeters ?? mapboxRoute?.distanceMeters ?? null,
          duration_s: normalizedRoute?.durationSeconds ?? mapboxRoute?.durationSeconds ?? null,
        });
        setRouteData(nextRouteData);
      };

      if (transportMode === 'public_transit') {
        await fetchAndSetWalkingRoute();
        setRouteError('Public Transit is temporarily unavailable. Showing walking route instead.');
      } else {
        await fetchAndSetWalkingRoute();
      }

      if (cameraRef.current) {
        setCenterCoordinateRef(startCoord);
        const targetZoom = syncZoomLevel(13);
        cameraRef.current.setCamera({
          centerCoordinate: startCoord,
          zoomLevel: targetZoom,
          animationMode: 'easeTo',
          animationDuration: 1000,
        });
      }
    } catch (error) {
      console.warn('Route API warning:', error);
      const nextRouteError =
        error instanceof Error
          ? error.message
          : formatRouteApiErrorValue(error) || 'Failed to calculate route';
      setRouteError(nextRouteError);
    } finally {
      setIsLoadingRoute(false);
    }
  }

  const applyMapSelection = (target: 'start' | 'destination') => {
    if (!mapSelectionCoordinate) {
      return;
    }

    const coordinate = mapSelectionCoordinate;
    const label = mapSelectionLabel || formatCoordinateLabel(coordinate);

    if (target === 'start') {
      closeMapPointModal();
      setRouteStart(coordinate);
      setStartQuery(label);
      setCenterCoordinateRef(coordinate);
      const targetZoom = syncZoomLevel(15);
      if (cameraRef.current) {
        cameraRef.current.setCamera({
          centerCoordinate: coordinate,
          zoomLevel: targetZoom,
          animationMode: 'easeTo',
          animationDuration: 350,
        });
      }
      if (routeEnd) {
        handleGetRoute(routeEnd, selectedTransportMode, coordinate).catch((error) => {
          console.warn('Failed to calculate route after selecting start from map', error);
        });
      }
      return;
    }

    if (!isWithinDublin(coordinate[0], coordinate[1])) {
      Alert.alert('Outside Dublin', 'Please choose a destination within Dublin.');
      return;
    }

    closeMapPointModal();
    const mapSelectionEntry: SearchResult = {
      id: `map-point-${coordinate[0].toFixed(5)}-${coordinate[1].toFixed(5)}`,
      place_name: label,
      center: coordinate,
      provider: 'osm',
    };

    setRouteEnd(coordinate);
    setDestQuery(label);
    setCenterCoordinateRef(coordinate);
    const targetZoom = syncZoomLevel(15);
    setRecentDestinations((prev) => {
      const deduped = prev.filter((item) => item.id !== mapSelectionEntry.id);
      return [mapSelectionEntry, ...deduped].slice(0, 5);
    });
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: coordinate,
        zoomLevel: targetZoom,
        animationMode: 'easeTo',
        animationDuration: 350,
      });
    }
    handleGetRoute(coordinate, selectedTransportMode).catch((error) => {
      console.warn('Failed to calculate route after selecting destination from map', error);
    });
  };

  const handleReportUnsafeLocationFromMapPoint = () => {
    if (!mapSelectionCoordinate) {
      return;
    }

    const [longitude, latitude] = mapSelectionCoordinate;
    closeMapPointModal();
    setReportLocation({ latitude, longitude });
    setReportText('');
    setFeedbackType(null);
    setSeverity(null);
    setIsSubmittingReport(false);
    setShowReportModal(true);
  };

  const handleTransportModeChange = (mode: TransportMode) => {
    console.log('[Routing] transport mode pressed', {
      mode,
      selectedTransportMode,
      routeStart,
      routeEnd,
    });

    if (mode === 'public_transit') {
      setSelectedTransportMode('public_transit');
      if (routeEnd) {
        handleGetRoute(routeEnd, 'public_transit').catch((error) => {
          console.warn('Failed to get route for transit mode', error);
        });
      }
      return;
    }

    if (mode === selectedTransportMode) {
      if (mode === 'walking' && routeEnd) {
        console.log('[Routing] re-trigger walking route from Walking button', {
          routeStart,
          routeEnd,
        });
        handleGetRoute(routeEnd, mode).catch((error) => {
          console.warn('Failed to recalculate route after pressing walking', error);
        });
      }
      return;
    }

    setSelectedTransportMode(mode);
    if (routeEnd) {
      handleGetRoute(routeEnd, mode).catch((error) => {
        console.warn('Failed to recalculate route after mode change', error);
      });
    }
  };

  const handleSwapRouteEndpoints = () => {
    if (isLoadingRoute || !routeStart || !routeEnd) {
      return;
    }

    const nextStart = routeEnd;
    const nextEnd = routeStart;
    const nextStartLabel =
      destQuery.trim().length > 0 ? destQuery : formatCoordinateLabel(nextStart);
    const nextDestLabel =
      startQuery.trim().length > 0 ? startQuery : formatCoordinateLabel(nextEnd);

    setRouteStart(nextStart);
    setRouteEnd(nextEnd);
    setStartQuery(nextStartLabel);
    setDestQuery(nextDestLabel);
    setCenterCoordinateRef(nextStart);

    handleGetRoute(nextEnd, selectedTransportMode, nextStart).catch((error) => {
      console.warn('Failed to swap start and destination', error);
    });
  };

  const handleClearRoute = () => {
    setRouteData(null);
    setRouteEnd(null);
    setDestQuery('');
    setRouteError(null);
    setTransitItinerary(null);
    setSelectedRouteSegment(null);
    setIsNavigationMode(false);
    isNavigationModeRef.current = false;
    if (location) {
      const coord: [number, number] = [location.longitude, location.latitude];
      setRouteStart(coord);
      setStartQuery('Current Location');
    }
  };

  const handleSelectLocation = async (result: SearchResult) => {
    const isCurrentLocationSelection = result.id === CURRENT_LOCATION_RESULT_ID;
    let coord = await resolveSearchResultCoordinates(result);
    if (!coord && isCurrentLocationSelection) {
      if (location) {
        coord = [location.longitude, location.latitude];
      } else if (routeStart) {
        coord = routeStart;
      }
    }
    if (!coord) {
      if (isCurrentLocationSelection) {
        Alert.alert(
          'Current Location Unavailable',
          'Your current location is not ready yet. Please try again in a moment.'
        );
        return;
      }
      Alert.alert('Location Not Found', 'Could not resolve this destination. Try another result.');
      return;
    }

    if (!isWithinDublin(coord[0], coord[1])) {
      Alert.alert('Outside Dublin', 'Please choose a destination within Dublin.');
      return;
    }

    const targetZoom = syncZoomLevel(
      zoomLevelRef.current > SEARCH_RESULT_PREVIEW_ZOOM
        ? SEARCH_RESULT_PREVIEW_ZOOM
        : zoomLevelRef.current - SEARCH_RESULT_MIN_ZOOM_OUT_DELTA
    );
    setCenterCoordinateRef(coord);
    setSearchResults([]);
    closeDestinationOverlay();
    destInputRef.current?.blur();
    if (cameraRef.current) {
      cameraRef.current.setCamera({
        centerCoordinate: coord,
        zoomLevel: targetZoom,
        animationMode: 'flyTo',
        animationDuration: SEARCH_RESULT_FLYTO_DURATION_MS,
      });
    }

    if (activeSearchField === 'start') {
      console.log('[Routing] search result selected for start', {
        place: result.place_name,
        selectedLocation: coord,
        currentDestination: routeEnd,
      });
      setRouteStart(coord);
      setStartQuery(isCurrentLocationSelection ? 'Current location' : result.place_name);
      if (routeEnd) {
        handleGetRoute(routeEnd, selectedTransportMode, coord);
      }
      return;
    }

    console.log('[Routing] search result selected for destination', {
      place: result.place_name,
      selectedLocation: coord,
      previousDestination: routeEnd,
      currentLocation: location,
    });
    if (!routeStart && location) {
      setRouteStart([location.longitude, location.latitude]);
    }
    setRouteEnd(coord);
    console.log('[Routing] triggering route request after destination selection', {
      selectedLocation: coord,
    });
    setDestQuery(isCurrentLocationSelection ? 'Current location' : result.place_name);
    if (!isCurrentLocationSelection) {
      setRecentDestinations((prev) => {
        const deduped = prev.filter((item) => item.id !== result.id);
        return [{ ...result, center: coord }, ...deduped].slice(0, 5);
      });
    }
    handleGetRoute(coord);
  };

  const renderDestinationResultItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.searchResultItem} onPress={() => handleSelectLocation(item)}>
      <Text style={styles.searchResultText}>{item.place_name}</Text>
    </TouchableOpacity>
  );

  const renderDestinationPanelContent = () => {
    const currentLocationOption: SearchResult[] = [
      {
        id: CURRENT_LOCATION_RESULT_ID,
        place_name: 'Current location',
        center: location ? [location.longitude, location.latitude] : (routeStart ?? null),
        provider: 'local',
      },
    ];
    const withCurrentLocationOption = (items: SearchResult[]) => [
      ...currentLocationOption,
      ...items.filter((item) => item.id !== CURRENT_LOCATION_RESULT_ID),
    ];

    if (activeQuery.trim().length > 0) {
      if (activeQuery.trim().length < MIN_SEARCH_QUERY_LENGTH) {
        if (currentLocationOption.length > 0) {
          return (
            <FlatList
              data={currentLocationOption}
              keyExtractor={(item) => item.id}
              style={styles.searchResultsList}
              keyboardShouldPersistTaps="handled"
              renderItem={renderDestinationResultItem}
              ListFooterComponent={
                <Text style={styles.emptyDestinationText}>
                  Type at least {MIN_SEARCH_QUERY_LENGTH} characters.
                </Text>
              }
            />
          );
        }
        return (
          <Text style={styles.emptyDestinationText}>
            Type at least {MIN_SEARCH_QUERY_LENGTH} characters.
          </Text>
        );
      }

      if (searchResults.length > 0) {
        return (
          <FlatList
            data={withCurrentLocationOption(searchResults)}
            keyExtractor={(item) => item.id}
            style={styles.searchResultsList}
            keyboardShouldPersistTaps="handled"
            renderItem={renderDestinationResultItem}
          />
        );
      }

      if (isSearching) {
        if (currentLocationOption.length > 0) {
          return (
            <FlatList
              data={currentLocationOption}
              keyExtractor={(item) => item.id}
              style={styles.searchResultsList}
              keyboardShouldPersistTaps="handled"
              renderItem={renderDestinationResultItem}
            />
          );
        }
        return null;
      }

      if (currentLocationOption.length > 0) {
        return (
          <FlatList
            data={currentLocationOption}
            keyExtractor={(item) => item.id}
            style={styles.searchResultsList}
            keyboardShouldPersistTaps="handled"
            renderItem={renderDestinationResultItem}
            ListFooterComponent={
              <Text style={styles.emptyDestinationText}>
                No results found in Dublin. Try another keyword.
              </Text>
            }
          />
        );
      }

      return (
        <Text style={styles.emptyDestinationText}>
          No results found in Dublin. Try another keyword.
        </Text>
      );
    }

    if (recentDestinations.length > 0) {
      return (
        <FlatList
          data={withCurrentLocationOption(recentDestinations)}
          keyExtractor={(item) => item.id}
          style={styles.searchResultsList}
          keyboardShouldPersistTaps="handled"
          renderItem={renderDestinationResultItem}
        />
      );
    }

    if (currentLocationOption.length > 0) {
      return (
        <FlatList
          data={currentLocationOption}
          keyExtractor={(item) => item.id}
          style={styles.searchResultsList}
          keyboardShouldPersistTaps="handled"
          renderItem={renderDestinationResultItem}
        />
      );
    }

    return <Text style={styles.emptyDestinationText}>No recent destinations yet.</Text>;
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

  useEffect(() => {
    if (!routeData) {
      setWalkingRouteDistanceMeters(null);
      setWalkingRouteDurationSeconds(null);
      return;
    }

    const distanceMeters = getRouteDistanceMeters(routeData);
    const durationSeconds = getRouteDurationSeconds(routeData);
    setWalkingRouteDistanceMeters(distanceMeters);
    setWalkingRouteDurationSeconds(durationSeconds);
  }, [routeData]);

  const walkingDistanceLabel = formatDistance(walkingRouteDistanceMeters);
  const walkingDurationLabel = formatWalkingDuration(walkingRouteDurationSeconds);
  const transitDurationLabel = formatWalkingDuration(transitItinerary?.duration_s ?? null);
  const transitWalkingDurationLabel = formatWalkingDuration(
    transitItinerary?.walking_duration_s ?? null
  );
  const transitInVehicleDurationLabel = formatWalkingDuration(
    transitItinerary?.transit_duration_s ?? null
  );
  const transitLines = Array.from(
    new Set(
      (transitItinerary?.legs || [])
        .filter((leg) => leg.mode === 'transit' && leg.route_id)
        .map((leg) => leg.route_id as string)
    )
  );
  const transitJourneySteps = buildTransitJourneySteps(transitItinerary);
  const hasPlannedRoute = Boolean(routeData || transitItinerary || routeEnd);
  const shouldShowOnlyRouteEndpoints = Boolean(routeStart && routeEnd);
  const isMapInteractionLocked =
    isDestinationOverlayVisible || isMapPointModalVisible || showReportModal;
  const plannerMainContent = (() => {
    if (selectedTransportMode === 'walking') {
      if (isLoadingRoute) {
        return <Text style={styles.plannerEmptyText}>Calculating walking route...</Text>;
      }
      if (routeEnd && routeError) {
        return <Text style={styles.plannerEmptyText}>Unable to render route summary yet.</Text>;
      }
      if (routeEnd && !routeData) {
        return (
          <Text style={styles.plannerEmptyText}>Destination selected. Waiting for route...</Text>
        );
      }
      if (!routeData) {
        return (
          <Text style={styles.plannerEmptyText}>
            Select a destination to calculate walking route.
          </Text>
        );
      }
      return (
        <>
          <Text style={styles.plannerSectionTitle}>Walking Route</Text>
          <Text style={styles.plannerPrimaryValue}>{walkingDurationLabel || 'N/A'}</Text>
          <Text style={styles.plannerMetaLine}>Distance: {walkingDistanceLabel || 'N/A'}</Text>
        </>
      );
    }

    if (!transitItinerary) {
      return (
        <Text style={styles.plannerEmptyText}>
          Select a destination to calculate public transit route.
        </Text>
      );
    }

    return (
      <>
        <Text style={styles.plannerSectionTitle}>Public Transit</Text>
        <Text style={styles.plannerPrimaryValue}>{transitDurationLabel || 'N/A'}</Text>
        <Text style={styles.plannerMetaLine}>
          Walk: {transitWalkingDurationLabel || 'N/A'} | In vehicle:{' '}
          {transitInVehicleDurationLabel || 'N/A'}
        </Text>
        <Text style={styles.plannerMetaLine}>Transfers: {transitItinerary.transfers}</Text>
        {transitLines.length > 0 && (
          <Text style={styles.plannerMetaLine}>Lines: {transitLines.join(', ')}</Text>
        )}
        {transitJourneySteps.length > 0 && (
          <View style={styles.plannerStepList}>
            {transitJourneySteps.map((step, index) => {
              const isLast = index === transitJourneySteps.length - 1;
              return (
                <View
                  key={step.id}
                  style={[styles.itineraryStepRow, isLast && styles.itineraryStepRowLast]}
                >
                  <Text style={styles.itineraryStepTitle}>{getTransitStepTitle(step, index)}</Text>
                  <Text style={styles.itineraryStepDetail}>{getTransitStepDetail(step)}</Text>
                </View>
              );
            })}
          </View>
        )}
      </>
    );
  })();
  let destinationSectionTitle = 'Recent Destinations';
  if (activeQuery.trim().length > 0) {
    destinationSectionTitle = 'Search Results';
  } else if (activeSearchField === 'start') {
    destinationSectionTitle = 'Recent Places';
  }

  useEffect(() => {
    if (!routeData) {
      setSelectedRouteSegment(null);
    }
  }, [routeData]);

  const handleRouteFeaturePress = (event: any) => {
    routeFeaturePressTimestampRef.current = Date.now();
    const pressedFeature = event?.features?.[0];
    if (!pressedFeature || typeof pressedFeature !== 'object') {
      return;
    }

    const properties =
      pressedFeature.properties && typeof pressedFeature.properties === 'object'
        ? (pressedFeature.properties as Record<string, unknown>)
        : null;
    if (!properties) {
      return;
    }

    setSelectedRouteSegment(buildSelectedRouteSegment(properties));
  };

  const handleAllowLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      // Re-trigger the location useEffect to start fetching
      setLocationError(null);
      setIsLoadingLocation(true);
      setLocationRetry((c) => c + 1);
    } else {
      Alert.alert(
        'Location Permission Required',
        'Please enable location access in your device settings to use SafeRoute.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              if (Platform.OS === 'ios') {
                Linking.openURL('app-settings:');
              } else {
                Linking.openSettings();
              }
            },
          },
        ]
      );
    }
  };

  // Show full-screen permission screen when location is denied
  if (locationError && !isLoadingLocation) {
    return (
      <View style={styles.permissionScreen}>
        <View style={styles.permissionImageContainer}>
          <Image
            source={require('../../assets/images/location-pin.jpg')}
            style={styles.permissionImage}
          />
        </View>
        <Text style={styles.permissionTitle}>Enable location to get started</Text>
        <Text style={styles.permissionDescription}>
          SafeRoute uses your location to analyze street safety data and guide you on the most
          secure path to your destination.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.permissionButton,
            pressed && styles.permissionButtonPressed,
          ]}
          onPress={handleAllowLocation}
        >
          <Text style={styles.permissionButtonText}>Allow Location Access</Text>
        </Pressable>
      </View>
    );
  }

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
      return null;
    }

    if (location) {
      const initialCenter = centerCoordinateRef.current ?? [location.longitude, location.latitude];
      const markerHeading = normalizeHeadingDegrees(effectiveHeading ?? 0);
      const userLocationCoordinate: [number, number] = [location.longitude, location.latitude];
      const userLocationFeatureCollection = buildUserLocationFeatureCollection(
        userLocationCoordinate,
        markerHeading
      );
      const userLocationSourceKey = `user-location-source-${userLocationCoordinate[0].toFixed(5)}-${userLocationCoordinate[1].toFixed(5)}-${Math.round(markerHeading)}`;
      return (
        <Mapbox.MapView
          style={styles.map}
          styleURL={Mapbox.StyleURL.Dark}
          logoEnabled={false}
          attributionEnabled={false}
          onPress={handleMapPress}
          onLongPress={handleMapLongPress}
          onCameraChanged={handleMapCameraChanged}
          onMapIdle={handleMapIdle}
          zoomEnabled={!isMapInteractionLocked}
          scrollEnabled={!isMapInteractionLocked}
          pitchEnabled={isNavigationMode}
          rotateEnabled={isNavigationMode}
          compassEnabled={false}
          scaleBarEnabled
          scaleBarPosition={{ bottom: 20, left: 20 }}
        >
          <Camera
            ref={cameraRef}
            defaultSettings={{
              centerCoordinate: initialCenter as [number, number],
              zoomLevel: zoomLevelRef.current,
              heading: 0,
              pitch: 0,
            }}
            minZoomLevel={MIN_ZOOM}
            maxZoomLevel={MAX_ZOOM}
          />
          <ShapeSource
            key={userLocationSourceKey}
            id="userLocationSource"
            shape={userLocationFeatureCollection as any}
          >
            <CircleLayer
              id="userLocationAccuracyHalo"
              filter={['==', ['get', 'kind'], 'user-dot'] as any}
              style={{
                circleRadius: 14,
                circleColor: 'rgba(37, 99, 235, 0.22)',
                circleStrokeColor: 'rgba(147, 197, 253, 0.5)',
                circleStrokeWidth: 1,
              }}
            />
            <LineLayer
              id="userLocationHeadingLine"
              filter={['==', ['get', 'kind'], 'user-heading-line'] as any}
              style={{
                lineColor: '#2563EB',
                lineWidth: 2.2,
                lineOpacity: 0.95,
              }}
            />
            <FillLayer
              id="userLocationHeadingTriangle"
              filter={['==', ['get', 'kind'], 'user-heading'] as any}
              style={{
                fillColor: '#2563EB',
                fillOpacity: 0.95,
              }}
            />
            <CircleLayer
              id="userLocationRing"
              filter={['==', ['get', 'kind'], 'user-dot'] as any}
              style={{
                circleRadius: 8.5,
                circleColor: '#FFFFFF',
                circleStrokeColor: '#2563EB',
                circleStrokeWidth: 2,
              }}
            />
            <CircleLayer
              id="userLocationDot"
              filter={['==', ['get', 'kind'], 'user-dot'] as any}
              style={{
                circleRadius: 3.5,
                circleColor: '#2563EB',
              }}
            />
          </ShapeSource>
          {routeData && (
            <ShapeSource id="routeSource" shape={routeData} onPress={handleRouteFeaturePress}>
              <LineLayer
                id="routeLine"
                style={{
                  lineColor: ROUTE_LINE_COLOR_EXPRESSION as any,
                  lineWidth: 4,
                  lineOpacity: 0.8,
                }}
              />
              <LineLayer
                id="routeLineSelected"
                filter={
                  [
                    '==',
                    ['get', 'feature_id'],
                    selectedRouteSegment?.featureId ?? '__no_selected_segment__',
                  ] as any
                }
                style={{
                  lineColor: '#F8FAFC',
                  lineWidth: 7,
                  lineOpacity: 0.95,
                }}
              />
            </ShapeSource>
          )}
          {routeStart && (
            <PointAnnotation id="route-start" coordinate={routeStart} title="Route Start">
              <View collapsable={false} style={styles.markerContainer}>
                <View style={styles.startMarker} />
              </View>
            </PointAnnotation>
          )}
          {routeEnd && (
            <PointAnnotation id="route-end" coordinate={routeEnd} title="Route End">
              <View collapsable={false} style={styles.markerContainer}>
                <View style={styles.endMarker} />
              </View>
            </PointAnnotation>
          )}
          {isMapPointModalVisible && mapSelectionCoordinate && (
            <PointAnnotation
              id="map-selection-point"
              coordinate={mapSelectionCoordinate}
              title="Selected Point"
            >
              <View collapsable={false} style={styles.markerContainer}>
                <View style={styles.mapSelectionMarker} />
              </View>
            </PointAnnotation>
          )}
          {/* Report marker placed when user chooses "Report unsafe location" from map point menu */}
          {!shouldShowOnlyRouteEndpoints && reportLocation && (
            <PointAnnotation
              id="reported-location"
              coordinate={[reportLocation.longitude, reportLocation.latitude]}
              title="Reported Location"
            >
              <View collapsable={false} style={styles.markerContainer}>
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

      {/* High-risk area status banner — disabled until endpoint is stable
      <View
        style={[
          styles.riskZoneStatusBanner,
          isHighRiskArea ? styles.riskZoneStatusBannerAlert : styles.riskZoneStatusBannerSafe,
        ]}
      >
        <Text style={[styles.riskZoneStatusText, !isHighRiskArea && styles.riskZoneStatusTextSafe]}>
          {isHighRiskArea ? HIGH_RISK_BANNER_MESSAGE : highRiskStatusText}
        </Text>
      </View>
      */}

      <View style={styles.searchWrapper}>
        {hasPlannedRoute ? (
          <View style={styles.routeInputsRow}>
            <View style={[styles.routeInputsCard, styles.routeInputsCardMain]}>
              <Pressable
                style={styles.routeInputTrigger}
                onPress={() => openDestinationOverlay('start')}
              >
                <View style={styles.destinationTriggerContent}>
                  <Text style={styles.searchIcon}>📍</Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.destinationTriggerText,
                      !startQuery && styles.destinationTriggerPlaceholder,
                    ]}
                  >
                    {startQuery || 'Current location'}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.routeInputDivider} />
              <Pressable
                style={styles.routeInputTrigger}
                onPress={() => openDestinationOverlay('destination')}
              >
                <View style={styles.destinationTriggerContent}>
                  <Text style={styles.searchIcon}>🏁</Text>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.destinationTriggerText,
                      !destQuery && styles.destinationTriggerPlaceholder,
                    ]}
                  >
                    {destQuery || 'Search destination in Dublin'}
                  </Text>
                </View>
              </Pressable>
            </View>
            <Pressable
              style={[
                styles.routeSwitchButton,
                (isLoadingRoute || !routeStart || !routeEnd) && styles.routeSwitchButtonDisabled,
              ]}
              onPress={handleSwapRouteEndpoints}
              disabled={isLoadingRoute}
            >
              <Text style={styles.routeSwitchButtonIcon}>⇅</Text>
            </Pressable>
            <Pressable style={styles.clearRouteButton} onPress={handleClearRoute}>
              <Text style={styles.clearRouteButtonText}>✕</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.routeInputsRow}>
            <Pressable
              style={[styles.destinationTrigger, styles.routeInputsCardMain]}
              onPress={() => openDestinationOverlay('destination')}
            >
              <View style={styles.destinationTriggerContent}>
                <Text style={styles.searchIcon}>🏁</Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.destinationTriggerText,
                    !destQuery && styles.destinationTriggerPlaceholder,
                  ]}
                >
                  {destQuery || 'Search destination in Dublin'}
                </Text>
              </View>
            </Pressable>
            {destQuery ? (
              <Pressable style={styles.clearRouteButton} onPress={handleClearRoute}>
                <Text style={styles.clearRouteButtonText}>✕</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      {routeEnd && (
        <View style={styles.transportModeContainer}>
          <View style={styles.plannerPanel}>
            <View style={styles.transportModeCard}>
              <Pressable
                style={[
                  styles.transportModeButton,
                  selectedTransportMode === 'walking' && styles.transportModeButtonActive,
                ]}
                onPress={() => handleTransportModeChange('walking')}
              >
                <Text
                  style={[
                    styles.transportModeButtonText,
                    selectedTransportMode === 'walking' && styles.transportModeButtonTextActive,
                  ]}
                >
                  Walking
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.transportModeButton,
                  selectedTransportMode === 'public_transit' && styles.transportModeButtonActive,
                ]}
                onPress={() => handleTransportModeChange('public_transit')}
              >
                <Text
                  style={[
                    styles.transportModeButtonText,
                    selectedTransportMode === 'public_transit' && styles.transportModeButtonTextActive,
                  ]}
                >
                  Public Transit
                </Text>
              </Pressable>
            </View>

            <View style={styles.plannerBody}>
              {plannerMainContent}
              {selectedRouteSegment && (
                <View style={styles.plannerStepList}>
                  <Text style={styles.routeInfoLabel}>Selected Segment</Text>
                  <Text style={styles.selectedSegmentTitle}>{selectedRouteSegment.title}</Text>
                  <Text style={styles.selectedSegmentDetail}>{selectedRouteSegment.detail}</Text>
                  <Text style={styles.selectedSegmentMeta}>
                    {selectedRouteSegment.durationLabel || 'N/A'}
                    {' · '}
                    {selectedRouteSegment.distanceLabel || 'N/A'}
                  </Text>
                </View>
              )}
              {routeError && <Text style={styles.routeErrorText}>{routeError}</Text>}
            </View>
          </View>
        </View>
      )}

      <Modal
        visible={isDestinationOverlayVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDestinationOverlay}
      >
        <Pressable style={styles.destinationOverlay} onPress={closeDestinationOverlay}>
          <Pressable style={styles.destinationSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.destinationInputBox}>
              <Text style={styles.searchIcon}>🏁</Text>
              <TextInput
                ref={destInputRef}
                style={styles.searchInput}
                placeholder={
                  activeSearchField === 'start'
                    ? 'Search start location in Dublin'
                    : 'Search destination in Dublin'
                }
                placeholderTextColor="#6B7280"
                value={activeQuery}
                autoCorrect={false}
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="none"
                onChangeText={handleActiveQueryChange}
              />
              {isSearching && (
                <ActivityIndicator size="small" color="#3B82F6" style={styles.searchLoader} />
              )}
            </View>

            <View style={styles.destinationSection}>
              <Text style={styles.destinationSectionTitle}>{destinationSectionTitle}</Text>
              {renderDestinationPanelContent()}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isMapPointModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeMapPointModal}
      >
        <Pressable style={styles.mapPointOverlay} onPress={closeMapPointModal}>
          <Pressable style={styles.mapPointSheet} onPress={(event) => event.stopPropagation()}>
            <Text style={styles.mapPointTitle}>Use this point on map</Text>
            <Text style={styles.mapPointSubtitle}>{mapSelectionLabel}</Text>
            <Pressable
              style={[styles.mapPointActionButton, styles.mapPointStartButton]}
              onPress={() => applyMapSelection('start')}
            >
              <Text style={styles.mapPointActionText}>Set as start</Text>
            </Pressable>
            <Pressable
              style={[styles.mapPointActionButton, styles.mapPointEndButton]}
              onPress={() => applyMapSelection('destination')}
            >
              <Text style={styles.mapPointActionText}>Set as destination</Text>
            </Pressable>
            <Pressable
              style={[styles.mapPointActionButton, styles.mapPointReportButton]}
              onPress={handleReportUnsafeLocationFromMapPoint}
            >
              <Text style={styles.mapPointActionText}>Report unsafe location</Text>
            </Pressable>
            <Pressable
              style={[styles.mapPointActionButton, styles.mapPointCancelButton]}
              onPress={closeMapPointModal}
            >
              <Text style={styles.mapPointActionText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {location && (
        <View style={styles.mapControlsContainer} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.controlRoundButton, isNavigationMode && styles.controlRoundButtonActive]}
            onPress={handleCenterOnLocation}
          >
            {isNavigationMode ? (
              <NavigationModeIcon color="#FFFFFF" />
            ) : (
              <CenterLocationIcon color="#2563EB" />
            )}
          </TouchableOpacity>
          <View style={styles.zoomControls}>
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomIn}
              disabled={zoomLevel >= MAX_ZOOM}
            >
              <Text style={styles.zoomButtonText}>+</Text>
            </TouchableOpacity>
            <View style={styles.zoomDivider} />
            <TouchableOpacity
              style={styles.zoomButton}
              onPress={handleZoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
            >
              <Text style={styles.zoomButtonText}>−</Text>
            </TouchableOpacity>
          </View>
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
                    : styles.pillButton
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

            {/* Severity selector */}
            <Text style={styles.modalLabel}>Severity</Text>
            <View style={{ flexDirection: 'row', marginBottom: 8 }}>
              {(['low', 'medium', 'high', 'critical'] as const).map((s, idx) => (
                <Pressable
                  key={s}
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
                  user_id: user?.sub?.replace(/^auth0\|/, '') || 'anonymous',
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
                  const resp = await fetch(FEEDBACK_SUBMIT_URL, {
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

                  Alert.alert('Report submitted', 'Thank you for your feedback.');
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
