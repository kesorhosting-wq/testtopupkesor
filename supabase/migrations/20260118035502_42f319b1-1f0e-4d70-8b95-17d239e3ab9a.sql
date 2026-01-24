-- Rename SEAGM columns in topup_orders to G2Bulk naming
ALTER TABLE public.topup_orders RENAME COLUMN seagm_order_id TO g2bulk_order_id;
ALTER TABLE public.topup_orders RENAME COLUMN seagm_product_id TO g2bulk_product_id;