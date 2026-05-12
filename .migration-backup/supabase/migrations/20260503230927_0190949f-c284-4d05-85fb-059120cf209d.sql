
-- Enums
CREATE TYPE public.app_role AS ENUM ('patient','nurse','admin');
CREATE TYPE public.appointment_status AS ENUM ('pending','confirmed','completed','cancelled');
CREATE TYPE public.appointment_type AS ENUM ('virtual','inclinic');
CREATE TYPE public.payment_method AS ENUM ('online','eft','cash','card','medical-aid');
CREATE TYPE public.delivery_choice AS ENUM ('collect','courier');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  surname TEXT,
  phone TEXT,
  dob DATE,
  gender TEXT,
  address TEXT,
  is_student BOOLEAN NOT NULL DEFAULT false,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles (separate)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Nurse availability slots
CREATE TABLE public.nurse_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nurse_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nurse_name TEXT NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  patient_name TEXT NOT NULL,
  service_id TEXT NOT NULL,
  service_name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  time TIME NOT NULL,
  type public.appointment_type NOT NULL,
  nurse_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nurse_name TEXT,
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  is_student BOOLEAN DEFAULT false,
  medical_aid JSONB,
  status public.appointment_status NOT NULL DEFAULT 'pending',
  paid BOOLEAN NOT NULL DEFAULT false,
  zoom_link TEXT,
  notes TEXT,
  diagnosis TEXT,
  health_education TEXT,
  follow_up_date DATE,
  delivery public.delivery_choice,
  medication_received BOOLEAN DEFAULT false,
  rating INT,
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_appointments_updated BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto profile + default patient role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_role public.app_role;
  v_invite TEXT;
BEGIN
  v_invite := COALESCE(NEW.raw_user_meta_data->>'invite_code','');
  IF v_invite = 'DUNWELL-NURSE-2026' THEN
    v_role := 'nurse';
  ELSE
    v_role := 'patient';
  END IF;

  INSERT INTO public.profiles (id, email, name, surname, phone, dob, gender, address, is_student)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)),
    NEW.raw_user_meta_data->>'surname',
    NEW.raw_user_meta_data->>'phone',
    NULLIF(NEW.raw_user_meta_data->>'dob','')::DATE,
    NEW.raw_user_meta_data->>'gender',
    NEW.raw_user_meta_data->>'address',
    COALESCE((NEW.raw_user_meta_data->>'is_student')::BOOLEAN, false)
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nurse_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- profiles: user can view/update own; nurses can view all (to see patient names)
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'nurse'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- user_roles: user can read own; nurses can read all (to list nurses); no client writes
CREATE POLICY "roles read own or nurse" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'nurse') OR role = 'nurse');

-- nurse_slots: anyone authenticated can read; nurses manage their own
CREATE POLICY "slots read all auth" ON public.nurse_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "nurse insert own slots" ON public.nurse_slots FOR INSERT TO authenticated
  WITH CHECK (nurse_id = auth.uid() AND public.has_role(auth.uid(),'nurse'));
CREATE POLICY "nurse delete own slots" ON public.nurse_slots FOR DELETE TO authenticated
  USING (nurse_id = auth.uid() AND public.has_role(auth.uid(),'nurse'));

-- appointments
CREATE POLICY "appt patient or nurse read" ON public.appointments FOR SELECT TO authenticated
  USING (patient_id = auth.uid() OR public.has_role(auth.uid(),'nurse'));
CREATE POLICY "appt patient insert" ON public.appointments FOR INSERT TO authenticated
  WITH CHECK (patient_id = auth.uid());
CREATE POLICY "appt patient update own" ON public.appointments FOR UPDATE TO authenticated
  USING (patient_id = auth.uid() OR public.has_role(auth.uid(),'nurse'));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.nurse_slots;
