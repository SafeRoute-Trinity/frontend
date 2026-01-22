import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

type ServiceStatusState = 'idle' | 'checking' | 'ok' | 'error' | 'skipped';

type ServiceStatus = {
  state: ServiceStatusState;
  error?: string;
  requestData?: {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  responseData?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
  };
};

type ServiceDefinition = {
  id: string;
  name: string;
  description: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
  requiresProxy?: boolean;
};

// Get services with environment variables - evaluated at runtime
const getServices = (): ServiceDefinition[] => [
  {
    id: 'user-management',
    name: 'User Management',
    description: 'Checks user management service health endpoint',
    url: process.env.EXPO_PUBLIC_USER_MANAGEMENT_HEALTH_URL || undefined,
  },
  {
    id: 'notification-service',
    name: 'Notification Service',
    description: 'Verifies notification service health endpoint',
    url: process.env.EXPO_PUBLIC_NOTIFICATION_SERVICE_HEALTH_URL || undefined,
  },
  {
    id: 'routing-service',
    name: 'Routing Service',
    description: 'Checks routing service health endpoint',
    url: process.env.EXPO_PUBLIC_ROUTING_SERVICE_HEALTH_URL || undefined,
  },
  {
    id: 'feedback-service',
    name: 'Feedback Service',
    description: 'Verifies feedback service health endpoint',
    url: process.env.EXPO_PUBLIC_FEEDBACK_SERVICE_HEALTH_URL || undefined,
  },
  {
    id: 'sos-service',
    name: 'SOS Service',
    description: 'Checks SOS (emergency) service health endpoint',
    url: process.env.EXPO_PUBLIC_SOS_SERVICE_HEALTH_URL || undefined,
  },
];

const SERVICES = getServices();

const DEFAULT_TIMEOUT_MS = 8000;

export default function Health() {
  const router = useRouter();
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);

  // Get services dynamically to ensure env vars are read at runtime
  const services = useMemo(() => getServices(), []);

  useEffect(() => {
    setStatuses(
      services.reduce<Record<string, ServiceStatus>>((acc, service) => {
        acc[service.id] = { state: service.url ? 'idle' : 'skipped' };
        return acc;
      }, {})
    );
  }, [services]);

  const pendingChecks = useMemo(() => services.filter((service) => service.url), [services]);

  const handleCheckAll = useCallback(async () => {
    setIsChecking(true);
    setStatuses((prev) => {
      const next = { ...prev };
      for (const service of services) {
        next[service.id] = service.url
          ? { state: 'checking' }
          : {
              state: 'skipped',
              error: 'Missing EXPO_PUBLIC_* env for this check',
            };
      }
      return next;
    });

    try {
      const results = await Promise.all(
        services.map(async (service) => {
          if (!service.url) {
            return {
              id: service.id,
              status: {
                state: 'skipped' as ServiceStatusState,
                error: 'Missing EXPO_PUBLIC_* env for this check',
              },
            };
          }

          const status = await checkHttpService(service);
          return { id: service.id, status };
        })
      );

      setStatuses((prev) => {
        const next = { ...prev };
        for (const result of results) {
          next[result.id] = result.status;
        }
        return next;
      });
      setLastCheckedAt(new Date());
    } finally {
      setIsChecking(false);
    }
  }, [services]);

  useEffect(() => {
    if (pendingChecks.length > 0) {
      handleCheckAll().catch(() => {
        // errors handled per-service; this catch prevents unhandled rejections
      });
    }
  }, [handleCheckAll, pendingChecks.length]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>SafeRoute Connectivity</Text>
            <Text style={styles.subtitle}>
              Quick health snapshot across critical platform services.
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isChecking}
          onPress={handleCheckAll}
          style={({ pressed }) => [
            styles.button,
            isChecking && styles.buttonDisabled,
            pressed && !isChecking && styles.buttonPressed,
          ]}
        >
          {isChecking ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Run health checks</Text>
          )}
        </Pressable>
        <Text style={styles.summary}>{formatSummary(statuses, isChecking)}</Text>
        {lastCheckedAt ? (
          <Text style={styles.lastChecked}>Last checked: {lastCheckedAt.toLocaleTimeString()}</Text>
        ) : (
          <Text style={styles.lastChecked}>
            Configure the EXPO_PUBLIC_* environment variables to enable checks.
          </Text>
        )}
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {services.map((service) => {
          const status = statuses[service.id] ?? { state: 'idle' };
          const isExpanded = expandedService === service.id;
          return (
            <Pressable
              key={service.id}
              onPress={() => setExpandedService(isExpanded ? null : service.id)}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Text style={styles.cardTitle}>{service.name}</Text>
                  {isExpanded && <Text style={styles.expandIndicator}>▼</Text>}
                  {!isExpanded && <Text style={styles.expandIndicator}>▶</Text>}
                </View>
                <StatusBadge status={status.state} />
              </View>
              <Text style={styles.cardDescription}>{service.description}</Text>
              {service.requiresProxy && (
                <Text style={styles.cardNote}>
                  Requires backend health endpoint (HTTP) that encapsulates the non-HTTP service.
                </Text>
              )}
              {service.url ? (
                <Text style={styles.cardEndpoint}>{service.url}</Text>
              ) : (
                <Text style={styles.cardMissing}>
                  {`Set EXPO_PUBLIC_${service.id
                    .toUpperCase()
                    .replace(/-/g, '_')}_HEALTH_URL in your Expo config to enable this check.`}
                </Text>
              )}
              {status.state === 'error' && status.error && (
                <Text style={styles.cardError}>{status.error}</Text>
              )}
              {status.state === 'skipped' && status.error && (
                <Text style={styles.cardNote}>{status.error}</Text>
              )}

              {/* Expanded JSON View */}
              {isExpanded && (status.requestData || status.responseData) && (
                <View style={styles.expandedContent}>
                  {status.requestData && (
                    <View style={styles.jsonSection}>
                      <Text style={styles.jsonSectionTitle}>Request</Text>
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator
                        showsHorizontalScrollIndicator
                        style={styles.jsonContainer}
                        contentContainerStyle={styles.jsonContent}
                      >
                        <Text style={styles.jsonText}>
                          {JSON.stringify(status.requestData, null, 2)}
                        </Text>
                      </ScrollView>
                    </View>
                  )}
                  {status.responseData && (
                    <View style={styles.jsonSection}>
                      <Text style={styles.jsonSectionTitle}>
                        Response ({status.responseData.status} {status.responseData.statusText})
                      </Text>
                      <ScrollView
                        nestedScrollEnabled
                        showsVerticalScrollIndicator
                        showsHorizontalScrollIndicator
                        style={styles.jsonContainer}
                        contentContainerStyle={styles.jsonContent}
                      >
                        <Text style={styles.jsonText}>
                          {formatJsonResponse(status.responseData.body)}
                        </Text>
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const StatusBadge = ({ status }: { status: ServiceStatusState }) => {
  const label = STATUS_LABELS[status];
  return (
    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
};

async function checkHttpService(service: ServiceDefinition): Promise<ServiceStatus> {
  const requestHeaders = {
    Accept: 'application/json',
    ...(service.headers ?? {}),
  };

  const requestData = {
    url: service.url!,
    method: service.method ?? 'GET',
    headers: requestHeaders,
  };

  try {
    const response = await fetchWithTimeout(
      service.url!,
      {
        method: service.method ?? 'GET',
        headers: requestHeaders,
      },
      service.timeoutMs ?? DEFAULT_TIMEOUT_MS
    );

    // Get response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    // Get response body
    const bodyText = await safeReadText(response);

    const responseData = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: bodyText,
    };

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}${bodyText ? ` – ${truncate(bodyText, 120)}` : ''}`);
    }

    return {
      state: 'ok',
      requestData,
      responseData,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error occurred';
    return {
      state: 'error',
      error: message,
      requestData,
    };
  }
}

function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timed out after ${timeoutMs} ms`));
    }, timeoutMs);

    fetch(url, options)
      .then((response) => {
        clearTimeout(timeoutId);
        resolve(response);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}…` : value;
}

function formatJsonResponse(body: string): string {
  try {
    // Try to parse as JSON and format it
    const parsed = JSON.parse(body);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // If not valid JSON, return as-is
    return body;
  }
}

function formatSummary(statuses: Record<string, ServiceStatus>, isChecking: boolean) {
  if (isChecking) {
    return 'Running checks…';
  }

  const total = Object.keys(statuses).length;

  if (!total) {
    return 'Awaiting health check configuration.';
  }

  const counts = Object.values(statuses).reduce(
    (acc, status) => {
      acc[status.state] = (acc[status.state] ?? 0) + 1;
      return acc;
    },
    {} as Record<ServiceStatusState, number>
  );

  return [
    counts.ok ? `${counts.ok} OK` : '',
    counts.error ? `${counts.error} error` : '',
    counts.skipped ? `${counts.skipped} skipped` : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

const STATUS_LABELS: Record<ServiceStatusState, string> = {
  idle: 'Idle',
  checking: 'Checking',
  ok: 'OK',
  error: 'Error',
  skipped: 'Skipped',
};

const STATUS_COLORS: Record<ServiceStatusState, string> = {
  idle: '#9CA3AF',
  checking: '#2563EB',
  ok: '#16A34A',
  error: '#DC2626',
  skipped: '#6B7280',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  header: {
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    marginRight: 16,
  },
  backButton: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#475569',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#CBD5F5',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    backgroundColor: '#1D4ED8',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  summary: {
    color: '#E2E8F0',
    fontSize: 14,
    marginBottom: 4,
  },
  lastChecked: {
    color: '#94A3B8',
    fontSize: 12,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardPressed: {
    opacity: 0.9,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  expandIndicator: {
    color: '#94A3B8',
    fontSize: 10,
    marginLeft: 8,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '600',
  },
  cardDescription: {
    color: '#CBD5F5',
    fontSize: 14,
    marginBottom: 6,
  },
  cardNote: {
    color: '#FACC15',
    fontSize: 12,
    marginBottom: 6,
  },
  cardEndpoint: {
    color: '#38BDF8',
    fontSize: 12,
    marginBottom: 6,
    fontFamily: 'monospace',
  },
  cardMissing: {
    color: '#F87171',
    fontSize: 12,
    marginBottom: 6,
  },
  cardError: {
    color: '#F87171',
    fontSize: 12,
  },
  badge: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '700',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  jsonSection: {
    marginBottom: 12,
  },
  jsonSectionTitle: {
    color: '#CBD5F5',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  jsonContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 12,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#334155',
  },
  jsonContent: {
    paddingRight: 8,
  },
  jsonText: {
    color: '#38BDF8',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
});
