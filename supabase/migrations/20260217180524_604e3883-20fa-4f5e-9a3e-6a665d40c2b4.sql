
-- Enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'sales');

-- Enum for vehicle status
CREATE TYPE public.vehicle_status AS ENUM ('available', 'sold', 'reserved', 'in_treatment');

-- Enum for deal type
CREATE TYPE public.deal_type AS ENUM ('regular_sale', 'brokerage');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Vehicles table with all fields from spec
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identification
  license_plate TEXT,
  chassis_number TEXT,
  model_code TEXT,
  engine_number TEXT,
  code TEXT,
  -- Vehicle specs
  manufacturer TEXT,
  model TEXT,
  trim_level TEXT,
  year INTEGER,
  engine_type TEXT,
  engine_volume TEXT,
  horsepower TEXT,
  transmission TEXT,
  color TEXT,
  seats INTEGER,
  doors INTEGER,
  -- Condition
  hand INTEGER,
  is_original BOOLEAN DEFAULT true,
  odometer INTEGER,
  test_date DATE,
  registration_fee NUMERIC,
  needs_route BOOLEAN DEFAULT false,
  is_pledged BOOLEAN DEFAULT false,
  -- Deal info
  deal_type deal_type DEFAULT 'regular_sale',
  status vehicle_status DEFAULT 'available',
  list_price NUMERIC,
  weighted_list_price NUMERIC,
  asking_price NUMERIC,
  purchase_price NUMERIC,
  expenses NUMERIC,
  -- Additional
  branch TEXT,
  entry_date DATE DEFAULT CURRENT_DATE,
  salesperson TEXT,
  notes TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert vehicles" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update vehicles" ON public.vehicles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete vehicles" ON public.vehicles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets for vehicle photos and documents
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-photos', 'vehicle-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-documents', 'vehicle-documents', false);

-- Storage policies
CREATE POLICY "Anyone authenticated can view vehicle photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vehicle-photos');
CREATE POLICY "Admins can upload vehicle photos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-photos' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete vehicle photos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vehicle-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can view vehicle documents" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'vehicle-documents');
CREATE POLICY "Admins can upload vehicle documents" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'vehicle-documents' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete vehicle documents" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'vehicle-documents' AND public.has_role(auth.uid(), 'admin'));
