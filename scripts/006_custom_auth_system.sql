-- Drop existing tables and policies that depend on auth.users
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
DROP POLICY IF EXISTS "sections_select_all" ON public.supermarket_sections;
DROP POLICY IF EXISTS "lists_select_all" ON public.shopping_lists;
DROP POLICY IF EXISTS "lists_insert_auth" ON public.shopping_lists;
DROP POLICY IF EXISTS "lists_update_all" ON public.shopping_lists;
DROP POLICY IF EXISTS "lists_delete_all" ON public.shopping_lists;
DROP POLICY IF EXISTS "items_select_all" ON public.shopping_list_items;
DROP POLICY IF EXISTS "items_insert_auth" ON public.shopping_list_items;
DROP POLICY IF EXISTS "items_update_all" ON public.shopping_list_items;
DROP POLICY IF EXISTS "items_delete_all" ON public.shopping_list_items;
DROP POLICY IF EXISTS "frequent_select_all" ON public.frequent_items;
DROP POLICY IF EXISTS "frequent_insert_auth" ON public.frequent_items;
DROP POLICY IF EXISTS "frequent_update_all" ON public.frequent_items;
DROP POLICY IF EXISTS "frequent_delete_all" ON public.frequent_items;

-- Disable RLS temporarily
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_sections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequent_items DISABLE ROW LEVEL SECURITY;

-- Drop existing profiles table
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create new independent users table
CREATE TABLE IF NOT EXISTS public.family_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table for managing user sessions
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.family_users(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update foreign key references in existing tables
ALTER TABLE public.shopping_lists DROP CONSTRAINT IF EXISTS shopping_lists_created_by_fkey;
ALTER TABLE public.shopping_lists ADD CONSTRAINT shopping_lists_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.family_users(id) ON DELETE CASCADE;

ALTER TABLE public.shopping_list_items DROP CONSTRAINT IF EXISTS shopping_list_items_added_by_fkey;
ALTER TABLE public.shopping_list_items ADD CONSTRAINT shopping_list_items_added_by_fkey 
  FOREIGN KEY (added_by) REFERENCES public.family_users(id);

ALTER TABLE public.shopping_list_items DROP CONSTRAINT IF EXISTS shopping_list_items_purchased_by_fkey;
ALTER TABLE public.shopping_list_items ADD CONSTRAINT shopping_list_items_purchased_by_fkey 
  FOREIGN KEY (purchased_by) REFERENCES public.family_users(id);

-- Create function to hash passwords (simple version)
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Simple hash using crypt extension (you might want to use a more secure method)
  RETURN crypt(password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql;

-- Create function to verify passwords
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN crypt(password, hash) = hash;
END;
$$ LANGUAGE plpgsql;

-- Create function to authenticate user
CREATE OR REPLACE FUNCTION authenticate_user(p_username TEXT, p_password TEXT)
RETURNS TABLE(user_id UUID, username TEXT, display_name TEXT, session_token TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_username TEXT;
  v_display_name TEXT;
  v_password_hash TEXT;
  v_session_token TEXT;
BEGIN
  -- Get user data
  SELECT fu.id, fu.username, fu.display_name, fu.password_hash
  INTO v_user_id, v_username, v_display_name, v_password_hash
  FROM public.family_users fu
  WHERE fu.username = p_username AND fu.is_active = TRUE;

  -- Check if user exists and password is correct
  IF v_user_id IS NOT NULL AND verify_password(p_password, v_password_hash) THEN
    -- Generate session token
    v_session_token := gen_random_uuid()::TEXT;
    
    -- Insert session
    INSERT INTO public.user_sessions (user_id, session_token, expires_at)
    VALUES (v_user_id, v_session_token, NOW() + INTERVAL '30 days');
    
    -- Return user data
    RETURN QUERY SELECT v_user_id, v_username, v_display_name, v_session_token;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Create function to register user
CREATE OR REPLACE FUNCTION register_user(p_username TEXT, p_display_name TEXT, p_password TEXT)
RETURNS TABLE(user_id UUID, username TEXT, display_name TEXT, session_token TEXT) AS $$
DECLARE
  v_user_id UUID;
  v_session_token TEXT;
BEGIN
  -- Insert new user
  INSERT INTO public.family_users (username, display_name, password_hash)
  VALUES (p_username, p_display_name, hash_password(p_password))
  RETURNING id INTO v_user_id;
  
  -- Generate session token
  v_session_token := gen_random_uuid()::TEXT;
  
  -- Insert session
  INSERT INTO public.user_sessions (user_id, session_token, expires_at)
  VALUES (v_user_id, v_session_token, NOW() + INTERVAL '30 days');
  
  -- Return user data
  RETURN QUERY SELECT v_user_id, p_username, p_display_name, v_session_token;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user from session
CREATE OR REPLACE FUNCTION get_user_from_session(p_session_token TEXT)
RETURNS TABLE(user_id UUID, username TEXT, display_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT fu.id, fu.username, fu.display_name
  FROM public.family_users fu
  JOIN public.user_sessions us ON fu.id = us.user_id
  WHERE us.session_token = p_session_token 
    AND us.expires_at > NOW()
    AND fu.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to logout (invalidate session)
CREATE OR REPLACE FUNCTION logout_user(p_session_token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.user_sessions WHERE session_token = p_session_token;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
