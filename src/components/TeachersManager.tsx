import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Users, Edit, Trash2, Link2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Teacher {
  id: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student' | 'headteacher';
  created_at: string | null;
}

interface ClassRow { id: string; class_name: string; section?: string | null; class_teacher_id?: string | null; }
interface SubjectRow { id: string; subject_name: string; subject_code?: string | null; class_id: string; }

const TeachersManager = () => {
  const { schoolId, school } = useSchool();
  const { toast } = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<Teacher['role']>('teacher');

  // Assign
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [selectedClassId, setSelectedClassId] = useState<string>('none');
  const [savingAssign, setSavingAssign] = useState(false);

  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setTeachers((data || []) as Teacher[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Use at least 6 characters.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      // Preserve current admin session
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            full_name: fullName.trim(),
            role: 'teacher',
            school_id: schoolId,
          },
        },
      });
      if (error) throw error;

      // signUp may sign the new user in — restore the admin session
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }

      toast({
        title: 'Teacher invited',
        description: `${fullName} has been added. They'll receive a confirmation email at ${email}.`,
      });
      setFullName('');
      setEmail('');
      setPassword('');
      setOpen(false);
      await load();
    } catch (error: any) {
      toast({ title: 'Could not add teacher', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (t: Teacher) => {
    setEditing(t);
    setEditName(t.full_name);
    setEditRole(t.role);
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName.trim(), role: editRole })
      .eq('id', editing.id);
    if (error) {
      toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Teacher updated' });
    setEditOpen(false);
    setEditing(null);
    await load();
  };

  const removeTeacher = async (t: Teacher) => {
    if (!confirm(`Remove ${t.full_name} from this school? Their assignments will be cleared.`)) return;
    // Detach assignments first
    await supabase.from('teacher_subjects').delete().eq('teacher_id', t.id);
    await supabase.from('classes').update({ class_teacher_id: null }).eq('class_teacher_id', t.id);
    // Detach from school (cannot delete auth user from client)
    const { error } = await supabase
      .from('profiles')
      .update({ school_id: null })
      .eq('id', t.id);
    if (error) {
      toast({ title: 'Remove failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Teacher removed' });
    await load();
  };

  const openAssign = async (t: Teacher) => {
    if (!schoolId) return;
    setAssigning(t);
    setAssignOpen(true);
    setSavingAssign(false);

    const [classesRes, subjectsRes, tsRes, classTeacherRes] = await Promise.all([
      supabase.from('classes').select('id, class_name, section, class_teacher_id').eq('school_id', schoolId).order('class_name'),
      supabase.from('subjects').select('id, subject_name, subject_code, class_id').eq('school_id', schoolId).order('subject_name'),
      supabase.from('teacher_subjects').select('subject_id').eq('teacher_id', t.id),
      supabase.from('classes').select('id').eq('class_teacher_id', t.id).maybeSingle(),
    ]);
    setClasses((classesRes.data || []) as ClassRow[]);
    setSubjects((subjectsRes.data || []) as SubjectRow[]);
    setSelectedSubjectIds(new Set((tsRes.data || []).map((r: any) => r.subject_id)));
    setSelectedClassId(classTeacherRes.data?.id || 'none');
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const saveAssignments = async () => {
    if (!assigning || !schoolId) return;
    setSavingAssign(true);
    try {
      // Replace teacher_subjects rows
      await supabase.from('teacher_subjects').delete().eq('teacher_id', assigning.id);
      const rows = Array.from(selectedSubjectIds).map(subject_id => ({
        teacher_id: assigning.id,
        subject_id,
        school_id: schoolId,
      }));
      if (rows.length) {
        const { error } = await supabase.from('teacher_subjects').insert(rows);
        if (error) throw error;
      }
      // Class teacher: clear any class previously held by this teacher, then assign new one
      await supabase.from('classes').update({ class_teacher_id: null }).eq('class_teacher_id', assigning.id);
      if (selectedClassId && selectedClassId !== 'none') {
        const { error: cErr } = await supabase
          .from('classes')
          .update({ class_teacher_id: assigning.id })
          .eq('id', selectedClassId);
        if (cErr) throw cErr;
      }
      toast({ title: 'Assignments saved' });
      setAssignOpen(false);
      setAssigning(null);
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingAssign(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {teachers.length} {teachers.length === 1 ? 'member' : 'members'} in {school?.school_name || 'your school'}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Teacher
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a Teacher</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="t-name">Full Name</Label>
                <Input id="t-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-email">Email</Label>
                <Input id="t-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="t-pass">Temporary Password</Label>
                <Input id="t-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
                <p className="text-xs text-muted-foreground">Share this with the teacher. They can change it after first login.</p>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Teacher'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : teachers.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No teachers yet. Add your first one.</TableCell></TableRow>
            ) : (
              teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.full_name}</TableCell>
                  <TableCell><Badge variant="secondary">{t.role}</Badge></TableCell>
                  <TableCell>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openAssign(t)}>
                        <Link2 className="w-4 h-4 mr-1" /> Assign
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeTeacher(t)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={editRole} onValueChange={(v) => setEditRole(v as Teacher['role'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="headteacher">Headteacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Subjects & Class — {assigning?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Class teacher of</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— None —</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.class_name}{c.section ? ` - ${c.section}` : ''}
                      {c.class_teacher_id && c.class_teacher_id !== assigning?.id ? ' (currently assigned)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">A teacher can be class teacher of one class. Re-assigning will move them.</p>
            </div>

            <div className="space-y-2">
              <Label>Subjects taught</Label>
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes yet.</p>
              ) : (
                <div className="space-y-4 max-h-72 overflow-y-auto pr-2">
                  {classes.map(cls => {
                    const classSubjects = subjects.filter(s => s.class_id === cls.id);
                    if (classSubjects.length === 0) return null;
                    return (
                      <div key={cls.id} className="border rounded-md p-3">
                        <div className="text-sm font-medium mb-2">
                          {cls.class_name}{cls.section ? ` - ${cls.section}` : ''}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {classSubjects.map(s => (
                            <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                              <Checkbox
                                checked={selectedSubjectIds.has(s.id)}
                                onCheckedChange={() => toggleSubject(s.id)}
                              />
                              <span>{s.subject_code ? `${s.subject_code} — ` : ''}{s.subject_name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button onClick={saveAssignments} disabled={savingAssign}>
                {savingAssign ? 'Saving...' : 'Save Assignments'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeachersManager;
