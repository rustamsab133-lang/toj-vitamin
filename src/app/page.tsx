import { supabase } from '@/lib/supabase';
import HomeClient from './HomeClient';

// Enable ISR or dynamic rendering depending on needs. 
// For site settings, we can revalidate every hour or keep it dynamic.
export const dynamic = 'force-dynamic';

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
