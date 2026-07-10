import { FilamentRoll, FilamentUsage, MaterialStock, Profile, SettlementRow } from '../types';

export function usageCost(usage: FilamentUsage) {
  if (Number.isFinite(usage.cost_eur) && usage.cost_eur > 0) {
    return usage.cost_eur;
  }

  if (!usage.roll?.price || !usage.roll?.original_weight_g) {
    return 0;
  }

  return (usage.roll.price / usage.roll.original_weight_g) * usage.used_weight_g;
}

export function materialStock(rolls: FilamentRoll[]): MaterialStock[] {
  const materials = Array.from(new Set(rolls.map((roll) => roll.material))).sort((a, b) => a.localeCompare(b));
  return materials.map((material) => {
    const matching = rolls.filter((roll) => roll.material === material && roll.status !== 'leer');
    return {
      material,
      weight: matching.reduce((sum, roll) => sum + roll.remaining_weight_g, 0),
      activeRolls: matching.length
    };
  });
}

export function buildSettlementRows(
  profiles: Profile[],
  rolls: FilamentRoll[],
  usage: FilamentUsage[]
): SettlementRow[] {
  return profiles
    .map((profile) => {
      const purchased = rolls
        .filter((roll) => roll.buyer_id === profile.id)
        .reduce((sum, roll) => sum + roll.price, 0);
      const userUsage = usage.filter((entry) => entry.user_id === profile.id);
      const consumedCost = userUsage.reduce((sum, entry) => sum + usageCost(entry), 0);
      const usedWeight = userUsage.reduce((sum, entry) => sum + entry.used_weight_g, 0);

      return {
        profile,
        purchased,
        consumedCost,
        usedWeight,
        balance: purchased - consumedCost
      };
    })
    .sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance));
}

export function lowStockRolls(rolls: FilamentRoll[]) {
  return rolls
    .filter((roll) => roll.status !== 'leer' && roll.remaining_weight_g < 150)
    .sort((a, b) => a.remaining_weight_g - b.remaining_weight_g);
}

export function totalStock(rolls: FilamentRoll[]) {
  return rolls.filter((roll) => roll.status !== 'leer').reduce((sum, roll) => sum + roll.remaining_weight_g, 0);
}

export type LeaderboardRow = {
  profile: Profile;
  weightG: number;
  prints: number;
};

/**
 * Team-Rangliste der letzten X Tage - wer hat wie viel gedruckt.
 * Nur Profile mit mindestens einem Eintrag im Zeitraum werden gezeigt,
 * damit die Liste nicht mit inaktiven Mitgliedern zugemuellt wird.
 */
export function buildUsageLeaderboard(profiles: Profile[], usage: FilamentUsage[], days = 30): LeaderboardRow[] {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const recent = usage.filter((entry) => new Date(entry.used_at) >= since);

  return profiles
    .map((profile) => {
      const mine = recent.filter((entry) => entry.user_id === profile.id);
      return {
        profile,
        weightG: mine.reduce((sum, entry) => sum + entry.used_weight_g, 0),
        prints: mine.length
      };
    })
    .filter((row) => row.prints > 0)
    .sort((a, b) => b.weightG - a.weightG);
}
