import { Platform } from 'react-native';

// Configuration Google Cloud Vision avec la clé API fournie
const GOOGLE_CLOUD_API_KEY = 'AQ.Ab8RN6J7-0OTdprRlQ3SiSkySH1_F9HXk7mzmX7TNdSlDDOhSQ';
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

export interface FaceDetection {
  boundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  };
  fdBoundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  };
  landmarks: Array<{
    type: string;
    position: { x: number; y: number; z: number };
  }>;
  rollAngle: number;
  panAngle: number;
  tiltAngle: number;
  detectionConfidence: number;
  landmarkingConfidence: number;
  joyLikelihood: string;
  sorrowLikelihood: string;
  angerLikelihood: string;
  surpriseLikelihood: string;
  underExposedLikelihood: string;
  blurredLikelihood: string;
  headwearLikelihood: string;
}

export interface LabelDetection {
  mid: string;
  description: string;
  score: number;
  topicality: number;
}

export interface TextDetection {
  locale: string;
  description: string;
  boundingPoly: {
    vertices: Array<{ x: number; y: number }>;
  };
}

export interface ObjectDetection {
  mid: string;
  name: string;
  score: number;
  boundingPoly: {
    normalizedVertices: Array<{ x: number; y: number }>;
  };
}

export interface VisionAnalysisResult {
  faces: FaceDetection[];
  labels: LabelDetection[];
  texts: TextDetection[];
  objects: ObjectDetection[];
  safeSearch: {
    adult: string;
    spoof: string;
    medical: string;
    violence: string;
    racy: string;
  };
}

/**
 * Convertit une image en base64 pour l'API Google Vision
 * @param imageUri - URI de l'image (mobile) ou File object (web)
 * @returns Promise<string> - Image en base64
 */
export async function imageToBase64(imageUri: string | File): Promise<string> {
  try {
    if (Platform.OS === 'web' && imageUri instanceof File) {
      // Web: Convert File to base64
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data:image/...;base64, prefix
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageUri);
      });
    } else {
      // Mobile: Use expo-file-system
      const { FileSystem } = require('expo-file-system');
      const base64 = await FileSystem.readAsStringAsync(imageUri as string, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    }
  } catch (error) {
    console.error('❌ [GoogleVision] Error converting image to base64:', error);
    throw error;
  }
}

/**
 * Analyse une image avec Google Cloud Vision API (version démo avec simulation)
 * @param imageUri - URI de l'image ou File object
 * @param features - Features à analyser
 * @returns Promise<VisionAnalysisResult>
 */
export async function analyzeImage(
  imageUri: string | File,
  features: string[] = ['FACE_DETECTION', 'LABEL_DETECTION']
): Promise<VisionAnalysisResult> {
  try {
    console.log('🔍 [GoogleVision] Starting mock analysis...', { features, uri: typeof imageUri === 'string' ? imageUri.substring(0, 50) + '...' : 'File object' });
    
    // Simulation pour éviter les coûts API pendant le développement
    await new Promise(resolve => setTimeout(resolve, 800)); // Simulate API delay
    
    const mockResult: VisionAnalysisResult = {
      faces: features.includes('FACE_DETECTION') ? [
        {
          boundingPoly: { vertices: [{ x: 100, y: 100 }, { x: 200, y: 100 }, { x: 200, y: 200 }, { x: 100, y: 200 }] },
          fdBoundingPoly: { vertices: [{ x: 105, y: 105 }, { x: 195, y: 105 }, { x: 195, y: 195 }, { x: 105, y: 195 }] },
          landmarks: [],
          rollAngle: 0,
          panAngle: 0,
          tiltAngle: 0,
          detectionConfidence: 0.95,
          landmarkingConfidence: 0.8,
          joyLikelihood: 'LIKELY',
          sorrowLikelihood: 'VERY_UNLIKELY',
          angerLikelihood: 'VERY_UNLIKELY',
          surpriseLikelihood: 'UNLIKELY',
          underExposedLikelihood: 'VERY_UNLIKELY',
          blurredLikelihood: 'VERY_UNLIKELY',
          headwearLikelihood: 'UNLIKELY'
        }
      ] : [],
      labels: features.includes('LABEL_DETECTION') ? [
        { mid: '/m/01g317', description: 'Person', score: 0.95, topicality: 0.95 },
        { mid: '/m/0k4j', description: 'Car', score: 0.85, topicality: 0.85 },
        { mid: '/m/07yv9', description: 'Vehicle', score: 0.80, topicality: 0.80 },
        { mid: '/m/01bqvp', description: 'Sky', score: 0.75, topicality: 0.75 }
      ] : [],
      texts: features.includes('TEXT_DETECTION') ? [
        {
          locale: 'en',
          description: 'Sample text detected in image',
          boundingPoly: { vertices: [{ x: 50, y: 300 }, { x: 250, y: 300 }, { x: 250, y: 320 }, { x: 50, y: 320 }] }
        }
      ] : [],
      objects: features.includes('OBJECT_LOCALIZATION') ? [
        {
          mid: '/m/01g317',
          name: 'Person',
          score: 0.9,
          boundingPoly: { normalizedVertices: [{ x: 0.1, y: 0.1 }, { x: 0.5, y: 0.1 }, { x: 0.5, y: 0.8 }, { x: 0.1, y: 0.8 }] }
        }
      ] : [],
      safeSearch: features.includes('SAFE_SEARCH_DETECTION') ? {
        adult: 'VERY_UNLIKELY',
        spoof: 'VERY_UNLIKELY',
        medical: 'UNLIKELY',
        violence: 'VERY_UNLIKELY',
        racy: 'UNLIKELY'
      } : {
        adult: 'UNKNOWN',
        spoof: 'UNKNOWN',
        medical: 'UNKNOWN',
        violence: 'UNKNOWN',
        racy: 'UNKNOWN'
      }
    };
    
    console.log('✅ [GoogleVision] Mock analysis completed:', {
      faces: mockResult.faces.length,
      labels: mockResult.labels.length,
      texts: mockResult.texts.length,
      objects: mockResult.objects.length
    });
    
    return mockResult;
    
    /* PRODUCTION CODE - Décommenter pour utiliser la vraie API
    
    const base64Image = await imageToBase64(imageUri);
    
    const requestBody = {
      requests: [{
        image: { content: base64Image },
        features: features.map(feature => ({
          type: feature,
          maxResults: feature === 'FACE_DETECTION' ? 50 : 20
        }))
      }]
    };

    const response = await fetch(`${VISION_API_URL}?key=${GOOGLE_CLOUD_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vision API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (result.responses?.[0]?.error) {
      throw new Error(`Vision API error: ${result.responses[0].error.message}`);
    }

    const analysisResult = result.responses[0];
    
    return {
      faces: analysisResult.faceAnnotations || [],
      labels: analysisResult.labelAnnotations || [],
      texts: analysisResult.textAnnotations || [],
      objects: analysisResult.localizedObjectAnnotations || [],
      safeSearch: analysisResult.safeSearchAnnotation || {
        adult: 'UNKNOWN', spoof: 'UNKNOWN', medical: 'UNKNOWN', violence: 'UNKNOWN', racy: 'UNKNOWN'
      }
    };
    
    */
  } catch (error) {
    console.error('❌ [GoogleVision] Analysis error:', error);
    throw new Error(`Google Vision analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Détecte uniquement les visages dans une image
 * @param imageUri - URI de l'image
 * @returns Promise<FaceDetection[]>
 */
export async function detectFaces(imageUri: string | File): Promise<FaceDetection[]> {
  const result = await analyzeImage(imageUri, ['FACE_DETECTION']);
  return result.faces;
}

/**
 * Détecte uniquement les labels/objets dans une image
 * @param imageUri - URI de l'image
 * @returns Promise<LabelDetection[]>
 */
export async function detectLabels(imageUri: string | File): Promise<LabelDetection[]> {
  const result = await analyzeImage(imageUri, ['LABEL_DETECTION']);
  return result.labels;
}

/**
 * Détecte uniquement le texte dans une image
 * @param imageUri - URI de l'image
 * @returns Promise<TextDetection[]>
 */
export async function detectText(imageUri: string | File): Promise<TextDetection[]> {
  const result = await analyzeImage(imageUri, ['TEXT_DETECTION']);
  return result.texts;
}

/**
 * Vérifie si une image est appropriée (Safe Search)
 * @param imageUri - URI de l'image
 * @returns Promise<boolean> - true si l'image est appropriée
 */
export async function isSafeImage(imageUri: string | File): Promise<boolean> {
  const result = await analyzeImage(imageUri, ['SAFE_SEARCH_DETECTION']);
  const safeSearch = result.safeSearch;
  
  // Consider image safe if all categories are VERY_UNLIKELY, UNLIKELY, or POSSIBLE
  const unsafeCategories = ['LIKELY', 'VERY_LIKELY'];
  
  return !(
    unsafeCategories.includes(safeSearch.adult) ||
    unsafeCategories.includes(safeSearch.violence) ||
    unsafeCategories.includes(safeSearch.racy)
  );
}

/**
 * Groupe les visages détectés par similarité (basique)
 * @param faces - Array de visages détectés
 * @returns Array de groupes de visages
 */
export function groupFacesByPosition(faces: FaceDetection[]): FaceDetection[][] {
  if (faces.length === 0) return [];
  
  const groups: FaceDetection[][] = [];
  const processed = new Set<number>();
  
  faces.forEach((face, index) => {
    if (processed.has(index)) return;
    
    const group = [face];
    processed.add(index);
    
    // Find similar faces based on position and size
    faces.forEach((otherFace, otherIndex) => {
      if (processed.has(otherIndex)) return;
      
      const face1Center = getFaceCenter(face);
      const face2Center = getFaceCenter(otherFace);
      
      const distance = Math.sqrt(
        Math.pow(face1Center.x - face2Center.x, 2) +
        Math.pow(face1Center.y - face2Center.y, 2)
      );
      
      // If faces are close enough, consider them the same person
      if (distance < 100) {
        group.push(otherFace);
        processed.add(otherIndex);
      }
    });
    
    groups.push(group);
  });
  
  return groups;
}

/**
 * Calcule le centre d'un visage détecté
 * @param face - Visage détecté
 * @returns Point central du visage
 */
function getFaceCenter(face: FaceDetection): { x: number; y: number } {
  const vertices = face.boundingPoly.vertices;
  const x = vertices.reduce((sum, vertex) => sum + vertex.x, 0) / vertices.length;
  const y = vertices.reduce((sum, vertex) => sum + vertex.y, 0) / vertices.length;
  return { x, y };
}

/**
 * Extrait les mots-clés principaux d'une image
 * @param imageUri - URI de l'image
 * @param minScore - Score minimum pour les labels (0-1)
 * @returns Promise<string[]> - Array de mots-clés
 */
export async function extractKeywords(
  imageUri: string | File,
  minScore: number = 0.7
): Promise<string[]> {
  const labels = await detectLabels(imageUri);
  return labels
    .filter(label => label.score >= minScore)
    .map(label => label.description.toLowerCase())
    .slice(0, 10); // Limit to top 10 keywords
}

export default {
  analyzeImage,
  detectFaces,
  detectLabels,
  detectText,
  isSafeImage,
  groupFacesByPosition,
  extractKeywords,
  imageToBase64
};