// For now, let's implement a mock face processing that works with React Native
// This will allow the app to function while we work on the Human library compatibility

let modelsLoaded = false;
let initializationPromise: Promise<void> | null = null;

export async function ensureFaceModelsLoaded(): Promise<void> {
  if (modelsLoaded) {
    console.log('[face-utils] Face models already loaded (mock mode)');
    return;
  }

  // Prevent multiple simultaneous initializations
  if (initializationPromise) {
    console.log('[face-utils] Waiting for existing initialization...');
    return initializationPromise;
  }

  initializationPromise = initializeMockHuman();
  return initializationPromise;
}

async function initializeMockHuman(): Promise<void> {
  try {
    console.log('[face-utils] Initializing mock face processing for React Native...');
    
    // Simulate model loading time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    modelsLoaded = true;
    console.log('[face-utils] Mock face models loaded successfully');
  } catch (error) {
    console.error('[face-utils] Error loading mock face models:', error);
    modelsLoaded = false;
    initializationPromise = null;
    throw error;
  }
}

// Pre-initialize the Human library when the app starts
export async function preloadFaceModels(): Promise<void> {
  try {
    console.log('[face-utils] Pre-loading face models...');
    await ensureFaceModelsLoaded();
    console.log('[face-utils] Face models pre-loaded successfully');
  } catch (error) {
    console.error('[face-utils] Failed to pre-load face models:', error);
    // Don't throw here - let it fail gracefully during actual usage
  }
}

export async function extractSingleFaceDescriptorAsync(imageBase64: string): Promise<number[] | null> {
  await ensureFaceModelsLoaded();

  try {
    console.log('[face-utils] Processing image for face detection (mock mode)...');
    console.log('[face-utils] Image base64 length:', imageBase64.length);

    // Clean the base64 string - remove data URL prefix if present
    let cleanBase64 = imageBase64;
    if (imageBase64.includes(',')) {
      cleanBase64 = imageBase64.split(',')[1];
      console.log('[face-utils] Removed data URL prefix');
    }

    console.log('[face-utils] Clean base64 length:', cleanBase64.length);
    console.log('[face-utils] Running mock face detection...');
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a mock face descriptor based on the image data
    // This creates a deterministic 512-dimensional vector based on the image content
    const descriptor = generateMockFaceDescriptor(cleanBase64);
    
    console.log('[face-utils] Mock face descriptor generated, length:', descriptor.length);
    console.log('[face-utils] First few descriptor values:', descriptor.slice(0, 5));
    
    return descriptor;
  } catch (error) {
    console.error('[face-utils] Error during mock face detection:', error);
    console.error('[face-utils] Error stack:', error.stack);
    throw new Error(`Mock face detection failed: ${error.message}`);
  }
}

// Generate a mock face descriptor based on image content
function generateMockFaceDescriptor(base64: string): number[] {
  // Create a deterministic 512-dimensional vector based on the image data
  const descriptor: number[] = [];
  
  // Use the base64 string to generate consistent values
  for (let i = 0; i < 512; i++) {
    const charCode = base64.charCodeAt(i % base64.length);
    const normalized = (charCode - 32) / 95; // Normalize to 0-1 range
    descriptor.push(normalized);
  }
  
  return descriptor;
}


