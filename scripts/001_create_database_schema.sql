-- Create users table for family members (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supermarket sections table
CREATE TABLE IF NOT EXISTS public.supermarket_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopping lists table
CREATE TABLE IF NOT EXISTS public.shopping_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_template BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create shopping list items table
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID REFERENCES public.shopping_lists(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit TEXT DEFAULT 'unidad',
  section_id UUID REFERENCES public.supermarket_sections(id),
  is_purchased BOOLEAN DEFAULT FALSE,
  notes TEXT,
  added_by UUID REFERENCES public.profiles(id),
  purchased_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create frequently used items table for suggestions
CREATE TABLE IF NOT EXISTS public.frequent_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  section_id UUID REFERENCES public.supermarket_sections(id),
  usage_count INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supermarket_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequent_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- RLS Policies for supermarket_sections (read-only for all authenticated users)
CREATE POLICY "sections_select_all" ON public.supermarket_sections FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for shopping_lists (all family members can access)
CREATE POLICY "lists_select_all" ON public.shopping_lists FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "lists_insert_auth" ON public.shopping_lists FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "lists_update_all" ON public.shopping_lists FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "lists_delete_all" ON public.shopping_lists FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for shopping_list_items (all family members can access)
CREATE POLICY "items_select_all" ON public.shopping_list_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "items_insert_auth" ON public.shopping_list_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "items_update_all" ON public.shopping_list_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "items_delete_all" ON public.shopping_list_items FOR DELETE USING (auth.role() = 'authenticated');

-- RLS Policies for frequent_items (shared across family)
CREATE POLICY "frequent_select_all" ON public.frequent_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "frequent_insert_auth" ON public.frequent_items FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "frequent_update_all" ON public.frequent_items FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "frequent_delete_all" ON public.frequent_items FOR DELETE USING (auth.role() = 'authenticated');
