import { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pencil, Save, RotateCcw, Check, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SignaturePadProps {
  teacherId: string;
  existingSignature?: string | null;
  onSignatureSaved?: (signatureUrl: string) => void;
}

const SignaturePad = ({ teacherId, existingSignature, onSignatureSaved }: SignaturePadProps) => {
  const signatureRef = useRef<SignatureCanvas>(null);
  const [signatureData, setSignatureData] = useState<string | null>(existingSignature || null);
  const [isEditing, setIsEditing] = useState(!existingSignature);
  const [saving, setSaving] = useState(false);
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

  const handleSave = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      toast({
        title: "Error",
        description: "Please draw your signature first",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      // Get the signature as base64 PNG
      const signatureDataUrl = signatureRef.current.toDataURL('image/png');
      
      // Update the profile with the signature
      const { error } = await supabase
        .from('profiles')
        .update({ signature_url: signatureDataUrl })
        .eq('id', teacherId);

      if (error) throw error;

      setSignatureData(signatureDataUrl);
      setIsEditing(false);
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

  const handleReset = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ signature_url: null })
        .eq('id', teacherId);

      if (error) throw error;

      setSignatureData(null);
      setIsEditing(true);
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

  const handleEdit = () => {
    setIsEditing(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pencil className="w-5 h-5" />
          Digital Signature
        </CardTitle>
        <CardDescription>
          Draw your signature using your finger or stylus. This will appear on all report cards for your class.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg bg-background">
              <SignatureCanvas
                ref={signatureRef}
                canvasProps={{
                  className: 'w-full h-40 touch-none',
                  style: { 
                    width: '100%', 
                    height: '160px',
                    borderRadius: '0.5rem'
                  }
                }}
                backgroundColor="white"
                penColor="black"
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Sign in the box above using your finger or stylus
            </p>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Signature
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleClear} disabled={saving}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear
              </Button>
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
                    alt="Your signature" 
                    className="max-h-20 bg-white border rounded"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-600">Signature saved and will appear on report cards</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleEdit}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Update Signature
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
      </CardContent>
    </Card>
  );
};

export default SignaturePad;
