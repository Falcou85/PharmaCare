/*
  # Fix infinite recursion in profiles RLS policies

  The earlier admin policies queried the profiles table from inside profiles
  policies, causing "infinite recursion detected in policy for relation
  profiles" (Postgres error 42P17).

  1. Helper
     - Creates `public.is_admin(uid)` as SECURITY DEFINER so it bypasses RLS
       when checking the caller's role. Marked STABLE.
  2. Policies
     - Drops the recursive admin policies and recreates them using
       `public.is_admin(auth.uid())`.
  3. Notes
     - Existing "own profile" policies remain untouched.
*/

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, anon;

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));
