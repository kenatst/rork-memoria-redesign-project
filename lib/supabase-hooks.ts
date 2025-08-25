import { useState, useEffect, useCallback } from 'react';
import { supabase, Tables, Inserts, Updates } from '@/lib/supabase';
import { useSupabase } from '@/providers/SupabaseProvider';

// Hook pour les albums
export function useAlbums() {
  const { user } = useSupabase();
  const [albums, setAlbums] = useState<Tables<'albums'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlbums = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('albums')
        .select(`
          *,
          photos:photos(count)
        `)
        .or(`owner_id.eq.${user.id},group_id.in.(${await getUserGroupIds(user.id)})`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlbums(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user]);

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
    createAlbum,
    updateAlbum,
    deleteAlbum,
    refetch: fetchAlbums,
  };
}

// Hook pour les photos
export function usePhotos(albumId?: string) {
  const { user } = useSupabase();
  const [photos, setPhotos] = useState<Tables<'photos'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      let query = supabase
        .from('photos')
        .select('*')
        .order('created_at', { ascending: false });

      if (albumId) {
        query = query.eq('album_id', albumId);
      } else {
        query = query.eq('owner_id', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setPhotos(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [user, albumId]);

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
    addPhoto,
    updatePhoto,
    deletePhoto,
    refetch: fetchPhotos,
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

// Fonction utilitaire pour récupérer les IDs des groupes de l'utilisateur
async function getUserGroupIds(userId: string): Promise<string> {
  const { data } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId);

  return data?.map(item => item.group_id).join(',') || '';
}