import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Subject, Class } from '@/types/database';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';

const SubjectsManager = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    subject_name: '',
    class_id: '',
    max_marks: 100
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subjectsResult, classesResult] = await Promise.all([
        supabase
          .from('subjects')
          .select(`
            *,
            classes!subjects_class_id_fkey(class_name, section)
          `)
          .order('subject_name'),
        supabase
          .from('classes')
          .select('*')
          .order('class_name')
      ]);

      if (subjectsResult.error) throw subjectsResult.error;
      if (classesResult.error) throw classesResult.error;

      setSubjects(subjectsResult.data || []);
      setClasses(classesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject_name || !formData.class_id) {
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
          .from('subjects')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Subject updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('subjects')
          .insert([formData]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Subject added successfully"
        });
      }

      setFormData({
        subject_name: '',
        class_id: '',
        max_marks: 100
      });
      setEditingId(null);
      await fetchData();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast({
        title: "Error",
        description: "Failed to save subject",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject: Subject) => {
    setFormData({
      subject_name: subject.subject_name,
      class_id: subject.class_id,
      max_marks: subject.max_marks || 100
    });
    setEditingId(subject.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject? This will affect all related student marks.')) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Subject deleted successfully"
      });

      await fetchData();
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({
        title: "Error",
        description: "Failed to delete subject. Make sure no marks are recorded for this subject.",
        variant: "destructive"
      });
    }
  };

  const filteredSubjects = selectedClass && selectedClass !== 'all'
    ? subjects.filter(subject => subject.class_id === selectedClass)
    : subjects;

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            {editingId ? 'Edit Subject' : 'Add New Subject'}
          </CardTitle>
          <CardDescription>
            {editingId ? 'Update subject information' : 'Create a new subject for a class'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="subject_name">Subject Name *</Label>
                <Input
                  id="subject_name"
                  value={formData.subject_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, subject_name: e.target.value }))}
                  placeholder="e.g., Mathematics, English"
                  required
                />
              </div>

              <div>
                <Label htmlFor="class_id">Class *</Label>
                <Select value={formData.class_id} onValueChange={(value) => setFormData(prev => ({ ...prev, class_id: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.class_name} {cls.section ? `- ${cls.section}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="max_marks">Maximum Marks</Label>
                <Input
                  id="max_marks"
                  type="number"
                  value={formData.max_marks}
                  onChange={(e) => setFormData(prev => ({ ...prev, max_marks: parseInt(e.target.value) }))}
                  placeholder="100"
                  min="1"
                  max="1000"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {editingId ? 'Update Subject' : 'Add Subject'}
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
                      subject_name: '',
                      class_id: '',
                      max_marks: 100
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
          <CardTitle>Existing Subjects</CardTitle>
          <CardDescription>
            Manage subjects by class
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="filter_class">Filter by Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="All classes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.class_name} {cls.section ? `- ${cls.section}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredSubjects.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {selectedClass && selectedClass !== 'all' ? 'No subjects found for this class.' : 'No subjects found. Add your first subject above.'}
              </p>
            ) : (
              <div className="grid gap-4">
                {filteredSubjects.map((subject) => (
                  <div key={subject.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">{subject.subject_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Class: {(subject as any).classes?.class_name} {(subject as any).classes?.section ? `- ${(subject as any).classes?.section}` : ''} | 
                        Max Marks: {subject.max_marks || 100}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(subject)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(subject.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubjectsManager;