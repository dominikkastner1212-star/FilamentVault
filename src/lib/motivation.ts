import { FilamentUsage } from '../types';

// Runde Zahlen fuehlen sich wie ein Erfolg an - deshalb feiern wir genau
// diese Schwellen, statt beliebige Werte.
const PRINT_MILESTONES = [5, 10, 25, 50, 100, 250, 500, 1000];
const WEIGHT_MILESTONES_KG = [1, 5, 10, 25, 50, 100, 250, 500];

export type Momentum = {
  headline: string;
  detail: string;
  /** true = besonderer Moment (Meilenstein/Streak), verdient mehr visuelles Gewicht */
  celebrate: boolean;
};

function toDateKey(iso: string) {
  return iso.slice(0, 10);
}

/** Hoechste Schwelle, die zwischen "vorher" und "nachher" ueberschritten wurde. */
function crossedMilestone(before: number, after: number, steps: number[]): number | null {
  const hit = steps.filter((step) => before < step && after >= step);
  return hit.length ? hit[hit.length - 1] : null;
}

/**
 * Berechnet, ob der gerade eingetragene Verbrauch etwas Besonderes ist:
 * ein Gewichts- oder Druck-Meilenstein, oder eine Serie aufeinander-
 * folgender Tage. Rechnet bewusst mit dem VOR dem Speichern bekannten
 * Verlauf plus dem neuen Eintrag, statt auf einen State-Refresh zu
 * warten - so stimmt das Ergebnis unabhaengig vom Timing des Reloads.
 */
export function computeMomentum(
  existingUsage: FilamentUsage[],
  userId: string,
  newEntry: { used_at: string; used_weight_g: number }
): Momentum {
  const mine = existingUsage.filter((entry) => entry.user_id === userId);

  const priorPrints = mine.length;
  const nextPrints = priorPrints + 1;
  const priorWeightG = mine.reduce((sum, entry) => sum + entry.used_weight_g, 0);
  const nextWeightG = priorWeightG + newEntry.used_weight_g;

  const weightMilestone = crossedMilestone(priorWeightG / 1000, nextWeightG / 1000, WEIGHT_MILESTONES_KG);
  const printMilestone = crossedMilestone(priorPrints, nextPrints, PRINT_MILESTONES);

  // Streak: aufeinanderfolgende Kalendertage mit mind. einem Eintrag,
  // rueckwaerts gezaehlt ab dem Datum des neuen Eintrags.
  const dateKeys = new Set(mine.map((entry) => toDateKey(entry.used_at)));
  dateKeys.add(toDateKey(newEntry.used_at));
  let streak = 0;
  const cursor = new Date(`${toDateKey(newEntry.used_at)}T00:00:00Z`);
  while (dateKeys.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  if (weightMilestone) {
    return {
      headline: `🎉 ${weightMilestone} kg geknackt!`,
      detail: `Insgesamt hast du jetzt ${(nextWeightG / 1000).toFixed(1)} kg Filament verdruckt.`,
      celebrate: true
    };
  }

  if (printMilestone) {
    return {
      headline: `🎉 Druck Nr. ${printMilestone}!`,
      detail: `Du hast jetzt ${nextPrints} Drucke eingetragen. Weiter so!`,
      celebrate: true
    };
  }

  if (streak >= 3) {
    return {
      headline: `🔥 ${streak} Tage in Folge`,
      detail: 'Du bleibst dran - starke Serie!',
      celebrate: true
    };
  }

  return {
    headline: 'Verbrauch gebucht',
    detail: `Das ist dein ${nextPrints}. Druck insgesamt.`,
    celebrate: false
  };
}
