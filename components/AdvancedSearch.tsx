import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Search, Filter, X, Calendar, MapPin, Tag, User } from 'lucide-react-native';
import { useAppState } from '@/providers/AppStateProvider';
import Colors from '@/constants/colors';
import { Image } from 'expo-image';

interface SearchFilters {
  dateRange?: { start: string; end: string };
  location?: boolean;
  tags?: string[];
  author?: string;
  fileType?: 'image' | 'video' | 'all';
  quality?: 'high' | 'medium' | 'low' | 'all';
  favorites?: boolean;
  shared?: boolean;
}

interface AdvancedSearchProps {
  onClose: () => void;
  onResults: (results: { albums: any[]; photos: any[] }) => void;
}

export default function AdvancedSearch({ onClose, onResults }: AdvancedSearchProps) {
  const { albums, photos, searchAlbums, searchPhotos } = useAppState();
  const [query, setQuery] = useState<string>('');
  const [filters, setFilters] = useState<SearchFilters>({});
  const [showFilters, setShowFilters] = useState<boolean>(false);

  const searchResults = useMemo(() => {
    if (!query.trim() && Object.keys(filters).length === 0) {
      return { albums: [], photos: [] };
    }

    let filteredAlbums = query ? searchAlbums(query) : albums;
    let filteredPhotos = query ? searchPhotos(query) : photos;

    // Apply filters
    if (filters.dateRange) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      
      filteredAlbums = filteredAlbums.filter(album => {
        const albumDate = new Date(album.createdAt);
        return albumDate >= startDate && albumDate <= endDate;
      });
      
      filteredPhotos = filteredPhotos.filter(photo => {
        const photoDate = new Date(photo.createdAt);
        return photoDate >= startDate && photoDate <= endDate;
      });
    }

    if (filters.location) {
      filteredPhotos = filteredPhotos.filter(photo => photo.metadata?.location);
      filteredAlbums = filteredAlbums.filter(album => 
        album.photos.some(photoUri => {
          const photo = photos.find(p => p.uri === photoUri);
          return photo?.metadata?.location;
        })
      );
    }

    if (filters.favorites) {
      filteredPhotos = filteredPhotos.filter(photo => (photo as any).isFavorite);
      filteredAlbums = filteredAlbums.filter(album => (album as any).isFavorite);
    }

    if (filters.shared) {
      filteredPhotos = filteredPhotos.filter(photo => (photo as any).isShared);
      filteredAlbums = filteredAlbums.filter(album => (album as any).isShared);
    }

    if (filters.fileType && filters.fileType !== 'all') {
      filteredPhotos = filteredPhotos.filter(photo => {
        const isVideo = photo.uri.includes('.mp4') || photo.uri.includes('.mov');
        return filters.fileType === 'video' ? isVideo : !isVideo;
      });
    }

    return { albums: filteredAlbums, photos: filteredPhotos };
  }, [query, filters, albums, photos, searchAlbums, searchPhotos]);

  const handleSearch = useCallback(() => {
    onResults(searchResults);
  }, [searchResults, onResults]);

  const toggleFilter = useCallback((filterType: keyof SearchFilters, value?: any) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (filterType === 'location') {
        newFilters.location = !prev.location;
      } else if (filterType === 'favorites') {
        newFilters.favorites = !prev.favorites;
      } else if (filterType === 'shared') {
        newFilters.shared = !prev.shared;
      } else if (filterType === 'dateRange' && value) {
        newFilters.dateRange = value;
      } else if (filterType === 'fileType' && value) {
        newFilters.fileType = value;
      } else if (filterType === 'quality' && value) {
        newFilters.quality = value;
      }
      return newFilters;
    });
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setQuery('');
  }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#000000', '#0B0B0D', '#131417']} style={StyleSheet.absoluteFillObject} />
      
      {/* Header */}
      <View style={styles.header}>
        {Platform.OS !== 'web' ? (
          <BlurView intensity={20} style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Recherche avancée</Text>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <X color="#FFFFFF" size={24} />
              </Pressable>
            </View>
          </BlurView>
        ) : (
          <View style={[styles.headerBlur, styles.webBlur]}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Recherche avancée</Text>
              <Pressable style={styles.closeButton} onPress={onClose}>
                <X color="#FFFFFF" size={24} />
              </Pressable>
            </View>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Input */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <Search color={Colors.palette.taupe} size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Rechercher albums, photos..."
              placeholderTextColor={Colors.palette.taupe}
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={handleSearch}
            />
            {query.length > 0 && (
              <Pressable onPress={() => setQuery('')}>
                <X color={Colors.palette.taupe} size={16} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Filters Toggle */}
        <View style={styles.filtersToggle}>
          <Pressable 
            style={[styles.filterButton, showFilters && styles.filterButtonActive]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Filter color={showFilters ? '#000000' : Colors.palette.taupe} size={16} />
            <Text style={[styles.filterButtonText, showFilters && styles.filterButtonTextActive]}>
              Filtres {Object.keys(filters).length > 0 && `(${Object.keys(filters).length})`}
            </Text>
          </Pressable>
          
          {Object.keys(filters).length > 0 && (
            <Pressable style={styles.clearFiltersButton} onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Effacer</Text>
            </Pressable>
          )}
        </View>

        {/* Filters Panel */}
        {showFilters && (
          <View style={styles.filtersPanel}>
            <LinearGradient colors={['#1a1a1a', '#2d2d2d']} style={styles.filtersPanelGradient}>
              
              {/* Location Filter */}
              <Pressable 
                style={[styles.filterOption, filters.location && styles.filterOptionActive]}
                onPress={() => toggleFilter('location')}
              >
                <MapPin color={filters.location ? '#000000' : Colors.palette.taupe} size={20} />
                <Text style={[styles.filterOptionText, filters.location && styles.filterOptionTextActive]}>
                  Avec géolocalisation
                </Text>
              </Pressable>

              {/* Date Range Filter */}
              <View style={styles.filterOption}>
                <Calendar color={Colors.palette.taupe} size={20} />
                <Text style={styles.filterOptionText}>Période</Text>
              </View>

              {/* Favorites Filter */}
              <Pressable 
                style={[styles.filterOption, filters.favorites && styles.filterOptionActive]}
                onPress={() => toggleFilter('favorites')}
              >
                <Tag color={filters.favorites ? '#000000' : Colors.palette.taupe} size={20} />
                <Text style={[styles.filterOptionText, filters.favorites && styles.filterOptionTextActive]}>
                  Favoris uniquement
                </Text>
              </Pressable>

              {/* File Type Filter */}
              <View style={styles.filterOption}>
                <User color={Colors.palette.taupe} size={20} />
                <Text style={styles.filterOptionText}>Type de fichier</Text>
              </View>

              {/* Quality Filter */}
              <View style={styles.filterOption}>
                <Filter color={Colors.palette.taupe} size={20} />
                <Text style={styles.filterOptionText}>Qualité</Text>
              </View>

            </LinearGradient>
          </View>
        )}

        {/* Quick Filters */}
        <View style={styles.quickFilters}>
          <Text style={styles.quickFiltersTitle}>Recherches rapides</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickFiltersScroll}>
            <Pressable style={styles.quickFilter} onPress={() => setQuery('cette semaine')}>
              <Text style={styles.quickFilterText}>Cette semaine</Text>
            </Pressable>
            <Pressable style={styles.quickFilter} onPress={() => setQuery('favoris')}>
              <Text style={styles.quickFilterText}>Favoris</Text>
            </Pressable>
            <Pressable style={styles.quickFilter} onPress={() => toggleFilter('location')}>
              <Text style={styles.quickFilterText}>Avec localisation</Text>
            </Pressable>
            <Pressable style={styles.quickFilter} onPress={() => setQuery('récent')}>
              <Text style={styles.quickFilterText}>Récents</Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Results Preview */}
        {(query.length > 0 || Object.keys(filters).length > 0) && (
          <View style={styles.resultsPreview}>
            <Text style={styles.resultsTitle}>
              Résultats ({searchResults.albums.length + searchResults.photos.length})
            </Text>
            
            {searchResults.albums.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>Albums ({searchResults.albums.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {searchResults.albums.slice(0, 5).map(album => (
                    <View key={album.id} style={styles.resultItem}>
                      <Image
                        source={{ uri: album.coverImage || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=400&auto=format&fit=crop' }}
                        style={styles.resultImage}
                        contentFit="cover"
                      />
                      <Text style={styles.resultItemTitle} numberOfLines={1}>{album.name}</Text>
                      <Text style={styles.resultItemMeta}>{album.photos.length} photos</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {searchResults.photos.length > 0 && (
              <View style={styles.resultSection}>
                <Text style={styles.resultSectionTitle}>Photos ({searchResults.photos.length})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {searchResults.photos.slice(0, 5).map(photo => (
                    <View key={photo.id} style={styles.resultItem}>
                      <Image
                        source={{ uri: photo.uri }}
                        style={styles.resultImage}
                        contentFit="cover"
                      />
                      <Text style={styles.resultItemMeta}>
                        {new Date(photo.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            <Pressable style={styles.viewAllButton} onPress={handleSearch}>
              <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.viewAllGradient}>
                <Text style={styles.viewAllText}>Voir tous les résultats</Text>
              </LinearGradient>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  webBlur: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(20px)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  closeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchSection: {
    marginTop: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  filtersToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  filterButtonActive: {
    backgroundColor: '#FFD700',
  },
  filterButtonText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonTextActive: {
    color: '#000000',
  },
  clearFiltersButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearFiltersText: {
    color: '#FF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  filtersPanel: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  filtersPanelGradient: {
    padding: 16,
    gap: 12,
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  filterOptionActive: {
    backgroundColor: '#FFD700',
  },
  filterOptionText: {
    color: Colors.palette.taupe,
    fontSize: 16,
    fontWeight: '600',
  },
  filterOptionTextActive: {
    color: '#000000',
  },
  quickFilters: {
    marginTop: 24,
  },
  quickFiltersTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  quickFiltersScroll: {
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  quickFilter: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginRight: 12,
  },
  quickFilterText: {
    color: Colors.palette.taupe,
    fontSize: 14,
    fontWeight: '600',
  },
  resultsPreview: {
    marginTop: 24,
    marginBottom: 40,
  },
  resultsTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  resultSection: {
    marginBottom: 20,
  },
  resultSectionTitle: {
    color: Colors.palette.taupe,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  resultItem: {
    width: 120,
    marginRight: 12,
  },
  resultImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  resultItemTitle: {
    color: Colors.palette.taupeDeep,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  resultItemMeta: {
    color: Colors.palette.taupe,
    fontSize: 12,
  },
  viewAllButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  viewAllGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  viewAllText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
});