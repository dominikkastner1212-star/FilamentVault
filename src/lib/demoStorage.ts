import { ActivityLog, FilamentRoll, FilamentUsage, Printer, PrinterStatus, Profile } from '../types';

const STORAGE_KEY = 'filamentvault_demo_state_v1';

export type DemoSnapshot = {
  profiles: Profile[];
  rolls: FilamentRoll[];
  usage: FilamentUsage[];
  printers: Printer[];
  printerStatus: PrinterStatus[];
  activity: ActivityLog[];
};

export function loadDemoSnapshot(): DemoSnapshot | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoSnapshot) : null;
  } catch {
    return null;
  }
}

export function saveDemoSnapshot(snapshot: DemoSnapshot) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // storage unavailable (private mode, quota) - changes just stay in memory
  }
}
