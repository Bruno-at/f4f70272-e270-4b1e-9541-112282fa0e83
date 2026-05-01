import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSchool } from '@/contexts/SchoolContext';
import { seedSchoolDefaults } from '@/utils/seedDefaults';

export const SeedDefaultsButton = () => {
  const { schoolId } = useSchool();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSeed = async () => {
    if (!schoolId) {
      toast.error('No school context found');
      return;
    }
    setLoading(true);
    try {
      const result = await seedSchoolDefaults(schoolId);
      const total = result.classes + result.terms + result.subjects + result.grades + result.comments;
      if (total === 0) {
        toast.success('All defaults already present — nothing to add.');
      } else {
        toast.success(
          `Seeded: ${result.classes} classes, ${result.terms} terms, ${result.subjects} subjects, ${result.grades} grades, ${result.comments} comments.`
        );
      }
      setOpen(false);
      // Reload to refresh all manager lists
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      console.error('Seed error:', e);
      toast.error(e?.message || 'Failed to seed defaults');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-2">
          <Sparkles className="w-4 h-4" />
          Seed Defaults
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Seed default school data?</AlertDialogTitle>
          <AlertDialogDescription>
            This will add common classes (S1–S6), 3 terms for {new Date().getFullYear()},
            standard subjects per class, a default A–F grading system, and teacher/headteacher
            comment templates. Existing entries are kept — duplicates will not be created.
            You can edit or remove anything afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(e) => { e.preventDefault(); handleSeed(); }} disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Seeding…</> : 'Seed Defaults'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default SeedDefaultsButton;
