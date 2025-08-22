import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const suggestAlbumsProcedure = protectedProcedure
  .input(z.object({ photos: z.array(z.string()).min(1) }))
  .mutation(async ({ input, ctx }) => {
    console.log('[ai.suggestAlbums] user:', ctx.user?.id, 'photos:', input.photos.length);

    const suggestions = [
      {
        id: `sugg_${Date.now()}_1`,
        title: 'Moments en famille',
        criteria: 'people',
        cover: input.photos[0],
        score: 0.92,
        photos: input.photos.slice(0, Math.max(3, Math.floor(input.photos.length / 3)))
      },
      {
        id: `sugg_${Date.now()}_2`,
        title: 'Voyages & paysages',
        criteria: 'location',
        cover: input.photos[1] ?? input.photos[0],
        score: 0.87,
        photos: input.photos.slice(Math.floor(input.photos.length / 3), Math.floor((2 * input.photos.length) / 3))
      },
      {
        id: `sugg_${Date.now()}_3`,
        title: 'Temps forts',
        criteria: 'events',
        cover: input.photos[2] ?? input.photos[0],
        score: 0.84,
        photos: input.photos.slice(Math.floor((2 * input.photos.length) / 3))
      }
    ];

    await new Promise((r) => setTimeout(r, 500));

    return { suggestions };
  });
