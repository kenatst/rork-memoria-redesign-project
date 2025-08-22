import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const generateMiniFilmProcedure = protectedProcedure
  .input(
    z.object({
      photos: z.array(z.string()).min(1),
      duration: z.number().min(5).max(300).default(30),
      transition: z.enum(['fade', 'slide', 'zoom', 'dissolve']).default('fade'),
      music: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      aspectRatio: z.enum(['16:9', '9:16', '1:1', '4:3']).default('16:9'),
      quality: z.enum(['low', 'medium', 'high', 'ultra']).default('medium'),
      resolution: z.enum(['720p', '1080p', '4k']).default('1080p')
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('[video.generate] user:', ctx.user?.id, 'input:', input);

    const steps = [
      'Analyzing photos',
      'Picking highlights',
      'Applying transitions',
      'Mixing music',
      'Rendering',
      'Exporting'
    ];

    for (let i = 0; i < steps.length; i++) {
      console.log(`[video.generate] ${steps[i]} ${i + 1}/${steps.length}`);
      await new Promise((r) => setTimeout(r, 300));
    }

    const id = `minifilm_${Date.now()}`;

    return {
      id,
      videoUri: `https://example.com/${id}_${input.resolution}.mp4`,
      thumbnailUri: input.photos[0] ?? 'https://via.placeholder.com/400x300',
      duration: input.duration,
      createdAt: new Date().toISOString(),
      settings: input,
    };
  });
