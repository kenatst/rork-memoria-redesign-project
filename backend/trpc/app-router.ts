import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { createPhotoProcedure } from "./routes/photos/create/route";
import { syncDataProcedure, getDataProcedure } from "./routes/photos/sync/route";
import { 
  createGroupProcedure, 
  joinGroupProcedure, 
  updateGroupCoverProcedure, 
  getGroupMembersProcedure 
} from "./routes/groups/manage/route";
import { 
  createAlbumProcedure, 
  updateAlbumCoverProcedure, 
  exportAlbumProcedure, 
  searchAlbumsProcedure 
} from "./routes/albums/manage/route";
import { generateMiniFilmProcedure } from "./routes/video/generate/route";
import { suggestAlbumsProcedure } from "./routes/ai/suggest-albums/route";
import { enhancePhotoProcedure } from "./routes/photos/enhance/route";

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  photos: createTRPCRouter({
    create: createPhotoProcedure,
    sync: syncDataProcedure,
    getData: getDataProcedure,
    enhance: enhancePhotoProcedure,
  }),
  groups: createTRPCRouter({
    create: createGroupProcedure,
    join: joinGroupProcedure,
    updateCover: updateGroupCoverProcedure,
    getMembers: getGroupMembersProcedure,
  }),
  albums: createTRPCRouter({
    create: createAlbumProcedure,
    updateCover: updateAlbumCoverProcedure,
    export: exportAlbumProcedure,
    search: searchAlbumsProcedure,
  }),
  video: createTRPCRouter({
    generate: generateMiniFilmProcedure,
  }),
  ai: createTRPCRouter({
    suggestAlbums: suggestAlbumsProcedure,
  }),
});

export type AppRouter = typeof appRouter;
