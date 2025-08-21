import { useCallback, useEffect, useMemo, useState } from "react";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpcClient } from "@/lib/trpc";
import { Platform } from 'react-native';

interface Photo {
  id: string;
  uri: string;
  albumId: string;
  likes: string[];
  createdAt: string;
  metadata?: {
    timestamp: string;
    location?: { lat: number; lng: number };
    device?: string;
  };
}

interface Album {
  id: string;
  name: string;
  coverImage?: string;
  photos: string[];
  createdAt: string;
  groupId?: string;
  isPublic: boolean;
  likes: string[];
}

interface Group {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  members: string[];
  albums: string[];
  createdAt: string;
  owner: string;
  inviteCode?: string;
}

interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
  photoId?: string;
  albumId?: string;
}

interface AppState {
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;
  displayName: string;
  setDisplayName: (n: string) => void;
  points: number;
  addPoints: (n: number) => void;
  albums: Album[];
  groups: Group[];
  comments: Comment[];
  photos: Photo[];
  createAlbum: (name: string, groupId?: string) => Album;
  deleteAlbum: (albumId: string) => void;
  addPhotoToAlbum: (albumId: string, photoUri: string) => void;
  createGroup: (name: string, description?: string) => Group;
  deleteGroup: (groupId: string) => void;
  addComment: (text: string, photoId?: string, albumId?: string) => Comment;
  deleteComment: (commentId: string) => void;
  likePhoto: (photoId: string) => void;
  unlikePhoto: (photoId: string) => void;
  likeAlbum: (albumId: string) => void;
  unlikeAlbum: (albumId: string) => void;
  updateGroupCover: (groupId: string, coverImage: string) => void;
  joinGroupByCode: (inviteCode: string) => Promise<boolean>;
  updateProfile: (name: string, avatar?: string) => void;
  searchPhotos: (query: string) => Photo[];
  searchAlbums: (query: string) => Album[];
  exportAlbum: (albumId: string) => Promise<void>;
  profileAvatar?: string;
  // New advanced features
  syncData: () => Promise<void>;
  isOnline: boolean;
  lastSync?: string;
  pendingUploads: string[];
  batchSelectPhotos: (photoIds: string[]) => void;
  selectedPhotos: string[];
  clearSelection: () => void;
  batchDeletePhotos: (photoIds: string[]) => void;
  batchMovePhotos: (photoIds: string[], targetAlbumId: string) => void;
  favoriteAlbums: string[];
  toggleFavoriteAlbum: (albumId: string) => void;
  updateAlbumCover: (albumId: string, coverImage: string) => void;
  getSmartAlbums: () => { byDate: Album[]; byLocation: Album[]; favorites: Album[] };
  notifications: Notification[];
  markNotificationRead: (notificationId: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
}

interface Notification {
  id: string;
  type: 'comment' | 'like' | 'photo_added' | 'group_invite';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  data?: any;
}

const KEY = "memoria_app_state_v2";

export const [AppStateProvider, useAppState] = createContextHook<AppState>(() => {
  const [onboardingComplete, setOnboardingCompleteState] = useState<boolean>(false);
  const [displayName, setDisplayNameState] = useState<string>("Memoria");
  const [points, setPoints] = useState<number>(120);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [profileAvatar, setProfileAvatar] = useState<string | undefined>();
  
  // New state for advanced features
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<string | undefined>();
  const [pendingUploads, setPendingUploads] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [favoriteAlbums, setFavoriteAlbums] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) {
          const data = JSON.parse(raw) as { 
            onboardingComplete?: boolean; 
            displayName?: string; 
            points?: number;
            albums?: Album[];
            groups?: Group[];
            comments?: Comment[];
          };
          setOnboardingCompleteState(Boolean(data.onboardingComplete));
          setDisplayNameState(data.displayName ?? "Memoria");
          setPoints(typeof data.points === "number" ? data.points : 120);
          setAlbums(data.albums ?? []);
          setGroups(data.groups ?? []);
          setComments(data.comments ?? []);
        }
      } catch (e) {
        console.log("Load AppState error", e);
      }
    })();
  }, []);

  const persist = useCallback(
    async (next: { 
      onboardingComplete?: boolean; 
      displayName?: string; 
      points?: number;
      albums?: Album[];
      groups?: Group[];
      comments?: Comment[];
    }) => {
      try {
        const current = { onboardingComplete, displayName, points, albums, groups, comments };
        const merged = { ...current, ...next };
        await AsyncStorage.setItem(KEY, JSON.stringify(merged));
      } catch (e) {
        console.log("Persist AppState error", e);
      }
    },
    [onboardingComplete, displayName, points, albums, groups, comments]
  );

  const setOnboardingComplete = useCallback(
    (v: boolean) => {
      setOnboardingCompleteState(v);
      persist({ onboardingComplete: v });
    },
    [persist]
  );

  const setDisplayName = useCallback(
    (n: string) => {
      setDisplayNameState(n);
      persist({ displayName: n });
    },
    [persist]
  );

  const addPoints = useCallback(
    (n: number) => {
      const next = points + n;
      setPoints(next);
      persist({ points: next });
    },
    [persist, points]
  );

  // Albums functions
  const createAlbum = useCallback((name: string, groupId?: string) => {
    const newAlbum: Album = {
      id: Date.now().toString(),
      name,
      photos: [],
      createdAt: new Date().toISOString(),
      groupId,
      isPublic: false,
      likes: []
    };
    const updatedAlbums = [...albums, newAlbum];

    let updatedGroups = groups;
    if (groupId) {
      updatedGroups = groups.map(g => g.id === groupId ? { ...g, albums: [...g.albums, newAlbum.id] } : g);
    }

    setAlbums(updatedAlbums);
    setGroups(updatedGroups);
    persist({ albums: updatedAlbums, groups: updatedGroups });
    return newAlbum;
  }, [albums, groups, persist]);

  const deleteAlbum = useCallback((albumId: string) => {
    const updatedAlbums = albums.filter(album => album.id !== albumId);
    setAlbums(updatedAlbums);
    persist({ albums: updatedAlbums });
  }, [albums, persist]);

  const addPhotoToAlbum = useCallback(async (albumId: string, photoUri: string) => {
    try {
      // Sync with backend
      await trpcClient.photos.create.mutate({
        uri: photoUri,
        albumId,
        metadata: {
          timestamp: new Date().toISOString(),
        }
      });
      
      // Update local state
      const updatedAlbums = albums.map(album => 
        album.id === albumId 
          ? { ...album, photos: [...album.photos, photoUri], coverImage: album.coverImage || photoUri }
          : album
      );
      setAlbums(updatedAlbums);
      persist({ albums: updatedAlbums });
    } catch (error) {
      console.error('Failed to add photo to album:', error);
      // Still update local state as fallback
      const updatedAlbums = albums.map(album => 
        album.id === albumId 
          ? { ...album, photos: [...album.photos, photoUri], coverImage: album.coverImage || photoUri }
          : album
      );
      setAlbums(updatedAlbums);
      persist({ albums: updatedAlbums });
    }
  }, [albums, persist]);

  // Groups functions
  const createGroup = useCallback((name: string, description?: string) => {
    const newGroup: Group = {
      id: Date.now().toString(),
      name,
      description,
      members: [displayName],
      albums: [],
      createdAt: new Date().toISOString(),
      owner: displayName,
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase()
    };
    const updatedGroups = [...groups, newGroup];
    setGroups(updatedGroups);
    persist({ groups: updatedGroups });
    return newGroup;
  }, [groups, displayName, persist]);

  const deleteGroup = useCallback((groupId: string) => {
    const updatedGroups = groups.filter(group => group.id !== groupId);
    setGroups(updatedGroups);
    persist({ groups: updatedGroups });
  }, [groups, persist]);

  // Comments functions
  const addComment = useCallback((text: string, photoId?: string, albumId?: string) => {
    const newComment: Comment = {
      id: Date.now().toString(),
      text,
      author: displayName,
      createdAt: new Date().toISOString(),
      photoId,
      albumId
    };
    const updatedComments = [...comments, newComment];
    setComments(updatedComments);
    persist({ comments: updatedComments });
    return newComment;
  }, [comments, displayName, persist]);

  const deleteComment = useCallback((commentId: string) => {
    const updatedComments = comments.filter(comment => comment.id !== commentId);
    setComments(updatedComments);
    persist({ comments: updatedComments });
  }, [comments, persist]);

  // Like functions
  const likePhoto = useCallback((photoId: string) => {
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId && !photo.likes.includes(displayName)
        ? { ...photo, likes: [...photo.likes, displayName] }
        : photo
    );
    setPhotos(updatedPhotos);
  }, [photos, displayName]);

  const unlikePhoto = useCallback((photoId: string) => {
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId
        ? { ...photo, likes: photo.likes.filter(user => user !== displayName) }
        : photo
    );
    setPhotos(updatedPhotos);
  }, [photos, displayName]);

  const likeAlbum = useCallback((albumId: string) => {
    const updatedAlbums = albums.map(album => 
      album.id === albumId && !album.likes.includes(displayName)
        ? { ...album, likes: [...album.likes, displayName] }
        : album
    );
    setAlbums(updatedAlbums);
    persist({ albums: updatedAlbums });
  }, [albums, displayName, persist]);

  const unlikeAlbum = useCallback((albumId: string) => {
    const updatedAlbums = albums.map(album => 
      album.id === albumId
        ? { ...album, likes: album.likes.filter(user => user !== displayName) }
        : album
    );
    setAlbums(updatedAlbums);
    persist({ albums: updatedAlbums });
  }, [albums, displayName, persist]);

  // Group functions
  const updateGroupCover = useCallback((groupId: string, coverImage: string) => {
    const updatedGroups = groups.map(group => 
      group.id === groupId ? { ...group, coverImage } : group
    );
    setGroups(updatedGroups);
    persist({ groups: updatedGroups });
  }, [groups, persist]);

  // Notifications
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    };
    setNotifications(prev => [newNotification, ...prev]);
  }, []);

  const markNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      )
    );
  }, []);

  // Enhanced joinGroupByCode with tRPC
  const joinGroupByCodeAsync = useCallback(async (inviteCode: string): Promise<boolean> => {
    try {
      const result = await trpcClient.groups.join.mutate({ inviteCode });
      
      if (result.success) {
        // Update local state
        const group = groups.find(g => g.inviteCode === inviteCode);
        if (group && !group.members.includes(displayName)) {
          const updatedGroups = groups.map(g => 
            g.id === group.id ? { ...g, members: [...g.members, displayName] } : g
          );
          setGroups(updatedGroups);
          persist({ groups: updatedGroups });
        }
        
        addNotification({
          type: 'group_invite',
          title: 'Groupe rejoint',
          message: 'Vous avez rejoint un nouveau groupe avec succès',
          read: false,
          data: { groupId: result.groupId }
        });
        
        return true;
      }
    } catch (error) {
      console.error('Failed to join group:', error);
    }
    return false;
  }, [groups, displayName, persist, addNotification]);

  // Keep legacy sync version for compatibility
  const joinGroupByCode = joinGroupByCodeAsync;

  // Profile functions
  const updateProfile = useCallback((name: string, avatar?: string) => {
    setDisplayNameState(name);
    if (avatar) {
      setProfileAvatar(avatar);
    }
    persist({ displayName: name });
  }, [persist]);

  // Search functions
  const searchPhotos = useCallback((query: string) => {
    return photos.filter(photo => 
      photo.metadata?.timestamp.toLowerCase().includes(query.toLowerCase())
    );
  }, [photos]);

  const searchAlbums = useCallback((query: string) => {
    return albums.filter(album => 
      album.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [albums]);

  // Export function
  const exportAlbum = useCallback(async (albumId: string) => {
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    
    try {
      // Use tRPC to export album
      const result = await trpcClient.albums.export.mutate({ albumId, format: 'zip' });
      console.log(`Exporting album: ${album.name} with ${album.photos.length} photos`, result);
      
      // Add notification
      addNotification({
        type: 'photo_added',
        title: 'Export terminé',
        message: `L'album "${album.name}" a été exporté avec succès`,
        read: false,
        data: { albumId, downloadUrl: result.downloadUrl }
      });
    } catch (error) {
      console.error('Failed to export album:', error);
    }
  }, [albums, addNotification]);

  // Advanced sync function
  const syncData = useCallback(async () => {
    try {
      setIsOnline(true);
      const result = await trpcClient.photos.sync.mutate({
        photos,
        comments,
        albums,
        groups,
        lastSync
      });
      
      setLastSync(result.syncedAt);
      console.log('Data synced successfully:', result);
    } catch (error) {
      console.error('Sync failed:', error);
      setIsOnline(false);
    }
  }, [photos, comments, albums, groups, lastSync]);

  // Batch photo operations
  const batchSelectPhotos = useCallback((photoIds: string[]) => {
    setSelectedPhotos(prev => {
      const newSelection = [...prev];
      photoIds.forEach(id => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      return newSelection;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedPhotos([]);
  }, []);

  const batchDeletePhotos = useCallback((photoIds: string[]) => {
    const updatedPhotos = photos.filter(photo => !photoIds.includes(photo.id));
    setPhotos(updatedPhotos);
    
    // Update albums to remove deleted photos
    const updatedAlbums = albums.map(album => ({
      ...album,
      photos: album.photos.filter(photoUri => {
        const photo = photos.find(p => p.uri === photoUri);
        return !photo || !photoIds.includes(photo.id);
      })
    }));
    setAlbums(updatedAlbums);
    persist({ albums: updatedAlbums });
    
    clearSelection();
  }, [photos, albums, persist, clearSelection]);

  const batchMovePhotos = useCallback((photoIds: string[], targetAlbumId: string) => {
    const photosToMove = photos.filter(photo => photoIds.includes(photo.id));
    
    // Update photos with new album ID
    const updatedPhotos = photos.map(photo => 
      photoIds.includes(photo.id) ? { ...photo, albumId: targetAlbumId } : photo
    );
    setPhotos(updatedPhotos);
    
    // Update albums
    const updatedAlbums = albums.map(album => {
      if (album.id === targetAlbumId) {
        // Add photos to target album
        const newPhotos = photosToMove.map(p => p.uri).filter(uri => !album.photos.includes(uri));
        return { ...album, photos: [...album.photos, ...newPhotos] };
      } else {
        // Remove photos from other albums
        return {
          ...album,
          photos: album.photos.filter(photoUri => {
            const photo = photos.find(p => p.uri === photoUri);
            return !photo || !photoIds.includes(photo.id);
          })
        };
      }
    });
    setAlbums(updatedAlbums);
    persist({ albums: updatedAlbums });
    
    clearSelection();
  }, [photos, albums, persist, clearSelection]);

  // Favorites management
  const toggleFavoriteAlbum = useCallback((albumId: string) => {
    setFavoriteAlbums(prev => {
      const isFavorite = prev.includes(albumId);
      return isFavorite 
        ? prev.filter(id => id !== albumId)
        : [...prev, albumId];
    });
  }, []);

  // Album cover update
  const updateAlbumCover = useCallback(async (albumId: string, coverImage: string) => {
    try {
      await trpcClient.albums.updateCover.mutate({ albumId, coverImage });
      
      const updatedAlbums = albums.map(album => 
        album.id === albumId ? { ...album, coverImage } : album
      );
      setAlbums(updatedAlbums);
      persist({ albums: updatedAlbums });
    } catch (error) {
      console.error('Failed to update album cover:', error);
      // Fallback to local update
      const updatedAlbums = albums.map(album => 
        album.id === albumId ? { ...album, coverImage } : album
      );
      setAlbums(updatedAlbums);
      persist({ albums: updatedAlbums });
    }
  }, [albums, persist]);

  // Smart albums
  const getSmartAlbums = useCallback(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const byDate = albums.filter(album => {
      const albumDate = new Date(album.createdAt);
      return albumDate >= oneWeekAgo;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const byLocation = albums.filter(album => {
      return album.photos.some(photoUri => {
        const photo = photos.find(p => p.uri === photoUri);
        return photo?.metadata?.location;
      });
    });
    
    const favorites = albums.filter(album => favoriteAlbums.includes(album.id));
    
    return { byDate, byLocation, favorites };
  }, [albums, photos, favoriteAlbums]);

  return useMemo(
    () => ({ 
      onboardingComplete, 
      setOnboardingComplete, 
      displayName, 
      setDisplayName, 
      points, 
      addPoints,
      albums,
      groups,
      comments,
      photos,
      createAlbum,
      deleteAlbum,
      addPhotoToAlbum,
      createGroup,
      deleteGroup,
      addComment,
      deleteComment,
      likePhoto,
      unlikePhoto,
      likeAlbum,
      unlikeAlbum,
      updateGroupCover,
      joinGroupByCode,
      updateProfile,
      searchPhotos,
      searchAlbums,
      exportAlbum,
      profileAvatar,
      // New advanced features
      syncData,
      isOnline,
      lastSync,
      pendingUploads,
      batchSelectPhotos,
      selectedPhotos,
      clearSelection,
      batchDeletePhotos,
      batchMovePhotos,
      favoriteAlbums,
      toggleFavoriteAlbum,
      updateAlbumCover,
      getSmartAlbums,
      notifications,
      markNotificationRead,
      addNotification
    }),
    [
      onboardingComplete, 
      setOnboardingComplete, 
      displayName, 
      setDisplayName, 
      points, 
      addPoints,
      albums,
      groups,
      comments,
      photos,
      createAlbum,
      deleteAlbum,
      addPhotoToAlbum,
      createGroup,
      deleteGroup,
      addComment,
      deleteComment,
      likePhoto,
      unlikePhoto,
      likeAlbum,
      unlikeAlbum,
      updateGroupCover,
      joinGroupByCode,
      updateProfile,
      searchPhotos,
      searchAlbums,
      exportAlbum,
      profileAvatar,
      // New advanced features
      syncData,
      isOnline,
      lastSync,
      pendingUploads,
      batchSelectPhotos,
      selectedPhotos,
      clearSelection,
      batchDeletePhotos,
      batchMovePhotos,
      favoriteAlbums,
      toggleFavoriteAlbum,
      updateAlbumCover,
      getSmartAlbums,
      notifications,
      markNotificationRead,
      addNotification
    ]
  );
});

export type { Album, Group, Comment, Photo };