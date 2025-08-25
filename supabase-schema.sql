-- Memoria App Database Schema
-- Execute these commands in your Supabase SQL editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create groups table
CREATE TABLE IF NOT EXISTS groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create group_members table
CREATE TABLE IF NOT EXISTS group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Create albums table
CREATE TABLE IF NOT EXISTS albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT FALSE,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uri TEXT NOT NULL,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE NOT NULL,
  owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  metadata JSONB,
  tags TEXT[],
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (photo_id IS NOT NULL OR album_id IS NOT NULL)
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (photo_id IS NOT NULL OR album_id IS NOT NULL),
  UNIQUE(user_id, photo_id),
  UNIQUE(user_id, album_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Groups policies
CREATE POLICY "Users can view groups they belong to" ON groups FOR SELECT 
  USING (
    owner_id = auth.uid() OR 
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can create groups" ON groups FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Group owners can update their groups" ON groups FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Group owners can delete their groups" ON groups FOR DELETE USING (auth.uid() = owner_id);

-- Group members policies
CREATE POLICY "Users can view group members of groups they belong to" ON group_members FOR SELECT 
  USING (
    user_id = auth.uid() OR 
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can join groups" ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON group_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Group owners can manage members" ON group_members FOR ALL 
  USING (
    group_id IN (SELECT id FROM groups WHERE owner_id = auth.uid())
  );

-- Albums policies
CREATE POLICY "Users can view their albums and group albums" ON albums FOR SELECT 
  USING (
    owner_id = auth.uid() OR 
    is_public = true OR
    (group_id IS NOT NULL AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()))
  );
CREATE POLICY "Users can create albums" ON albums FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Album owners can update their albums" ON albums FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Album owners can delete their albums" ON albums FOR DELETE USING (auth.uid() = owner_id);

-- Photos policies
CREATE POLICY "Users can view photos in accessible albums" ON photos FOR SELECT 
  USING (
    owner_id = auth.uid() OR
    album_id IN (
      SELECT id FROM albums WHERE 
        owner_id = auth.uid() OR 
        is_public = true OR
        (group_id IS NOT NULL AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()))
    )
  );
CREATE POLICY "Users can add photos to their albums" ON photos FOR INSERT 
  WITH CHECK (
    auth.uid() = owner_id AND
    album_id IN (SELECT id FROM albums WHERE owner_id = auth.uid())
  );
CREATE POLICY "Photo owners can update their photos" ON photos FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Photo owners can delete their photos" ON photos FOR DELETE USING (auth.uid() = owner_id);

-- Comments policies
CREATE POLICY "Users can view comments on accessible content" ON comments FOR SELECT 
  USING (
    author_id = auth.uid() OR
    (photo_id IS NOT NULL AND photo_id IN (
      SELECT id FROM photos WHERE 
        owner_id = auth.uid() OR
        album_id IN (
          SELECT id FROM albums WHERE 
            owner_id = auth.uid() OR 
            is_public = true OR
            (group_id IS NOT NULL AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()))
        )
    )) OR
    (album_id IS NOT NULL AND album_id IN (
      SELECT id FROM albums WHERE 
        owner_id = auth.uid() OR 
        is_public = true OR
        (group_id IS NOT NULL AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()))
    ))
  );
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Comment authors can update their comments" ON comments FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Comment authors can delete their comments" ON comments FOR DELETE USING (auth.uid() = author_id);

-- Likes policies
CREATE POLICY "Users can view likes on accessible content" ON likes FOR SELECT 
  USING (
    user_id = auth.uid() OR
    (photo_id IS NOT NULL AND photo_id IN (
      SELECT id FROM photos WHERE 
        owner_id = auth.uid() OR
        album_id IN (
          SELECT id FROM albums WHERE 
            owner_id = auth.uid() OR 
            is_public = true OR
            (group_id IS NOT NULL AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()))
        )
    )) OR
    (album_id IS NOT NULL AND album_id IN (
      SELECT id FROM albums WHERE 
        owner_id = auth.uid() OR 
        is_public = true OR
        (group_id IS NOT NULL AND group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid()))
    ))
  );
CREATE POLICY "Users can like/unlike content" ON likes FOR ALL USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_albums_owner_id ON albums(owner_id);
CREATE INDEX IF NOT EXISTS idx_albums_group_id ON albums(group_id);
CREATE INDEX IF NOT EXISTS idx_photos_album_id ON photos(album_id);
CREATE INDEX IF NOT EXISTS idx_photos_owner_id ON photos(owner_id);
CREATE INDEX IF NOT EXISTS idx_comments_photo_id ON comments(photo_id);
CREATE INDEX IF NOT EXISTS idx_comments_album_id ON comments(album_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_photo_id ON likes(photo_id);
CREATE INDEX IF NOT EXISTS idx_likes_album_id ON likes(album_id);

-- Create functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON albums FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON photos FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION handle_updated_at();