import { useEffect, useRef, useState } from 'react';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { Loader2 } from 'lucide-react';

GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPagePreview({ blob }: { blob: Blob | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    let dispose = () => {};
    setLoading(true);
    setError('');
    async function render() {
      try {
        const task = getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
        dispose = () => { void task.destroy(); };
        const pdf = await task.promise;
        if (cancelled) { dispose(); return; }
        const page = await pdf.getPage(1);
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context || cancelled) return;
        const viewport = page.getViewport({ scale: 2 });
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: context, viewport }).promise;
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) { setError('Could not display the report card.'); setLoading(false); }
      }
    }
    void render();
    return () => { cancelled = true; dispose(); };
  }, [blob]);

  return (
    <div className="report-pdf-page relative mx-auto w-full max-w-[794px] aspect-[210/297] overflow-hidden bg-background">
      <canvas ref={canvasRef} aria-label="A4 portrait report card" className="block h-full w-full" />
      {(loading || error) && (
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background text-muted-foreground" role="status">
          {error || <><Loader2 className="h-5 w-5 animate-spin" /> Loading report card…</>}
        </div>
      )}
    </div>
  );
}