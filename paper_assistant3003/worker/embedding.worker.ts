/// <reference lib="webworker" />

import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers';

let extractor: FeatureExtractionPipeline | null = null;

async function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractor) {
    extractor = (await pipeline('feature-extraction', 'onnx-community/bge-small-zh-v1.5-ONNX', {
      dtype: 'q8',
      device: 'wasm',
    })) as FeatureExtractionPipeline;
  }
  return extractor;
}

self.onmessage = async (e: MessageEvent) => {
  const { id, texts } = e.data as { id: number; texts: string[] };
  try {
    const pipe = await getExtractor();
    const vectors: number[][] = [];
    for (const text of texts) {
      const out = await pipe(text, { pooling: 'mean', normalize: true });
      vectors.push(Array.from(out.data));
    }
    self.postMessage({ id, ok: true, vectors });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err) });
  }
};
