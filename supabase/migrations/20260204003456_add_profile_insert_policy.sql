/*
  # Add profile insert policy for new user registration

  ## Changes
  - Add INSERT policy to allow authenticated users to create their own profile
  - This is needed for the signup flow where a new user creates their profile

  ## Security
  - Users can only insert a profile with their own auth.uid() as the id
  - This prevents users from creating profiles for other users
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can create own profile'
  ) THEN
    CREATE POLICY "Users can create own profile"
      ON profiles FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  END IF;
END $$;
