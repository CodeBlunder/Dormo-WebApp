// machineService.ts
import { ref, set, onValue, update, get } from 'firebase/database';
import { database } from './firebase';
import { Machine, MachineStatus } from './types';

// Database references
export const machinesRef = ref(database, 'machines');

// Real-time listeners for machines
export function listenToMachines(callback: (machines: Machine[]) => void): () => void {
  return onValue(machinesRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Convert Firebase object to array
      const machinesArray: Machine[] = Object.values(data) as Machine[];
      callback(machinesArray.sort((a, b) => a.id - b.id));
    } else {
      callback([]);
    }
  });
}

// Initialize machines in Firebase
export async function initializeMachines(initialMachines: Machine[]): Promise<void> {
  try {
    // Check if machines already exist
    const snapshot = await get(machinesRef);
    if (!snapshot.exists()) {
      const machinesObject: any = {};
      initialMachines.forEach(machine => {
        machinesObject[machine.id] = {
          id: machine.id,
          status: MachineStatus.FREE,
          endTime: null,
          totalDuration: null,
          currentUser: null
        };
      });
      await set(machinesRef, machinesObject);
      console.log('Machines initialized in Firebase');
    } else {
      console.log('Machines already exist in Firebase');
    }
  } catch (error) {
    console.error('Error initializing machines:', error);
  }
}

// machineService.ts - Update the startMachine function
export async function startMachine(machineId: number, user: any, duration: number): Promise<void> {
  const machineRef = ref(database, `machines/${machineId}`);
  const startTime = Date.now(); // Capture start time
  const endTime = startTime + duration * 60 * 1000;
  
  await update(machineRef, {
    status: MachineStatus.RUNNING,
    startTime: startTime, // Add this
    endTime: endTime,
    totalDuration: duration,
    currentUser: user
  });
}

// Update the resetMachine function to clear startTime
export async function resetMachine(machineId: number): Promise<void> {
  const machineRef = ref(database, `machines/${machineId}`);
  await update(machineRef, {
    status: MachineStatus.FREE,
    startTime: null, // Add this
    endTime: null,
    totalDuration: null,
    currentUser: null
  });
}