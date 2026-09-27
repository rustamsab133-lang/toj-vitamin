import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  {
    auth: { persistSession: false },
    global: { fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }) }
  }
);

function checkAuth(request: Request) {
  const password = request.headers.get('x-admin-password');
  const adminPass = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'toj2024';
  return password === adminPass;
}

export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabaseAdmin
      .from('warehouse_documents')
      .select('*, supplier:suppliers(*), items:warehouse_document_items(*)', { count: 'exact' });

    if (type) query = query.eq('doc_type', type);
    if (status) query = query.eq('status', status);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const fromIdx = (page - 1) * limit;
    const toIdx = fromIdx + limit - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(fromIdx, toIdx);

    if (error) throw error;

    return NextResponse.json({ data, count });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, id, data } = body;

    if (action === 'create') {
      // Create doc_number
      const docType = data.doc_type;
      const prefixes: Record<string, string> = {
        receipt: 'ТН',
        write_off: 'СП',
        invoice: 'СЧ',
        return: 'ВЗ'
      };
      const prefix = prefixes[docType] || 'ДОК';
      
      const now = new Date();
      const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
      
      // Get latest doc for month to determine NNNN
      const { data: latestDoc } = await supabaseAdmin
        .from('warehouse_documents')
        .select('doc_number')
        .like('doc_number', `${prefix}-${yyyymm}-%`)
        .order('doc_number', { ascending: false })
        .limit(1)
        .single();
        
      let seq = 1;
      if (latestDoc && latestDoc.doc_number) {
        const parts = latestDoc.doc_number.split('-');
        if (parts.length === 3) {
          seq = parseInt(parts[2], 10) + 1;
        }
      }
      
      const doc_number = `${prefix}-${yyyymm}-${String(seq).padStart(4, '0')}`;
      
      // Calculate total amount
      const items = data.items || [];
      const total_amount = items.reduce((acc: number, item: any) => acc + (Number(item.total) || 0), 0);
      
      // Insert doc
      const { data: docData, error: docError } = await supabaseAdmin
        .from('warehouse_documents')
        .insert({
          doc_number,
          doc_type: data.doc_type,
          supplier_id: data.supplier_id || null,
          total_amount,
          status: 'draft',
          notes: data.notes || '',
          created_by: data.created_by || null
        })
        .select()
        .single();
        
      if (docError) throw docError;
      
      // Insert items
      if (items.length > 0) {
        const itemsToInsert = items.map((item: any) => ({
          document_id: docData.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
          total: item.total
        }));
        
        const { error: itemsError } = await supabaseAdmin
          .from('warehouse_document_items')
          .insert(itemsToInsert);
          
        if (itemsError) throw itemsError;
      }
      
      return NextResponse.json({ data: docData });
    }
    
    if (action === 'update') {
      const { data: res, error } = await supabaseAdmin
        .from('warehouse_documents')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data: res });
    }
    
    if (action === 'confirm') {
      const { data: res, error } = await supabaseAdmin
        .from('warehouse_documents')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data: res });
    }
    
    if (action === 'cancel') {
      const { data: res, error } = await supabaseAdmin
        .from('warehouse_documents')
        .update({ status: 'cancelled' })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json({ data: res });
    }
    
    if (action === 'delete') {
      // Check status
      const { data: doc } = await supabaseAdmin
        .from('warehouse_documents')
        .select('status')
        .eq('id', id)
        .single();
        
      if (doc?.status !== 'draft') {
        return NextResponse.json({ error: 'Only draft documents can be deleted' }, { status: 400 });
      }
      
      const { error } = await supabaseAdmin
        .from('warehouse_documents')
        .delete()
        .eq('id', id);
      if (error) throw error;
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
