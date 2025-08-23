import { ConvexReactClient, useMutation, useQuery } from 'convex/react';

// Configuration Convex avec l'URL fournie
const CONVEX_URL = process.env.EXPO_PUBLIC_CONVEX_URL || 'https://flexible-otter-858.convex.cloud';

// Client Convex pour les requêtes non-React
export const convexClient = new ConvexReactClient(CONVEX_URL);

// Initialize Convex client
console.log('🔗 [Convex] Initializing client with URL:', CONVEX_URL);

// Types pour les données Memoria
export interface MemoriaPhoto {
  _id: string;
  _creationTime: number;
  userId: string;
  albumId?: string;
  groupId?: string;
  cloudinaryUrl: string;
  cloudinaryPublicId: string;
  originalUri: string;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    faces?: number;
    labels?: string[];
    timestamp: number;
  };
  isPrivate: boolean;
  tags: string[];
  description?: string;
}

export interface MemoriaAlbum {
  _id: string;
  _creationTime: number;
  userId: string;
  groupId?: string;
  title: string;
  description?: string;
  coverPhotoId?: string;
  photoIds: string[];
  isPrivate: boolean;
  tags: string[];
  collaborators: string[];
  settings: {
    allowComments: boolean;
    allowDownload: boolean;
    autoAddPhotos: boolean;
  };
}

export interface MemoriaGroup {
  _id: string;
  _creationTime: number;
  ownerId: string;
  name: string;
  description?: string;
  coverPhotoId?: string;
  memberIds: string[];
  albumIds: string[];
  isPrivate: boolean;
  settings: {
    allowMemberInvites: boolean;
    autoApproveJoins: boolean;
    allowMemberUploads: boolean;
  };
  inviteCode?: string;
}

export interface MemoriaUser {
  _id: string;
  _creationTime: number;
  authId: string;
  email: string;
  name: string;
  picture?: string;
  nickname?: string;
  preferences: {
    autoUpload: boolean;
    compressionLevel: 'low' | 'medium' | 'high';
    geotagging: boolean;
    faceDetection: boolean;
    notifications: {
      newPhotos: boolean;
      albumUpdates: boolean;
      groupInvites: boolean;
    };
  };
  stats: {
    photosUploaded: number;
    albumsCreated: number;
    groupsJoined: number;
  };
}

export interface MemoriaEvent {
  _id: string;
  _creationTime: number;
  userId: string;
  groupId?: string;
  albumId?: string;
  type: 'photo_uploaded' | 'album_created' | 'group_joined' | 'face_detected' | 'location_tagged';
  data: Record<string, any>;
  timestamp: number;
}

// Note: Les hooks Convex nécessitent la configuration des fonctions backend
// Ces hooks seront fonctionnels une fois le backend Convex configuré

/**
 * Hook pour uploader une photo avec métadonnées
 */
export function useUploadPhoto() {
  // return useMutation(api.photos.upload);
  console.log('📤 [Convex] useUploadPhoto hook called');
  return null;
}

/**
 * Hook pour récupérer les photos d'un utilisateur
 */
export function useUserPhotos(userId: string) {
  // return useQuery(api.photos.getUserPhotos, { userId });
  console.log('📸 [Convex] useUserPhotos hook called for user:', userId);
  return null;
}

/**
 * Hook pour récupérer les photos d'un album
 */
export function useAlbumPhotos(albumId: string) {
  // return useQuery(api.photos.getAlbumPhotos, { albumId });
  console.log('📁 [Convex] useAlbumPhotos hook called for album:', albumId);
  return null;
}

/**
 * Hook pour récupérer les photos d'un groupe
 */
export function useGroupPhotos(groupId: string) {
  // return useQuery(api.photos.getGroupPhotos, { groupId });
  console.log('👥 [Convex] useGroupPhotos hook called for group:', groupId);
  return null;
}

/**
 * Hook pour créer un album
 */
export function useCreateAlbum() {
  // return useMutation(api.albums.create);
  console.log('📁 [Convex] useCreateAlbum hook called');
  return null;
}

/**
 * Hook pour récupérer les albums d'un utilisateur
 */
export function useUserAlbums(userId: string) {
  // return useQuery(api.albums.getUserAlbums, { userId });
  console.log('📚 [Convex] useUserAlbums hook called for user:', userId);
  return null;
}

/**
 * Hook pour mettre à jour un album
 */
export function useUpdateAlbum() {
  // return useMutation(api.albums.update);
  console.log('✏️ [Convex] useUpdateAlbum hook called');
  return null;
}

/**
 * Hook pour supprimer un album
 */
export function useDeleteAlbum() {
  // return useMutation(api.albums.delete);
  console.log('🗑️ [Convex] useDeleteAlbum hook called');
  return null;
}

/**
 * Hook pour créer un groupe
 */
export function useCreateGroup() {
  // return useMutation(api.groups.create);
  console.log('👥 [Convex] useCreateGroup hook called');
  return null;
}

/**
 * Hook pour récupérer les groupes d'un utilisateur
 */
export function useUserGroups(userId: string) {
  // return useQuery(api.groups.getUserGroups, { userId });
  console.log('👥 [Convex] useUserGroups hook called for user:', userId);
  return null;
}

/**
 * Hook pour rejoindre un groupe
 */
export function useJoinGroup() {
  // return useMutation(api.groups.join);
  console.log('🤝 [Convex] useJoinGroup hook called');
  return null;
}

/**
 * Hook pour quitter un groupe
 */
export function useLeaveGroup() {
  // return useMutation(api.groups.leave);
  console.log('👋 [Convex] useLeaveGroup hook called');
  return null;
}

/**
 * Hook pour créer/mettre à jour un utilisateur
 */
export function useUpsertUser() {
  // return useMutation(api.users.upsert);
  console.log('👤 [Convex] useUpsertUser hook called');
  return null;
}

/**
 * Hook pour récupérer un utilisateur par son authId
 */
export function useUserByAuthId(authId: string) {
  // return useQuery(api.users.getByAuthId, { authId });
  console.log('🔍 [Convex] useUserByAuthId hook called for authId:', authId);
  return null;
}

/**
 * Hook pour mettre à jour les préférences utilisateur
 */
export function useUpdateUserPreferences() {
  // return useMutation(api.users.updatePreferences);
  console.log('⚙️ [Convex] useUpdateUserPreferences hook called');
  return null;
}

/**
 * Hook pour récupérer les événements récents
 */
export function useRecentEvents(userId: string, limit: number = 20) {
  // return useQuery(api.events.getRecent, { userId, limit });
  console.log('📅 [Convex] useRecentEvents hook called for user:', userId, 'limit:', limit);
  return null;
}

/**
 * Hook pour créer un événement
 */
export function useCreateEvent() {
  // return useMutation(api.events.create);
  console.log('📅 [Convex] useCreateEvent hook called');
  return null;
}

/**
 * Hook pour rechercher des photos par mots-clés
 */
export function useSearchPhotos(query: string, userId: string) {
  // return useQuery(api.photos.search, { query, userId });
  console.log('🔍 [Convex] useSearchPhotos hook called with query:', query, 'for user:', userId);
  return null;
}

/**
 * Hook pour récupérer les photos par géolocalisation
 */
export function usePhotosNearLocation(
  latitude: number,
  longitude: number,
  radiusKm: number,
  userId: string
) {
  // return useQuery(api.photos.getNearLocation, { latitude, longitude, radiusKm, userId });
  console.log('📍 [Convex] usePhotosNearLocation hook called for location:', { latitude, longitude, radiusKm }, 'user:', userId);
  return null;
}

/**
 * Hook pour récupérer les photos avec des visages détectés
 */
export function usePhotosWithFaces(userId: string) {
  // return useQuery(api.photos.getWithFaces, { userId });
  console.log('😊 [Convex] usePhotosWithFaces hook called for user:', userId);
  return null;
}

/**
 * Hook pour récupérer les statistiques utilisateur
 */
export function useUserStats(userId: string) {
  // return useQuery(api.users.getStats, { userId });
  console.log('📊 [Convex] useUserStats hook called for user:', userId);
  return null;
}

/**
 * Hook pour synchroniser les données hors ligne
 */
export function useSyncOfflineData() {
  // return useMutation(api.sync.uploadOfflineData);
  console.log('🔄 [Convex] useSyncOfflineData hook called');
  return null;
}

/**
 * Fonctions utilitaires pour les requêtes directes (non-React)
 */

/**
 * Upload une photo directement (sans hook React)
 * @param photoData - Données de la photo
 */
export async function uploadPhotoDirectly(photoData: Partial<MemoriaPhoto>): Promise<string> {
  try {
    console.log('📤 [Convex] Uploading photo directly...', photoData);
    
    // Simulation pour le moment - remplacer par convexClient.mutation(api.photos.upload, photoData)
    const mockId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('✅ [Convex] Photo uploaded successfully (mock):', mockId);
    return mockId;
  } catch (error) {
    console.error('❌ [Convex] Error uploading photo:', error);
    throw error;
  }
}

/**
 * Crée un album directement (sans hook React)
 * @param albumData - Données de l'album
 */
export async function createAlbumDirectly(albumData: Partial<MemoriaAlbum>): Promise<string> {
  try {
    console.log('📁 [Convex] Creating album directly...', albumData);
    
    // Simulation pour le moment - remplacer par convexClient.mutation(api.albums.create, albumData)
    const mockId = `album_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('✅ [Convex] Album created successfully (mock):', mockId);
    return mockId;
  } catch (error) {
    console.error('❌ [Convex] Error creating album:', error);
    throw error;
  }
}

/**
 * Crée un groupe directement (sans hook React)
 * @param groupData - Données du groupe
 */
export async function createGroupDirectly(groupData: Partial<MemoriaGroup>): Promise<string> {
  try {
    console.log('👥 [Convex] Creating group directly...', groupData);
    
    // Simulation pour le moment - remplacer par convexClient.mutation(api.groups.create, groupData)
    const mockId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('✅ [Convex] Group created successfully (mock):', mockId);
    return mockId;
  } catch (error) {
    console.error('❌ [Convex] Error creating group:', error);
    throw error;
  }
}

/**
 * Récupère les photos d'un utilisateur directement
 * @param userId - ID de l'utilisateur
 */
export async function getUserPhotosDirectly(userId: string): Promise<MemoriaPhoto[]> {
  try {
    console.log('📸 [Convex] Getting user photos directly...', userId);
    
    // Simulation pour le moment - remplacer par convexClient.query(api.photos.getUserPhotos, { userId })
    const mockPhotos: MemoriaPhoto[] = [];
    
    console.log('✅ [Convex] User photos retrieved (mock):', mockPhotos.length);
    return mockPhotos;
  } catch (error) {
    console.error('❌ [Convex] Error getting user photos:', error);
    throw error;
  }
}

/**
 * Crée un événement directement
 * @param eventData - Données de l'événement
 */
export async function createEventDirectly(eventData: Partial<MemoriaEvent>): Promise<string> {
  try {
    console.log('📅 [Convex] Creating event directly...', eventData);
    
    // Simulation pour le moment - remplacer par convexClient.mutation(api.events.create, eventData)
    const mockId = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('✅ [Convex] Event created successfully (mock):', mockId);
    return mockId;
  } catch (error) {
    console.error('❌ [Convex] Error creating event:', error);
    throw error;
  }
}

/**
 * Synchronise les données en temps réel
 * @param callback - Fonction appelée lors des mises à jour
 */
export function subscribeToRealtimeUpdates(
  userId: string,
  callback: (data: any) => void
): () => void {
  console.log('🔄 [Convex] Subscribing to realtime updates...', userId);
  
  // Simulation pour le moment - remplacer par les vrais subscriptions Convex
  const intervalId = setInterval(() => {
    callback({ type: 'heartbeat', userId, timestamp: Date.now() });
  }, 30000); // Heartbeat toutes les 30 secondes
  
  // Retourner une fonction de désabonnement
  return () => {
    clearInterval(intervalId);
    console.log('🔇 [Convex] Unsubscribed from realtime updates');
  };
}

/**
 * Batch upload de photos
 * @param photos - Array de photos à uploader
 */
export async function batchUploadPhotos(photos: Partial<MemoriaPhoto>[]): Promise<string[]> {
  try {
    console.log('📦 [Convex] Batch uploading photos...', photos.length);
    
    const results = await Promise.allSettled(
      photos.map(photo => uploadPhotoDirectly(photo))
    );
    
    const successful = results
      .filter((result): result is PromiseFulfilledResult<string> => 
        result.status === 'fulfilled'
      )
      .map(result => result.value);
    
    const failed = results.filter(result => result.status === 'rejected');
    
    if (failed.length > 0) {
      console.warn('⚠️ [Convex] Some photo uploads failed:', failed.length);
    }
    
    console.log('✅ [Convex] Batch upload completed:', successful.length, 'successful,', failed.length, 'failed');
    return successful;
  } catch (error) {
    console.error('❌ [Convex] Batch upload error:', error);
    throw error;
  }
}

export default {
  // Hooks
  useUploadPhoto,
  useUserPhotos,
  useAlbumPhotos,
  useGroupPhotos,
  useCreateAlbum,
  useUserAlbums,
  useUpdateAlbum,
  useDeleteAlbum,
  useCreateGroup,
  useUserGroups,
  useJoinGroup,
  useLeaveGroup,
  useUpsertUser,
  useUserByAuthId,
  useUpdateUserPreferences,
  useRecentEvents,
  useCreateEvent,
  useSearchPhotos,
  usePhotosNearLocation,
  usePhotosWithFaces,
  useUserStats,
  useSyncOfflineData,
  
  // Direct functions
  uploadPhotoDirectly,
  createAlbumDirectly,
  createGroupDirectly,
  getUserPhotosDirectly,
  createEventDirectly,
  subscribeToRealtimeUpdates,
  batchUploadPhotos,
  
  // Client
  convexClient,
};