/**
 * Клиентский хелпер для работы с защищенным API базы данных.
 */
let serverTimeOffset = 0;

export function getCorrectNow(): Date {
  return new Date(Date.now() + serverTimeOffset);
}

export async function adminDbQuery(payload: {
  action: 'upsert' | 'update' | 'delete' | 'insert' | 'select' | 'rpc';
  table?: string;
  name?: string;
  data?: any;
  id?: any;
  filters?: Record<string, any>;
}) {
  const password = sessionStorage.getItem('toj-admin-password') || '';
  
  const localNow = Date.now();
  const response = await fetch('/api/admin/db', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-admin-password': password
    },
    body: JSON.stringify(payload)
  });

  // Получаем точное серверное время из заголовка Date и вычисляем разницу часов
  const serverTimeHeader = response.headers.get('Date');
  if (serverTimeHeader) {
    const serverTimeEpoch = new Date(serverTimeHeader).getTime();
    if (!isNaN(serverTimeEpoch)) {
      serverTimeOffset = serverTimeEpoch - localNow;
    }
  }

  const result = await response.json();
  
  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('toj-admin-auth');
        sessionStorage.removeItem('toj-admin-password');
        window.location.reload();
      }
    }
    throw new Error(result.error || 'Failed to execute admin query');
  }

  return result;
}
