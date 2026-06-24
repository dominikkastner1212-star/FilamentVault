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
