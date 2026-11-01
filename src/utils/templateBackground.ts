/** Render the uploaded template (first PDF page or image) as a picture for the mapping screen. */
export interface TemplateBackground { src: string; aspect: number; widthPt: number }

export async function renderTemplateBackground(url: string, mimeType: string): Promise<TemplateBackground> {
  if (mimeType === 'application/pdf') {
    const [{ getDocument, GlobalWorkerOptions }, worker] = await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ]);
    GlobalWorkerOptions.workerSrc = worker.default;
    const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
    const pdf = await getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Preview is not supported in this browser');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const src = canvas.toDataURL('image/png');
    void pdf.destroy();
    return { src, aspect: base.width / base.height, widthPt: base.width };
  }
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('Template image could not be loaded'));
    el.src = url;
  });
  const aspect = img.naturalWidth / img.naturalHeight;
  // Matches the page width used by the PDF renderer for image templates.
  return { src: url, aspect, widthPt: aspect > 1 ? 841.89 : 595.28 };
}

/** Page size in mm of an uploaded file, keeping its orientation. */
export async function templatePageSizeMm(file: File): Promise<{ width: number; height: number }> {
  const PT_TO_MM = 25.4 / 72;
  if (file.type === 'application/pdf') {
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(new Uint8Array(await file.arrayBuffer()), { ignoreEncryption: true });
    const { width, height } = doc.getPage(0).getSize();
    return { width: Math.round(width * PT_TO_MM * 10) / 10, height: Math.round(height * PT_TO_MM * 10) / 10 };
  }
  const url = URL.createObjectURL(file);
  try {
    const { aspect } = await renderTemplateBackground(url, file.type);
    return aspect > 1 ? { width: 297, height: Math.round((297 / aspect) * 10) / 10 } : { width: 210, height: Math.round((210 / aspect) * 10) / 10 };
  } finally { URL.revokeObjectURL(url); }
}
