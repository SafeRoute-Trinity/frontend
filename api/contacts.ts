import type { ITrustedContact } from '../constants/mockData';
import { apiClient } from './client';

/* eslint-disable no-console */

// ── Response types ──────────────────────────────────────────────────────────

interface PaginationInfo {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

interface TrustedContactsListResponse {
  user_id: string;
  data: ITrustedContact[];
  pagination: PaginationInfo;
}

interface TrustedContactUpsertResponse {
  user_id: string;
  status: string;
  contact: ITrustedContact;
  updated_at: string;
}

interface TrustedContactsSetResponse {
  user_id: string;
  status: string;
  contacts: ITrustedContact[];
  updated_at: string;
}

// ── Request types ───────────────────────────────────────────────────────────

export interface CreateContactPayload {
  name: string;
  phone: string;
  relationship?: string | null;
  is_primary?: boolean;
}

// ── API functions ───────────────────────────────────────────────────────────

/**
 * Fetch all trusted contacts for a user (paginated).
 */
export async function fetchTrustedContacts(
  userId: string,
  page: number = 1,
  pageSize: number = 50
): Promise<TrustedContactsListResponse> {
  const response = await apiClient.get(
    `/v1/users/${encodeURIComponent(userId)}/trusted-contacts?page=${page}&page_size=${pageSize}`
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to fetch contacts: ${errorText}`);
  }

  return response.json();
}

/**
 * Create or update a single trusted contact (upserts by user_id + phone).
 */
export async function upsertTrustedContact(
  userId: string,
  payload: CreateContactPayload
): Promise<TrustedContactUpsertResponse> {
  const response = await apiClient.post(
    `/v1/users/${encodeURIComponent(userId)}/trusted-contacts`,
    payload
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    const message =
      typeof errorData.detail === 'string'
        ? errorData.detail
        : JSON.stringify(errorData.detail ?? errorData);
    throw new Error(message);
  }

  return response.json();
}

/**
 * Replace all trusted contacts with a new list (bulk set).
 * Used for removing a contact: pass the full list minus the removed one.
 */
export async function replaceTrustedContacts(
  userId: string,
  contacts: CreateContactPayload[]
): Promise<TrustedContactsSetResponse> {
  const response = await apiClient.put(
    `/v1/users/${encodeURIComponent(userId)}/trusted-contacts`,
    { contacts }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to update contacts: ${errorText}`);
  }

  return response.json();
}
