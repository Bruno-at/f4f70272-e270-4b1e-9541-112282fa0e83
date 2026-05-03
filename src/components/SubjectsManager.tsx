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
import { Subject, Class } from '@/types/database';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
import SeedDefaultsButton from './SeedDefaultsButton';

interface SubjectWithClasses extends Subject {
  class_ids: string[];
}

const SubjectsManager = () => {
  const [subjects, setSubjects] = useState<SubjectWithClasses[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const { toast } = useToast();
  const { schoolId } = useSchool();

  const [formData, setFormData] = useState({
    subject_name: '',
    subject_code: '',
    class_ids: [] as string[],
    max_marks: 100
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [subjectsRes, classesRes, linksRes] = await Promise.all([
        supabase.from('subjects').select('*').order('subject_name'),
        supabase.from('classes').select('*').order('class_name'),
        supabase.from('class_subjects').select('class_id, subject_id'),
      ]);
      if (subjectsRes.error) throw subjectsRes.error;
      if (classesRes.error) throw classesRes.error;
      if (linksRes.error) throw linksRes.error;

      const linkMap = new Map<string, string[]>();
      (linksRes.data || []).forEach((l: any) => {
        const arr = linkMap.get(l.subject_id) || [];
        arr.push(l.class_id);
        linkMap.set(l.subject_id, arr);
      });
      const merged: SubjectWithClasses[] = (subjectsRes.data || []).map((s: any) => ({
        ...s,
        class_ids: linkMap.get(s.id) || [],
      }));
      setSubjects(merged);
      setClasses(classesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const toggleClassId = (id: string) => {
    setFormData(prev => ({
      ...prev,
      class_ids: prev.class_ids.includes(id)
        ? prev.class_ids.filter(x => x !== id)
        : [...prev.class_ids, id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject_name || formData.class_ids.length === 0) {
      toast({ title: "Error", description: "Enter a subject name and select at least one class", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let subjectId = editingId;

      if (editingId) {
        const { error } = await supabase
          .from('subjects')
          .update({
            subject_name: formData.subject_name,
            subject_code: formData.subject_code,
            max_marks: formData.max_marks,
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        // Re-use existing subject if same name in this school
        const { data: existing } = await supabase
          .from('subjects')
          .select('id')
          .eq('school_id', schoolId)
          .eq('subject_name', formData.subject_name)
          .maybeSingle();
        if (existing?.id) {
          subjectId = existing.id;
          await supabase.from('subjects').update({
            subject_code: formData.subject_code || undefined,
            max_marks: formData.max_marks,
          }).eq('id', existing.id);
        } else {
          const { data: inserted, error } = await supabase
            .from('subjects')
            .insert([{
              subject_name: formData.subject_name,
              subject_code: formData.subject_code,
              max_marks: formData.max_marks,
              school_id: schoolId,
            }])
            .select('id')
            .single();
          if (error) throw error;
          subjectId = inserted.id;
        }
      }

      // Sync class_subjects links
      if (subjectId) {
        const { data: existingLinks } = await supabase
          .from('class_subjects').select('class_id').eq('subject_id', subjectId);
        const existingClassIds = new Set((existingLinks || []).map((l: any) => l.class_id));
        const desired = new Set(formData.class_ids);
        const toAdd = formData.class_ids.filter(id => !existingClassIds.has(id));
        const toRemove = [...existingClassIds].filter(id => !desired.has(id));
        if (toAdd.length) {
          await supabase.from('class_subjects').insert(
            toAdd.map(class_id => ({ class_id, subject_id: subjectId, school_id: schoolId }))
          );
        }
        if (toRemove.length) {
          await supabase.from('class_subjects').delete()
            .eq('subject_id', subjectId).in('class_id', toRemove);
        }
      }

      toast({ title: "Success", description: editingId ? "Subject updated" : "Subject saved" });
      setFormData({ subject_name: '', subject_code: '', class_ids: [], max_marks: 100 });
      setEditingId(null);
      await fetchData();
    } catch (error: any) {
      console.error('Error saving subject:', error);
      toast({ title: "Error", description: error?.message || "Failed to save subject", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (subject: SubjectWithClasses) => {
    setFormData({
      subject_name: subject.subject_name,
      subject_code: subject.subject_code || '',
      class_ids: subject.class_ids,
      max_marks: subject.max_marks || 100,
    });
    setEditingId(subject.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject? It will be removed from all classes and related marks may be affected.')) return;
    try {
      await supabase.from('class_subjects').delete().eq('subject_id', id);
      const { error } = await supabase.from('subjects').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Success", description: "Subject deleted" });
      await fetchData();
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast({ title: "Error", description: "Failed to delete subject. Existing marks may prevent deletion.", variant: "destructive" });
    }
  };

  const filteredSubjects = selectedClass && selectedClass !== 'all'
    ? subjects.filter(s => s.class_ids.includes(selectedClass))
    : subjects;

  const classNameById = (id: string) => {
    const c = classes.find(x => x.id === id);
    return c ? `${c.class_name}${c.section ? ` - ${c.section}` : ''}` : '';
  };

  if (loading) return <div className="flex justify-center p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                {editingId ? 'Edit Subject' : 'Add New Subject'}
              </CardTitle>
              <CardDescription>
                {editingId ? 'Update subject and its class assignments' : 'Create a subject and assign it to one or more classes'}
              </CardDescription>
            </div>
            <SeedDefaultsButton section="subjects" onSeeded={fetchData} />
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="subject_name">Subject Name *</Label>
                <Input id="subject_name" value={formData.subject_name}
                  onChange={(e) => setFormData(p => ({ ...p, subject_name: e.target.value }))}
                  placeholder="e.g., Mathematics" required />
              </div>
              <div>
                <Label htmlFor="subject_code">Subject Code</Label>
                <Input id="subject_code" value={formData.subject_code}
                  onChange={(e) => setFormData(p => ({ ...p, subject_code: e.target.value }))}
                  placeholder="e.g., 535" />
              </div>
              <div>
                <Label htmlFor="max_marks">Maximum Marks</Label>
                <Input id="max_marks" type="number" value={formData.max_marks}
                  onChange={(e) => setFormData(p => ({ ...p, max_marks: parseInt(e.target.value) || 100 }))}
                  min="1" max="1000" />
              </div>
            </div>

            <div>
              <Label>Assign to Classes *</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {classes.map(cls => {
                  const active = formData.class_ids.includes(cls.id);
                  return (
                    <Badge key={cls.id}
                      variant={active ? 'default' : 'outline'}
                      className="cursor-pointer select-none"
                      onClick={() => toggleClassId(cls.id)}
                    >
                      {cls.class_name}{cls.section ? ` - ${cls.section}` : ''}
                    </Badge>
                  );
                })}
                {classes.length === 0 && (
                  <p className="text-sm text-muted-foreground">Add classes first.</p>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : (<><Plus className="w-4 h-4 mr-2" />{editingId ? 'Update Subject' : 'Add Subject'}</>)}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={() => {
                  setEditingId(null);
                  setFormData({ subject_name: '', subject_code: '', class_ids: [], max_marks: 100 });
                }}>Cancel</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Subjects</CardTitle>
          <CardDescription>One row per subject — assigned to one or more classes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="filter_class">Filter by Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.class_name}{cls.section ? ` - ${cls.section}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {filteredSubjects.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {selectedClass !== 'all' ? 'No subjects assigned to this class.' : 'No subjects yet.'}
              </p>
            ) : (
              <div className="grid gap-4">
                {filteredSubjects.map(subject => (
                  <div key={subject.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h3 className="font-medium">
                        {subject.subject_name}
                        {subject.subject_code && <span className="text-sm text-muted-foreground ml-2">({subject.subject_code})</span>}
                      </h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {subject.class_ids.length === 0
                          ? <span className="text-xs text-muted-foreground">Not assigned to any class</span>
                          : subject.class_ids.map(cid => (
                              <Badge key={cid} variant="secondary" className="text-xs">{classNameById(cid)}</Badge>
                            ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Max Marks: {subject.max_marks || 100}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(subject)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(subject.id)}>
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
