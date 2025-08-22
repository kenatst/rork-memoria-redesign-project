import { useState, useCallback, useMemo } from 'react';
import createContextHook from '@nkzw/create-context-hook';

interface MiniFilmSettings {
  duration: number;
  transition: 'fade' | 'slide' | 'zoom' | 'dissolve';
  music?: string;
  title?: string;
  subtitle?: string;
  aspectRatio: '16:9' | '9:16' | '1:1' | '4:3';
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

interface MiniFilmResult {
  id: string;
  videoUri: string;
  thumbnailUri: string;
  duration: number;
  createdAt: string;
  settings: MiniFilmSettings;
  photos: string[];
}

interface PhotoAnalysis {
  faces: number;
  objects: string[];
  quality: number;
  brightness: number;
  composition: 'good' | 'average' | 'poor';
  timestamp?: string;
  location?: string;
}

interface AIContextValue {
  generateMiniFilm: (photos: string[], settings?: Partial<MiniFilmSettings>) => Promise<MiniFilmResult>;
  analyzePhotos: (photos: string[]) => Promise<PhotoAnalysis[]>;
  organizePhotos: (photos: string[], criteria: 'date' | 'location' | 'people' | 'events') => Promise<{ [key: string]: string[] }>;
  isGenerating: boolean;
  isAnalyzing: boolean;
  progress: number;
}

const DEFAULT_MINI_FILM_SETTINGS: MiniFilmSettings = {
  duration: 30,
  transition: 'fade',
  aspectRatio: '16:9',
  quality: 'medium',
};

export const [AIProvider, useAI] = createContextHook<AIContextValue>(() => {
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  const generateMiniFilm = useCallback(async (
    photos: string[], 
    customSettings?: Partial<MiniFilmSettings>
  ): Promise<MiniFilmResult> => {
    setIsGenerating(true);
    setProgress(0);
    
    try {
      const settings = { ...DEFAULT_MINI_FILM_SETTINGS, ...customSettings };
      console.log('Starting mini-film generation with settings:', settings);
      
      const steps = [
        'Analyzing photos...',
        'Detecting faces and objects...',
        'Selecting best moments...',
        'Applying transitions...',
        'Adding music and effects...',
        'Rendering video...',
        'Finalizing...',
      ];
      
      for (let i = 0; i < steps.length; i++) {
        console.log(steps[i]);
        setProgress((i + 1) / steps.length);
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      }

      // Simulate video generation
      const result: MiniFilmResult = {
        id: `minifilm_${Date.now()}`,
        videoUri: `https://example.com/minifilm_${Date.now()}.mp4`,
        thumbnailUri: photos[0] || 'https://via.placeholder.com/400x300',
        duration: settings.duration,
        createdAt: new Date().toISOString(),
        settings,
        photos,
      };

      console.log('Mini-film generated successfully:', result);
      return result;
    } catch (error) {
      console.error('Error generating mini-film:', error);
      throw new Error('Failed to generate mini-film');
    } finally {
      setIsGenerating(false);
      setProgress(0);
    }
  }, []);

  const analyzePhotos = useCallback(async (photos: string[]): Promise<PhotoAnalysis[]> => {
    setIsAnalyzing(true);
    setProgress(0);

    try {
      console.log('Starting photo analysis for', photos.length, 'photos');
      
      const analyses: PhotoAnalysis[] = [];
      
      for (let i = 0; i < photos.length; i++) {
        setProgress((i + 1) / photos.length);
        
        // Simulate AI analysis
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        const analysis: PhotoAnalysis = {
          faces: Math.floor(Math.random() * 5),
          objects: ['person', 'building', 'nature', 'vehicle', 'food'].slice(0, Math.floor(Math.random() * 3) + 1),
          quality: Math.random() * 0.4 + 0.6, // 0.6 to 1.0
          brightness: Math.random() * 0.6 + 0.2, // 0.2 to 0.8
          composition: Math.random() > 0.7 ? 'good' : Math.random() > 0.4 ? 'average' : 'poor',
          timestamp: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
        };
        
        analyses.push(analysis);
      }

      console.log('Photo analysis completed:', analyses);
      return analyses;
    } catch (error) {
      console.error('Error analyzing photos:', error);
      throw new Error('Failed to analyze photos');
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  }, []);

  const organizePhotos = useCallback(async (
    photos: string[], 
    criteria: 'date' | 'location' | 'people' | 'events'
  ): Promise<{ [key: string]: string[] }> => {
    setIsAnalyzing(true);
    setProgress(0);

    try {
      console.log('Organizing photos by', criteria);
      
      // Simulate AI organization
      await new Promise(resolve => setTimeout(resolve, 2000));
      setProgress(0.5);
      
      let organized: { [key: string]: string[] } = {};
      
      switch (criteria) {
        case 'date':
          organized = {
            'This Week': photos.slice(0, Math.floor(photos.length * 0.3)),
            'Last Month': photos.slice(Math.floor(photos.length * 0.3), Math.floor(photos.length * 0.6)),
            'Earlier': photos.slice(Math.floor(photos.length * 0.6)),
          };
          break;
        case 'location':
          organized = {
            'Home': photos.slice(0, Math.floor(photos.length * 0.4)),
            'Work': photos.slice(Math.floor(photos.length * 0.4), Math.floor(photos.length * 0.7)),
            'Travel': photos.slice(Math.floor(photos.length * 0.7)),
          };
          break;
        case 'people':
          organized = {
            'Family': photos.slice(0, Math.floor(photos.length * 0.5)),
            'Friends': photos.slice(Math.floor(photos.length * 0.5), Math.floor(photos.length * 0.8)),
            'Solo': photos.slice(Math.floor(photos.length * 0.8)),
          };
          break;
        case 'events':
          organized = {
            'Celebrations': photos.slice(0, Math.floor(photos.length * 0.3)),
            'Daily Life': photos.slice(Math.floor(photos.length * 0.3), Math.floor(photos.length * 0.7)),
            'Special Moments': photos.slice(Math.floor(photos.length * 0.7)),
          };
          break;
      }
      
      setProgress(1);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Photos organized successfully:', organized);
      return organized;
    } catch (error) {
      console.error('Error organizing photos:', error);
      throw new Error('Failed to organize photos');
    } finally {
      setIsAnalyzing(false);
      setProgress(0);
    }
  }, []);

  const contextValue = useMemo(() => ({
    generateMiniFilm,
    analyzePhotos,
    organizePhotos,
    isGenerating,
    isAnalyzing,
    progress,
  }), [generateMiniFilm, analyzePhotos, organizePhotos, isGenerating, isAnalyzing, progress]);

  return contextValue;
});