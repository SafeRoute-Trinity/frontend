export interface ITrustedContact {
  contact_id: string;
  user_id: string;
  name: string;
  phone: string;
  relationship: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export const STORAGE_KEYS = {
  VOICE_GUIDANCE: 'saferoute_voice_guidance',
  UNITS: 'saferoute_units',
};
