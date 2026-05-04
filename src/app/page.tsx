import { supabase } from '@/lib/supabase';
import HomeClient from './HomeClient';

// ISR: Revalidate settings every hour. Avoids full server re-renders on every visit
// which was causing spontaneous page reloads.
export const revalidate = 3600;

export default async function Home() {
  let initialSettings: Record<string, string> = {
    brand_name: "TOJ-VITAMIN",
    whatsapp_phone: "992176660707"
  };

  try {
    const { data } = await supabase.from('site_settings').select('*');
    if (data && data.length > 0) {
      data.forEach((s: any) => {
        initialSettings[s.key] = s.value;
      });
    }
  } catch (err) {
    console.error('Error loading settings on server:', err);
  }

  return <HomeClient initialSettings={initialSettings} />;
}
