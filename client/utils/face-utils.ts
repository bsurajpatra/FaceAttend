import '@tensorflow/tfjs-react-native';
import * as tf from '@tensorflow/tfjs';
// face-api 0.22.x works with TFJS 1.x and RN backend
import * as faceapi from 'face-api.js';

let modelsLoaded = false;
let backendSet = false;

async function ensureTfReady(): Promise<void> {
  if (!backendSet) {
    console.log('[face-utils] tf.ready()...');
    await tf.ready();
    // Use RN WebGL backend provided by tfjs-react-native
    if (tf.getBackend() !== 'rn-webgl') {
      console.log('[face-utils] setting backend to rn-webgl (current:', tf.getBackend(), ')');
      // @ts-ignore known backend key for tfjs-react-native
      await tf.setBackend('rn-webgl');
    }
    console.log('[face-utils] backend set to', tf.getBackend());
    backendSet = true;
  }
}

export async function ensureFaceModelsLoaded(modelBaseUrl?: string): Promise<void> {
  await ensureTfReady();
  if (modelsLoaded) return;

  const base = modelBaseUrl || process.env.EXPO_PUBLIC_FACE_MODEL_URL || 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights/';
  console.log('[face-utils] model base url:', base);

  try {
    console.log('[face-utils] loading ssdMobilenetv1...');
    await faceapi.nets.ssdMobilenetv1.loadFromUri(base);
    console.log('[face-utils] loading faceLandmark68Net...');
    await faceapi.nets.faceLandmark68Net.loadFromUri(base);
    console.log('[face-utils] loading faceRecognitionNet...');
    await faceapi.nets.faceRecognitionNet.loadFromUri(base);
  } catch (e) {
    console.log('[face-utils] model load error:', e);
    throw e;
  }

  modelsLoaded = true;
  console.log('[face-utils] models loaded');
}

export async function extractSingleFaceDescriptorAsync(imageBase64: string): Promise<number[] | null> {
  await ensureFaceModelsLoaded();

  // face-api.js 0.22 on RN: use fromPixels-like path if available, else fallback to raw tensor
  // We already have base64 from camera; we cannot use HTMLImageElement. Keep tensor path.
  const cleaned = imageBase64.replace(/^data:image\/(png|jpeg);base64,/, '');
  const raw = Buffer.from(cleaned, 'base64');
  // Decode minimal JPEG header via react-native-fast-image isn't available; rely on camera width/height is not exposed here reliably.
  // Instead, pass to face-api using a tensor created by tf.browser.fromPixels is not available on RN.
  // Use a no-op: let face-api handle decoding via fetch when given data URL.
  const dataUrl = `data:image/jpeg;base64,${cleaned}`;
  const img: any = { src: dataUrl };
  const input: any = img;
  console.log('[face-utils] tensor created shape:', input.shape, 'dtype:', input.dtype, 'backend:', tf.getBackend());
  try {
    const result = await faceapi
      .detectSingleFace(input as any)
      .withFaceLandmarks()
      .withFaceDescriptor();
    console.log('[face-utils] detection result?', !!result);
    if (!result) return null;
    return Array.from(result.descriptor);
  } finally {
    // no disposal for non-tensor input
  }
}


