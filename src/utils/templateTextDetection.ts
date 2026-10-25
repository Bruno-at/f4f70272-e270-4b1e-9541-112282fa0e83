import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { TemplateField } from './templateFields';
import { normalizeDetectedFields } from './extraTemplateFields';

GlobalWorkerOptions.workerSrc = workerUrl;
export interface TextRegion { text: string; x: number; y: number; w: number; h: number; confidence?: number }
export function fieldsFromText(regions: TextRegion[]): TemplateField[] {
  return normalizeDetectedFields(regions.flatMap((r, i) => {
    const match = r.text.match(/^\s*([A-Za-z][A-Za-z /()'-]{1,60})\s*(?::|\.{3,}|_{2,}|\[\s*\])/);
    if (!match) return [];
    const label = match[1].trim();
    const x = Math.min(.95, r.x + r.w * Math.min(.8, (match[1].length + 1) / r.text.length));
    return [{ key: `detected_${i}`, label, systemField: null, x, y: r.y, w: Math.min(.25, 1-x), h: Math.max(.018, r.h), confidence: (r.confidence ?? 95) / 100, needsReview: true }];
  }));
}

export async function detectTemplateText(file: File): Promise<TemplateField[]> {
  let image: File | HTMLCanvasElement = file;
  if (file.type === 'application/pdf') {
    const task = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
      const pdf = await task.promise;
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 2 });
      const text = await page.getTextContent();
      const regions: TextRegion[] = [];
      for (const item of text.items) {
        if (!('str' in item)) continue;
        regions.push({ text: item.str, x: item.transform[4] * 2 / viewport.width, y: 1 - (item.transform[5] + item.height) * 2 / viewport.height, w: item.width * 2 / viewport.width, h: item.height * 2 / viewport.height });
      }
      const fields = fieldsFromText(regions);
      if (fields.length) return fields;
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width; canvas.height = viewport.height;
      const context = canvas.getContext('2d');
      if (!context) return [];
      await page.render({ canvasContext: context, viewport }).promise;
      image = canvas;
    } finally { await task.destroy(); }
  }
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(image, {}, { blocks: true });
    const bitmap = image instanceof HTMLCanvasElement ? null : await createImageBitmap(image);
    const width = image instanceof HTMLCanvasElement ? image.width : bitmap?.width || 1;
    const height = image instanceof HTMLCanvasElement ? image.height : bitmap?.height || 1;
    bitmap?.close();
    return fieldsFromText((data.blocks || []).flatMap(b => b.paragraphs.flatMap(p => p.lines.map(l => ({ text: l.text, x: l.bbox.x0/width, y: l.bbox.y0/height, w: (l.bbox.x1-l.bbox.x0)/width, h: (l.bbox.y1-l.bbox.y0)/height, confidence: l.confidence })))));
  } finally { await worker.terminate(); }
}