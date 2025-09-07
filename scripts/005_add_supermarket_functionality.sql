-- Add supermarket column to shopping_list_items
ALTER TABLE shopping_list_items ADD COLUMN supermarket TEXT;

-- Create index for better performance
CREATE INDEX idx_shopping_list_items_supermarket ON shopping_list_items(supermarket);

-- Update RLS policies to include supermarket
DROP POLICY IF EXISTS "Users can view all shopping list items" ON shopping_list_items;
CREATE POLICY "Users can view all shopping list items" ON shopping_list_items
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert shopping list items" ON shopping_list_items;
CREATE POLICY "Users can insert shopping list items" ON shopping_list_items
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update shopping list items" ON shopping_list_items;
CREATE POLICY "Users can update shopping list items" ON shopping_list_items
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete shopping list items" ON shopping_list_items;
CREATE POLICY "Users can delete shopping list items" ON shopping_list_items
  FOR DELETE USING (true);

-- Update frequent items function to include supermarket
CREATE OR REPLACE FUNCTION upsert_frequent_item(
  item_name TEXT,
  section_id UUID,
  supermarket_name TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO frequent_items (name, section_id, supermarket, frequency)
  VALUES (item_name, section_id, supermarket_name, 1)
  ON CONFLICT (name, section_id, COALESCE(supermarket, ''))
  DO UPDATE SET 
    frequency = frequent_items.frequency + 1,
    last_used = NOW();
END;
$$ LANGUAGE plpgsql;
