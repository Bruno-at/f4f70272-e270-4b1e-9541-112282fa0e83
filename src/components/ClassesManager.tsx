import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Class } from '@/types/database';
import { Plus, Edit, Trash2, Users, UserCheck } from 'lucide-react';

interface Teacher {
  id: string;
  full_name: string;
}

interface ClassWithTeacher extends Class {
  class_teacher_id?: string | null;
  profiles?: { full_name: string } | null;
}

const ClassesManager = () => {
  const [classes, setClasses] = useState<ClassWithTeacher[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    class_name: '',
    section: '',
    class_teacher_id: ''
  });

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          students!students_class_id_fkey(count),
          profiles!classes_class_teacher_id_fkey(full_name)
        `)
        .order('class_name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast({
        title: "Error",
        description: "Failed to load classes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('role', ['teacher', 'headteacher'])
        .order('full_name');

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.class_name) {
      toast({
        title: "Error",
        description: "Please enter a class name",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        class_name: formData.class_name,
        section: formData.section || null,
        class_teacher_id: formData.class_teacher_id || null
      };

      if (editingId) {
        const { error } = await supabase
          .from('classes')
          .update(dataToSave)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Class updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('classes')
          .insert([dataToSave]);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Class added successfully"
        });
      }

      setFormData({
        class_name: '',
        section: '',
        class_teacher_id: ''
      });
      setEditingId(null);
      await fetchClasses();
    } catch (error) {
      console.error('Error saving class:', error);
      toast({
        title: "Error",
        description: "Failed to save class",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (classData: ClassWithTeacher) => {
    setFormData({
      class_name: classData.class_name,
      section: classData.section || '',
      class_teacher_id: classData.class_teacher_id || ''
    });
    setEditingId(classData.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this class? This will affect all students in this class.')) return;

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Class deleted successfully"
      });

      await fetchClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      toast({
        title: "Error",
        description: "Failed to delete class. Make sure no students are enrolled in this class.",
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
            <Users className="w-5 h-5" />
            {editingId ? 'Edit Class' : 'Add New Class'}
          </CardTitle>
          <CardDescription>
            {editingId ? 'Update class information' : 'Create a new class for students'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="class_name">Class Name *</Label>
                <Input
                  id="class_name"
                  value={formData.class_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, class_name: e.target.value }))}
                  placeholder="e.g., Grade 7, Form 1, Class A"
                  required
                />
              </div>

              <div>
                <Label htmlFor="section">Section (Optional)</Label>
                <Input
                  id="section"
                  value={formData.section}
                  onChange={(e) => setFormData(prev => ({ ...prev, section: e.target.value }))}
                  placeholder="e.g., A, B, East, West"
                />
              </div>

              <div>
                <Label htmlFor="class_teacher">Class Teacher (Optional)</Label>
                <Select
                  value={formData.class_teacher_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, class_teacher_id: value === 'none' ? '' : value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No class teacher</SelectItem>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {editingId ? 'Update Class' : 'Add Class'}
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
                      class_name: '',
                      section: '',
                      class_teacher_id: ''
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
          <CardTitle>Existing Classes</CardTitle>
          <CardDescription>
            Manage your school classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No classes found. Add your first class above.
            </p>
          ) : (
            <div className="grid gap-4">
              {classes.map((classData) => (
                <div key={classData.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium">
                      {classData.class_name}
                      {classData.section && ` - ${classData.section}`}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                      <span>Students: {(classData as any).students?.[0]?.count || 0}</span>
                      {classData.profiles && (
                        <span className="flex items-center gap-1">
                          <UserCheck className="w-3 h-3" />
                          {classData.profiles.full_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(classData)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(classData.id)}
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

export default ClassesManager;
