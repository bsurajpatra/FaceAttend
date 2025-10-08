import { Human } from '@vladmandic/human';

let human: Human | null = null;
let modelsLoaded = false;

export async function ensureFaceModelsLoaded(): Promise<void> {
  if (modelsLoaded && human) {
    console.log('[face-utils] Human models already loaded');
    return;
  }

  try {
    console.log('[face-utils] Initializing Human library...');
    
    // Initialize Human with optimized config for React Native
    human = new Human({
      backend: 'cpu', // Use CPU backend for better React Native compatibility
      modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',
      face: {
        enabled: true,
        detector: { modelPath: 'blazeface.json' },
        mesh: { enabled: false }, // Disable mesh for better performance
        iris: { enabled: false },
        emotion: { enabled: false },
        description: { enabled: true }, // This gives us face embeddings
        antispoof: { enabled: false },
      },
      hand: { enabled: false },
      body: { enabled: false },
      object: { enabled: false },
      segmentation: { enabled: false },
    });

    console.log('[face-utils] Loading Human models...');
    await human.load();
    
    modelsLoaded = true;
    console.log('[face-utils] Human models loaded successfully');
  } catch (error) {
    console.error('[face-utils] Error loading Human models:', error);
    throw error;
  }
}

export async function extractSingleFaceDescriptorAsync(imageBase64: string): Promise<number[] | null> {
  await ensureFaceModelsLoaded();

  if (!human) {
    throw new Error('Human library not initialized');
  }

  try {
    console.log('[face-utils] Processing image for face detection...');
    console.log('[face-utils] Image base64 length:', imageBase64.length);

    // For React Native, we need to use a different approach
    // Human library can work with base64 directly in some cases
    console.log('[face-utils] Running face detection...');
    
    // Try to detect faces using the base64 string directly
    // Human library should handle base64 images
    const result = await human.detect(imageBase64);
    
    console.log('[face-utils] Detection result:', {
      faces: result.face?.length || 0,
      hasDescriptions: result.face?.some(face => face.embedding) || false
    });

    if (!result.face || result.face.length === 0) {
      console.log('[face-utils] No faces detected');
      return null;
    }

    // Get the first face's embedding (face descriptor)
    const firstFace = result.face[0];
    if (!firstFace.embedding) {
      console.log('[face-utils] No face embedding available');
      return null;
    }

    const descriptor = Array.from(firstFace.embedding);
    console.log('[face-utils] Face descriptor extracted, length:', descriptor.length);
    
    return descriptor;
  } catch (error) {
    console.error('[face-utils] Error during face detection:', error);
    throw error;
  }
}


