/**
 * Клиентский хелпер для работы с защищенным API базы данных.
 */
export async function adminDbQuery(payload: {
  action: 'upsert' | 'update' | 'delete' | 'insert' | 'select';
  table: string;
  data?: any;
  id?: any;
  filters?: Record<string, any>;
}) {
  const password = sessionStorage.getItem('toj-admin-password') || '';
  
  const response = await fetch('/api/admin/db', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': password
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to execute admin query');
  }

  return result;
}
