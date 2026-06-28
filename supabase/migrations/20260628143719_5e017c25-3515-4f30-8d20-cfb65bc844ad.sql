
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin', 'consultancy_admin', 'consultancy_recruiter');
CREATE TYPE public.job_status AS ENUM ('open', 'on_hold', 'closed', 'filled');
CREATE TYPE public.candidate_status AS ENUM ('submitted', 'screening', 'interview', 'offer', 'hired', 'rejected');
CREATE TYPE public.employment_type AS ENUM ('full_time', 'part_time', 'contract', 'contract_to_hire', 'internship');
CREATE TYPE public.experience_level AS ENUM ('entry', 'mid', 'senior', 'lead', 'principal');
CREATE TYPE public.subscription_plan AS ENUM ('starter', 'professional', 'enterprise');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- CONSULTANCIES
CREATE TABLE public.consultancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  subscription_plan public.subscription_plan NOT NULL DEFAULT 'starter',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultancies TO authenticated;
GRANT ALL ON public.consultancies TO service_role;
ALTER TABLE public.consultancies ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_consultancies_updated BEFORE UPDATE ON public.consultancies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  consultancy_id UUID REFERENCES public.consultancies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- security definer role check
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.current_consultancy_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT consultancy_id FROM public.profiles WHERE id = auth.uid()
$$;

-- JOBS
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  employment_type public.employment_type NOT NULL DEFAULT 'full_time',
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  experience_level public.experience_level NOT NULL DEFAULT 'mid',
  salary_range TEXT,
  job_description TEXT,
  source TEXT,
  job_url TEXT,
  posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.job_status NOT NULL DEFAULT 'open',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CANDIDATES
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  resume_url TEXT,
  skills TEXT[] NOT NULL DEFAULT '{}',
  experience TEXT,
  linked_job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  consultancy_id UUID REFERENCES public.consultancies(id) ON DELETE SET NULL,
  status public.candidate_status NOT NULL DEFAULT 'submitted',
  notes TEXT,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_candidates_updated BEFORE UPDATE ON public.candidates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT,
  type TEXT NOT NULL DEFAULT 'info',
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES

-- profiles: own row, super admin all
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id OR public.has_role(auth.uid(), 'super_admin'));

-- user_roles: users see their own roles; super admins manage all
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Super admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- consultancies: all authenticated can read; super admins manage
CREATE POLICY "Authenticated read consultancies" ON public.consultancies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage consultancies" ON public.consultancies FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Consultancy admins update own" ON public.consultancies FOR UPDATE TO authenticated USING (id = public.current_consultancy_id() AND public.has_role(auth.uid(), 'consultancy_admin'));

-- jobs: all authenticated read; super admins manage
CREATE POLICY "Authenticated read jobs" ON public.jobs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage jobs" ON public.jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'super_admin')) WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- candidates: consultancy users see + manage own consultancy's candidates; super admins all
CREATE POLICY "Read own consultancy candidates" ON public.candidates FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR consultancy_id = public.current_consultancy_id()
);
CREATE POLICY "Insert candidate for own consultancy" ON public.candidates FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
  OR consultancy_id = public.current_consultancy_id()
);
CREATE POLICY "Update own consultancy candidates" ON public.candidates FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR consultancy_id = public.current_consultancy_id()
);
CREATE POLICY "Delete own consultancy candidates" ON public.candidates FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'super_admin')
  OR consultancy_id = public.current_consultancy_id()
);

-- notifications: user manages own
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'consultancy_recruiter');
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
