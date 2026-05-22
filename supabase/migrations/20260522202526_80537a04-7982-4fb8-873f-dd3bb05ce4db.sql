
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin_geral', 'gestor_distrital', 'tecnico', 'visualizador');
CREATE TYPE public.entity_status AS ENUM ('ativo', 'inativo');
CREATE TYPE public.unidade_tipo AS ENUM ('UBS', 'USF', 'UPA', 'CAPS', 'Outros');
CREATE TYPE public.log_acao AS ENUM ('criar', 'editar', 'excluir');

-- ============ DISTRITOS ============
CREATE TABLE public.distritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT '#0F766E',
  descricao TEXT,
  responsavel TEXT,
  telefone TEXT,
  email TEXT,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  distrito_id UUID REFERENCES public.distritos(id) ON DELETE SET NULL,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  ultimo_acesso TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- ============ UNIDADES ============
CREATE TABLE public.unidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  tipo public.unidade_tipo NOT NULL DEFAULT 'UBS',
  cnes TEXT UNIQUE,
  distrito_id UUID NOT NULL REFERENCES public.distritos(id) ON DELETE RESTRICT,
  endereco TEXT,
  bairro TEXT,
  telefone TEXT,
  email TEXT,
  coordenador TEXT,
  cor TEXT NOT NULL DEFAULT '#16A34A',
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  foto_url TEXT,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ EQUIPES ============
CREATE TABLE public.equipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  unidade_id UUID NOT NULL REFERENCES public.unidades(id) ON DELETE RESTRICT,
  tipo TEXT,
  codigo_esus TEXT,
  qtd_acs INTEGER NOT NULL DEFAULT 0,
  responsavel TEXT,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ ÁREAS TERRITORIAIS ============
CREATE TABLE public.areas_territoriais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  codigo TEXT,
  distrito_id UUID NOT NULL REFERENCES public.distritos(id) ON DELETE RESTRICT,
  unidade_id UUID REFERENCES public.unidades(id) ON DELETE SET NULL,
  equipe_id UUID REFERENCES public.equipes(id) ON DELETE SET NULL,
  cor TEXT NOT NULL DEFAULT '#2563EB',
  populacao_estimada INTEGER NOT NULL DEFAULT 0,
  qtd_familias INTEGER NOT NULL DEFAULT 0,
  observacoes TEXT,
  geojson JSONB,
  status public.entity_status NOT NULL DEFAULT 'ativo',
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ LOGS ============
CREATE TABLE public.logs_alteracoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_nome TEXT,
  acao public.log_acao NOT NULL,
  entidade TEXT NOT NULL,
  entidade_id UUID,
  detalhes JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ FUNCTIONS ============

-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_distritos_updated BEFORE UPDATE ON public.distritos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_unidades_updated BEFORE UPDATE ON public.unidades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_equipes_updated BEFORE UPDATE ON public.equipes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_areas_updated BEFORE UPDATE ON public.areas_territoriais
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Role checker (SECURITY DEFINER, avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user's distrito_id
CREATE OR REPLACE FUNCTION public.user_distrito_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT distrito_id FROM public.profiles WHERE id = _user_id
$$;

-- Helper: any of these roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles public.app_role[])
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  -- Default role: visualizador
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'visualizador');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ RLS ============
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas_territoriais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_alteracoes ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin_geral'));
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin_geral'));
CREATE POLICY "profiles admin insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin_geral'));

-- user_roles: only admins manage; users can read own roles
CREATE POLICY "roles own read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin_geral'));
CREATE POLICY "roles admin all" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_geral'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_geral'));

-- distritos: everyone authenticated reads; only admin writes
CREATE POLICY "distritos read all" ON public.distritos FOR SELECT TO authenticated USING (true);
CREATE POLICY "distritos admin write" ON public.distritos FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin_geral'))
  WITH CHECK (public.has_role(auth.uid(), 'admin_geral'));

-- unidades: admin tudo; gestor/tecnico do próprio distrito; visualizador lê do próprio distrito
CREATE POLICY "unidades read scoped" ON public.unidades FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin_geral')
  OR distrito_id = public.user_distrito_id(auth.uid())
);
CREATE POLICY "unidades write scoped" ON public.unidades FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_geral')
  OR (public.has_any_role(auth.uid(), ARRAY['gestor_distrital','tecnico']::public.app_role[])
      AND distrito_id = public.user_distrito_id(auth.uid()))
);
CREATE POLICY "unidades update scoped" ON public.unidades FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_geral')
  OR (public.has_any_role(auth.uid(), ARRAY['gestor_distrital','tecnico']::public.app_role[])
      AND distrito_id = public.user_distrito_id(auth.uid()))
);
CREATE POLICY "unidades delete admin" ON public.unidades FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_geral')
  OR (public.has_role(auth.uid(), 'gestor_distrital') AND distrito_id = public.user_distrito_id(auth.uid()))
);

-- equipes: mesma regra via unidade->distrito
CREATE POLICY "equipes read scoped" ON public.equipes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin_geral')
  OR EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = unidade_id AND u.distrito_id = public.user_distrito_id(auth.uid()))
);
CREATE POLICY "equipes write scoped" ON public.equipes FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_geral')
  OR (public.has_any_role(auth.uid(), ARRAY['gestor_distrital','tecnico']::public.app_role[])
      AND EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = unidade_id AND u.distrito_id = public.user_distrito_id(auth.uid())))
);
CREATE POLICY "equipes update scoped" ON public.equipes FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_geral')
  OR (public.has_any_role(auth.uid(), ARRAY['gestor_distrital','tecnico']::public.app_role[])
      AND EXISTS (SELECT 1 FROM public.unidades u WHERE u.id = unidade_id AND u.distrito_id = public.user_distrito_id(auth.uid())))
);
CREATE POLICY "equipes delete admin" ON public.equipes FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_geral')
);

-- areas
CREATE POLICY "areas read scoped" ON public.areas_territoriais FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin_geral')
  OR distrito_id = public.user_distrito_id(auth.uid())
);
CREATE POLICY "areas write scoped" ON public.areas_territoriais FOR INSERT TO authenticated WITH CHECK (
  public.has_role(auth.uid(), 'admin_geral')
  OR (public.has_any_role(auth.uid(), ARRAY['gestor_distrital','tecnico']::public.app_role[])
      AND distrito_id = public.user_distrito_id(auth.uid()))
);
CREATE POLICY "areas update scoped" ON public.areas_territoriais FOR UPDATE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_geral')
  OR (public.has_any_role(auth.uid(), ARRAY['gestor_distrital','tecnico']::public.app_role[])
      AND distrito_id = public.user_distrito_id(auth.uid()))
);
CREATE POLICY "areas delete admin" ON public.areas_territoriais FOR DELETE TO authenticated USING (
  public.has_role(auth.uid(), 'admin_geral')
);

-- logs: admin lê tudo; usuários veem seus próprios; insert por authenticated
CREATE POLICY "logs read" ON public.logs_alteracoes FOR SELECT TO authenticated USING (
  public.has_role(auth.uid(), 'admin_geral') OR user_id = auth.uid()
);
CREATE POLICY "logs insert" ON public.logs_alteracoes FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid()
);

-- indexes
CREATE INDEX idx_unidades_distrito ON public.unidades(distrito_id);
CREATE INDEX idx_equipes_unidade ON public.equipes(unidade_id);
CREATE INDEX idx_areas_distrito ON public.areas_territoriais(distrito_id);
CREATE INDEX idx_areas_unidade ON public.areas_territoriais(unidade_id);
CREATE INDEX idx_logs_created ON public.logs_alteracoes(created_at DESC);
