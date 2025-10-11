// React Native compatible face processing with fallback to server-side processing
// @ts-ignore - TensorFlow.js types may not be fully compatible with React Native
import * as tf from '@tensorflow/tfjs';

// Global state
let modelsLoaded = false;
let initializationPromise: Promise<void> | null = null;

export async function ensureFaceModelsLoaded(): Promise<void> {
  if (modelsLoaded) {
    console.log('[face-utils] Face models already loaded');
    return;
  }

  // Prevent multiple simultaneous initializations
  if (initializationPromise) {
    console.log('[face-utils] Waiting for existing initialization...');
    return initializationPromise;
  }

  initializationPromise = initializeTensorFlow();
  return initializationPromise;
}

async function initializeTensorFlow(): Promise<void> {
  try {
    console.log('[face-utils] Initializing TensorFlow.js for React Native...');
    
    // Initialize TensorFlow.js with React Native compatible settings
    await tf.ready();
    console.log('[face-utils] TensorFlow.js ready');
    
    // Force CPU backend for React Native compatibility
    await tf.setBackend('cpu');
    await tf.ready();
    console.log('[face-utils] TensorFlow backend set to CPU');
    
    modelsLoaded = true;
    console.log('[face-utils] TensorFlow.js initialized successfully');
  } catch (error) {
    console.error('[face-utils] Error initializing TensorFlow.js:', error);
    modelsLoaded = false;
    initializationPromise = null;
    
    // Don't throw error, fall back to server-side processing
    console.log('[face-utils] Falling back to server-side face processing');
  }
}

// Pre-initialize TensorFlow.js when the app starts
export async function preloadFaceModels(): Promise<void> {
  try {
    console.log('[face-utils] Pre-loading TensorFlow.js...');
    await ensureFaceModelsLoaded();
    console.log('[face-utils] TensorFlow.js pre-loaded successfully');
  } catch (error) {
    console.error('[face-utils] Failed to pre-load TensorFlow.js:', error);
    // Don't throw here - let it fail gracefully during actual usage
    console.log('[face-utils] Will use server-side processing as fallback');
  }
}

export async function extractSingleFaceDescriptorAsync(imageBase64: string): Promise<number[] | null> {
  console.log('[face-utils] Processing image for face detection...');
  console.log('[face-utils] Image base64 length:', imageBase64.length);

  // Clean the base64 string - remove data URL prefix if present
  let cleanBase64 = imageBase64;
  if (imageBase64.includes(',')) {
    cleanBase64 = imageBase64.split(',')[1];
    console.log('[face-utils] Removed data URL prefix');
  }

  console.log('[face-utils] Clean base64 length:', cleanBase64.length);
  
  // IMPORTANT: Force server-side processing for accurate face recognition
  // The client-side deterministic approach was causing incorrect matches
  // Server-side processing uses the actual Human library with proper face recognition
  console.log('[face-utils] Using server-side processing for accurate face recognition');
  return null; // This will trigger server-side processing
}



