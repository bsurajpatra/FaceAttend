import * as tf from '@tensorflow/tfjs';
// Important: import the ESM/browser build of Human to avoid tfjs-node on server
// We will dynamic-import to bypass CommonJS resolution to human.node.js
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type HumanType = typeof import('@vladmandic/human/dist/human.esm.js').Human;
let HumanCtor: HumanType | null = null;
import jpeg from 'jpeg-js';

let humanInstance: InstanceType<HumanType> | null = null;

export async function getHuman(): Promise<InstanceType<HumanType>> {
  if (humanInstance) return humanInstance;

  await tf.ready();
  // Use default CPU backend (no native)
  if (tf.getBackend() !== 'cpu') {
    await tf.setBackend('cpu');
    await tf.ready();
  }

  if (!HumanCtor) {
    const mod = await import('@vladmandic/human/dist/human.esm.js');
    HumanCtor = mod.Human as unknown as HumanType;
  }

  const human = new HumanCtor!({
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

  await human.load();
  humanInstance = human;
  return humanInstance;
}

export async function imageBase64ToTensor(base64: string): Promise<tf.Tensor3D> {
  const buffer = Buffer.from(base64, 'base64');
  const { data, width, height } = jpeg.decode(buffer, { useTArray: true });
  // jpeg-js returns RGBA Uint8Array; drop alpha
  const numPixels = width * height;
  const rgb = new Uint8Array(numPixels * 3);
  for (let i = 0, j = 0; i < numPixels; i += 1, j += 4) {
    rgb[i * 3 + 0] = data[j + 0];
    rgb[i * 3 + 1] = data[j + 1];
    rgb[i * 3 + 2] = data[j + 2];
  }
  const tensor = tf.tensor3d(rgb, [height, width, 3], 'int32');
  return tensor;
}


