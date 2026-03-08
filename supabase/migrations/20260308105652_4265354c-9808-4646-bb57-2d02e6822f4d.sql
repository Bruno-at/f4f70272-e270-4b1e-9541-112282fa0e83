
-- Fee structures table (per class per term)
CREATE TABLE public.fee_structures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  total_fees NUMERIC NOT NULL DEFAULT 0,
  fees_next_term NUMERIC DEFAULT 0,
  other_requirements TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(class_id, term_id)
);

-- Student payments table
CREATE TABLE public.student_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_number TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Student bursaries table
CREATE TABLE public.student_bursaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  bursary_type TEXT NOT NULL DEFAULT 'none',
  bursary_percentage NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id)
);

-- Fee balance overrides table
CREATE TABLE public.fee_balance_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES public.terms(id) ON DELETE CASCADE,
  override_amount NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  overridden_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(student_id, term_id)
);

-- Fee audit logs table
CREATE TABLE public.fee_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_bursaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_balance_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fee_structures
CREATE POLICY "Admins can manage fee_structures" ON public.fee_structures
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

CREATE POLICY "Authenticated users can read fee_structures" ON public.fee_structures
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for student_payments
CREATE POLICY "Admins can manage student_payments" ON public.student_payments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

CREATE POLICY "Authenticated users can read student_payments" ON public.student_payments
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for student_bursaries
CREATE POLICY "Admins can manage student_bursaries" ON public.student_bursaries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

CREATE POLICY "Authenticated users can read student_bursaries" ON public.student_bursaries
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for fee_balance_overrides
CREATE POLICY "Admins can manage fee_balance_overrides" ON public.fee_balance_overrides
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

CREATE POLICY "Authenticated users can read fee_balance_overrides" ON public.fee_balance_overrides
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for fee_audit_logs
CREATE POLICY "Admins can manage fee_audit_logs" ON public.fee_audit_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'headteacher')));

CREATE POLICY "Authenticated users can read fee_audit_logs" ON public.fee_audit_logs
  FOR SELECT TO authenticated USING (true);

-- Update trigger for fee_structures
CREATE TRIGGER update_fee_structures_updated_at
  BEFORE UPDATE ON public.fee_structures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update trigger for student_bursaries
CREATE TRIGGER update_student_bursaries_updated_at
  BEFORE UPDATE ON public.student_bursaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
