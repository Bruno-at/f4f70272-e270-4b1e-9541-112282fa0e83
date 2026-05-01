import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useSchool } from '@/contexts/SchoolContext';
import { SECTION_RUNNERS, SeedSection } from '@/utils/seedDefaults';

interface Props {
  section: SeedSection;
  onSeeded?: () => void;
}

export const SeedDefaultsButton = ({ section, onSeeded }: Props) => {
  const { schoolId } = useSchool();
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [checking, setChecking] = useState(true);

  const runner = SECTION_RUNNERS[section];

  const recheck = async () => {
    if (!schoolId) { setChecking(false); return; }
    setChecking(true);
    try {
      const done = await runner.check(schoolId);
      setComplete(done);
    } catch (e) {
      console.error('Seed check error:', e);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { recheck(); }, [schoolId, section]);

  const handleSeed = async () => {
    if (!schoolId) { toast.error('No school context found'); return; }
    setLoading(true);
    try {
      const res = await runner.seed(schoolId);
      if (res.alreadyComplete) {
        toast.info(`All default ${runner.label} already present.`);
      } else {
        toast.success(`Added ${res.inserted} default ${runner.label}.`);
      }
      await recheck();
      onSeeded?.();
    } catch (e: any) {
      console.error('Seed error:', e);
      toast.error(e?.message || `Failed to seed ${runner.label}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      className="gap-2"
      onClick={handleSeed}
      disabled={loading || checking || complete}
      title={complete ? 'Defaults already added' : `Add default ${runner.label}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" />
        : complete ? <Check className="w-4 h-4" />
        : <Sparkles className="w-4 h-4" />}
      {complete ? 'Defaults Added' : 'Seed Defaults'}
    </Button>
  );
};

export default SeedDefaultsButton;
