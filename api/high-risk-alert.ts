import { coreEndpoints } from '../config/core-endpoints';

export interface HighRiskAlertRequest {
  lat: number;
  lng: number;
  radius_m: number;
}

export interface HighRiskAlertMatch {
  id: number | string;
  safety_factor: number;
  distance_m: number;
  geometry?: unknown;
}

export interface HighRiskAlertResponse {
  in_high_risk_area: boolean;
  threshold: number;
  radius_m: number;
  user_location: {
    lat: number;
    lng: number;
  };
  matches: HighRiskAlertMatch[];
}

const truncate = (value: string, maxLength = 160) =>
  value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;

const formatHighRiskError = (status: number, payload: unknown) => {
  if (typeof payload === 'string' && payload.trim()) {
    return `High-risk API ${status}: ${truncate(payload.trim())}`;
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>;
    const detail =
      (typeof record.detail === 'string' && record.detail) ||
      (typeof record.message === 'string' && record.message) ||
      (typeof record.error === 'string' && record.error) ||
      '';

    if (detail) {
      return `High-risk API ${status}: ${truncate(detail)}`;
    }
  }

  return `High-risk API ${status}`;
};

export const checkHighRiskAlert = async (
  payload: HighRiskAlertRequest
): Promise<HighRiskAlertResponse> => {
  const response = await fetch(coreEndpoints.highRiskAlertUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text().catch(() => '');
  let data: unknown = null;

  if (responseText.trim()) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  if (!response.ok) {
    throw new Error(formatHighRiskError(response.status, data));
  }

  return data as HighRiskAlertResponse;
};
