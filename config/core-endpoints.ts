import { Platform } from 'react-native';

export type ApiProfile = 'local' | 'public';

type CoreEndpoints = {
  backendBaseUrl: string;
  highRiskAlertUrl: string;
  routeCalculateUrl: string;
  transitPlanUrl: string;
  feedbackSubmitUrl: string;
  sosBaseUrl: string;
  userManagementHealthUrl: string;
  notificationServiceHealthUrl: string;
  routingServiceHealthUrl: string;
  feedbackServiceHealthUrl: string;
  sosServiceHealthUrl: string;
};

const localHost = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';
const localUrl = (port: number, path = '') => `http://${localHost}:${port}${path}`;

const LOCAL_ENDPOINTS: CoreEndpoints = {
  backendBaseUrl: localUrl(20000),
  highRiskAlertUrl: localUrl(20002, '/api/high_risk_alert'),
  routeCalculateUrl: localUrl(20000, '/v1/routes/calculate'),
  transitPlanUrl: localUrl(20002, '/v1/transit/plan'),
  feedbackSubmitUrl: localUrl(20004, '/v1/feedback/submit'),
  sosBaseUrl: localUrl(20006),
  userManagementHealthUrl: localUrl(20000, '/health'),
  notificationServiceHealthUrl: localUrl(20001, '/health'),
  routingServiceHealthUrl: localUrl(20002, '/health'),
  feedbackServiceHealthUrl: localUrl(20004, '/health'),
  sosServiceHealthUrl: localUrl(20006, '/health'),
};

const PUBLIC_ENDPOINTS: CoreEndpoints = {
  backendBaseUrl: 'https://saferoutemap.duckdns.org',
  highRiskAlertUrl: 'https://api.saferoute.app/api/high_risk_alert',
  routeCalculateUrl: 'https://api.saferoute.app/v1/routes/calculate',
  transitPlanUrl: 'https://saferoutemap.duckdns.org/v1/transit/plan',
  feedbackSubmitUrl: 'https://saferoutemap.duckdns.org/v1/feedback/submit',
  sosBaseUrl: 'https://saferoutemap.duckdns.org',
  userManagementHealthUrl: 'https://saferoutemap.duckdns.org/health/user-management',
  notificationServiceHealthUrl: 'https://saferoutemap.duckdns.org/health/notification',
  routingServiceHealthUrl: 'https://saferoutemap.duckdns.org/health/routing',
  feedbackServiceHealthUrl: 'https://saferoutemap.duckdns.org/health/feedback',
  sosServiceHealthUrl: 'https://saferoutemap.duckdns.org/health/sos',
};

const rawProfile = process.env.EXPO_PUBLIC_API_PROFILE?.trim().toLowerCase();
export const API_PROFILE: ApiProfile = rawProfile === 'public' ? 'public' : 'local';
const isProfileExplicit = Boolean(rawProfile);

const profileDefaults = API_PROFILE === 'public' ? PUBLIC_ENDPOINTS : LOCAL_ENDPOINTS;

const pickValue = (envValue: string | undefined, fallbackValue: string): string => {
  if (isProfileExplicit) {
    return fallbackValue;
  }
  return envValue || fallbackValue;
};

const pickFirstDefined = (...values: Array<string | undefined>) => values.find(Boolean)?.trim();

export const coreEndpoints: CoreEndpoints = {
  backendBaseUrl:
    pickFirstDefined(
      process.env.EXPO_PUBLIC_BACKEND_URL,
      process.env.EXPO_PUBLIC_API_BASE_URL
    ) || pickValue(process.env.EXPO_PUBLIC_API_URL, profileDefaults.backendBaseUrl),
  highRiskAlertUrl:
    pickFirstDefined(process.env.EXPO_PUBLIC_HIGH_RISK_ALERT_URL) ||
    profileDefaults.highRiskAlertUrl,
  routeCalculateUrl:
    pickFirstDefined(
      process.env.EXPO_PUBLIC_ROUTE_CALCULATE_URL,
      process.env.EXPO_PUBLIC_ROUTING_API_URL
    ) || profileDefaults.routeCalculateUrl,
  transitPlanUrl:
    pickValue(process.env.EXPO_PUBLIC_TRANSIT_PLAN_URL, profileDefaults.transitPlanUrl),
  feedbackSubmitUrl:
    pickValue(process.env.EXPO_PUBLIC_FEEDBACK_SUBMIT_URL, profileDefaults.feedbackSubmitUrl),
  sosBaseUrl:
    pickFirstDefined(
      process.env.EXPO_PUBLIC_SOS_API_URL,
      process.env.EXPO_PUBLIC_NOTIFICATION_API_URL
    ) || profileDefaults.sosBaseUrl,
  userManagementHealthUrl:
    pickValue(
      process.env.EXPO_PUBLIC_USER_MANAGEMENT_HEALTH_URL,
      profileDefaults.userManagementHealthUrl
    ),
  notificationServiceHealthUrl:
    pickValue(
      process.env.EXPO_PUBLIC_NOTIFICATION_SERVICE_HEALTH_URL,
      profileDefaults.notificationServiceHealthUrl
    ),
  routingServiceHealthUrl:
    pickValue(
      process.env.EXPO_PUBLIC_ROUTING_SERVICE_HEALTH_URL,
      profileDefaults.routingServiceHealthUrl
    ),
  feedbackServiceHealthUrl:
    pickValue(
      process.env.EXPO_PUBLIC_FEEDBACK_SERVICE_HEALTH_URL,
      profileDefaults.feedbackServiceHealthUrl
    ),
  sosServiceHealthUrl:
    pickValue(process.env.EXPO_PUBLIC_SOS_SERVICE_HEALTH_URL, profileDefaults.sosServiceHealthUrl),
};
