/**
 * Centralized route constants to avoid hardcoded paths and typos
 */
export const ROUTES = {
  // Main tabs
  HOME: '/',
  ALBUMS: '/albums',
  GROUPS: '/groups',
  CAPTURE: '/capture',
  PROFILE: '/profile',
  
  // Modal screens
  MODAL: '/modal',
  SETTINGS: '/settings',
  QR_SCAN: '/qr-scan',
  NOTIFICATIONS: '/notifications',
  NOTIFICATION_SETTINGS: '/notification-settings',
  
  // Onboarding
  ONBOARDING: '/onboarding',
  
  // Album related
  ALBUM_DETAIL: (id: string) => `/album/${id}`,
  ALBUM_MINI_FILM: (id: string) => `/album/${id}/mini-film`,
  ALBUM_COVER_EDITOR: (id: string) => `/album/${id}/cover-editor`,
  
  // Group related
  GROUP_DETAIL: (id: string) => `/group/${id}`,
  
  // Photo related
  PHOTO_DETAIL: (id: string) => `/photo/${id}`,
  
  // Features
  CREATE_EVENT: '/create-event',
  ANALYTICS: '/analytics',
  SOCIAL_SHARE: '/social-share',
  COLLABORATION: '/collaboration',
  VIDEO_STUDIO: '/video-studio',
  AI_SUGGESTIONS: '/ai-suggestions',
  CLOUDINARY_TEST: '/cloudinary-test',
  INTEGRATIONS_TEST: '/integrations-test',
  PERFORMANCE_DASHBOARD: '/performance-dashboard',
  SUPABASE_TEST: '/supabase-test',
  BACKUP_CLOUD: '/backup-cloud',
  IMAGE_FILTERS: '/image-filters',
  EXPORT_ADVANCED: '/export-advanced',
} as const;

/**
 * Navigation helpers
 */
export const navigateToAlbum = (id: string) => ROUTES.ALBUM_DETAIL(id);
export const navigateToGroup = (id: string) => ROUTES.GROUP_DETAIL(id);
export const navigateToPhoto = (id: string) => ROUTES.PHOTO_DETAIL(id);

/**
 * Route validation
 */
export const isValidRoute = (route: string): boolean => {
  const staticRoutes = Object.values(ROUTES).filter(r => typeof r === 'string') as string[];
  return staticRoutes.includes(route);
};

export type RouteKey = keyof typeof ROUTES;
export type StaticRoute = Extract<typeof ROUTES[RouteKey], string>;
export type DynamicRoute = Extract<typeof ROUTES[RouteKey], (...args: any[]) => string>;