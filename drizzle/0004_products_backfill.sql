-- Products now live in the database and a shop starts with an empty catalogue.
-- 1. Order lines placed before this keep a readable name: the reference styles by name,
--    anything else by its id.
UPDATE "order_lines" SET "product_name" = CASE "product_id"
  WHEN 'aperture-tote' THEN 'Aperture Tote'
  WHEN 'meridian-backpack' THEN 'Meridian Backpack'
  WHEN 'slip-crossbody' THEN 'Slip Crossbody'
  WHEN 'ledger-work-bag' THEN 'Ledger Work Bag'
  WHEN 'signal-clutch' THEN 'Signal Clutch'
  WHEN 'aperture-mini' THEN 'Aperture Mini'
  WHEN 'meridian-daypack' THEN 'Meridian Daypack'
  WHEN 'ledger-folio' THEN 'Ledger Folio'
  ELSE "product_id"
END
WHERE "product_name" = '';
--> statement-breakpoint
-- 2. Migration 0001 priced the eight reference styles. Drop product prices with no product
--    behind them; strap and initials prices stay. `npm run db:seed` loads the samples again.
DELETE FROM "prices" p
WHERE p."sku" LIKE 'product:%'
  AND NOT EXISTS (SELECT 1 FROM "products" pr WHERE 'product:' || pr."id" = p."sku");
