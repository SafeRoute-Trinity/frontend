import { SOS_API_URL } from '../config/api';
import { getDeviceId } from '../utils/device';
import { storage } from '../utils/storage';
import { AUTH_KEYS } from './client';

/* eslint-disable no-console */

// ── Request / Response types ────────────────────────────────────────────────

interface SOSContactPayload {
  name: string;
  phone: string;
}

interface LocationPayload {
  lat: number;
  lon: number;
  accuracy_m?: number;
}

export interface EmergencySMSRequest {
  sos_id: string;
  user_id: string;
  location?: LocationPayload | null;
  emergency_contact: SOSContactPayload;
  message_template?: string | null;
  variables: Record<string, string>;
  notification_type?: string;
  locale?: string;
}

export interface EmergencySMSResponse {
  emergency_id: string;
  status: 'sent' | 'failed';
  sms_id: string;
  timestamp: string;
  message_sent: string;
  recipient: string;
}

// ── Helper ──────────────────────────────────────────────────────────────────

async function sosFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${SOS_API_URL}${path}`;

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const accessToken = await storage.getItem(AUTH_KEYS.ACCESS_TOKEN);
  const deviceId = await getDeviceId();
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (deviceId) headers.set('X-Device-Id', deviceId);

  console.log(`🚨 [SOS] ${options.method ?? 'GET'} ${url}`);

  return fetch(url, { ...options, headers });
}

// ── API functions ───────────────────────────────────────────────────────────

/**
 * Send an emergency SMS to the primary contact via the SOS service.
 */
export async function sendEmergencySMS(
  payload: EmergencySMSRequest
): Promise<EmergencySMSResponse> {
  const response = await sosFetch('/v1/emergency/sms', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Emergency SMS failed: ${errorText}`);
  }

  return response.json();
}
