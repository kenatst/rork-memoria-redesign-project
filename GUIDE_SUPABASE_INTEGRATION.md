# 🚀 Guide d'Intégration Supabase pour Memoria

## ✅ Configuration Terminée

Supabase est déjà configuré avec vos identifiants :
- **URL**: `https://yxkbgrmkfgahaclsyeoe.supabase.co`
- **Clé publique**: Configurée dans `lib/supabase.ts`

## 📋 Étapes d'Intégration Complète

### 1. Créer les Tables dans Supabase Dashboard

Connectez-vous à votre dashboard Supabase et exécutez ce SQL :

```sql
-- Activer RLS (Row Level Security)
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Table des profils utilisateurs
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des groupes
CREATE TABLE groups (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des membres de groupes
CREATE TABLE group_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('owner', 'admin', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Table des albums
CREATE TABLE albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  group_id UUID REFERENCES groups(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des photos
CREATE TABLE photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  uri TEXT NOT NULL,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES profiles(id) NOT NULL,
  metadata JSONB,
  tags TEXT[],
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des commentaires
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  text TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (photo_id IS NOT NULL OR album_id IS NOT NULL)
);

-- Table des likes
CREATE TABLE likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (photo_id IS NOT NULL OR album_id IS NOT NULL),
  UNIQUE(user_id, photo_id),
  UNIQUE(user_id, album_id)
);

-- Indexes pour les performances
CREATE INDEX idx_albums_owner ON albums(owner_id);
CREATE INDEX idx_albums_group ON albums(group_id);
CREATE INDEX idx_photos_album ON photos(album_id);
CREATE INDEX idx_photos_owner ON photos(owner_id);
CREATE INDEX idx_comments_photo ON comments(photo_id);
CREATE INDEX idx_comments_album ON comments(album_id);
CREATE INDEX idx_likes_photo ON likes(photo_id);
CREATE INDEX idx_likes_album ON likes(album_id);

-- Triggers pour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_photos_updated_at BEFORE UPDATE ON photos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Configurer Row Level Security (RLS)

```sql
-- Activer RLS sur toutes les tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Politiques pour les profils
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Politiques pour les groupes
CREATE POLICY "Users can view groups they belong to" ON groups FOR SELECT USING (
  id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create groups" ON groups FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Group owners can update groups" ON groups FOR UPDATE USING (auth.uid() = owner_id);

-- Politiques pour les albums
CREATE POLICY "Users can view public albums or albums in their groups" ON albums FOR SELECT USING (
  is_public = true OR 
  owner_id = auth.uid() OR
  group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
);
CREATE POLICY "Users can create albums" ON albums FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Album owners can update albums" ON albums FOR UPDATE USING (auth.uid() = owner_id);

-- Politiques pour les photos
CREATE POLICY "Users can view photos in accessible albums" ON photos FOR SELECT USING (
  album_id IN (
    SELECT id FROM albums WHERE 
    is_public = true OR 
    owner_id = auth.uid() OR
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  )
);
CREATE POLICY "Users can add photos to their albums" ON photos FOR INSERT WITH CHECK (
  auth.uid() = owner_id AND
  album_id IN (SELECT id FROM albums WHERE owner_id = auth.uid())
);

-- Politiques pour les commentaires
CREATE POLICY "Users can view comments on accessible content" ON comments FOR SELECT USING (
  (photo_id IS NOT NULL AND photo_id IN (
    SELECT id FROM photos WHERE album_id IN (
      SELECT id FROM albums WHERE 
      is_public = true OR 
      owner_id = auth.uid() OR
      group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    )
  )) OR
  (album_id IS NOT NULL AND album_id IN (
    SELECT id FROM albums WHERE 
    is_public = true OR 
    owner_id = auth.uid() OR
    group_id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
  ))
);
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own comments" ON comments FOR DELETE USING (auth.uid() = author_id);
```

### 3. Configurer l'Authentification

Dans votre dashboard Supabase, allez dans **Authentication > Settings** :

1. **Email Templates** : Personnalisez les emails
2. **URL Configuration** :
   - Site URL: `https://your-app-domain.com`
   - Redirect URLs: Ajoutez vos URLs de redirection
3. **Providers** : Activez Google, Apple, etc.

### 4. Tester l'Intégration

Utilisez l'écran de test Supabase dans votre app :

```bash
# Naviguez vers l'écran de test
/supabase-test
```

### 5. Migrer les Données Existantes

Si vous avez des données locales, créez un script de migration :

```typescript
// utils/migrate-to-supabase.ts
import { supabase } from '@/lib/supabase';
import { useAppState } from '@/providers/AppStateProvider';

export async function migrateLocalDataToSupabase() {
  const { albums, photos } = useAppState();
  
  try {
    // Migrer les albums
    for (const album of albums) {
      const { error } = await supabase
        .from('albums')
        .insert({
          name: album.name,
          description: album.description,
          is_public: false,
        });
      
      if (error) throw error;
    }
    
    console.log('Migration terminée avec succès');
  } catch (error) {
    console.error('Erreur de migration:', error);
  }
}
```

### 6. Configurer les Hooks Supabase

Les hooks sont déjà créés dans `lib/supabase-hooks.ts`. Utilisez-les dans vos composants :

```typescript
import { useAlbums, usePhotos } from '@/lib/supabase-hooks';

function MyComponent() {
  const { albums, loading, createAlbum } = useAlbums();
  const { photos, addPhoto } = usePhotos();
  
  // Utiliser les données...
}
```

### 7. Synchronisation Temps Réel

Supabase offre la synchronisation en temps réel. Ajoutez dans vos hooks :

```typescript
useEffect(() => {
  const channel = supabase
    .channel('albums-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'albums' },
      (payload) => {
        console.log('Album changé:', payload);
        // Mettre à jour l'état local
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

## 🔧 Fonctionnalités Disponibles

### ✅ Déjà Implémenté
- Configuration Supabase
- Types TypeScript
- Hooks de base
- Écran de test
- Authentification
- CRUD albums/photos

### 🚧 À Implémenter
- Migration des données locales
- Synchronisation temps réel
- Upload d'images vers Supabase Storage
- Notifications push
- Partage d'albums

## 🚀 Prochaines Étapes

1. **Créer les tables** dans votre dashboard Supabase
2. **Tester** avec l'écran `/supabase-test`
3. **Migrer** progressivement de l'état local vers Supabase
4. **Configurer** l'upload d'images vers Supabase Storage
5. **Activer** la synchronisation temps réel

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans la console
2. Testez avec l'écran de test intégré
3. Consultez la documentation Supabase
4. Vérifiez les politiques RLS

Votre app Memoria est maintenant prête pour Supabase ! 🎉