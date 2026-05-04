import { redirect } from 'next/navigation';

interface Props {
  searchParams: { q?: string };
}

export default function SearchPage({ searchParams }: Props) {
  const query = searchParams.q || '';
  
  // Redirect to home page with search query parameter
  // HomeClient will pick this up and open the new SearchOverlay
  if (query) {
    redirect(`/?search=${encodeURIComponent(query)}`);
  } else {
    redirect('/');
  }
}
