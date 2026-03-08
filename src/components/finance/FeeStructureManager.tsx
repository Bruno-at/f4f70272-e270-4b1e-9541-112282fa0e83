import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Save, Trash2 } from 'lucide-react';

interface FeeStructure {
  id: string;
  class_id: string;
  term_id: string;
  total_fees: number;
  fees_next_term: number;
  other_requirements: string | null;
  classes?: { class_name: string; section: string | null };
  terms?: { term_name: string; year: number };
}

const FeeStructureManager = () => {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [totalFees, setTotalFees] = useState('');
  const [feesNextTerm, setFeesNextTerm] = useState('');
  const [otherRequirements, setOtherRequirements] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [structRes, classRes, termRes] = await Promise.all([
        supabase.from('fee_structures').select('*, classes(class_name, section), terms(term_name, year)').order('created_at', { ascending: false }),
        supabase.from('classes').select('*').order('class_name'),
        supabase.from('terms').select('*').order('year', { ascending: false })
      ]);
      if (structRes.error) throw structRes.error;
      if (classRes.error) throw classRes.error;
      if (termRes.error) throw termRes.error;
      setStructures(structRes.data || []);
      setClasses(classRes.data || []);
      setTerms(termRes.data || []);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load fee structures", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedClass || !selectedTerm || !totalFees) {
      toast({ title: "Error", description: "Please fill in class, term, and total fees", variant: "destructive" });
      return;
    }
    try {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from('fee_structures').upsert({
        class_id: selectedClass,
        term_id: selectedTerm,
        total_fees: parseFloat(totalFees),
        fees_next_term: parseFloat(feesNextTerm) || 0,
        other_requirements: otherRequirements || null,
      }, { onConflict: 'class_id,term_id' });
      if (error) throw error;

      // Audit log
      await supabase.from('fee_audit_logs').insert({
        action: 'fee_structure_updated',
        details: { class_id: selectedClass, term_id: selectedTerm, total_fees: parseFloat(totalFees) },
        performed_by: user?.user?.id
      });

      toast({ title: "Success", description: "Fee structure saved" });
      setSelectedClass(''); setSelectedTerm(''); setTotalFees(''); setFeesNextTerm(''); setOtherRequirements('');
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('fee_structures').delete().eq('id', id);
      if (error) throw error;
      toast({ title: "Deleted", description: "Fee structure removed" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const formatCurrency = (amount: number) => `${amount.toLocaleString()} UGX`;

  if (loading) return <div className="text-center p-4">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label>Class *</Label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.class_name} {c.section ? `- ${c.section}` : ''}</SelectItem>
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
                <SelectItem key={t.id} value={t.id}>{t.term_name} {t.year}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Total Fees (UGX) *</Label>
          <Input type="number" value={totalFees} onChange={e => setTotalFees(e.target.value)} placeholder="e.g. 500000" />
        </div>
        <div>
          <Label>Fees Next Term (UGX)</Label>
          <Input type="number" value={feesNextTerm} onChange={e => setFeesNextTerm(e.target.value)} placeholder="e.g. 600000" />
        </div>
        <div className="md:col-span-2">
          <Label>Other Requirements</Label>
          <Textarea value={otherRequirements} onChange={e => setOtherRequirements(e.target.value)} placeholder="Any additional requirements for next term..." rows={2} />
        </div>
      </div>
      <Button onClick={handleSave}><Plus className="w-4 h-4 mr-2" />Save Fee Structure</Button>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Class</TableHead>
            <TableHead>Term</TableHead>
            <TableHead>Total Fees</TableHead>
            <TableHead>Fees Next Term</TableHead>
            <TableHead>Other Requirements</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {structures.map(s => (
            <TableRow key={s.id}>
              <TableCell>{s.classes?.class_name} {s.classes?.section ? `- ${s.classes.section}` : ''}</TableCell>
              <TableCell>{s.terms?.term_name} {s.terms?.year}</TableCell>
              <TableCell>{formatCurrency(s.total_fees)}</TableCell>
              <TableCell>{formatCurrency(s.fees_next_term || 0)}</TableCell>
              <TableCell className="max-w-[200px] truncate">{s.other_requirements || '-'}</TableCell>
              <TableCell>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {structures.length === 0 && (
            <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No fee structures configured yet</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default FeeStructureManager;
