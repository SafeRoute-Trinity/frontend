export interface TrustedContact {
  id: string;
  name: string;
  role: string;
  relationship: string;
  phone: string;
  avatarUrl?: string;
}

export const mockContacts: TrustedContact[] = [
  {
    id: '1',
    name: 'Sarah Thompson',
    role: 'Emergency Contact',
    relationship: 'Spouse',
    phone: '+1 555-123-4567',
    avatarUrl: 'https://i.pravatar.cc/150?u=sarah',
  },
  {
    id: '2',
    name: 'Michael Chen',
    role: 'Safety Check-in',
    relationship: 'Friend',
    phone: '+1 555-987-6543',
    avatarUrl: 'https://i.pravatar.cc/150?u=mike',
  },
  {
    id: '3',
    name: 'Emily Rodriguez',
    role: 'Emergency Contact',
    relationship: 'Sister',
    phone: '+1 555-456-7890',
    avatarUrl: 'https://i.pravatar.cc/150?u=emily',
  },
];

export const STORAGE_KEYS = {
  VOICE_GUIDANCE: 'saferoute_voice_guidance',
  UNITS: 'saferoute_units',
};
