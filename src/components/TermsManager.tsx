import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { Term } from '@/types/database';
import { Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import SeedDefaultsButton from './SeedDefaultsButton';

const TermsManager = () => {
  const [terms, setTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();
  const { schoolId } = useSchool();

  const [formData, setFormData] = useState({
    term_name: '',
    year: new Date().getFullYear(),
    start_date: '',
    end_date: '',
    is_active: false
  });

  const [years, setYears] = useState<{ id: string; year: number; is_active: boolean }[]>([]);
  const [newYear, setNewYear] = useState(new Date().getFullYear());
  const activeYear = years.find((y) => y.is_active) || null;

  useEffect(() => {
    fetchTerms();
    fetchYears();
  }, []);

  const fetchYears = async () => {
    const { data } = await (supabase as any).from('academic_years').select('id, year, is_active').order('year', { ascending: false });
    setYears(data || []);
  };

  const addYear = async () => {
    const { error } = await (supabase as any).from('academic_years').insert({ school_id: schoolId, year: newYear, is_active: years.length === 0 });
    if (error) return toast({ title: 'Error', description: error.code === '23505' ? 'That year already exists' : error.message, variant: 'destructive' });
    toast({ title: 'Success', description: 'Academic year added' });
    fetchYears();
  };

  const setActiveYear = async (id: string) => {
    const { error: e1 } = await (supabase as any).from('academic_years').update({ is_active: false }).eq('school_id', schoolId!).eq('is_active', true);
    const { error } = e1 ? { error: e1 } : await (supabase as any).from('academic_years').update({ is_active: true }).eq('id', id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Success', description: 'Current academic year updated' });
    fetchYears();
  };

  const deleteYear = async (y: { id: string; year: number }) => {
    if (terms.some((t) => t.year === y.year)) {
      return toast({ title: 'Cannot delete', description: 'This year still has terms. Delete its terms first.', variant: 'destructive' });
    }
    if (!confirm(`Delete academic year ${y.year}?`)) return;
    const { error } = await (supabase as any).from('academic_years').delete().eq('id', y.id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    fetchYears();
  };

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
    if (!editingId && !activeYear) {
      toast({ title: "Error", description: "Set a current academic year first", variant: "destructive" });
      return;
    }
    const payload = { ...formData, year: editingId ? formData.year : activeYear!.year };

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
            .eq('school_id', schoolId!)
            .eq('is_active', true);
        }

        const { error } = await supabase
          .from('terms')
          .insert([{ ...formData, school_id: schoolId }]);

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
    if (!confirm('Are you sure you want to delete this term? This will also delete all related marks and report cards.')) return;

    try {
      // Delete related records first to avoid foreign key constraint violations
      await supabase.from('student_marks').delete().eq('term_id', id);
      await supabase.from('report_cards').delete().eq('term_id', id);
      await supabase.from('fee_structures').delete().eq('term_id', id);
      await supabase.from('fee_balance_overrides').delete().eq('term_id', id);
      await supabase.from('student_payments').delete().eq('term_id', id);
      await supabase.from('pending_submissions').delete().eq('term_id', id);

      // Now delete the term
      const { error, count } = await supabase
        .from('terms')
        .delete()
        .eq('id', id)
        .select('id');

      if (error) throw error;
      if (!count && (await supabase.from('terms').select('id').eq('id', id).maybeSingle()).data) {
        throw new Error('Term was not deleted (permission or constraint).');
      }

      toast({
        title: "Success",
        description: "Term deleted successfully"
      });

      await fetchTerms();
    } catch (error) {
      console.error('Error deleting term:', error);
      toast({
        title: "Error",
        description: (error as Error).message || "Failed to delete term",
        variant: "destructive"
      });
    }
  };

  const handleSetActive = async (id: string) => {
    try {
      // Deactivate all terms first
      const { error: deactErr } = await supabase
        .from('terms')
        .update({ is_active: false })
        .eq('school_id', schoolId!)
        .neq('id', id);
      if (deactErr) throw deactErr;

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
        description: (error as Error).message || "Failed to set active term",
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
          <CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5" /> Academic Year Settings</CardTitle>
          <CardDescription>Create academic years and choose the current one. New terms use the active academic year.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 max-w-sm">
            <Input type="number" value={newYear} min={2000} max={2100}
              onChange={(e) => setNewYear(parseInt(e.target.value) || new Date().getFullYear())} aria-label="Academic year" />
            <Button type="button" onClick={addYear}><Plus className="w-4 h-4 mr-1" /> Add Year</Button>
          </div>
          {years.length === 0 ? (
            <p className="text-sm text-muted-foreground">No academic years yet.</p>
          ) : (
            <div className="grid gap-2">
              {years.map((y) => (
                <div key={y.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2 font-medium">
                    {y.year} {y.is_active && <Badge>Current</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant={y.is_active ? 'default' : 'outline'} disabled={y.is_active} onClick={() => setActiveYear(y.id)}>
                      {y.is_active ? 'Current' : 'Set Current'}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteYear(y)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {editingId ? 'Edit Term' : 'Add New Term'}
              </CardTitle>
              <CardDescription>
                {editingId ? 'Update term information' : 'Create a new academic term'}
              </CardDescription>
            </div>
            <SeedDefaultsButton section="terms" onSeeded={fetchTerms} />
          </div>
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
                <Label>Academic Year</Label>
                <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm">
                  {editingId ? formData.year : (activeYear?.year ?? 'No active academic year — set one above')}
                </div>
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
                    <Button
                      size="sm"
                      variant={term.is_active ? 'default' : 'outline'}
                      disabled={term.is_active}
                      onClick={() => handleSetActive(term.id)}
                    >
                      {term.is_active ? 'Active' : 'Set Active'}
                    </Button>
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