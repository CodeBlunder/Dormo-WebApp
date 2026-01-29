// types.ts
export enum MachineStatus {
  FREE = 'FREE',
  RUNNING = 'RUNNING',
  FINISHED = 'FINISHED'
}

export interface User {
  name: string;
  room: string;
}

export interface Machine {
  id: number;
  status: MachineStatus;
  endTime?: number | null; // timestamp or null
  startTime?: number | null;
  totalDuration?: number | null; // minutes or null
  currentUser?: User | null;
}

export interface LaundryTip {
  title: string;
  content: string;
}