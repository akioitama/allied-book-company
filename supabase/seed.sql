-- Seed territories + featured expedition (run after schema.sql)

insert into categories (id, slug, name, coordinate_label, description) values
  ('11111111-1111-1111-1111-111111111101', 'expedition-narratives', 'Expedition Narratives', '41°N', 'First-hand accounts of journeys where the map was drawn after the boots returned.'),
  ('11111111-1111-1111-1111-111111111102', 'natural-histories', 'Natural Histories', '22°S', 'Field notes on flora, fauna, weather, and quiet systems.'),
  ('11111111-1111-1111-1111-111111111103', 'cartographic-arts', 'Cartographic Arts', '51°N', 'Atlas craft, projection, and visual language of place.'),
  ('11111111-1111-1111-1111-111111111104', 'harbor-fiction', 'Harbor Fiction', '18°W', 'Novels that leave from docks and return changed.'),
  ('11111111-1111-1111-1111-111111111105', 'surveyors-memoir', 'Surveyor''s Memoir', '33°E', 'Lives measured in bearings and clear weather.'),
  ('11111111-1111-1111-1111-111111111106', 'island-studies', 'Island Studies', '9°S', 'Archipelagos as laboratories of language and ecology.')
on conflict (slug) do nothing;

insert into books (slug, title, author, description, price_cents, cover_image_url, category_id, stock, is_featured, waypoint_order) values
  ('the-coast-that-moved', 'The Coast That Moved', 'Mira Ellsworth', 'A surveyor''s diary of a shoreline that refuses to stay put.', 2899, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600&q=80', '11111111-1111-1111-1111-111111111101', 24, true, 1),
  ('bearing-true-north', 'Bearing True North', 'Jonas Reed', 'How compasses fail and sailors correct for weather.', 2499, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=600&q=80', '11111111-1111-1111-1111-111111111103', 18, true, 2),
  ('salt-ledger', 'Salt Ledger', 'Amara Okonkwo', 'Twin ports linked by a cargo book that records more than goods.', 2699, 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?w=600&q=80', '11111111-1111-1111-1111-111111111104', 31, true, 3),
  ('atlas-of-lost-harbors', 'Atlas of Lost Harbors', 'Helen Voss', 'Ports that silted, burned, or were renamed out of existence.', 4200, 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=600&q=80', '11111111-1111-1111-1111-111111111103', 12, true, 4),
  ('moss-and-meridian', 'Moss & Meridian', 'Theo Park', 'Essays on lichen, latitude, and noticing what maps leave out.', 2299, 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=600&q=80', '11111111-1111-1111-1111-111111111102', 40, false, null),
  ('chain-and-theodolite', 'Chain & Theodolite', 'Ruth Lang', 'A memoir of mid-century land surveys.', 2799, 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?w=600&q=80', '11111111-1111-1111-1111-111111111105', 15, false, null),
  ('island-grammar', 'Island Grammar', 'Sera Nalani', 'A linguistic atlas of six Pacific islands.', 3100, 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=600&q=80', '11111111-1111-1111-1111-111111111106', 22, false, null),
  ('harbor-letters', 'Harbor Letters', 'Ivo March', 'Epistolary fiction across one North Sea winter.', 2199, 'https://images.unsplash.com/photo-1456513080080-7e3f82b6b5c9?w=600&q=80', '11111111-1111-1111-1111-111111111104', 28, false, null)
on conflict (slug) do nothing;
