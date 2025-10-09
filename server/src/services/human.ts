import * as tf from '@tensorflow/tfjs';
import jpeg from 'jpeg-js';

// Use dynamic import to load Human library
let HumanCtor: any = null;
let humanInstance: any = null;

export async function getHuman(): Promise<any> {
  if (humanInstance) return humanInstance;

  console.log('🔄 Initializing Human library...');
  
  try {
    await tf.ready();
    console.log('✅ TensorFlow ready');
    
    // Use default CPU backend (no native)
    if (tf.getBackend() !== 'cpu') {
      await tf.setBackend('cpu');
      await tf.ready();
      console.log('✅ TensorFlow backend set to CPU');
    }

    if (!HumanCtor) {
      console.log('🔄 Loading Human module...');
      try {
        // Try to import Human using dynamic import
        const humanModule = await import('@vladmandic/human');
        HumanCtor = (humanModule as any).Human || (humanModule as any).default?.Human || (humanModule as any).default;
        
        if (!HumanCtor) {
          throw new Error('Human constructor not found in module');
        }
        console.log('✅ Human module loaded');
      } catch (error) {
        console.error('❌ Failed to load Human library:', error);
        throw new Error('Failed to load Human library. Please ensure @vladmandic/human is properly installed.');
      }
    }

    console.log('🔄 Creating Human instance...');
    const human = new HumanCtor({
      backend: 'cpu',
      modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',
      face: {
        enabled: true,
        detector: { modelPath: 'blazeface.json' },
        mesh: { enabled: false },
        iris: { enabled: false },
        emotion: { enabled: false },
        description: { enabled: true },
        antispoof: { enabled: false },
      },
      hand: { enabled: false },
      body: { enabled: false },
      object: { enabled: false },
      segmentation: { enabled: false },
    });

    console.log('🔄 Loading Human models...');
    await human.load();
    console.log('✅ Human models loaded successfully');
    
    humanInstance = human;
    return humanInstance;
  } catch (error) {
    console.error('❌ Failed to initialize Human library:', error);
    throw new Error(`Human library initialization failed: ${(error as Error).message}`);
  }
}

export async function imageBase64ToTensor(base64: string): Promise<tf.Tensor3D> {
  try {
    console.log('🔄 Converting base64 to tensor...');
    console.log('Base64 length:', base64.length);
    
    // Remove data URL prefix if present
    const cleanBase64 = base64.replace(/^data:image\/[a-z]+;base64,/, '');
    console.log('Cleaned base64 length:', cleanBase64.length);
    
    const buffer = Buffer.from(cleanBase64, 'base64');
    console.log('Buffer length:', buffer.length);
    
    if (buffer.length === 0) {
      throw new Error('Invalid base64 data - empty buffer');
    }
    
    // Try to decode as JPEG first
    let data, width, height;
    try {
      const result = jpeg.decode(buffer, { useTArray: true });
      data = result.data;
      width = result.width;
      height = result.height;
      console.log('✅ Decoded as JPEG, dimensions:', width, 'x', height);
    } catch (jpegError) {
      console.log('⚠️ Not a valid JPEG, trying alternative approach...');
      // For non-JPEG images, create a simple RGB array
      // This is a fallback for other image formats
      const size = Math.sqrt(buffer.length / 4); // Assume RGBA
      width = Math.floor(size);
      height = Math.floor(size);
      data = new Uint8Array(buffer);
      console.log('Using fallback decoding, dimensions:', width, 'x', height);
    }
    
    if (width < 10 || height < 10) {
      throw new Error('Image too small for face detection (minimum 10x10 pixels)');
    }
    
    // jpeg-js returns RGBA Uint8Array; drop alpha
    const numPixels = width * height;
    const rgb = new Uint8Array(numPixels * 3);
    
    for (let i = 0, j = 0; i < numPixels; i += 1, j += 4) {
      rgb[i * 3 + 0] = data[j + 0] || 0; // R
      rgb[i * 3 + 1] = data[j + 1] || 0; // G
      rgb[i * 3 + 2] = data[j + 2] || 0; // B
    }
    
    const tensor = tf.tensor3d(rgb, [height, width, 3], 'int32');
    console.log('✅ Tensor created successfully, shape:', tensor.shape);
    return tensor;
  } catch (error) {
    console.error('❌ Error converting base64 to tensor:', error);
    throw new Error(`Failed to convert base64 to tensor: ${(error as Error).message}`);
  }
}


