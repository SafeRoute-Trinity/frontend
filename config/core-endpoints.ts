export type ApiProfile = 'local' | 'public';

type CoreEndpoints = {
  backendBaseUrl: string;
  userManagementHealthUrl: string;
  notificationServiceHealthUrl: string;
  routingServiceHealthUrl: string;
  feedbackServiceHealthUrl: string;
  sosServiceHealthUrl: string;
  feedbackSubmitUrl: string;
  transitPlanUrl: string;
};

const LOCAL_ENDPOINTS: CoreEndpoints = {
  backendBaseUrl: 'http://127.0.0.1:20000',
  userManagementHealthUrl: 'http://127.0.0.1:20000/health',
  notificationServiceHealthUrl: 'http://127.0.0.1:20001/health',
  routingServiceHealthUrl: 'http://127.0.0.1:20002/health',
  feedbackServiceHealthUrl: 'http://127.0.0.1:20004/health',
  sosServiceHealthUrl: 'http://127.0.0.1:20006/health',
  feedbackSubmitUrl: 'http://127.0.0.1:20004/v1/feedback/submit',
  transitPlanUrl: 'http://127.0.0.1:20002/v1/transit/plan',
};

const PUBLIC_ENDPOINTS: CoreEndpoints = {
  backendBaseUrl: 'https://api.saferoute.app',
  userManagementHealthUrl: 'https://saferoutemap.duckdns.org/health/user-management',
  notificationServiceHealthUrl: 'https://saferoutemap.duckdns.org/health/notification',
  routingServiceHealthUrl: 'https://saferoutemap.duckdns.org/health/routing',
  feedbackServiceHealthUrl: 'https://saferoutemap.duckdns.org/health/feedback',
  sosServiceHealthUrl: 'https://saferoutemap.duckdns.org/health/sos',
  feedbackSubmitUrl: 'https://saferoutemap.duckdns.org/v1/feedback/submit',
  transitPlanUrl: 'https://saferoutemap.duckdns.org/v1/transit/plan',
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

export const coreEndpoints: CoreEndpoints = {
  backendBaseUrl: pickValue(process.env.EXPO_PUBLIC_BACKEND_URL, profileDefaults.backendBaseUrl),
  userManagementHealthUrl: pickValue(
    process.env.EXPO_PUBLIC_USER_MANAGEMENT_HEALTH_URL,
    profileDefaults.userManagementHealthUrl
  ),
  notificationServiceHealthUrl: pickValue(
    process.env.EXPO_PUBLIC_NOTIFICATION_SERVICE_HEALTH_URL,
    profileDefaults.notificationServiceHealthUrl
  ),
  routingServiceHealthUrl: pickValue(
    process.env.EXPO_PUBLIC_ROUTING_SERVICE_HEALTH_URL,
    profileDefaults.routingServiceHealthUrl
  ),
  feedbackServiceHealthUrl: pickValue(
    process.env.EXPO_PUBLIC_FEEDBACK_SERVICE_HEALTH_URL,
    profileDefaults.feedbackServiceHealthUrl
  ),
  sosServiceHealthUrl: pickValue(
    process.env.EXPO_PUBLIC_SOS_SERVICE_HEALTH_URL,
    profileDefaults.sosServiceHealthUrl
  ),
  feedbackSubmitUrl: pickValue(
    process.env.EXPO_PUBLIC_FEEDBACK_SUBMIT_URL,
    profileDefaults.feedbackSubmitUrl
  ),
  transitPlanUrl: pickValue(
    process.env.EXPO_PUBLIC_TRANSIT_PLAN_URL,
    profileDefaults.transitPlanUrl
  ),
};
