/**
 * Centralized route constants to avoid hardcoded paths and typos
 */
export const ROUTES = {
  // Tab routes
  HOME: '/(tabs)/(home)' as const,
  CAPTURE: '/(tabs)/capture' as const,
  ALBUMS: '/(tabs)/albums' as const,
  GROUPS: '/(tabs)/groups' as const,
  PROFILE: '/(tabs)/profile' as const,

  // Modal routes
  MODAL: '/modal' as const,
  SETTINGS: '/settings' as const,
  NOTIFICATIONS: '/notifications' as const,
  QR_SCAN: '/qr-scan' as const,
  ONBOARDING: '/onboarding' as const,

  // Dynamic routes
  ALBUM_DETAIL: (id: string) => `/album/${id}` as const,
  ALBUM_MINI_FILM: (id: string) => `/album/${id}/mini-film` as const,
  ALBUM_COVER_EDITOR: (id: string) => `/album/${id}/cover-editor` as const,
  GROUP_DETAIL: (id: string) => `/group/${id}` as const,
  PHOTO_DETAIL: (uri: string) => `/photo/${encodeURIComponent(uri)}` as const,

  // Feature routes
  CREATE_EVENT: '/create-event' as const,
  NOTIFICATION_SETTINGS: '/notification-settings' as const,
  ANALYTICS: '/analytics' as const,
  SOCIAL_SHARE: '/social-share' as const,
  COLLABORATION: '/collaboration' as const,
  VIDEO_STUDIO: '/video-studio' as const,
  AI_SUGGESTIONS: '/ai-suggestions' as const,
  CLOUDINARY_TEST: '/cloudinary-test' as const,
  INTEGRATIONS_TEST: '/integrations-test' as const,
  PERFORMANCE_DASHBOARD: '/performance-dashboard' as const,
  SUPABASE_TEST: '/supabase-test' as const,
  BACKUP_CLOUD: '/backup-cloud' as const,
  IMAGE_FILTERS: '/image-filters' as const,
  EXPORT_ADVANCED: '/export-advanced' as const,
} as const;

/**
 * Navigation helpers
 */
export const navigateToAlbum = (id: string) => ROUTES.ALBUM_DETAIL(id);
export const navigateToGroup = (id: string) => ROUTES.GROUP_DETAIL(id);
export const navigateToPhoto = (uri: string) => ROUTES.PHOTO_DETAIL(uri);

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