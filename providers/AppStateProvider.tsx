import { useCallback, useEffect, useMemo, useState } from "react";
import createContextHook from "@nkzw/create-context-hook";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { trpcClient } from "@/lib/trpc";

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
  joinGroupByCode: (inviteCode: string) => boolean;
  updateProfile: (name: string, avatar?: string) => void;
  searchPhotos: (query: string) => Photo[];
  searchAlbums: (query: string) => Album[];
  exportAlbum: (albumId: string) => Promise<void>;
  profileAvatar?: string;
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

  const joinGroupByCode = useCallback((inviteCode: string) => {
    const group = groups.find(g => g.inviteCode === inviteCode);
    if (group && !group.members.includes(displayName)) {
      const updatedGroups = groups.map(g => 
        g.id === group.id ? { ...g, members: [...g.members, displayName] } : g
      );
      setGroups(updatedGroups);
      persist({ groups: updatedGroups });
      return true;
    }
    return false;
  }, [groups, displayName, persist]);

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
      // In a real app, this would save all photos to the device's photo library
      console.log(`Exporting album: ${album.name} with ${album.photos.length} photos`);
      // For now, just log the action
    } catch (error) {
      console.error('Failed to export album:', error);
    }
  }, [albums]);

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
      profileAvatar
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
      profileAvatar
    ]
  );
});

export type { Album, Group, Comment, Photo };