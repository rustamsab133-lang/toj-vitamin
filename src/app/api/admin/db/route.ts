import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Инициализируем серверный клиент с Service Role Key (обходит RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export async function POST(request: Request) {
  const password = request.headers.get('x-admin-password');
  const adminPass = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'toj2024';

  if (password !== adminPass) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, table, data, id, filters } = await request.json();

  try {
    let query = supabaseAdmin.from(table);

    if (action === 'upsert') {
      const { data: res, error } = await query.upsert(data);
      if (error) throw error;
      return NextResponse.json({ data: res });
    }

    if (action === 'update') {
      let updateQuery = query.update(data);
      
      if (id) {
        updateQuery = updateQuery.eq('id', id);
      } else if (filters) {
        Object.entries(filters).forEach(([col, val]) => {
          updateQuery = updateQuery.eq(col, val);
        });
      }

      const { data: res, error } = await updateQuery;
      if (error) throw error;
      return NextResponse.json({ data: res });
    }

    if (action === 'delete') {
      let deleteQuery = query.delete();

      if (id) {
        deleteQuery = deleteQuery.eq('id', id);
      } else if (filters) {
        Object.entries(filters).forEach(([col, val]) => {
          deleteQuery = deleteQuery.eq(col, val);
        });
      }

      const { error } = await deleteQuery;
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === 'insert') {
        const { data: res, error } = await query.insert(data);
        if (error) throw error;
        return NextResponse.json({ data: res });
    }

    if (action === 'select') {
      let selectQuery = query.select(data?.columns || '*');
      
      if (data?.order) {
        selectQuery = selectQuery.order(data.order.column, { ascending: data.order.ascending });
      }

      if (filters) {
        Object.entries(filters).forEach(([col, val]) => {
          selectQuery = selectQuery.eq(col, val);
        });
      }

      const { data: res, error } = await selectQuery;
      if (error) throw error;
      return NextResponse.json({ data: res });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('DB Admin API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
