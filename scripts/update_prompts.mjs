import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function updatePrompts() {
  const { data: prompts, error } = await supabase.from('agent_prompts').select('*');
  if (error) {
    console.error('Error fetching prompts:', error);
    return;
  }

  for (const p of prompts) {
    let text = p.prompt_text;
    if (!text.includes('Инструкция производителя GLS')) {
      const rule = `\n6. ИНСТРУКЦИЯ И КУРС ПРИЕМА: Если клиент спрашивает, как принимать препарат, сколько капсул/таблеток в день пить, какова продолжительность курса или есть ли противопоказания, СТРОГО называй официальную "Инструкцию производителя GLS" из предоставленного каталога (дозировку, время приема и длительность курса). Никогда не выдумывай дозировки от себя!\n`;
      if (text.includes('ПРАВИЛО ЯЗЫКА')) {
        text = text.replace('ПРАВИЛО ЯЗЫКА', rule + '\nПРАВИЛО ЯЗЫКА');
      } else {
        text = text + '\n' + rule;
      }
      const { error: updateErr } = await supabase
        .from('agent_prompts')
        .update({ prompt_text: text })
        .eq('id', p.id);
      console.log(`Updated "${p.name}":`, updateErr || 'OK');
    } else {
      console.log(`"${p.name}" already has GLS instruction rule.`);
    }
  }
}

updatePrompts();
