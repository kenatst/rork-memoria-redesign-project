import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

const PhotoSchema = z.object({
  id: z.string(),
  uri: z.string(),
  albumId: z.string(),
  likes: z.array(z.string()),
  createdAt: z.string(),
  metadata: z.object({
    timestamp: z.string(),
    location: z.object({
      lat: z.number(),
      lng: z.number()
    }).optional(),
    device: z.string().optional(),
    tags: z.array(z.string()).optional(),
    filter: z.string().optional()
  }).optional()
});

const CommentSchema = z.object({
  id: z.string(),
  text: z.string(),
  author: z.string(),
  createdAt: z.string(),
  photoId: z.string().optional(),
  albumId: z.string().optional()
});

const AlbumSchema = z.object({
  id: z.string(),
  name: z.string(),
  coverImage: z.string().optional(),
  photos: z.array(z.string()),
  createdAt: z.string(),
  groupId: z.string().optional(),
  isPublic: z.boolean(),
  likes: z.array(z.string()),
  tags: z.array(z.string()).optional(),
  description: z.string().optional()
});

const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
  members: z.array(z.string()),
  albums: z.array(z.string()),
  createdAt: z.string(),
  owner: z.string(),
  inviteCode: z.string().optional(),
  permissions: z.object({
    canAddPhotos: z.array(z.string()),
    canDeletePhotos: z.array(z.string()),
    canModerate: z.array(z.string())
  }).optional()
});

export const syncDataProcedure = protectedProcedure
  .input(z.object({
    photos: z.array(PhotoSchema),
    comments: z.array(CommentSchema),
    albums: z.array(AlbumSchema),
    groups: z.array(GroupSchema),
    lastSync: z.string().optional()
  }))
  .mutation(async ({ input }: { input: { photos: any[]; comments: any[]; albums: any[]; groups: any[]; lastSync?: string } }) => {
    // Simulate server sync - in real app, this would sync with database
    console.log('Syncing data:', {
      photos: input.photos.length,
      comments: input.comments.length,
      albums: input.albums.length,
      groups: input.groups.length,
      lastSync: input.lastSync
    });
    
    return {
      success: true,
      syncedAt: new Date().toISOString(),
      conflicts: [], // In real app, return any sync conflicts
      serverData: {
        photos: input.photos,
        comments: input.comments,
        albums: input.albums,
        groups: input.groups
      }
    };
  });

export const getDataProcedure = protectedProcedure
  .input(z.object({
    lastSync: z.string().optional()
  }))
  .query(async ({ input }: { input: { lastSync?: string } }) => {
    // Simulate fetching server data
    console.log('Fetching data since:', input.lastSync);
    
    return {
      photos: [],
      comments: [],
      albums: [],
      groups: [],
      lastSync: new Date().toISOString()
    };
  });