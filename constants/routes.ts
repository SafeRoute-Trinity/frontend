// Tab names for navigation
export enum TabNames {
  INDEX = 'index',
  ALERTS = 'alerts',
  PROFILE = 'profile',
  PERSONAL_INFO = 'personal-info',
  HELP = 'help',
}

// Route paths for app navigation
export enum Routes {
  TABS = '/(tabs)',
  LOGIN = '/login',
  REGISTER = '/register',
  HEALTH = '/health',
}

// Input focus types for modals
export type InputFocusType = 'help' | 'feedback' | null;
