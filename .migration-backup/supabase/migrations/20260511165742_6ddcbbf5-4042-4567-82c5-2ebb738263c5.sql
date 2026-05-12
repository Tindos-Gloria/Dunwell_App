
CREATE TYPE public.medical_document_type AS ENUM ('sick_note', 'prescription', 'referral');

CREATE TABLE public.medical_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL,
  patient_name TEXT NOT NULL,
  nurse_id UUID NOT NULL,
  nurse_name TEXT NOT NULL,
  type public.medical_document_type NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.medical_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docs read patient or nurse"
ON public.medical_documents FOR SELECT TO authenticated
USING (patient_id = auth.uid() OR public.has_role(auth.uid(), 'nurse'::app_role));

CREATE POLICY "docs nurse insert"
ON public.medical_documents FOR INSERT TO authenticated
WITH CHECK (nurse_id = auth.uid() AND public.has_role(auth.uid(), 'nurse'::app_role));

CREATE INDEX idx_medical_documents_patient ON public.medical_documents(patient_id, created_at DESC);
