import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Trash2 } from 'lucide-react';

const BalanceOverrideManager = () => {
  const [overrides, setOverrides] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [overrideAmount, setOverrideAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [ovRes, studRes, termRes, classRes] = await Promise.all([
        supabase.from('fee_balance_overrides').select('*, students(name, class_id, classes!students_class_id_fkey(class_name, section)), terms(term_name, year)').order('created_at', { ascending: false }),
        supabase.from('students').select('*, classes!students_class_id_fkey(class_name, section)').order('name'),
        supabase.from('terms').select('*').order('year', { ascending: false }),
        supabase.from('classes').select('*').order('class_name')
      ]);
      if (ovRes.error) throw ovRes.error;
      setOverrides(ovRes.data || []);
      setStudents(studRes.data || []);
      setTerms(termRes.data || []);
      setClasses(classRes.data || []);

      const activeTerm = termRes.data?.find((t: any) => t.is_active);
      if (activeTerm) setSelectedTerm(activeTerm.id);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = filterClass && filterClass !== 'all'
    ? students.filter((s: any) => s.class_id === filterClass)
    : students;

  const handleSave = async () => {
    if (!selectedStudent || !selectedTerm || overrideAmount === '' || !reason) {
      toast({ title: "Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('fee_balance_overrides').upsert({
        student_id: selectedStudent,
        term_id: selectedTerm,
        override_amount: parseFloat(overrideAmount),
        reason,
        overridden_by: user?.user?.id
      }, { onConflict: 'student_id,term_id' });
      if (error) throw error;

      await supabase.from('fee_audit_logs').insert({
        student_id: selectedStudent,
        action: 'balance_override',
        details: { override_amount: parseFloat(overrideAmount), reason },
        performed_by: user?.user?.id
      });

      toast({ title: "Success", description: "Balance override saved" });
      setSelectedStudent(''); setOverrideAmount(''); setReason('');
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase.from('fee_balance_overrides').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Removed", description: "Override removed, balance will be auto-calculated" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const formatCurrency = (a: number) => `${a.toLocaleString()} UGX`;

  if (loading) return <div className="text-center p-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Override the automatically calculated fees balance for special cases (scholarships, waivers, etc.). Set to 0 for fully sponsored students.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <Label>Filter by Class</Label>
          <Select value={filterClass} onValueChange={setFilterClass}>
            <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.class_name} {c.section ? `- ${c.section}` : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Student *</Label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
            <SelectContent>
              {filteredStudents.map((s: any) => (
                <SelectItem key={s.id} value={s.id}>{s.name} ({s.classes?.class_name})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Term *</Label>
          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
            <SelectContent>
              {terms.map(t => (
                <SelectItem key={t.id} value={t.id}>{t.term_name} {t.year}{t.is_active ? ' (Active)' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Override Balance (UGX) *</Label>
          <Input type="number" value={overrideAmount} onChange={e => setOverrideAmount(e.target.value)} placeholder="e.g. 0" />
        </div>
        <div className="md:col-span-2">
          <Label>Reason *</Label>
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Full government scholarship" rows={2} />
        </div>
      </div>
      <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" />Save Override</Button>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Override Amount</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {overrides.map(o => (
            <TableRow key={o.id}>
              <TableCell>{o.students?.name}</TableCell>
              <TableCell>{o.students?.classes?.class_name}</TableCell>
              <TableCell>{o.terms?.term_name} {o.terms?.year}</TableCell>
              <TableCell className="font-semibold">{formatCurrency(o.override_amount)}</TableCell>
              <TableCell>{o.reason}</TableCell>
              <TableCell>
                <Button variant="destructive" size="sm" onClick={() => handleRemove(o.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {overrides.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No overrides configured</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default BalanceOverrideManager;
