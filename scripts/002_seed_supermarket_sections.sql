-- Insert default supermarket sections
INSERT INTO public.supermarket_sections (name, icon, sort_order) VALUES
('Frutas y Verduras', '🥕', 1),
('Carnicería', '🥩', 2),
('Pescadería', '🐟', 3),
('Lácteos', '🥛', 4),
('Panadería', '🍞', 5),
('Congelados', '🧊', 6),
('Conservas', '🥫', 7),
('Cereales y Legumbres', '🌾', 8),
('Bebidas', '🥤', 9),
('Limpieza', '🧽', 10),
('Higiene Personal', '🧴', 11),
('Otros', '📦', 12)
ON CONFLICT DO NOTHING;
