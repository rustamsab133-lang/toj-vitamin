import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, name, phone, password } = body;

    if (!phone || !password) {
      return NextResponse.json(
        { error: 'Phone and password are required' },
        { status: 400 }
      );
    }

    // Format phone: remove spaces, dashes, make sure it starts with +
    let formattedPhone = phone.replace(/[\s\-\(\)]/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }

    if (action === 'register') {
      if (!name || !name.trim()) {
        return NextResponse.json(
          { error: 'Name is required for registration' },
          { status: 400 }
        );
      }

      // Check if client already exists
      const { data: existingClient, error: checkErr } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('phone', formattedPhone)
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (existingClient) {
        return NextResponse.json(
          { error: 'Этот номер телефона уже зарегистрирован' },
          { status: 400 }
        );
      }

      // Insert new client
      const { data: newClient, error: regError } = await supabaseAdmin
        .from('clients')
        .insert({
          name: name.trim(),
          phone: formattedPhone,
          password_hash: password
        })
        .select()
        .single();

      if (regError || !newClient) {
        throw regError || new Error('Registration failed');
      }

      return NextResponse.json({
        success: true,
        client: {
          id: newClient.id,
          name: newClient.name,
          phone: newClient.phone,
          quiz_results: newClient.quiz_results
        }
      });

    } else if (action === 'login') {
      // Find client with matching credentials
      const { data: clientData, error: loginError } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('phone', formattedPhone)
        .eq('password_hash', password)
        .maybeSingle();

      if (loginError) throw loginError;

      if (!clientData) {
        return NextResponse.json(
          { error: 'Неверный номер телефона или пароль' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        client: {
          id: clientData.id,
          name: clientData.name,
          phone: clientData.phone,
          quiz_results: clientData.quiz_results
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Client Auth API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Server error occurred' },
      { status: 500 }
    );
  }
}
