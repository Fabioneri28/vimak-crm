-- VIMAK CRM V6.6 - campos complementares para Insumos PRO
ALTER TABLE public.inputs ADD COLUMN IF NOT EXISTS stock_qty numeric NOT NULL DEFAULT 0;
ALTER TABLE public.inputs ADD COLUMN IF NOT EXISTS min_stock numeric NOT NULL DEFAULT 0;
ALTER TABLE public.inputs ADD COLUMN IF NOT EXISTS supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;
ALTER TABLE public.inputs ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE public.inputs ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE public.inputs ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE public.inputs ADD COLUMN IF NOT EXISTS notes text;
CREATE INDEX IF NOT EXISTS idx_inputs_company_supplier ON public.inputs(company_id, supplier_id);
