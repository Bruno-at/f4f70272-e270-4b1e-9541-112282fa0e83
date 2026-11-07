import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import type { ReportCardField } from '@/utils/reportCardFields';

interface Props { field: ReportCardField; value: string; onChange: (v: string) => void; compact?: boolean; id?: string }

/** Renders the right input for a custom report card field type. */
const CustomFieldInput = ({ field, value, onChange, compact, id }: Props) => {
  switch (field.data_type) {
    case 'checkbox':
      return <Checkbox id={id} checked={value === 'true'} onCheckedChange={(c) => onChange(c ? 'true' : 'false')} aria-label={field.label} />;
    case 'comment':
      return compact
        ? <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} maxLength={2000} aria-label={field.label} />
        : <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} maxLength={2000} rows={2} />;
    case 'number':
    case 'percentage':
      return <Input id={id} type="number" min={field.data_type === 'percentage' ? 0 : undefined} max={field.data_type === 'percentage' ? 100 : undefined}
        value={value} onChange={(e) => onChange(e.target.value)} aria-label={field.label} />;
    case 'date':
      return <Input id={id} type="date" value={value} onChange={(e) => onChange(e.target.value)} aria-label={field.label} />;
    default:
      return <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} maxLength={field.data_type === 'grade' ? 10 : 500} aria-label={field.label} />;
  }
};

export default CustomFieldInput;
