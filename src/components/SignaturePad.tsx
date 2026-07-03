import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Pencil, Save, RotateCcw, Check, Trash2, Upload } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SignaturePadProps {
  targetType: 'class' | 'headteacher';
  targetId: string;
  existingSignature?: string | null;
  onSignatureSaved?: (signatureUrl: string) => void;
  title?: string;
}

const SignaturePad = ({ targetType, targetId, existingSignature, onSignatureSaved, title }: SignaturePadProps) => {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string | null>(existingSignature || null);
  const [isEditing, setIsEditing] = useState(!existingSignature);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'draw' | 'upload'>('draw');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setSignatureData(existingSignature || null);
    setIsEditing(!existingSignature);
  }, [existingSignature]);

  const handleClear = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const persistSignature = async (signatureDataUrl: string) => {
    if (targetType === 'class') {
        const { error } = await supabase
          .from('classes')
          .update({ class_signature_url: signatureDataUrl })
          .eq('id', targetId);
        if (error) throw error;
      } else if (targetType === 'headteacher') {
        const { error } = await supabase
          .from('schools')
          .update({ headteacher_signature_url: signatureDataUrl })
          .eq('id', targetId);
        if (error) throw error;
      }
  };

  const handleSave = async () => {
    let signatureDataUrl: string | null = null;

    if (mode === 'draw') {
      if (!signatureRef.current || signatureRef.current.isEmpty()) {
        toast({ title: "Error", description: "Please draw your signature first", variant: "destructive" });
        return;
      }
      signatureDataUrl = signatureRef.current.toDataURL('image/png');
    } else {
      if (!uploadPreview) {
        toast({ title: "Error", description: "Please upload a signature image first", variant: "destructive" });
        return;
      }
      signatureDataUrl = uploadPreview;
    }

    setSaving(true);
    try {
      await persistSignature(signatureDataUrl);

      setSignatureData(signatureDataUrl);
      setIsEditing(false);
      setUploadPreview(null);
      onSignatureSaved?.(signatureDataUrl);

      toast({
        title: "Success",
        description: "Signature saved successfully"
      });
    } catch (error) {
      console.error('Error saving signature:', error);
      toast({
        title: "Error",
        description: "Failed to save signature",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleFile = (file: File) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file", description: "Please upload a PNG, JPG, JPEG, or WEBP image", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 5 MB", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => setUploadPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleReset = async () => {
    setSaving(true);
    try {
      if (targetType === 'class') {
        const { error } = await supabase
          .from('classes')
          .update({ class_signature_url: null })
          .eq('id', targetId);
        if (error) throw error;
      } else if (targetType === 'headteacher') {
        const { error } = await supabase
          .from('schools')
          .update({ headteacher_signature_url: null })
          .eq('id', targetId);
        if (error) throw error;
      }

      setSignatureData(null);
      setIsEditing(true);
      setUploadPreview(null);
      if (signatureRef.current) {
        signatureRef.current.clear();
      }

      toast({
        title: "Success",
        description: "Signature cleared"
      });
    } catch (error) {
      console.error('Error clearing signature:', error);
      toast({
        title: "Error",
        description: "Failed to clear signature",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {title && (
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      )}
      
      {isEditing ? (
        <>
          <Tabs value={mode} onValueChange={(v) => setMode(v as 'draw' | 'upload')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="draw">
                <Pencil className="w-4 h-4 mr-2" />
                Draw Signature
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="w-4 h-4 mr-2" />
                Upload Signature
              </TabsTrigger>
            </TabsList>
            <TabsContent value="draw" className="space-y-2">
              <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg bg-background">
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    className: 'w-full h-40 touch-none',
                    style: { width: '100%', height: '160px', borderRadius: '0.5rem' }
                  }}
                  backgroundColor="white"
                  penColor="black"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Sign in the box above using your finger or stylus
              </p>
            </TabsContent>
            <TabsContent value="upload" className="space-y-2">
              {uploadPreview ? (
                <div className="space-y-2">
                  <div className="border rounded-lg p-4 bg-white flex justify-center">
                    <img src={uploadPreview} alt="Upload preview" className="max-h-32 object-contain" />
                  </div>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Replace Image
                  </Button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:bg-muted/30'
                  }`}
                >
                  <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Drag & drop or click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG, JPEG, WEBP — max 5 MB</p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
                className="hidden"
                onChange={handleFileInput}
              />
            </TabsContent>
          </Tabs>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Signature
                </>
              )}
            </Button>
            {mode === 'draw' ? (
              <Button variant="outline" onClick={handleClear} disabled={saving}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear
              </Button>
            ) : uploadPreview && (
              <Button variant="outline" onClick={() => setUploadPreview(null)} disabled={saving}>
                <Trash2 className="w-4 h-4 mr-2" />
                Remove
              </Button>
            )}
            {signatureData && (
              <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </>
      ) : (
        <>
          {signatureData ? (
            <div className="space-y-4">
              <div className="border rounded-lg p-4 bg-background">
                <p className="text-xs text-muted-foreground mb-2">Saved Signature Preview:</p>
                <img 
                  src={signatureData} 
                  alt="Signature preview" 
                  className="max-h-20 bg-white border rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span className="text-sm text-green-600">Signature saved and will appear on report cards</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditing(true)}>
                  <Pencil className="w-4 h-4 mr-2" />
                  Change Signature
                </Button>
                <Button variant="destructive" onClick={handleReset} disabled={saving}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-4">No signature provided</p>
              <Button onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Add Signature
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SignaturePad;