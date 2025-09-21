import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SchoolInfo } from '@/types/database';
import { Save, Upload } from 'lucide-react';

interface SchoolInfoManagerProps {
  onSuccess?: () => void;
}

const SchoolInfoManager = ({ onSuccess }: SchoolInfoManagerProps) => {
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    school_name: '',
    motto: '',
    location: '',
    po_box: '',
    telephone: '',
    email: '',
    website: '',
    logo_url: ''
  });

  useEffect(() => {
    fetchSchoolInfo();
  }, []);

  const fetchSchoolInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('school_info')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSchoolInfo(data);
        setFormData({
          school_name: data.school_name || '',
          motto: data.motto || '',
          location: data.location || '',
          po_box: data.po_box || '',
          telephone: data.telephone || '',
          email: data.email || '',
          website: data.website || '',
          logo_url: data.logo_url || ''
        });
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
      toast({
        title: "Error",
        description: "Failed to load school information",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (schoolInfo) {
        // Update existing record
        const { error } = await supabase
          .from('school_info')
          .update(formData)
          .eq('id', schoolInfo.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('school_info')
          .insert([formData]);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "School information saved successfully",
      });

      // Refresh data
      await fetchSchoolInfo();
      
      // Call onSuccess callback if provided
      onSuccess?.();
    } catch (error) {
      console.error('Error saving school info:', error);
      toast({
        title: "Error",
        description: "Failed to save school information",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        handleInputChange('logo_url', dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="school_name">School Name *</Label>
            <Input
              id="school_name"
              value={formData.school_name}
              onChange={(e) => handleInputChange('school_name', e.target.value)}
              required
              placeholder="Enter school name"
            />
          </div>

          <div>
            <Label htmlFor="motto">School Motto</Label>
            <Input
              id="motto"
              value={formData.motto}
              onChange={(e) => handleInputChange('motto', e.target.value)}
              placeholder="Enter school motto"
            />
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              placeholder="Enter school location"
            />
          </div>

          <div>
            <Label htmlFor="po_box">P.O. Box</Label>
            <Input
              id="po_box"
              value={formData.po_box}
              onChange={(e) => handleInputChange('po_box', e.target.value)}
              placeholder="Enter P.O. Box"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="telephone">Telephone</Label>
            <Input
              id="telephone"
              value={formData.telephone}
              onChange={(e) => handleInputChange('telephone', e.target.value)}
              placeholder="Enter telephone number"
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="Enter email address"
            />
          </div>

          <div>
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              placeholder="Enter website URL"
            />
          </div>

          <div>
            <Label htmlFor="logo">School Logo</Label>
            <div className="space-y-2">
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="cursor-pointer"
              />
              {formData.logo_url && (
                <div className="flex items-center gap-2">
                  <img 
                    src={formData.logo_url} 
                    alt="School Logo" 
                    className="w-16 h-16 object-contain border rounded"
                  />
                  <span className="text-sm text-muted-foreground">Logo uploaded</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Button type="submit" disabled={saving} className="w-full md:w-auto">
        {saving ? (
          'Saving...'
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save School Information
          </>
        )}
      </Button>
    </form>
  );
};

export default SchoolInfoManager;