import { z } from 'zod';
import { protectedProcedure, type Context } from '../../create-context';

const CreateGroupInput = z.object({
  name: z.string(),
  description: z.string().optional(),
  coverImage: z.string().optional(),
});

export const createGroupProcedure = protectedProcedure
  .input(CreateGroupInput)
  .mutation(async ({ input, ctx }: { input: z.infer<typeof CreateGroupInput>; ctx: Context }) => {
    const group = {
      id: Date.now().toString(),
      name: input.name,
      description: input.description,
      coverImage: input.coverImage,
      members: [ctx.user.name],
      albums: [] as string[],
      createdAt: new Date().toISOString(),
      owner: ctx.user.name,
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      permissions: {
        canAddPhotos: [ctx.user.name],
        canDeletePhotos: [ctx.user.name],
        canModerate: [ctx.user.name],
      },
    };

    console.log('Creating group:', group);
    return group;
  });

const JoinGroupInput = z.object({
  inviteCode: z.string(),
});

export const joinGroupProcedure = protectedProcedure
  .input(JoinGroupInput)
  .mutation(async ({ input, ctx }: { input: z.infer<typeof JoinGroupInput>; ctx: Context }) => {
    console.log('Joining group with code:', input.inviteCode, 'for user:', ctx.user.name);

    return {
      success: true,
      groupId: 'mock-group-id',
      message: 'Successfully joined group',
    } as const;
  });

const UpdateGroupCoverInput = z.object({
  groupId: z.string(),
  coverImage: z.string(),
});

export const updateGroupCoverProcedure = protectedProcedure
  .input(UpdateGroupCoverInput)
  .mutation(async ({ input, ctx }: { input: z.infer<typeof UpdateGroupCoverInput>; ctx: Context }) => {
    console.log('Updating group cover:', input.groupId, 'by user:', ctx.user.name);

    return {
      success: true,
      groupId: input.groupId,
      coverImage: input.coverImage,
    } as const;
  });

const GetGroupMembersInput = z.object({
  groupId: z.string(),
});

export const getGroupMembersProcedure = protectedProcedure
  .input(GetGroupMembersInput)
  .query(async ({ input }: { input: z.infer<typeof GetGroupMembersInput> }) => {
    console.log('Getting members for group:', input.groupId);

    return {
      members: [
        { id: '1', name: 'Alice', role: 'owner', avatar: null as string | null },
        { id: '2', name: 'Bob', role: 'admin', avatar: null as string | null },
        { id: '3', name: 'Charlie', role: 'member', avatar: null as string | null },
      ],
    };
  });
