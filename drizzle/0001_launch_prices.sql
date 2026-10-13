-- EUR launch prices from the design handoff (mirrors src/server/launch-prices.ts).
-- After this, prices are edited in the atelier. ON CONFLICT keeps any edits.
INSERT INTO "prices" ("sku", "currency", "amount", "updated_by") VALUES
  ('product:aperture-tote', 'EUR', 680, 'migration'),
  ('product:meridian-backpack', 'EUR', 740, 'migration'),
  ('product:slip-crossbody', 'EUR', 390, 'migration'),
  ('product:ledger-work-bag', 'EUR', 820, 'migration'),
  ('product:signal-clutch', 'EUR', 340, 'migration'),
  ('product:aperture-mini', 'EUR', 560, 'migration'),
  ('product:meridian-daypack', 'EUR', 620, 'migration'),
  ('product:ledger-folio', 'EUR', 470, 'migration'),
  ('strap:sling', 'EUR', 40, 'migration'),
  ('strap:chain', 'EUR', 60, 'migration'),
  ('initials', 'EUR', 25, 'migration')
ON CONFLICT ("sku", "currency") DO NOTHING;
