-- Suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  inn TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  contact_person TEXT,
  payment_terms TEXT,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Warehouse documents
CREATE TABLE IF NOT EXISTS warehouse_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number TEXT NOT NULL UNIQUE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('receipt', 'write_off', 'invoice', 'return')),
  supplier_id UUID REFERENCES suppliers(id),
  total_amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  notes TEXT,
  created_by TEXT,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Document line items
CREATE TABLE IF NOT EXISTS warehouse_document_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES warehouse_documents(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_docs_type ON warehouse_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_docs_status ON warehouse_documents(status);
CREATE INDEX IF NOT EXISTS idx_docs_created ON warehouse_documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_items_doc ON warehouse_document_items(document_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(is_active);

-- RLS policies (allow service role full access)
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_document_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON warehouse_documents FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON warehouse_document_items FOR ALL USING (true) WITH CHECK (true);
