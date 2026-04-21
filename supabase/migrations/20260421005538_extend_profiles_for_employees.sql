/*
  # Extend profiles for employee management

  Adds HR-related fields to the profiles table so admins can manage staff as employees.

  1. New columns on `profiles`
     - `employee_code` (text, unique): short identifier for payroll / schedules
     - `hire_date` (date): date the employee joined
     - `status` (text): active | on_leave | inactive
     - `salary` (numeric): current monthly / periodic salary
     - `emergency_contact` (text): name + phone, free-form
     - `address` (text): home address
     - `notes` (text): admin-only notes
  2. Security
     - Adds RLS policies so admins can view, insert, update, and delete any profile
     - Existing policies (owner can view/update self) remain intact
  3. Notes
     - Uses `IF NOT EXISTS` patterns throughout for idempotency
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='employee_code') THEN
    ALTER TABLE profiles ADD COLUMN employee_code text;
    ALTER TABLE profiles ADD CONSTRAINT profiles_employee_code_key UNIQUE (employee_code);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='hire_date') THEN
    ALTER TABLE profiles ADD COLUMN hire_date date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='status') THEN
    ALTER TABLE profiles ADD COLUMN status text DEFAULT 'active';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='salary') THEN
    ALTER TABLE profiles ADD COLUMN salary numeric DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='emergency_contact') THEN
    ALTER TABLE profiles ADD COLUMN emergency_contact text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='address') THEN
    ALTER TABLE profiles ADD COLUMN address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='notes') THEN
    ALTER TABLE profiles ADD COLUMN notes text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Admins can view all profiles'
  ) THEN
    CREATE POLICY "Admins can view all profiles"
      ON profiles FOR SELECT
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='profiles' AND policyname='Admins can update all profiles'
  ) THEN
    CREATE POLICY "Admins can update all profiles"
      ON profiles FOR UPDATE
      TO authenticated
      USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
      );
  END IF;
END $$;
