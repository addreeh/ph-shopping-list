-- Function to upsert frequent items
CREATE OR REPLACE FUNCTION upsert_frequent_item(item_name TEXT, section_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.frequent_items (name, section_id, usage_count, last_used)
  VALUES (item_name, section_id, 1, NOW())
  ON CONFLICT (name, section_id) 
  DO UPDATE SET 
    usage_count = frequent_items.usage_count + 1,
    last_used = NOW();
END;
$$;

-- Add unique constraint for frequent items
ALTER TABLE public.frequent_items 
ADD CONSTRAINT frequent_items_name_section_unique 
UNIQUE (name, section_id);
