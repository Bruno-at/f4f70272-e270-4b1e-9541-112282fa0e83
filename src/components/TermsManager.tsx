import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Term } from '@/types/database';
import { Plus, Calendar, Edit, Trash2 } from 'lucide-react';

const TermsManager = () => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    term_name: '',
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    is_active: false
  });

  useEffect(() => {
    fetchTerms();
  }, []);

  const fetchTerms = async () => {
    try {
      const { data, error } = await supabase
        .from('terms')
        .select('*')
        .order('year', { ascending: false })
        .order('term_name');

      if (error) throw error;
      setTerms(data || []);
    } catch (error) {
      console.error('Error fetching terms:', error);
      toast({
        title: "Error",
        description: "Failed to load terms",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.term_name || !formData.start_date || !formData.end_date) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('terms')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Term updated successfully"
        });
      } else {
        // If setting as active, deactivate other terms first
        if (formData.is_active) {
          await supabase
            .from('terms')
            .update({ is_active: false })
            .neq('id', '');
        }

        const { error } = await supabase
          .from('terms')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Term added successfully"
        });
      }

      setFormData({
        term_name: '',
        year: new Date().getFullYear(),
        start_date: '',
        end_date: '',
        is_active: false
      });
      setEditingId(null);
      await fetchTerms();
    } catch (error) {
      console.error('Error saving term:', error);
      toast({
        title: "Error",
        description: "Failed to save term",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (term: Term) => {
    setFormData({
      term_name: term.term_name,
      year: term.year,
      start_date: term.start_date,
      end_date: term.end_date,
      is_active: term.is_active || false
    });
    setEditingId(term.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this term?')) return;

    try {
      const { error } = await supabase
        .from('terms')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Term deleted successfully"
      });

      await fetchTerms();
    } catch (error) {
      console.error('Error deleting term:', error);
      toast({
        title: "Error",
        description: "Failed to delete term",
        variant: "destructive"
      });
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      // Deactivate all terms first
      await supabase
        .from('terms')
        .update({ is_active: false })
        .neq('id', '');

      // Activate the selected term
      const { error } = await supabase
        .from('terms')
        .update({ is_active: true })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Active term updated successfully"
      });

      await fetchTerms();
    } catch (error) {
      console.error('Error setting active term:', error);
      toast({
        title: "Error",
        description: "Failed to set active term",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {editingId ? 'Edit Term' : 'Add New Term'}
          </CardTitle>
          <CardDescription>
            {editingId ? 'Update term information' : 'Create a new academic term'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="term_name">Term Name *</Label>
                <Select value={formData.term_name} onValueChange={(value) => setFormData(prev => ({ ...prev, term_name: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Term 1">Term 1</SelectItem>
                    <SelectItem value="Term 2">Term 2</SelectItem>
                    <SelectItem value="Term 3">Term 3</SelectItem>
                    <SelectItem value="Semester 1">Semester 1</SelectItem>
                    <SelectItem value="Semester 2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                  required
                  min="2020"
                  max="2030"
                />
              </div>

              <div>
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="end_date">End Date *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
              />
              <Label htmlFor="is_active">Set as Active Term</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {editingId ? 'Update Term' : 'Add Term'}
                  </>
                )}
              </Button>
              {editingId && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setEditingId(null);
                    setFormData({
                      term_name: '',
                      year: new Date().getFullYear(),
                      start_date: '',
                      end_date: '',
                      is_active: false
                    });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Terms</CardTitle>
          <CardDescription>
            Manage your academic terms
          </CardDescription>
        </CardHeader>
        <CardContent>
          {terms.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No terms found. Add your first term above.
            </p>
          ) : (
            <div className="grid gap-4">
              {terms.map((term) => (
                <div key={term.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{term.term_name} {term.year}</h3>
                      {term.is_active && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(term.start_date).toLocaleDateString()} - {new Date(term.end_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {!term.is_active && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetActive(term.id)}
                      >
                        Set Active
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(term)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(term.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TermsManager;