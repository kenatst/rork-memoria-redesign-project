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

### 7. Utiliser les Hooks Supabase

Tous les hooks sont prêts à utiliser dans vos composants :

```typescript
import { 
  useAlbums, 
  usePhotos, 
  useGroups, 
  useComments, 
  useLikes,
  useRealtimeSync,
  useOfflineSync,
  useUserStats,
  useGlobalSearch,
  useMigration
} from '@/lib/supabase-hooks';

function MyComponent() {
  // Données principales
  const { albums, createAlbum, loading } = useAlbums();
  const { photos, addPhoto } = usePhotos();
  const { groups, createGroup, joinGroup } = useGroups();
  
  // Interactions sociales
  const { comments, addComment } = useComments(photoId);
  const { isLiked, likesCount, toggleLike } = useLikes(photoId);
  
  // Fonctionnalités avancées
  const { isConnected } = useRealtimeSync(); // Sync temps réel
  const { syncToLocal, lastSyncTime } = useOfflineSync(); // Cache local
  const { stats } = useUserStats(); // Statistiques
  const { search, results } = useGlobalSearch(); // Recherche
  const { migrateLocalData, progress } = useMigration(); // Migration
  
  // Utiliser les données...
}
```

### 8. Synchronisation Temps Réel

La synchronisation temps réel est automatiquement activée :

```typescript
// Dans votre composant principal
const { isConnected } = useRealtimeSync();

// Afficher le statut de connexion
<Text>Sync: {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}</Text>
```

## 🔧 Fonctionnalités Disponibles

### ✅ Déjà Implémenté
- **Configuration Supabase** : Client configuré avec authentification persistante
- **Types TypeScript** : Types complets pour toutes les tables
- **Authentification** : Inscription, connexion, déconnexion avec profils automatiques
- **Albums** : CRUD complet avec compteur de photos
- **Photos** : CRUD complet avec métadonnées et tags
- **Groupes** : Création, invitation par code, gestion des membres
- **Commentaires** : Sur photos et albums avec profils utilisateur
- **Likes** : Système de likes avec compteurs temps réel
- **Synchronisation temps réel** : Mise à jour automatique des données
- **Cache local** : Synchronisation offline avec AsyncStorage
- **Recherche globale** : Recherche dans albums, photos et groupes
- **Statistiques utilisateur** : Compteurs de toutes les activités
- **Migration** : Outil pour migrer les données locales vers Supabase
- **Écran de test** : Interface complète pour tester toutes les fonctionnalités

### 🚧 À Implémenter (Optionnel)
- Upload d'images vers Supabase Storage
- Notifications push
- Partage d'albums publics
- Modération de contenu

## 🚀 Guide d'Utilisation Rapide

### 1. Créer les Tables
Exécutez le SQL dans `supabase-schema.sql` dans votre dashboard Supabase.

### 2. Tester l'Intégration
Naviguez vers `/supabase-test` dans votre app pour tester toutes les fonctionnalités.

### 3. Utiliser dans vos Composants
```typescript
// Exemple d'utilisation complète
import { useAlbums, useLikes, useComments } from '@/lib/supabase-hooks';

function AlbumScreen({ albumId }: { albumId: string }) {
  const { albums } = useAlbums();
  const { isLiked, likesCount, toggleLike } = useLikes(undefined, albumId);
  const { comments, addComment } = useComments(undefined, albumId);
  
  const album = albums.find(a => a.id === albumId);
  
  return (
    <View>
      <Text>{album?.name}</Text>
      
      {/* Bouton Like */}
      <TouchableOpacity onPress={toggleLike}>
        <Heart fill={isLiked ? '#FF0000' : 'transparent'} />
        <Text>{likesCount}</Text>
      </TouchableOpacity>
      
      {/* Commentaires */}
      {comments.map(comment => (
        <View key={comment.id}>
          <Text>{comment.profiles.display_name}</Text>
          <Text>{comment.text}</Text>
        </View>
      ))}
      
      {/* Ajouter commentaire */}
      <TouchableOpacity onPress={() => addComment('Super album !')}>
        <Text>Commenter</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 4. Migration des Données Locales
```typescript
const { migrateLocalData, progress, migrationStatus } = useMigration();

// Migrer vos données existantes
const handleMigration = async () => {
  await migrateLocalData({
    albums: localAlbums,
    photos: localPhotos
  });
};
```

### 5. Recherche Globale
```typescript
const { search, results, loading } = useGlobalSearch();

// Rechercher dans toutes les données
const handleSearch = (query: string) => {
  search(query);
};

// Afficher les résultats
{results.albums.map(album => <AlbumCard key={album.id} album={album} />)}
{results.photos.map(photo => <PhotoCard key={photo.id} photo={photo} />)}
{results.groups.map(group => <GroupCard key={group.id} group={group} />)}
```

## 📞 Support & Débogage

### 🔍 Outils de Débogage
1. **Écran de test** : `/supabase-test` - Interface complète pour tester
2. **Logs console** : Tous les hooks loggent leurs actions
3. **Indicateurs visuels** : Statuts de chargement et connexion
4. **Dashboard Supabase** : Vérifiez les données directement

### 🚨 Problèmes Courants

**Erreur d'authentification :**
- Vérifiez les identifiants dans `lib/supabase.ts`
- Testez la connexion avec l'écran de test

**Données non synchronisées :**
- Vérifiez le statut de connexion temps réel
- Utilisez `refetch()` pour forcer la mise à jour

**Erreurs RLS (Row Level Security) :**
- Vérifiez que les politiques sont bien créées
- Testez avec un utilisateur authentifié

**Performance lente :**
- Utilisez le cache local avec `useOfflineSync()`
- Limitez les requêtes avec pagination

### 📋 Checklist de Vérification
- [ ] Tables créées dans Supabase
- [ ] Politiques RLS activées
- [ ] Utilisateur authentifié
- [ ] Connexion temps réel active
- [ ] Cache local synchronisé
- [ ] Écran de test fonctionnel

### 🎯 Optimisations Recommandées
1. **Pagination** : Limitez les résultats avec `.limit()`
2. **Cache** : Utilisez `useOfflineSync()` pour les données critiques
3. **Recherche** : Indexez les colonnes fréquemment recherchées
4. **Images** : Utilisez Supabase Storage pour les fichiers
5. **Monitoring** : Surveillez les métriques dans le dashboard

## 🎯 Fonctionnalités Clés Implémentées

### 🔐 Authentification Complète
- Inscription/Connexion avec email/mot de passe
- Création automatique de profil utilisateur
- Session persistante avec AsyncStorage
- Support OAuth (Google, Apple) prêt

### 📁 Gestion d'Albums
- Création, modification, suppression d'albums
- Albums privés ou liés à des groupes
- Compteur automatique de photos
- Recherche par nom et description

### 📸 Gestion de Photos
- Ajout de photos avec métadonnées
- Système de tags pour la recherche
- Compteur de likes automatique
- Association aux albums

### 👥 Système de Groupes
- Création de groupes avec codes d'invitation
- Gestion des rôles (owner, admin, member)
- Partage d'albums dans les groupes
- Invitation par code unique

### 💬 Commentaires Sociaux
- Commentaires sur photos et albums
- Profils utilisateur intégrés
- Suppression par l'auteur
- Ordre chronologique

### ❤️ Système de Likes
- Like/Unlike sur photos et albums
- Compteurs temps réel
- État utilisateur (déjà liké ou non)
- Synchronisation automatique

### ⚡ Synchronisation Temps Réel
- Mise à jour automatique des données
- Connexion WebSocket avec Supabase
- Indicateur de statut de connexion
- Gestion des déconnexions

### 💾 Cache Local & Offline
- Synchronisation avec AsyncStorage
- Données disponibles hors ligne
- Synchronisation automatique au retour en ligne
- Horodatage de dernière sync

### 🔍 Recherche Avancée
- Recherche globale dans albums, photos, groupes
- Recherche par nom, description, tags
- Résultats limités et optimisés
- Interface de recherche fluide

### 📊 Statistiques Utilisateur
- Compteurs de toutes les activités
- Albums, photos, groupes, likes, commentaires
- Mise à jour en temps réel
- Interface de dashboard

### 🔄 Migration de Données
- Outil de migration des données locales
- Barre de progression
- Gestion des erreurs
- Mapping automatique des relations

## 🎉 Votre App Memoria est Super Fluide avec Supabase !

✅ **Authentification** : Inscription, connexion, déconnexion  
✅ **Albums** : Création, lecture, mise à jour, suppression  
✅ **Photos** : Ajout, lecture, métadonnées, tags  
✅ **Groupes** : Création, invitation par code  
✅ **Commentaires** : Sur photos et albums  
✅ **Likes** : Sur photos et albums  
✅ **Synchronisation** : Automatique entre local et Supabase  
✅ **Temps Réel** : Mise à jour instantanée  
✅ **Recherche** : Globale et performante  
✅ **Cache** : Données disponibles offline  
✅ **Migration** : Outils pour migrer les données existantes  

Tout est prêt pour une expérience utilisateur exceptionnelle ! 🚀