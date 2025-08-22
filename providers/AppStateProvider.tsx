import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  tags?: string[];
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
  views?: number;
  lastActivity?: string;
  coverTransform?: { scale: number; offsetX: number; offsetY: number; rotation?: number };
  shareLink?: { url: string; expiresAt: string } | null;
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

interface Event {
  id: string;
  title: string;
  description?: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  date: string;
  createdAt: string;
  createdBy: string;
  attendees: string[];
  albumId?: string;
  coverImage?: string;
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
  events: Event[];
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
  favoriteGroups: string[];
  toggleFavoriteGroup: (groupId: string) => void;
  updateAlbumCover: (albumId: string, coverImage: string) => void;
  getSmartAlbums: () => { byDate: Album[]; byLocation: Album[]; favorites: Album[] };
  notifications: Notification[];
  markNotificationRead: (notificationId: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  batchArchivePhotos: (photoIds: string[]) => void;
  addTagToPhoto: (photoId: string, tag: string) => void;
  removeTagFromPhoto: (photoId: string, tag: string) => void;
  searchByTag: (tag: string) => Photo[];
  setAlbumCoverTransform: (albumId: string, transform: { scale: number; offsetX: number; offsetY: number; rotation?: number }) => void;
  incrementAlbumView: (albumId: string) => void;
  createTemporaryShareLink: (albumId: string, hours: number) => { url: string; expiresAt: string } | null;
  revokeShareLink: (albumId: string) => void;
  createEvent: (title: string, description: string, location: { latitude: number; longitude: number; address?: string }, date: string) => Event;
  deleteEvent: (eventId: string) => void;
  joinEvent: (eventId: string) => void;
  leaveEvent: (eventId: string) => void;
  searchEvents: (query: string) => Event[];
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
  const [events, setEvents] = useState<Event[]>([]);
  const [profileAvatar, setProfileAvatar] = useState<string | undefined>();
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastSync, setLastSync] = useState<string | undefined>();
  const [pendingUploads, setPendingUploads] = useState<string[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [favoriteAlbums, setFavoriteAlbums] = useState<string[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [favoriteGroups, setFavoriteGroups] = useState<string[]>([]);
  const ARCHIVE_ALBUM_NAME = 'Archives';

  const mountedRef = useRef<boolean>(false);

  useEffect(() => {
    mountedRef.current = true;
    let syncTimeout: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!mountedRef.current) return;
        if (raw) {
          const data = JSON.parse(raw) as { 
            onboardingComplete?: boolean; 
            displayName?: string; 
            points?: number;
            albums?: Album[];
            groups?: Group[];
            comments?: Comment[];
            photos?: Photo[];
            favoriteAlbums?: string[];
            lastSync?: string;
            profileAvatar?: string;
            favoriteGroups?: string[];
          };
          setOnboardingCompleteState(Boolean(data.onboardingComplete));
          setDisplayNameState(data.displayName ?? "Memoria");
          setPoints(typeof data.points === "number" ? data.points : 120);
          setAlbums(data.albums ?? []);
          setGroups(data.groups ?? []);
          setComments(data.comments ?? []);
          setPhotos(data.photos ?? []);
          setFavoriteAlbums(data.favoriteAlbums ?? []);
          setFavoriteGroups(data.favoriteGroups ?? []);
          setLastSync(data.lastSync);
          setProfileAvatar(data.profileAvatar);
        }
        syncTimeout = setTimeout(() => { if (mountedRef.current) { syncData(); } }, 1000);
      } catch (e) {
        console.log("Load AppState error", e);
      }
    })();
    return () => {
      mountedRef.current = false;
      if (syncTimeout) clearTimeout(syncTimeout);
    };
  }, []);

  const persist = useCallback(
    async (next: { 
      onboardingComplete?: boolean; 
      displayName?: string; 
      points?: number;
      albums?: Album[];
      groups?: Group[];
      comments?: Comment[];
      photos?: Photo[];
      favoriteAlbums?: string[];
      favoriteGroups?: string[];
      lastSync?: string;
      profileAvatar?: string;
    }) => {
      try {
        const current = { 
          onboardingComplete, 
          displayName, 
          points, 
          albums, 
          groups, 
          comments, 
          photos, 
          favoriteAlbums, 
          favoriteGroups,
          lastSync, 
          profileAvatar 
        };
        const merged = { ...current, ...next };
        await AsyncStorage.setItem(KEY, JSON.stringify(merged));
      } catch (e) {
        console.log("Persist AppState error", e);
      }
    },
    [onboardingComplete, displayName, points, albums, groups, comments, photos, favoriteAlbums, favoriteGroups, lastSync, profileAvatar]
  );

  const setOnboardingComplete = useCallback((v: boolean) => {
    setOnboardingCompleteState(v);
    persist({ onboardingComplete: v });
  }, [persist]);

  const setDisplayName = useCallback((n: string) => {
    setDisplayNameState(n);
    persist({ displayName: n });
  }, [persist]);

  const addPoints = useCallback((n: number) => {
    const next = points + n;
    setPoints(next);
    persist({ points: next });
  }, [persist, points]);

  const createAlbum = useCallback((name: string, groupId?: string) => {
    const newAlbum: Album = {
      id: Date.now().toString(),
      name,
      photos: [],
      createdAt: new Date().toISOString(),
      groupId,
      isPublic: false,
      likes: [],
      views: 0,
      lastActivity: new Date().toISOString(),
      coverTransform: { scale: 1, offsetX: 0, offsetY: 0 },
      shareLink: null,
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
    const newPhoto: Photo = {
      id: `${albumId}-${Date.now()}`,
      uri: photoUri,
      albumId,
      likes: [],
      createdAt: new Date().toISOString(),
      metadata: { timestamp: new Date().toISOString() }
    };
    try {
      await trpcClient.photos.create.mutate({
        uri: photoUri,
        albumId,
        metadata: { timestamp: new Date().toISOString() }
      });
      const updatedAlbums = albums.map(album => 
        album.id === albumId 
          ? { 
              ...album, 
              photos: [...album.photos, photoUri], 
              coverImage: album.coverImage || photoUri,
              lastActivity: new Date().toISOString()
            }
          : album
      );
      const updatedPhotos = [...photos, newPhoto];
      setAlbums(updatedAlbums);
      setPhotos(updatedPhotos);
      persist({ albums: updatedAlbums, photos: updatedPhotos });
    } catch (error) {
      console.error('Failed to add photo to album:', error);
      const updatedAlbums = albums.map(album => 
        album.id === albumId 
          ? { 
              ...album, 
              photos: [...album.photos, photoUri], 
              coverImage: album.coverImage || photoUri,
              lastActivity: new Date().toISOString()
            }
          : album
      );
      const updatedPhotos = [...photos, newPhoto];
      setAlbums(updatedAlbums);
      setPhotos(updatedPhotos);
      persist({ albums: updatedAlbums, photos: updatedPhotos });
    }
  }, [albums, photos, persist]);

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

  const likePhoto = useCallback((photoId: string) => {
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId && !photo.likes.includes(displayName)
        ? { ...photo, likes: [...photo.likes, displayName] }
        : photo
    );
    setPhotos(updatedPhotos);
    persist({ photos: updatedPhotos });
  }, [photos, displayName, persist]);

  const unlikePhoto = useCallback((photoId: string) => {
    const updatedPhotos = photos.map(photo => 
      photo.id === photoId
        ? { ...photo, likes: photo.likes.filter(user => user !== displayName) }
        : photo
    );
    setPhotos(updatedPhotos);
    persist({ photos: updatedPhotos });
  }, [photos, displayName, persist]);

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

  const updateGroupCover = useCallback((groupId: string, coverImage: string) => {
    const updatedGroups = groups.map(group => 
      group.id === groupId ? { ...group, coverImage } : group
    );
    setGroups(updatedGroups);
    persist({ groups: updatedGroups });
  }, [groups, persist]);

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

  const joinGroupByCodeAsync = useCallback(async (inviteCode: string): Promise<boolean> => {
    try {
      const result = await trpcClient.groups.join.mutate({ inviteCode });
      if (result.success) {
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

  const joinGroupByCode = joinGroupByCodeAsync;

  const updateProfile = useCallback((name: string, avatar?: string) => {
    setDisplayNameState(name);
    if (avatar) {
      setProfileAvatar(avatar);
    }
    persist({ displayName: name, profileAvatar: avatar });
  }, [persist]);

  const searchPhotos = useCallback((query: string) => {
    const q = query.toLowerCase();
    return photos.filter(photo => 
      (photo.metadata?.timestamp ?? '').toLowerCase().includes(q) || (photo.tags ?? []).some(t => t.includes(q))
    );
  }, [photos]);

  const searchAlbums = useCallback((query: string) => {
    return albums.filter(album => 
      album.name.toLowerCase().includes(query.toLowerCase())
    );
  }, [albums]);

  const exportAlbum = useCallback(async (albumId: string) => {
    const album = albums.find(a => a.id === albumId);
    if (!album) return;
    try {
      const result = await trpcClient.albums.export.mutate({ albumId, format: 'zip' });
      console.log(`Exporting album: ${album.name} with ${album.photos.length} photos`, result);
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

  const syncData = useCallback(async (retryCount = 0) => {
    try {
      if (mountedRef.current) setIsOnline(true);
      console.log('Starting sync...', { photosCount: photos.length, albumsCount: albums.length });
      const result = await trpcClient.photos.sync.mutate({
        photos,
        comments,
        albums,
        groups,
        lastSync
      });
      if (!mountedRef.current) return;
      const newLastSync = result.syncedAt;
      setLastSync(newLastSync);
      persist({ lastSync: newLastSync });
      if (result.conflicts && result.conflicts.length > 0) {
        console.log('Resolving conflicts:', result.conflicts);
        if (result.serverData) {
          setPhotos(result.serverData.photos as Photo[]);
          setAlbums(result.serverData.albums as Album[]);
          setGroups(result.serverData.groups as Group[]);
          setComments(result.serverData.comments as Comment[]);
          persist({
            photos: result.serverData.photos as Photo[],
            albums: result.serverData.albums as Album[],
            groups: result.serverData.groups as Group[],
            comments: result.serverData.comments as Comment[]
          });
        }
      }
      console.log('Data synced successfully:', result);
    } catch (error) {
      console.error('Sync failed:', error);
      if (mountedRef.current) setIsOnline(false);
      if (retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying sync in ${delay}ms...`);
        setTimeout(() => { if (mountedRef.current) { syncData(retryCount + 1); } }, delay);
      }
    }
  }, [photos, comments, albums, groups, lastSync, persist]);

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
    const updatedPhotos = photos.map(photo => 
      photoIds.includes(photo.id) ? { ...photo, albumId: targetAlbumId } : photo
    );
    setPhotos(updatedPhotos);
    const updatedAlbums = albums.map(album => {
      if (album.id === targetAlbumId) {
        const newPhotos = photosToMove.map(p => p.uri).filter(uri => !album.photos.includes(uri));
        return { ...album, photos: [...album.photos, ...newPhotos] };
      } else {
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

  const batchArchivePhotos = useCallback((photoIds: string[]) => {
    let archiveAlbum = albums.find(a => a.name === ARCHIVE_ALBUM_NAME);
    if (!archiveAlbum) {
      archiveAlbum = createAlbum(ARCHIVE_ALBUM_NAME);
    }
    const targetAlbumId = archiveAlbum.id;
    batchMovePhotos(photoIds, targetAlbumId);
  }, [albums, createAlbum, batchMovePhotos]);

  const toggleFavoriteAlbum = useCallback((albumId: string) => {
    setFavoriteAlbums(prev => {
      const isFavorite = prev.includes(albumId);
      const updated = isFavorite 
        ? prev.filter(id => id !== albumId)
        : [...prev, albumId];
      persist({ favoriteAlbums: updated });
      return updated;
    });
  }, [persist]);

  const toggleFavoriteGroup = useCallback((groupId: string) => {
    setFavoriteGroups(prev => {
      const isFavorite = prev.includes(groupId);
      const updated = isFavorite ? prev.filter(id => id !== groupId) : [...prev, groupId];
      persist({ favoriteGroups: updated });
      return updated;
    });
  }, [persist]);

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
      const updatedAlbums = albums.map(album => 
        album.id === albumId ? { ...album, coverImage } : album
      );
      setAlbums(updatedAlbums);
      persist({ albums: updatedAlbums });
    }
  }, [albums, persist]);

  const addTagToPhoto = useCallback((photoId: string, tag: string) => {
    const t = tag.trim().toLowerCase();
    if (!t) return;
    const updated = photos.map(p => p.id === photoId ? { ...p, tags: Array.from(new Set([...(p.tags ?? []), t])) } : p);
    setPhotos(updated);
    persist({ photos: updated });
  }, [photos, persist]);

  const removeTagFromPhoto = useCallback((photoId: string, tag: string) => {
    const updated = photos.map(p => p.id === photoId ? { ...p, tags: (p.tags ?? []).filter(x => x !== tag) } : p);
    setPhotos(updated);
    persist({ photos: updated });
  }, [photos, persist]);

  const searchByTag = useCallback((tag: string) => {
    const t = tag.trim().toLowerCase();
    return photos.filter(p => (p.tags ?? []).includes(t));
  }, [photos]);

  const setAlbumCoverTransform = useCallback((albumId: string, transform: { scale: number; offsetX: number; offsetY: number; rotation?: number }) => {
    const updated = albums.map(a => a.id === albumId ? { ...a, coverTransform: transform } : a);
    setAlbums(updated);
    persist({ albums: updated });
  }, [albums, persist]);

  const incrementAlbumView = useCallback((albumId: string) => {
    const updated = albums.map(a => a.id === albumId ? { ...a, views: (a.views ?? 0) + 1, lastActivity: new Date().toISOString() } : a);
    setAlbums(updated);
    persist({ albums: updated });
  }, [albums, persist]);

  const createTemporaryShareLink = useCallback((albumId: string, hours: number) => {
    const album = albums.find(a => a.id === albumId);
    if (!album) return null;
    const token = Math.random().toString(36).slice(2, 10);
    const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    const url = `https://memoria.app/share/${albumId}?t=${token}`;
    const updated = albums.map(a => a.id === albumId ? { ...a, shareLink: { url, expiresAt } } : a);
    setAlbums(updated);
    persist({ albums: updated });
    return { url, expiresAt };
  }, [albums, persist]);

  const revokeShareLink = useCallback((albumId: string) => {
    const updated = albums.map(a => a.id === albumId ? { ...a, shareLink: null } : a);
    setAlbums(updated);
    persist({ albums: updated });
  }, [albums, persist]);

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
        return Boolean(photo?.metadata?.location);
      });
    });
    const favorites = albums.filter(album => favoriteAlbums.includes(album.id));
    return { byDate, byLocation, favorites };
  }, [albums, photos, favoriteAlbums]);

  const createEvent = useCallback((title: string, description: string, location: { latitude: number; longitude: number; address?: string }, date: string) => {
    const newEvent: Event = {
      id: Date.now().toString(),
      title,
      description,
      location,
      date,
      createdAt: new Date().toISOString(),
      createdBy: displayName,
      attendees: [displayName]
    };
    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    persist({ events: updatedEvents } as any);
    return newEvent;
  }, [events, displayName, persist]);

  const deleteEvent = useCallback((eventId: string) => {
    const updatedEvents = events.filter(event => event.id !== eventId);
    setEvents(updatedEvents);
    persist({ events: updatedEvents } as any);
  }, [events, persist]);

  const joinEvent = useCallback((eventId: string) => {
    const updatedEvents = events.map(event => 
      event.id === eventId && !event.attendees.includes(displayName)
        ? { ...event, attendees: [...event.attendees, displayName] }
        : event
    );
    setEvents(updatedEvents);
    persist({ events: updatedEvents } as any);
  }, [events, displayName, persist]);

  const leaveEvent = useCallback((eventId: string) => {
    const updatedEvents = events.map(event => 
      event.id === eventId
        ? { ...event, attendees: event.attendees.filter(user => user !== displayName) }
        : event
    );
    setEvents(updatedEvents);
    persist({ events: updatedEvents } as any);
  }, [events, displayName, persist]);

  const searchEvents = useCallback((query: string) => {
    const q = query.toLowerCase();
    return events.filter(event => 
      event.title.toLowerCase().includes(q) || 
      (event.description ?? '').toLowerCase().includes(q) ||
      (event.location.address ?? '').toLowerCase().includes(q)
    );
  }, [events]);

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
      events,
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
      favoriteGroups,
      toggleFavoriteGroup,
      updateAlbumCover,
      getSmartAlbums,
      notifications,
      markNotificationRead,
      addNotification,
      batchArchivePhotos,
      addTagToPhoto,
      removeTagFromPhoto,
      searchByTag,
      setAlbumCoverTransform,
      incrementAlbumView,
      createTemporaryShareLink,
      revokeShareLink,
      createEvent,
      deleteEvent,
      joinEvent,
      leaveEvent,
      searchEvents
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
      events,
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
      favoriteGroups,
      toggleFavoriteGroup,
      updateAlbumCover,
      getSmartAlbums,
      notifications,
      markNotificationRead,
      addNotification,
      batchArchivePhotos,
      addTagToPhoto,
      removeTagFromPhoto,
      searchByTag,
      setAlbumCoverTransform,
      incrementAlbumView,
      createTemporaryShareLink,
      revokeShareLink,
      createEvent,
      deleteEvent,
      joinEvent,
      leaveEvent,
      searchEvents
    ]
  );
});

export type { Album, Group, Comment, Photo, Event };
