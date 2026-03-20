import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WorkerData {
  id?: string;
  name: string;
  phone: string;
  city: string;
  zone: string;
  platform: string;
  dailyIncome: number;
  workingHours: number;
}

interface WorkerState {
  worker: WorkerData | null;
  setWorker: (data: WorkerData) => void;
  clearWorker: () => void;
}

export const useWorkerStore = create<WorkerState>()(
  persist(
    (set) => ({
      worker: null,
      setWorker: (data) => set({ worker: data }),
      clearWorker: () => set({ worker: null }),
    }),
    {
      name: 'downtime-worker-storage',
    }
  )
);
