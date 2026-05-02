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
import { useSchool } from '@/contexts/SchoolContext';
import { Plus, Trash2 } from 'lucide-react';

const PAYMENT_METHODS = ['cash', 'bank', 'mobile_money', 'online'];

const PaymentManager = () => {
  const [payments, setPayments] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [filterClass, setFilterClass] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNumber, setReceiptNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { schoolId } = useSchool();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [payRes, studRes, termRes, classRes] = await Promise.all([
        supabase.from('student_payments').select('*, students(name, class_id, classes!students_class_id_fkey(class_name, section)), terms(term_name, year)').order('created_at', { ascending: false }).limit(100),
        supabase.from('students').select('*, classes!students_class_id_fkey(class_name, section)').order('name'),
        supabase.from('terms').select('*').order('year', { ascending: false }),
        supabase.from('classes').select('*').order('class_name')
      ]);
      if (payRes.error) throw payRes.error;
      setPayments(payRes.data || []);
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

  const handleRecord = async () => {
    if (!selectedStudent || !selectedTerm || !amount) {
      toast({ title: "Error", description: "Please fill student, term, and amount", variant: "destructive" });
      return;
    }
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('student_payments').insert({
        student_id: selectedStudent,
        term_id: selectedTerm,
        amount: parseFloat(amount),
        payment_method: paymentMethod,
        payment_date: paymentDate,
        receipt_number: receiptNumber || null,
        notes: notes || null,
        recorded_by: user?.user?.id,
        school_id: schoolId
      });
      if (error) throw error;

      await supabase.from('fee_audit_logs').insert({
        student_id: selectedStudent,
        action: 'payment_recorded',
        details: { amount: parseFloat(amount), payment_method: paymentMethod, receipt_number: receiptNumber },
        performed_by: user?.user?.id,
        school_id: schoolId
      });

      toast({ title: "Success", description: "Payment recorded" });
      setAmount(''); setReceiptNumber(''); setNotes('');
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const payment = payments.find(p => p.id === id);
      const { error } = await supabase.from('student_payments').delete().eq('id', id);
      if (error) throw error;

      await supabase.from('fee_audit_logs').insert({
        student_id: payment?.student_id,
        action: 'payment_deleted',
        details: { amount: payment?.amount, payment_method: payment?.payment_method },
        performed_by: user?.user?.id,
        school_id: schoolId
      });

      toast({ title: "Deleted", description: "Payment removed" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const formatCurrency = (a: number) => `${a.toLocaleString()} UGX`;
  const methodBadge = (m: string) => {
    const colors: Record<string, string> = { cash: 'default', bank: 'secondary', mobile_money: 'outline', online: 'outline' };
    return <Badge variant={colors[m] as any || 'default'}>{m.replace('_', ' ')}</Badge>;
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
          <Label>Term *</Label>
          {(() => {
            const t = terms.find(tt => tt.id === selectedTerm) || terms.find(tt => tt.is_active);
            return (
              <div className="h-10 flex items-center px-3 rounded-md border bg-muted text-sm">
                {t ? `${t.term_name} ${t.year}` : 'No active term'}
              </div>
            );
          })()}
        </div>
        <div>
          <Label>Amount (UGX) *</Label>
          <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 200000" />
        </div>
        <div>
          <Label>Payment Method</Label>
          <Select value={paymentMethod} onValueChange={setPaymentMethod}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace('_', ' ')}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Payment Date</Label>
          <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
        </div>
        <div>
          <Label>Receipt Number</Label>
          <Input value={receiptNumber} onChange={e => setReceiptNumber(e.target.value)} placeholder="Optional" />
        </div>
        <div>
          <Label>Notes</Label>
          <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes" />
        </div>
      </div>
      <Button onClick={handleRecord}><Plus className="w-4 h-4 mr-2" />Record Payment</Button>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Class</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Receipt</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map(p => (
            <TableRow key={p.id}>
              <TableCell>{p.students?.name}</TableCell>
              <TableCell>{p.students?.classes?.class_name}</TableCell>
              <TableCell>{p.terms?.term_name} {p.terms?.year}</TableCell>
              <TableCell className="font-semibold">{formatCurrency(p.amount)}</TableCell>
              <TableCell>{methodBadge(p.payment_method)}</TableCell>
              <TableCell>{new Date(p.payment_date).toLocaleDateString('en-GB')}</TableCell>
              <TableCell>{p.receipt_number || '-'}</TableCell>
              <TableCell>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {payments.length === 0 && (
            <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">No payments recorded yet</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default PaymentManager;
