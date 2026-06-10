import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSchool } from '@/contexts/SchoolContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  UserPlus, Users, Edit, Trash2, Link2, Eye, Search, GraduationCap, BookOpen, UserCheck, UserX, Upload,
} from 'lucide-react';

interface Teacher {
  id: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student' | 'headteacher';
  created_at: string | null;
  email: string | null;
  contact_phone: string | null;
  teacher_code: string | null;
  photo_url: string | null;
}

interface ClassRow {
  id: string;
  class_name: string;
  section?: string | null;
  class_teacher_id?: string | null;
}
interface SubjectRow { id: string; subject_name: string; subject_code?: string | null; }

const TeachersManager = () => {
  const { schoolId, school } = useSchool();
  const { toast } = useToast();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [classSubjectLinks, setClassSubjectLinks] = useState<{ class_id: string; subject_id: string }[]>([]);
  const [teacherSubjects, setTeacherSubjects] = useState<{ teacher_id: string; subject_id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchName, setSearchName] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');

  // Add
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  // Edit
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<Teacher['role']>('teacher');
  const [editPhone, setEditPhone] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState<string>('');

  // Assign
  const [assignOpen, setAssignOpen] = useState(false);
  const [assigning, setAssigning] = useState<Teacher | null>(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [savingAssign, setSavingAssign] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<{ classNames: string[] } | null>(null);

  // View
  const [viewing, setViewing] = useState<Teacher | null>(null);

  // Delete
  const [deleting, setDeleting] = useState<Teacher | null>(null);

  const loadAll = async () => {
    if (!schoolId) return;
    setLoading(true);
    const [tRes, cRes, sRes, csRes, tsRes] = await Promise.all([
      supabase.from('profiles')
        .select('id, full_name, role, created_at, email, contact_phone, teacher_code, photo_url')
        .eq('school_id', schoolId)
        .in('role', ['teacher', 'headteacher', 'admin'])
        .order('created_at', { ascending: false }),
      supabase.from('classes').select('id, class_name, section, class_teacher_id').eq('school_id', schoolId).order('class_name'),
      supabase.from('subjects').select('id, subject_name, subject_code').eq('school_id', schoolId).order('subject_name'),
      supabase.from('class_subjects').select('class_id, subject_id').eq('school_id', schoolId),
      supabase.from('teacher_subjects').select('teacher_id, subject_id').eq('school_id', schoolId),
    ]);
    if (tRes.error) toast({ title: 'Error', description: tRes.error.message, variant: 'destructive' });
    setTeachers((tRes.data || []) as Teacher[]);
    setClasses((cRes.data || []) as ClassRow[]);
    setSubjects((sRes.data || []) as SubjectRow[]);
    setClassSubjectLinks((csRes.data || []) as any);
    setTeacherSubjects((tsRes.data || []) as any);
    setLoading(false);
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [schoolId]);

  // Indexes
  const subjectById = useMemo(() => Object.fromEntries(subjects.map(s => [s.id, s])), [subjects]);
  const classById = useMemo(() => Object.fromEntries(classes.map(c => [c.id, c])), [classes]);

  const subjectsByTeacher = useMemo(() => {
    const map: Record<string, string[]> = {};
    teacherSubjects.forEach(ts => {
      (map[ts.teacher_id] ||= []).push(ts.subject_id);
    });
    return map;
  }, [teacherSubjects]);

  const classesByTeacher = useMemo(() => {
    const map: Record<string, string[]> = {};
    classes.forEach(c => {
      if (c.class_teacher_id) (map[c.class_teacher_id] ||= []).push(c.id);
    });
    return map;
  }, [classes]);

  // Stats
  const stats = useMemo(() => {
    const total = teachers.length;
    const subjTeachers = teachers.filter(t => (subjectsByTeacher[t.id] || []).length > 0).length;
    const classTeachers = teachers.filter(t => (classesByTeacher[t.id] || []).length > 0).length;
    const unassigned = teachers.filter(
      t => !(subjectsByTeacher[t.id] || []).length && !(classesByTeacher[t.id] || []).length
    ).length;
    return { total, subjTeachers, classTeachers, unassigned };
  }, [teachers, subjectsByTeacher, classesByTeacher]);

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      if (searchName && !t.full_name.toLowerCase().includes(searchName.toLowerCase())) return false;
      if (filterSubject !== 'all' && !(subjectsByTeacher[t.id] || []).includes(filterSubject)) return false;
      if (filterClass !== 'all' && !(classesByTeacher[t.id] || []).includes(filterClass)) return false;
      return true;
    });
  }, [teachers, searchName, filterSubject, filterClass, subjectsByTeacher, classesByTeacher]);

  // ----- Helpers -----
  const uploadPhoto = async (file: File): Promise<string | null> => {
    const ext = file.name.split('.').pop();
    const path = `teachers/${Math.random().toString(36).slice(2)}_${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('student-photos').upload(path, file);
    if (upErr) throw upErr;
    const { data, error } = await supabase.storage.from('student-photos').createSignedUrl(path, 60 * 60 * 24 * 365);
    if (error) throw error;
    return data.signedUrl;
  };

  // ----- Add -----
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolId) return;
    if (password.length < 6) {
      toast({ title: 'Password too short', description: 'Use at least 6 characters.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: { full_name: fullName.trim(), role: 'teacher', school_id: schoolId },
        },
      });
      if (error) throw error;
      if (currentSession) {
        await supabase.auth.setSession({
          access_token: currentSession.access_token,
          refresh_token: currentSession.refresh_token,
        });
      }
      // Persist extra fields onto profile (after handle_new_user trigger creates the row)
      const newId = signUpData.user?.id;
      if (newId) {
        await supabase.from('profiles').update({
          email: email.trim(),
          contact_phone: phone.trim() || null,
          teacher_code: code.trim() || null,
        }).eq('id', newId);
      }
      toast({ title: 'Teacher added', description: `${fullName} has been invited.` });
      setFullName(''); setEmail(''); setPassword(''); setPhone(''); setCode('');
      setAddOpen(false);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'Could not add teacher', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ----- Edit -----
  const openEdit = (t: Teacher) => {
    setEditing(t);
    setEditName(t.full_name);
    setEditRole(t.role);
    setEditPhone(t.contact_phone || '');
    setEditCode(t.teacher_code || '');
    setEditPhotoFile(null);
    setEditPhotoPreview(t.photo_url || '');
    setEditOpen(true);
  };

  const onEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setEditPhotoFile(f);
    const r = new FileReader();
    r.onloadend = () => setEditPhotoPreview(r.result as string);
    r.readAsDataURL(f);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      let photoUrl = editing.photo_url || null;
      if (editPhotoFile) photoUrl = await uploadPhoto(editPhotoFile);
      const { error } = await supabase.from('profiles').update({
        full_name: editName.trim(),
        role: editRole,
        contact_phone: editPhone.trim() || null,
        teacher_code: editCode.trim() || null,
        photo_url: photoUrl,
      }).eq('id', editing.id);
      if (error) throw error;
      toast({ title: 'Teacher updated' });
      setEditOpen(false);
      setEditing(null);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' });
    }
  };

  // ----- Delete -----
  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await supabase.from('teacher_subjects').delete().eq('teacher_id', deleting.id);
      await supabase.from('classes').update({ class_teacher_id: null }).eq('class_teacher_id', deleting.id);
      const { error } = await supabase.from('profiles').update({ school_id: null }).eq('id', deleting.id);
      if (error) throw error;
      toast({ title: 'Teacher removed' });
      setDeleting(null);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'Remove failed', description: err.message, variant: 'destructive' });
    }
  };

  // ----- Assign -----
  const openAssign = (t: Teacher) => {
    setAssigning(t);
    setSelectedSubjectIds(new Set(subjectsByTeacher[t.id] || []));
    setSelectedClassIds(new Set(classesByTeacher[t.id] || []));
    setAssignOpen(true);
  };

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleClass = (id: string) => {
    setSelectedClassIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const performSaveAssign = async (replace: boolean) => {
    if (!assigning || !schoolId) return;
    setSavingAssign(true);
    try {
      // Subjects: replace
      await supabase.from('teacher_subjects').delete().eq('teacher_id', assigning.id);
      const subjRows = Array.from(selectedSubjectIds).map(subject_id => ({
        teacher_id: assigning.id, subject_id, school_id: schoolId,
      }));
      if (subjRows.length) {
        const { error } = await supabase.from('teacher_subjects').insert(subjRows);
        if (error) throw error;
      }

      // Class teacher assignments
      // First clear classes currently held by this teacher
      await supabase.from('classes').update({ class_teacher_id: null }).eq('class_teacher_id', assigning.id);

      const newClassIds = Array.from(selectedClassIds);
      if (newClassIds.length) {
        if (replace) {
          // Clear any existing class_teacher_id for those classes
          await supabase.from('classes').update({ class_teacher_id: null }).in('id', newClassIds);
        }
        const { error } = await supabase.from('classes')
          .update({ class_teacher_id: assigning.id })
          .in('id', newClassIds);
        if (error) throw error;
      }
      toast({ title: 'Assignments saved' });
      setAssignOpen(false);
      setAssigning(null);
      setPendingReplace(null);
      await loadAll();
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSavingAssign(false);
    }
  };

  const saveAssignments = async () => {
    if (!assigning) return;
    // Check class teacher conflicts
    const conflicts = Array.from(selectedClassIds)
      .map(id => classById[id])
      .filter(c => c && c.class_teacher_id && c.class_teacher_id !== assigning.id);
    if (conflicts.length) {
      setPendingReplace({ classNames: conflicts.map(c => `${c!.class_name}${c!.section ? ` - ${c!.section}` : ''}`) });
      return;
    }
    await performSaveAssign(false);
  };

  // ----- Render helpers -----
  const initials = (name: string) =>
    name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const subjectChips = (teacherId: string, limit = 3) => {
    const ids = subjectsByTeacher[teacherId] || [];
    const shown = ids.slice(0, limit).map(id => subjectById[id]?.subject_name).filter(Boolean);
    const extra = ids.length - shown.length;
    if (!ids.length) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {shown.map((n, i) => <Badge key={i} variant="secondary" className="text-xs">{n}</Badge>)}
        {extra > 0 && <Badge variant="outline" className="text-xs">+{extra}</Badge>}
      </div>
    );
  };

  const classChips = (teacherId: string) => {
    const ids = classesByTeacher[teacherId] || [];
    if (!ids.length) return <span className="text-xs text-muted-foreground">—</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {ids.map(id => {
          const c = classById[id];
          if (!c) return null;
          return (
            <Badge key={id} variant="default" className="text-xs">
              {c.class_name}{c.section ? ` ${c.section}` : ''}
            </Badge>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Teachers" value={stats.total} />
        <StatCard icon={<BookOpen className="w-5 h-5" />} label="Subject Teachers" value={stats.subjTeachers} />
        <StatCard icon={<GraduationCap className="w-5 h-5" />} label="Class Teachers" value={stats.classTeachers} />
        <StatCard icon={<UserX className="w-5 h-5" />} label="Unassigned" value={stats.unassigned} />
      </div>

      {/* Header / Filters */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Search by name</Label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Teacher name..." value={searchName} onChange={e => setSearchName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Filter by subject</Label>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All subjects</SelectItem>
                {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.subject_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Filter by class</Label>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All classes</SelectItem>
                {classes.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.class_name}{c.section ? ` - ${c.section}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button><UserPlus className="w-4 h-4 mr-2" />Add Teacher</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a Teacher</DialogTitle>
              <DialogDescription>Invite a teacher to {school?.school_name || 'your school'}.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Full Name *</Label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} required /></div>
                <div className="space-y-1"><Label>Teacher ID</Label>
                  <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. TCH-001" /></div>
                <div className="space-y-1"><Label>Email *</Label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
                <div className="space-y-1"><Label>Contact Phone</Label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+256..." /></div>
                <div className="space-y-1 sm:col-span-2"><Label>Temporary Password *</Label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
                  <p className="text-xs text-muted-foreground">Share with the teacher. They can change it after first login.</p>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Teacher'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">Photo</TableHead>
              <TableHead>Teacher ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Subjects</TableHead>
              <TableHead>Classes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Loading...</TableCell></TableRow>
            ) : filteredTeachers.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                {teachers.length === 0 ? 'No teachers yet. Add your first one.' : 'No teachers match the filters.'}
              </TableCell></TableRow>
            ) : (
              filteredTeachers.map(t => (
                <TableRow key={t.id}>
                  <TableCell>
                    <Avatar className="w-9 h-9">
                      {t.photo_url && <AvatarImage src={t.photo_url} alt={t.full_name} />}
                      <AvatarFallback>{initials(t.full_name)}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{t.teacher_code || '—'}</TableCell>
                  <TableCell className="font-medium">
                    {t.full_name}
                    {t.role !== 'teacher' && <Badge variant="outline" className="ml-2 text-xs">{t.role}</Badge>}
                  </TableCell>
                  <TableCell className="text-sm">{t.email || '—'}</TableCell>
                  <TableCell className="text-sm">{t.contact_phone || '—'}</TableCell>
                  <TableCell>{subjectChips(t.id)}</TableCell>
                  <TableCell>{classChips(t.id)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setViewing(t)} title="View">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openAssign(t)} title="Assign">
                        <Link2 className="w-4 h-4 mr-1" />Assign
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(t)} title="Edit">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeleting(t)} title="Delete"
                        className="text-destructive hover:text-destructive">
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

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Teacher Profile</DialogTitle>
          </DialogHeader>
          {viewing && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  {viewing.photo_url && <AvatarImage src={viewing.photo_url} />}
                  <AvatarFallback className="text-lg">{initials(viewing.full_name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="text-lg font-semibold">{viewing.full_name}</div>
                  <div className="text-sm text-muted-foreground">{viewing.role}</div>
                  {viewing.teacher_code && <div className="text-xs font-mono mt-1">{viewing.teacher_code}</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><div className="text-muted-foreground text-xs">Email</div><div>{viewing.email || '—'}</div></div>
                <div><div className="text-muted-foreground text-xs">Phone</div><div>{viewing.contact_phone || '—'}</div></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Assigned Subjects</div>
                {(subjectsByTeacher[viewing.id] || []).length ? (
                  <div className="flex flex-wrap gap-1">
                    {(subjectsByTeacher[viewing.id] || []).map(id => (
                      <Badge key={id} variant="secondary">{subjectById[id]?.subject_name}</Badge>
                    ))}
                  </div>
                ) : <div className="text-sm text-muted-foreground">None</div>}
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Class Teacher Of</div>
                {(classesByTeacher[viewing.id] || []).length ? (
                  <div className="flex flex-wrap gap-1">
                    {(classesByTeacher[viewing.id] || []).map(id => {
                      const c = classById[id];
                      return c ? <Badge key={id}>{c.class_name}{c.section ? ` - ${c.section}` : ''}</Badge> : null;
                    })}
                  </div>
                ) : <div className="text-sm text-muted-foreground">None</div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Teacher</DialogTitle></DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                {editPhotoPreview && <AvatarImage src={editPhotoPreview} />}
                <AvatarFallback>{initials(editName || 'T')}</AvatarFallback>
              </Avatar>
              <div>
                <Label className="text-xs">Photo</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" onChange={onEditPhotoChange} className="text-xs" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Full Name</Label>
                <Input value={editName} onChange={e => setEditName(e.target.value)} required /></div>
              <div className="space-y-1"><Label>Teacher ID</Label>
                <Input value={editCode} onChange={e => setEditCode(e.target.value)} /></div>
              <div className="space-y-1"><Label>Contact Phone</Label>
                <Input value={editPhone} onChange={e => setEditPhone(e.target.value)} /></div>
              <div className="space-y-1">
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
            </div>
            <Button type="submit" className="w-full">Save Changes</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Teacher Assignment</DialogTitle>
            <DialogDescription>
              <span className="font-medium text-foreground">Teacher:</span> {assigning?.full_name}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="subjects">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="subjects">Subject Assignment</TabsTrigger>
              <TabsTrigger value="classes">Class Assignment</TabsTrigger>
            </TabsList>

            <TabsContent value="subjects" className="space-y-3 mt-4">
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes / subjects yet.</p>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2">
                  {classes.map(cls => {
                    const ids = new Set(classSubjectLinks.filter(l => l.class_id === cls.id).map(l => l.subject_id));
                    const cs = subjects.filter(s => ids.has(s.id));
                    if (!cs.length) return null;
                    return (
                      <div key={cls.id} className="border rounded-md p-3">
                        <div className="text-sm font-medium mb-2">
                          {cls.class_name}{cls.section ? ` - ${cls.section}` : ''}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {cs.map(s => (
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
            </TabsContent>

            <TabsContent value="classes" className="space-y-3 mt-4">
              <p className="text-xs text-muted-foreground">
                Select classes this teacher should be the class teacher of. A class can only have one class teacher;
                you'll be asked to confirm replacement if one already exists.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[50vh] overflow-y-auto pr-2">
                {classes.map(c => {
                  const taken = c.class_teacher_id && c.class_teacher_id !== assigning?.id;
                  const takenBy = taken ? teachers.find(t => t.id === c.class_teacher_id)?.full_name : null;
                  return (
                    <label key={c.id} className="flex items-start gap-2 text-sm border rounded-md p-2 cursor-pointer">
                      <Checkbox
                        checked={selectedClassIds.has(c.id)}
                        onCheckedChange={() => toggleClass(c.id)}
                      />
                      <div>
                        <div>{c.class_name}{c.section ? ` - ${c.section}` : ''}</div>
                        {taken && (
                          <div className="text-xs text-amber-600 dark:text-amber-400">
                            Currently: {takenBy || 'another teacher'}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button onClick={saveAssignments} disabled={savingAssign}>
              {savingAssign ? 'Saving...' : 'Save Assignments'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace-class-teacher confirmation */}
      <AlertDialog open={!!pendingReplace} onOpenChange={(o) => !o && setPendingReplace(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace existing class teacher?</AlertDialogTitle>
            <AlertDialogDescription>
              The following class(es) already have a class teacher. Replace existing assignment?
              <ul className="list-disc pl-5 mt-2 text-foreground">
                {pendingReplace?.classNames.map(n => <li key={n}>{n}</li>)}
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => performSaveAssign(true)}>Replace</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete teacher?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleting?.full_name}</strong>?
              Their subject and class-teacher assignments will also be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const StatCard = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center">{icon}</div>
      <div>
        <div className="text-2xl font-semibold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </CardContent>
  </Card>
);

export default TeachersManager;