-- ==============================================================================
-- Migration: 20261107000001_core_identity_rbac.sql
-- Domain: Core Extensions, Profiles, Identity Roles & Authoritative RBAC Engine
-- ==============================================================================

-- 1. Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. Official System Roles Table
CREATE TABLE IF NOT EXISTS public.auth_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  title_fa VARCHAR(100) NOT NULL,
  description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed System Roles
INSERT INTO public.auth_roles (name, title_fa, description, is_system) VALUES
  ('super_admin', 'مدیر ارشد سامانه', 'دسترسی نامحدود به تمامی منابع، مدیریت کاربران و تنظیمات زیرساختی', true),
  ('catalog_manager', 'مدیر کاتالوگ و محصولات', 'مدیریت محصولات، قیمت‌گذاری، دسته‌بندی‌ها و مشخصات فنی', true),
  ('warehouse_manager', 'مدیر انبار و لجستیک', 'مدیریت گردش انبار، اسناد ورود/خروج کالا و پایش موجودی', true),
  ('customer', 'مشتری عادی', 'کاربر احرازهویت‌شده استاندارد با دسترسی خرید و مشاهده تاریخچه خود', true)
ON CONFLICT (name) DO UPDATE SET
  title_fa = EXCLUDED.title_fa,
  description = EXCLUDED.description;

-- 3. Public Profiles Table (Coupled to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  phone VARCHAR(15) UNIQUE,
  full_name VARCHAR(150),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. User Role Mapping Table (Strict Separation of Roles from Profiles)
CREATE TABLE IF NOT EXISTS public.auth_user_roles (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES public.auth_roles(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- 5. Authoritative Security Definer RBAC Helper Functions
CREATE OR REPLACE FUNCTION auth.user_has_role(required_role TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  -- Service role JWT claim always has administrative access
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.auth_user_roles ur
    JOIN public.auth_roles r ON ur.role_id = r.id
    WHERE ur.user_id = auth.uid()
      AND r.name = required_role
  );
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION auth.user_has_role(text) OWNER TO postgres;

CREATE OR REPLACE FUNCTION auth.user_has_permission(required_perm TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
BEGIN
  -- Service role JWT claim possesses all permissions
  IF auth.role() = 'service_role' THEN
    RETURN TRUE;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Super admin has all permissions
  IF auth.user_has_role('super_admin') THEN
    RETURN TRUE;
  END IF;

  -- Catalog Manager permissions
  IF auth.user_has_role('catalog_manager') AND required_perm IN ('catalog:read', 'catalog:manage', 'products:write') THEN
    RETURN TRUE;
  END IF;

  -- Warehouse Manager permissions
  IF auth.user_has_role('warehouse_manager') AND required_perm IN ('catalog:read', 'inventory:read', 'inventory:manage') THEN
    RETURN TRUE;
  END IF;

  -- Standard permissions
  IF required_perm = 'catalog:read' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

ALTER FUNCTION auth.user_has_permission(text) OWNER TO postgres;

-- 6. Function Grants and Revokes
REVOKE ALL ON FUNCTION auth.user_has_role(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION auth.user_has_role(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION auth.user_has_permission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION auth.user_has_permission(text) TO authenticated, service_role;

-- 7. Table Privileges & RLS Configuration
REVOKE ALL ON TABLE public.auth_roles FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.auth_roles TO authenticated, anon;
GRANT ALL ON TABLE public.auth_roles TO service_role;

ALTER TABLE public.auth_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public Read Auth Roles" ON public.auth_roles FOR SELECT TO public USING (true);

REVOKE ALL ON TABLE public.profiles FROM PUBLIC, anon;
GRANT SELECT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users Read Own Profile" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins Read All Profiles" ON public.profiles FOR SELECT TO authenticated USING (auth.user_has_role('super_admin'));

REVOKE ALL ON TABLE public.auth_user_roles FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_user_roles TO authenticated;
GRANT ALL ON TABLE public.auth_user_roles TO service_role;

ALTER TABLE public.auth_user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super Admins Manage User Roles" ON public.auth_user_roles FOR ALL TO authenticated
USING (auth.user_has_role('super_admin')) WITH CHECK (auth.user_has_role('super_admin'));
CREATE POLICY "Users Read Own Roles" ON public.auth_user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
