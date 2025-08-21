import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

const createPhotoSchema = z.object({
  uri: z.string(),
  albumId: z.string(),
  metadata: z.object({
    timestamp: z.string(),
    location: z.string().optional(),
    filter: z.string().optional(),
  }).optional(),
});

export const createPhotoProcedure = protectedProcedure
  .input(createPhotoSchema)
  .mutation(async ({ input, ctx }: { input: z.infer<typeof createPhotoSchema>, ctx: any }) => {
    // Mock implementation - replace with actual database logic
    const photo = {
      id: Date.now().toString(),
      uri: input.uri,
      albumId: input.albumId,
      userId: ctx.user.id,
      createdAt: new Date().toISOString(),
      likes: [],
      comments: [],
      metadata: input.metadata,
    };
    
    console.log('Creating photo:', photo);
    
    return photo;
  });