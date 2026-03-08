
-- Drop the overly broad SELECT policy on student_payments
DROP POLICY IF EXISTS "Authenticated users can read student_payments" ON public.student_payments;

-- Create a restrictive SELECT policy limited to admin and headteacher roles
CREATE POLICY "Admins and headteachers can read student_payments"
ON public.student_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'headteacher')
  )
);
