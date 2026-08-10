import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { clientId, quizResults, name } = body;

    if (!clientId) {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      );
    }

    let updateData: any = {};
    if (quizResults !== undefined) updateData.quiz_results = quizResults;
    if (name !== undefined) updateData.name = name;

    // Update client profile in database
    const { data: updatedClient, error: updateError } = await supabaseAdmin
      .from('clients')
      .update(updateData)
      .eq('id', clientId)
      .select()
      .single();

    if (updateError) {
      throw updateError;
    }

    if (!updatedClient) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      client: {
        id: updatedClient.id,
        name: updatedClient.name,
        phone: updatedClient.phone,
        quiz_results: updatedClient.quiz_results
      }
    });
  } catch (error: any) {
    console.error('Client Profile Update API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Server error occurred' },
      { status: 500 }
    );
  }
}
