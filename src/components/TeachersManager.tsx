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
import { UserPlus, Users } from 'lucide-react';

interface Teacher {
  id: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'student' | 'headteacher';
  created_at: string | null;
}

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">Loading...</TableCell></TableRow>
            ) : teachers.length === 0 ? (
              <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No teachers yet. Add your first one.</TableCell></TableRow>
            ) : (
              teachers.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.full_name}</TableCell>
                  <TableCell><Badge variant="secondary">{t.role}</Badge></TableCell>
                  <TableCell>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TeachersManager;
