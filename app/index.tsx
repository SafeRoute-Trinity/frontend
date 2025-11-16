import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type ServiceStatusState = "idle" | "checking" | "ok" | "error" | "skipped";

type ServiceStatus = {
  state: ServiceStatusState;
  error?: string;
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

const SERVICES: ServiceDefinition[] = [
  {
    id: "auth0",
    name: "Auth0",
    description: "Checks Auth0 tenant availability",
    url: process.env.EXPO_PUBLIC_AUTH0_HEALTH_URL,
  },
  {
    id: "api-gateway",
    name: "API Gateway",
    description: "Verifies the primary API gateway health endpoint",
    url: process.env.EXPO_PUBLIC_API_HEALTH_URL,
  },
  {
    id: "grafana",
    name: "Grafana",
    description: "Verifies Grafana instance is reachable",
    url: process.env.EXPO_PUBLIC_GRAFANA_HEALTH_URL,
  },
  {
    id: "prometheus",
    name: "Prometheus",
    description: "Checks Prometheus metrics endpoint",
    url: process.env.EXPO_PUBLIC_PROMETHEUS_HEALTH_URL,
  },
  {
    id: "postgres",
    name: "PostgreSQL",
    description:
      "Requires a backend-provided health endpoint that confirms DB connectivity",
    url: process.env.EXPO_PUBLIC_POSTGRES_HEALTH_URL,
    requiresProxy: true,
  },
  {
    id: "postgis",
    name: "PostGIS",
    description:
      "Requires backend verification that PostGIS extensions are enabled",
    url: process.env.EXPO_PUBLIC_POSTGIS_HEALTH_URL,
    requiresProxy: true,
  },
  {
    id: "mapbox",
    name: "Mapbox",
    description: "Checks Mapbox SDK/token via a lightweight REST call",
    url: process.env.EXPO_PUBLIC_MAPBOX_HEALTH_URL,
  },
  {
    id: "rabbitmq",
    name: "RabbitMQ",
    description:
      "Needs a backend health bridge that confirms the broker connection",
    url: process.env.EXPO_PUBLIC_RABBITMQ_HEALTH_URL,
    requiresProxy: true,
  },
  {
    id: "redis",
    name: "Redis",
    description:
      "Needs a backend health bridge that checks the cache connectivity",
    url: process.env.EXPO_PUBLIC_REDIS_HEALTH_URL,
    requiresProxy: true,
  },
];

const DEFAULT_TIMEOUT_MS = 8000;

export default function Index() {
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  useEffect(() => {
    setStatuses(
      SERVICES.reduce<Record<string, ServiceStatus>>((acc, service) => {
        acc[service.id] = { state: service.url ? "idle" : "skipped" };
        return acc;
      }, {}),
    );
  }, []);

  const pendingChecks = useMemo(
    () => SERVICES.filter((service) => service.url),
    [],
  );

  const handleCheckAll = useCallback(async () => {
    setIsChecking(true);
    setStatuses((prev) => {
      const next = { ...prev };
      for (const service of SERVICES) {
        next[service.id] = service.url
          ? { state: "checking" }
          : {
              state: "skipped",
              error: "Missing EXPO_PUBLIC_* env for this check",
            };
      }
      return next;
    });

    try {
      const results = await Promise.all(
        SERVICES.map(async (service) => {
          if (!service.url) {
            return {
              id: service.id,
              status: {
                state: "skipped" as ServiceStatusState,
                error: "Missing EXPO_PUBLIC_* env for this check",
              },
            };
          }

          const status = await checkHttpService(service);
          return { id: service.id, status };
        }),
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
  }, []);

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
        <Text style={styles.title}>SafeRoute Connectivity</Text>
        <Text style={styles.subtitle}>
          Quick health snapshot across critical platform services.
        </Text>
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
        <Text style={styles.summary}>
          {formatSummary(statuses, isChecking)}
        </Text>
        {lastCheckedAt ? (
          <Text style={styles.lastChecked}>
            Last checked: {lastCheckedAt.toLocaleTimeString()}
          </Text>
        ) : (
          <Text style={styles.lastChecked}>
            Configure the EXPO_PUBLIC_* environment variables to enable checks.
          </Text>
        )}
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SERVICES.map((service) => {
          const status = statuses[service.id] ?? { state: "idle" };
          return (
            <View key={service.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{service.name}</Text>
                <StatusBadge status={status.state} />
              </View>
              <Text style={styles.cardDescription}>{service.description}</Text>
              {service.requiresProxy && (
                <Text style={styles.cardNote}>
                  Requires backend health endpoint (HTTP) that encapsulates the
                  non-HTTP service.
                </Text>
              )}
              {service.url ? (
                <Text style={styles.cardEndpoint}>{service.url}</Text>
              ) : (
                <Text style={styles.cardMissing}>
                  {`Set EXPO_PUBLIC_${service.id
                    .toUpperCase()
                    .replace(/-/g, "_")}_HEALTH_URL in your Expo config to enable this check.`}
                </Text>
              )}
              {status.state === "error" && status.error && (
                <Text style={styles.cardError}>{status.error}</Text>
              )}
              {status.state === "skipped" && status.error && (
                <Text style={styles.cardNote}>{status.error}</Text>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function StatusBadge({ status }: { status: ServiceStatusState }) {
  const label = STATUS_LABELS[status];
  return (
    <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] }]}>
      <Text style={styles.badgeText}>{label}</Text>
    </View>
  );
}

async function checkHttpService(
  service: ServiceDefinition,
): Promise<ServiceStatus> {
  try {
    const response = await fetchWithTimeout(
      service.url!,
      {
        method: service.method ?? "GET",
        headers: {
          Accept: "application/json",
          ...(service.headers ?? {}),
        },
      },
      service.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    );

    if (!response.ok) {
      const bodyPreview = await safeReadText(response);
      throw new Error(
        `HTTP ${response.status}${
          bodyPreview ? ` – ${truncate(bodyPreview, 120)}` : ""
        }`,
      );
    }

    return { state: "ok" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected error occurred";
    return { state: "error", error: message };
  }
}

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
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
    return "";
  }
}

function truncate(value: string, maxLength: number) {
  return value.length > maxLength
    ? `${value.slice(0, maxLength - 1)}…`
    : value;
}

function formatSummary(
  statuses: Record<string, ServiceStatus>,
  isChecking: boolean,
) {
  if (isChecking) {
    return "Running checks…";
  }

  const total = Object.keys(statuses).length;

  if (!total) {
    return "Awaiting health check configuration.";
  }

  const counts = Object.values(statuses).reduce(
    (acc, status) => {
      acc[status.state] = (acc[status.state] ?? 0) + 1;
      return acc;
    },
    {} as Record<ServiceStatusState, number>,
  );

  return [
    counts.ok ? `${counts.ok} OK` : "",
    counts.error ? `${counts.error} error` : "",
    counts.skipped ? `${counts.skipped} skipped` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

const STATUS_LABELS: Record<ServiceStatusState, string> = {
  idle: "Idle",
  checking: "Checking",
  ok: "OK",
  error: "Error",
  skipped: "Skipped",
};

const STATUS_COLORS: Record<ServiceStatusState, string> = {
  idle: "#9CA3AF",
  checking: "#2563EB",
  ok: "#16A34A",
  error: "#DC2626",
  skipped: "#6B7280",
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: "#CBD5F5",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    backgroundColor: "#1D4ED8",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  summary: {
    color: "#E2E8F0",
    fontSize: 14,
    marginBottom: 4,
  },
  lastChecked: {
    color: "#94A3B8",
    fontSize: 12,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "600",
  },
  cardDescription: {
    color: "#CBD5F5",
    fontSize: 14,
    marginBottom: 6,
  },
  cardNote: {
    color: "#FACC15",
    fontSize: 12,
    marginBottom: 6,
  },
  cardEndpoint: {
    color: "#38BDF8",
    fontSize: 12,
    marginBottom: 6,
    fontFamily: "monospace",
  },
  cardMissing: {
    color: "#F87171",
    fontSize: 12,
    marginBottom: 6,
  },
  cardError: {
    color: "#F87171",
    fontSize: 12,
  },
  badge: {
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    color: "#0F172A",
    fontSize: 12,
    fontWeight: "700",
  },
});

