import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

export const enhancePhotoProcedure = protectedProcedure
  .input(
    z.object({
      photoUri: z.string(),
      level: z.enum(['light', 'standard', 'strong']).default('standard')
    })
  )
  .mutation(async ({ input, ctx }) => {
    console.log('[photos.enhance] user:', ctx.user?.id, 'input:', input);

    await new Promise((r) => setTimeout(r, 600));

    return {
      id: `enhanced_${Date.now()}`,
      originalUri: input.photoUri,
      enhancedUri: input.photoUri + `?enhanced=${input.level}`,
      level: input.level,
      createdAt: new Date().toISOString()
    };
  });
