import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  quiz_results?: any;
  created_at?: string;
}

interface ClientState {
  client: ClientProfile | null;
  isAuth: boolean;
  setClient: (client: ClientProfile | null) => void;
  logout: () => void;
}

export const useClient = create<ClientState>()(
  persist(
    (set) => ({
      client: null,
      isAuth: false,
      setClient: (client) => set({ client, isAuth: !!client }),
      logout: () => set({ client: null, isAuth: false }),
    }),
    {
      name: 'client-storage',
      partialize: (state) => ({ client: state.client, isAuth: state.isAuth }),
    }
  )
);
