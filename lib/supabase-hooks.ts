import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, Tables, Inserts, Updates } from '@/lib/supabase';
import { useSupabase } from '@/providers/SupabaseProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hook pour les albums avec pagination
export function useAlbums(options?: { limit?: number; offset?: number }) {
  const { user } = useSupabase();
  const [albums, setAlbums] = useState<Tables<'albums'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const cacheRef = useRef<Map<string, Tables<'albums'>[]>>(new Map());

  const fetchAlbums = useCallback(async (loadMore = false) => {
    if (!user) return;

    const limit = options?.limit || 20;
    const offset = loadMore ? albums.length : (options?.offset || 0);
    const cacheKey = `${user.id}-${limit}-${offset}`;

    // Vérifier le cache d'abord
    if (cacheRef.current.has(cacheKey) && !loadMore) {
      setAlbums(cacheRef.current.get(cacheKey) || []);
      setLoading(false);
      return;
    }

    try {
      if (!loadMore) setLoading(true);
      
      // Requête avec pagination optimisée
      const { data, error, count } = await supabase
        .from('albums')
        .select(`
          *,
          photos:photos(count)
        `, { count: 'exact' })
        .or(`owner_id.eq.${user.id},group_id.in.(${await getUserGroupIds(user.id)})`)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      
      const newAlbums = data || [];
      
      if (loadMore) {
        const updatedAlbums = [...albums, ...newAlbums];
        setAlbums(updatedAlbums);
        cacheRef.current.set(cacheKey, updatedAlbums);
      } else {
        setAlbums(newAlbums);
        cacheRef.current.set(cacheKey, newAlbums);
      }
      
      setTotalCount(count || 0);
      setHasMore(newAlbums.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, options?.limit, options?.offset]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchAlbums(true);
    }
  }, [fetchAlbums, loading, hasMore]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const createAlbum = useCallback(async (albumData: Omit<Inserts<'albums'>, 'owner_id'>) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('albums')
      .insert({
        ...albumData,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    
    setAlbums(prev => [data, ...prev]);
    return data;
  }, [user]);

  const updateAlbum = useCallback(async (id: string, updates: Updates<'albums'>) => {
    const { data, error } = await supabase
      .from('albums')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    setAlbums(prev => prev.map(album => album.id === id ? data : album));
    return data;
  }, []);

  const deleteAlbum = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    setAlbums(prev => prev.filter(album => album.id !== id));
  }, []);

  useEffect(() => {
    fetchAlbums();
  }, [fetchAlbums]);

  return {
    albums,
    loading,
    error,
    hasMore,
    totalCount,
    createAlbum,
    updateAlbum,
    deleteAlbum,
    refetch: fetchAlbums,
    loadMore,
    clearCache,
  };
}

// Hook pour les photos avec lazy loading
export function usePhotos(albumId?: string, options?: { limit?: number; offset?: number }) {
  const { user } = useSupabase();
  const [photos, setPhotos] = useState<Tables<'photos'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const cacheRef = useRef<Map<string, Tables<'photos'>[]>>(new Map());

  const fetchPhotos = useCallback(async (loadMore = false) => {
    if (!user) return;

    const limit = options?.limit || 50;
    const offset = loadMore ? photos.length : (options?.offset || 0);
    const cacheKey = `${user.id}-${albumId || 'all'}-${limit}-${offset}`;

    // Vérifier le cache d'abord
    if (cacheRef.current.has(cacheKey) && !loadMore) {
      setPhotos(cacheRef.current.get(cacheKey) || []);
      setLoading(false);
      return;
    }

    try {
      if (!loadMore) setLoading(true);
      
      let query = supabase
        .from('photos')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (albumId) {
        query = query.eq('album_id', albumId);
      } else {
        query = query.eq('owner_id', user.id);
      }

      const { data, error, count } = await query;

      if (error) throw error;
      
      const newPhotos = data || [];
      
      if (loadMore) {
        const updatedPhotos = [...photos, ...newPhotos];
        setPhotos(updatedPhotos);
        cacheRef.current.set(cacheKey, updatedPhotos);
      } else {
        setPhotos(newPhotos);
        cacheRef.current.set(cacheKey, newPhotos);
      }
      
      setTotalCount(count || 0);
      setHasMore(newPhotos.length === limit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, albumId, options?.limit, options?.offset]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchPhotos(true);
    }
  }, [fetchPhotos, loading, hasMore]);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const addPhoto = useCallback(async (photoData: Omit<Inserts<'photos'>, 'owner_id'>) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('photos')
      .insert({
        ...photoData,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    
    setPhotos(prev => [data, ...prev]);
    return data;
  }, [user]);

  const updatePhoto = useCallback(async (id: string, updates: Updates<'photos'>) => {
    const { data, error } = await supabase
      .from('photos')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    setPhotos(prev => prev.map(photo => photo.id === id ? data : photo));
    return data;
  }, []);

  const deletePhoto = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    setPhotos(prev => prev.filter(photo => photo.id !== id));
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  return {
    photos,
    loading,
    error,
    hasMore,
    totalCount,
    addPhoto,
    updatePhoto,
    deletePhoto,
    refetch: fetchPhotos,
    loadMore,
    clearCache,
  };
}

// Hook pour les groupes
export function useGroups() {
  const { user } = useSupabase();
  const [groups, setGroups] = useState<Tables<'groups'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          group_members!inner(user_id)
        `)
        .eq('group_members.user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGroups(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createGroup = useCallback(async (groupData: Omit<Inserts<'groups'>, 'owner_id'>) => {
    if (!user) throw new Error('User not authenticated');

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        ...groupData,
        owner_id: user.id,
      })
      .select()
      .single();

    if (groupError) throw groupError;

    // Ajouter l'utilisateur comme membre du groupe
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'owner',
      });

    if (memberError) throw memberError;
    
    setGroups(prev => [group, ...prev]);
    return group;
  }, [user]);

  const joinGroup = useCallback(async (inviteCode: string) => {
    if (!user) throw new Error('User not authenticated');

    // Trouver le groupe par code d'invitation
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode)
      .single();

    if (groupError) throw groupError;

    // Ajouter l'utilisateur comme membre
    const { error: memberError } = await supabase
      .from('group_members')
      .insert({
        group_id: group.id,
        user_id: user.id,
        role: 'member',
      });

    if (memberError) throw memberError;
    
    setGroups(prev => [group, ...prev]);
    return group;
  }, [user]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return {
    groups,
    loading,
    error,
    createGroup,
    joinGroup,
    refetch: fetchGroups,
  };
}

// Types pour les commentaires avec profils
type CommentWithProfile = Tables<'comments'> & {
  profiles: {
    display_name: string;
    avatar_url?: string;
  };
};

// Hook pour les commentaires
export function useComments(photoId?: string, albumId?: string) {
  const { user } = useSupabase();
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('comments')
        .select(`
          *,
          profiles:author_id(display_name, avatar_url)
        `)
        .order('created_at', { ascending: true });

      if (photoId) {
        query = query.eq('photo_id', photoId);
      } else if (albumId) {
        query = query.eq('album_id', albumId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setComments(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [photoId, albumId]);

  const addComment = useCallback(async (text: string) => {
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('comments')
      .insert({
        text,
        author_id: user.id,
        photo_id: photoId,
        album_id: albumId,
      })
      .select(`
        *,
        profiles:author_id(display_name, avatar_url)
      `)
      .single();

    if (error) throw error;
    
    setComments(prev => [...prev, data]);
    return data;
  }, [user, photoId, albumId]);

  const deleteComment = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    setComments(prev => prev.filter(comment => comment.id !== id));
  }, []);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  return {
    comments,
    loading,
    error,
    addComment,
    deleteComment,
    refetch: fetchComments,
  };
}

// Hook pour les likes
export function useLikes(photoId?: string, albumId?: string) {
  const { user } = useSupabase();
  const [likes, setLikes] = useState<Tables<'likes'>[]>([]);
  const [userLike, setUserLike] = useState<Tables<'likes'> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLikes = useCallback(async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('likes')
        .select('*')
        .order('created_at', { ascending: false });

      if (photoId) {
        query = query.eq('photo_id', photoId);
      } else if (albumId) {
        query = query.eq('album_id', albumId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setLikes(data || []);
      
      // Trouver le like de l'utilisateur actuel
      if (user) {
        const currentUserLike = data?.find(like => like.user_id === user.id) || null;
        setUserLike(currentUserLike);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, photoId, albumId]);

  const toggleLike = useCallback(async () => {
    if (!user) throw new Error('User not authenticated');

    try {
      if (userLike) {
        // Supprimer le like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('id', userLike.id);

        if (error) throw error;
        
        setLikes(prev => prev.filter(like => like.id !== userLike.id));
        setUserLike(null);
        
        // Décrémenter le compteur sur la photo/album
        if (photoId) {
          await supabase
            .from('photos')
            .update({ likes: Math.max(0, likes.length - 1) })
            .eq('id', photoId);
        } else if (albumId) {
          await supabase
            .from('albums')
            .update({ likes: Math.max(0, likes.length - 1) })
            .eq('id', albumId);
        }
      } else {
        // Ajouter un like
        const { data, error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            photo_id: photoId,
            album_id: albumId,
          })
          .select()
          .single();

        if (error) throw error;
        
        setLikes(prev => [data, ...prev]);
        setUserLike(data);
        
        // Incrémenter le compteur sur la photo/album
        if (photoId) {
          await supabase
            .from('photos')
            .update({ likes: likes.length + 1 })
            .eq('id', photoId);
        } else if (albumId) {
          await supabase
            .from('albums')
            .update({ likes: likes.length + 1 })
            .eq('id', albumId);
        }
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      throw error;
    }
  }, [user, userLike, likes.length, photoId, albumId]);

  useEffect(() => {
    fetchLikes();
  }, [fetchLikes]);

  // Synchronisation temps réel
  useEffect(() => {
    if (!photoId && !albumId) return;

    const channel = supabase
      .channel(`likes-${photoId || albumId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'likes',
          filter: photoId ? `photo_id=eq.${photoId}` : `album_id=eq.${albumId}`
        },
        (payload) => {
          console.log('Like changed:', payload);
          fetchLikes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [photoId, albumId, fetchLikes]);

  return {
    likes,
    userLike,
    loading,
    error,
    toggleLike,
    isLiked: !!userLike,
    likesCount: likes.length,
    refetch: fetchLikes,
  };
}

// Hook pour la synchronisation automatique
export function useRealtimeSync() {
  const { user } = useSupabase();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Écouter les changements sur toutes les tables importantes
    const channels = [
      // Albums
      supabase
        .channel('albums-sync')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'albums' },
          (payload) => {
            console.log('Album sync:', payload);
            // Ici on pourrait déclencher un refetch global ou utiliser un store
          }
        ),
      // Photos
      supabase
        .channel('photos-sync')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'photos' },
          (payload) => {
            console.log('Photo sync:', payload);
          }
        ),
      // Commentaires
      supabase
        .channel('comments-sync')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'comments' },
          (payload) => {
            console.log('Comment sync:', payload);
          }
        ),
      // Groupes
      supabase
        .channel('groups-sync')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'groups' },
          (payload) => {
            console.log('Group sync:', payload);
          }
        ),
    ];

    // S'abonner à tous les channels
    Promise.all(channels.map(channel => channel.subscribe()))
      .then(() => {
        setIsConnected(true);
        console.log('✅ Synchronisation temps réel activée');
      })
      .catch((error) => {
        console.error('❌ Erreur synchronisation temps réel:', error);
        setIsConnected(false);
      });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
      setIsConnected(false);
    };
  }, [user]);

  return { isConnected };
}

// Hook pour la migration des données locales vers Supabase
export function useMigration() {
  const { user } = useSupabase();
  const [migrationStatus, setMigrationStatus] = useState<'idle' | 'migrating' | 'success' | 'error'>('idle');
  const [progress, setProgress] = useState(0);

  const migrateLocalData = useCallback(async (localData: {
    albums: any[];
    photos: any[];
  }) => {
    if (!user) throw new Error('User not authenticated');

    setMigrationStatus('migrating');
    setProgress(0);

    try {
      const totalItems = localData.albums.length + localData.photos.length;
      let processedItems = 0;

      // Migrer les albums
      for (const album of localData.albums) {
        const { error } = await supabase
          .from('albums')
          .insert({
            name: album.name,
            description: album.description,
            cover_image: album.coverImage,
            owner_id: user.id,
            is_public: false,
          });

        if (error) {
          console.warn('Album migration warning:', error);
        }

        processedItems++;
        setProgress((processedItems / totalItems) * 100);
      }

      // Migrer les photos (nécessite de récupérer les nouveaux IDs d'albums)
      const { data: migratedAlbums } = await supabase
        .from('albums')
        .select('*')
        .eq('owner_id', user.id);

      for (const photo of localData.photos) {
        // Trouver l'album correspondant
        const matchingAlbum = migratedAlbums?.find(album => 
          album.name === photo.albumName
        );

        if (matchingAlbum) {
          const { error } = await supabase
            .from('photos')
            .insert({
              uri: photo.uri,
              album_id: matchingAlbum.id,
              owner_id: user.id,
              metadata: photo.metadata,
              tags: photo.tags || [],
            });

          if (error) {
            console.warn('Photo migration warning:', error);
          }
        }

        processedItems++;
        setProgress((processedItems / totalItems) * 100);
      }

      setMigrationStatus('success');
      console.log('✅ Migration terminée avec succès');
    } catch (error) {
      setMigrationStatus('error');
      console.error('❌ Erreur de migration:', error);
      throw error;
    }
  }, [user]);

  return {
    migrationStatus,
    progress,
    migrateLocalData,
  };
}

// Hook pour la synchronisation avec le cache local
export function useOfflineSync() {
  const { user } = useSupabase();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  const syncToLocal = useCallback(async () => {
    if (!user) return;

    setSyncStatus('syncing');
    try {
      // Récupérer toutes les données de l'utilisateur
      const [albumsResult, photosResult, groupsResult] = await Promise.all([
        supabase.from('albums').select('*').eq('owner_id', user.id),
        supabase.from('photos').select('*').eq('owner_id', user.id),
        supabase.from('groups').select(`
          *,
          group_members!inner(user_id)
        `).eq('group_members.user_id', user.id)
      ]);

      // Sauvegarder en local
      await Promise.all([
        AsyncStorage.setItem('supabase_albums', JSON.stringify(albumsResult.data || [])),
        AsyncStorage.setItem('supabase_photos', JSON.stringify(photosResult.data || [])),
        AsyncStorage.setItem('supabase_groups', JSON.stringify(groupsResult.data || [])),
        AsyncStorage.setItem('supabase_last_sync', new Date().toISOString())
      ]);

      setLastSyncTime(new Date());
      setSyncStatus('success');
      console.log('✅ Synchronisation locale terminée');
    } catch (error) {
      setSyncStatus('error');
      console.error('❌ Erreur synchronisation locale:', error);
    }
  }, [user]);

  const loadFromLocal = useCallback(async () => {
    try {
      const [albums, photos, groups, lastSync] = await Promise.all([
        AsyncStorage.getItem('supabase_albums'),
        AsyncStorage.getItem('supabase_photos'),
        AsyncStorage.getItem('supabase_groups'),
        AsyncStorage.getItem('supabase_last_sync')
      ]);

      return {
        albums: albums ? JSON.parse(albums) : [],
        photos: photos ? JSON.parse(photos) : [],
        groups: groups ? JSON.parse(groups) : [],
        lastSync: lastSync ? new Date(lastSync) : null
      };
    } catch (error) {
      console.error('Erreur chargement cache local:', error);
      return { albums: [], photos: [], groups: [], lastSync: null };
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadFromLocal().then(data => {
        setLastSyncTime(data.lastSync);
      });
    }
  }, [user, loadFromLocal]);

  return {
    syncStatus,
    lastSyncTime,
    syncToLocal,
    loadFromLocal,
  };
}

// Hook pour les statistiques utilisateur
export function useUserStats() {
  const { user } = useSupabase();
  const [stats, setStats] = useState({
    totalAlbums: 0,
    totalPhotos: 0,
    totalGroups: 0,
    totalLikes: 0,
    totalComments: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [albumsCount, photosCount, groupsCount, likesCount, commentsCount] = await Promise.all([
        supabase.from('albums').select('id', { count: 'exact' }).eq('owner_id', user.id),
        supabase.from('photos').select('id', { count: 'exact' }).eq('owner_id', user.id),
        supabase.from('group_members').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('likes').select('id', { count: 'exact' }).eq('user_id', user.id),
        supabase.from('comments').select('id', { count: 'exact' }).eq('author_id', user.id),
      ]);

      setStats({
        totalAlbums: albumsCount.count || 0,
        totalPhotos: photosCount.count || 0,
        totalGroups: groupsCount.count || 0,
        totalLikes: likesCount.count || 0,
        totalComments: commentsCount.count || 0,
      });
    } catch (error) {
      console.error('Erreur récupération statistiques:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

// Hook pour la recherche globale
export function useGlobalSearch() {
  const { user } = useSupabase();
  const [results, setResults] = useState<{
    albums: Tables<'albums'>[];
    photos: Tables<'photos'>[];
    groups: Tables<'groups'>[];
  }>({ albums: [], photos: [], groups: [] });
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (query: string) => {
    if (!user || !query.trim()) {
      setResults({ albums: [], photos: [], groups: [] });
      return;
    }

    setLoading(true);
    try {
      const searchTerm = `%${query.toLowerCase()}%`;
      
      const [albumsResult, photosResult, groupsResult] = await Promise.all([
        supabase
          .from('albums')
          .select('*')
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .eq('owner_id', user.id)
          .limit(10),
        supabase
          .from('photos')
          .select('*')
          .contains('tags', [query.toLowerCase()])
          .eq('owner_id', user.id)
          .limit(10),
        supabase
          .from('groups')
          .select(`
            *,
            group_members!inner(user_id)
          `)
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .eq('group_members.user_id', user.id)
          .limit(10)
      ]);

      setResults({
        albums: albumsResult.data || [],
        photos: photosResult.data || [],
        groups: groupsResult.data || [],
      });
    } catch (error) {
      console.error('Erreur recherche:', error);
      setResults({ albums: [], photos: [], groups: [] });
    } finally {
      setLoading(false);
    }
  }, [user]);

  return { results, loading, search };
}

// Fonction utilitaire pour récupérer les IDs des groupes de l'utilisateur
async function getUserGroupIds(userId: string): Promise<string> {
  const { data } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  return data?.map(item => item.group_id).join(',') || '';
}