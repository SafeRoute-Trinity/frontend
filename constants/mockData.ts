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
];

export const STORAGE_KEYS = {
  SAFE_ROUTING_MODE: 'saferoute_safe_routing_mode',
  RISK_SENSITIVITY: 'saferoute_risk_sensitivity',
};
