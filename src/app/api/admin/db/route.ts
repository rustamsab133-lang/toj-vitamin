import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Инициализируем серверный клиент с Service Role Key (обходит RLS)
// Отключаем кэширование Next.js для всех запросов Supabase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
  {
    auth: {
      persistSession: false
    },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' })
    }
  }
);

// In-memory rate limiting map for brute-force protection
const failedAttemptsMap = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: Request) {
  const { action, table, data, id, filters, name } = await request.json();

  try {
    let query = supabaseAdmin.from(table || '_dummy'); // table is optional for rpc

    if (action === 'verify') {
      return NextResponse.json({ success: true });
    }

    if (action === 'rpc') {
      const { data: res, error } = await supabaseAdmin.rpc(name, data);
      if (error) throw error;
      return NextResponse.json({ data: res });
    }

    if (action === 'upsert') {
      const { data: res, error } = await query.upsert(data).select();
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

      const { data: res, error } = await updateQuery.select();
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
        const { data: res, error } = await query.insert(data).select();
        if (error) throw error;
        return NextResponse.json({ data: res });
    }

    if (action === 'select') {
      let selectQuery = query.select(data?.columns || '*', { count: 'exact' });
      
      if (data?.order) {
        selectQuery = selectQuery.order(data.order.column, { ascending: data.order.ascending });
      }

      if (data?.search) {
        if (data.search.or) {
          selectQuery = selectQuery.or(data.search.or);
        } else if (data.search.column && data.search.query) {
          selectQuery = selectQuery.ilike(data.search.column, `%${data.search.query}%`);
        }
      }

      if (data?.range) {
        selectQuery = selectQuery.range(data.range.from, data.range.to);
      }

      if (filters) {
        Object.entries(filters).forEach(([col, val]) => {
          selectQuery = selectQuery.eq(col, val);
        });
      }

      const { data: res, error, count } = await selectQuery;
      if (error) throw error;
      return NextResponse.json({ data: res, count });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('DB Admin API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
