import { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AuditLogViewer = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('fee_audit_logs')
        .select('*, students(name)')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to load audit logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const actionBadge = (action: string) => {
    const colors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      payment_recorded: 'default',
      payment_deleted: 'destructive',
      balance_override: 'secondary',
      bursary_updated: 'outline',
      bursary_removed: 'destructive',
      fee_structure_updated: 'outline',
    };
    return <Badge variant={colors[action] || 'default'}>{action.replace(/_/g, ' ')}</Badge>;
  };

  if (loading) return <div className="text-center p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">All financial actions are logged here for audit purposes.</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date & Time</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map(log => (
            <TableRow key={log.id}>
              <TableCell className="text-xs">{new Date(log.created_at).toLocaleString('en-GB')}</TableCell>
              <TableCell>{actionBadge(log.action)}</TableCell>
              <TableCell>{log.students?.name || '-'}</TableCell>
              <TableCell className="text-xs max-w-[300px] truncate">
                {log.details ? JSON.stringify(log.details) : '-'}
              </TableCell>
            </TableRow>
          ))}
          {logs.length === 0 && (
            <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No audit logs yet</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default AuditLogViewer;
