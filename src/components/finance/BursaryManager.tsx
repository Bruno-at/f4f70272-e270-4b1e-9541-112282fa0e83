import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Save, Trash2 } from 'lucide-react';

const BURSARY_TYPES = [
  { value: 'none', label: 'None', percentage: 0 },
  { value: 'full', label: 'Full Bursary (100%)', percentage: 100 },
  { value: 'half', label: 'Half Bursary (50%)', percentage: 50 },
  { value: 'custom', label: 'Custom Percentage', percentage: 0 },
];

const BursaryManager = () => {
  const [bursaries, setBursaries] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [bursaryType, setBursaryType] = useState('none');
  const [customPercentage, setCustomPercentage] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [burRes, studRes, classRes] = await Promise.all([
        supabase.from('student_bursaries').select('*, students(name, class_id, classes(class_name, section))').order('created_at', { ascending: false }),
        supabase.from('students').select('*, classes(class_name, section)').order('name'),
        supabase.from('classes').select('*').order('class_name')
      ]);
      if (burRes.error) throw burRes.error;
      setBursaries(burRes.data || []);
      setStudents(studRes.data || []);
      setClasses(classRes.data || []);
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

  const getPercentage = (): number => {
    if (bursaryType === 'full') return 100;
    if (bursaryType === 'half') return 50;
    if (bursaryType === 'custom') return parseFloat(customPercentage) || 0;
    return 0;
  };

  const handleSave = async () => {
    if (!selectedStudent) {
      toast({ title: "Error", description: "Please select a student", variant: "destructive" });
      return;
    }
    try {
      const { data: user } = await supabase.auth.getUser();
      const percentage = getPercentage();
      const { error } = await supabase.from('student_bursaries').upsert({
        student_id: selectedStudent,
        bursary_type: bursaryType,
        bursary_percentage: percentage,
        description: description || null,
        is_active: bursaryType !== 'none',
      }, { onConflict: 'student_id' });
      if (error) throw error;

      await supabase.from('fee_audit_logs').insert({
        student_id: selectedStudent,
        action: 'bursary_updated',
        details: { bursary_type: bursaryType, percentage },
        performed_by: user?.user?.id
      });

      toast({ title: "Success", description: "Bursary configuration saved" });
      setSelectedStudent(''); setBursaryType('none'); setCustomPercentage(''); setDescription('');
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRemove = async (id: string, studentId: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('student_bursaries').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('fee_audit_logs').insert({
        student_id: studentId,
        action: 'bursary_removed',
        details: {},
        performed_by: user?.user?.id
      });

      toast({ title: "Removed", description: "Bursary removed" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  if (loading) return <div className="text-center p-4">Loading...</div>;

  return (
    <div className="space-y-6">
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
          <Label>Bursary Type</Label>
          <Select value={bursaryType} onValueChange={setBursaryType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BURSARY_TYPES.map(b => <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {bursaryType === 'custom' && (
          <div>
            <Label>Custom Percentage (%)</Label>
            <Input type="number" min="0" max="100" value={customPercentage} onChange={e => setCustomPercentage(e.target.value)} placeholder="e.g. 75" />
          </div>
        )}
        <div className={bursaryType === 'custom' ? 'lg:col-span-4' : ''}>
          <Label>Description</Label>
          <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Government scholarship" />
        </div>
      </div>
      <Button onClick={handleSave}><Save className="w-4 h-4 mr-2" />Save Bursary</Button>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Bursary Type</TableHead>
            <TableHead>Discount %</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bursaries.map(b => (
            <TableRow key={b.id}>
              <TableCell>{b.students?.name}</TableCell>
              <TableCell>{b.students?.classes?.class_name}</TableCell>
              <TableCell className="capitalize">{b.bursary_type.replace('_', ' ')}</TableCell>
              <TableCell className="font-semibold">{b.bursary_percentage}%</TableCell>
              <TableCell>{b.description || '-'}</TableCell>
              <TableCell><Badge variant={b.is_active ? 'default' : 'secondary'}>{b.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
              <TableCell>
                <Button variant="destructive" size="sm" onClick={() => handleRemove(b.id, b.student_id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {bursaries.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No bursaries configured</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default BursaryManager;
