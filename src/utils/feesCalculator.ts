import { supabase } from '@/integrations/supabase/client';

export interface FeesData {
  totalFeesRequired: number;
  totalFeesPaid: number;
  bursaryPercentage: number;
  adjustedFeesRequired: number;
  feesBalance: number;
  feesNextTerm: number;
  otherRequirements: string;
  isOverridden: boolean;
  overrideAmount?: number;
}

/**
 * Calculate fees balance for a student in a given term.
 * Formula: Adjusted Fees = Total Fees * (1 - bursary%) 
 *          Balance = Adjusted Fees - Total Paid
 * If an override exists, use the override amount instead.
 */
export const calculateStudentFees = async (
  studentId: string,
  termId: string,
  classId: string
): Promise<FeesData> => {
  // Fetch all data in parallel
  const [feeStructure, payments, bursary, override] = await Promise.all([
    supabase
      .from('fee_structures')
      .select('total_fees, fees_next_term, other_requirements')
      .eq('class_id', classId)
      .eq('term_id', termId)
      .maybeSingle(),
    supabase
      .from('student_payments')
      .select('amount')
      .eq('student_id', studentId)
      .eq('term_id', termId),
    supabase
      .from('student_bursaries')
      .select('bursary_percentage, is_active')
      .eq('student_id', studentId)
      .eq('is_active', true)
      .maybeSingle(),
    supabase
      .from('fee_balance_overrides')
      .select('override_amount')
      .eq('student_id', studentId)
      .eq('term_id', termId)
      .maybeSingle(),
  ]);

  const totalFeesRequired = feeStructure.data?.total_fees || 0;
  const feesNextTerm = feeStructure.data?.fees_next_term || 0;
  const otherRequirements = feeStructure.data?.other_requirements || '';
  const bursaryPercentage = bursary.data?.bursary_percentage || 0;
  const totalFeesPaid = (payments.data || []).reduce((sum, p) => sum + (p.amount || 0), 0);

  const adjustedFeesRequired = totalFeesRequired * (1 - bursaryPercentage / 100);
  const calculatedBalance = Math.max(0, adjustedFeesRequired - totalFeesPaid);

  const isOverridden = !!override.data;
  const feesBalance = isOverridden ? override.data!.override_amount : calculatedBalance;

  return {
    totalFeesRequired,
    totalFeesPaid,
    bursaryPercentage,
    adjustedFeesRequired,
    feesBalance,
    feesNextTerm,
    otherRequirements,
    isOverridden,
    overrideAmount: override.data?.override_amount,
  };
};
