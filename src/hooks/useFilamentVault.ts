import { useCallback, useEffect, useMemo, useState } from 'react';
import { demoActivity, demoProfiles, demoRolls, demoUsage } from '../lib/demoData';
import { supabase } from '../lib/supabase';
import {
  ActivityLog,
  AppRole,
  FilamentRoll,
  FilamentUsage,
  Profile,
  RollFormValues,
  UsageFormValues
} from '../types';

type VaultState = {
  profiles: Profile[];
  rolls: FilamentRoll[];
  usage: FilamentUsage[];
  activity: ActivityLog[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addRoll: (values: RollFormValues) => Promise<void>;
  updateRoll: (id: string, values: RollFormValues) => Promise<void>;
  markRollEmpty: (roll: FilamentRoll) => Promise<void>;
  deleteRoll: (roll: FilamentRoll) => Promise<void>;
  addUsage: (values: UsageFormValues) => Promise<void>;
  updateProfileRole: (profileId: string, role: AppRole) => Promise<void>;
};

function sortByCreatedAt<T extends { created_at: string }>(items: T[]) {
  return [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function attachRollRelations(rolls: FilamentRoll[], profiles: Profile[]) {
  return rolls.map((roll) => ({
    ...roll,
    buyer: roll.buyer || profiles.find((profile) => profile.id === roll.buyer_id) || null
  }));
}

function attachUsageRelations(usage: FilamentUsage[], rolls: FilamentRoll[], profiles: Profile[]) {
  return usage.map((entry) => ({
    ...entry,
    roll: entry.roll || rolls.find((roll) => roll.id === entry.roll_id) || null,
    user: entry.user || profiles.find((profile) => profile.id === entry.user_id) || null
  }));
}

function attachActivityRelations(activity: ActivityLog[], profiles: Profile[]) {
  return activity.map((entry) => ({
    ...entry,
    actor: entry.actor || profiles.find((profile) => profile.id === entry.actor_id) || null
  }));
}

function normalizeProfile(profile: Profile): Profile {
  return {
    ...profile,
    role: profile.role || 'member'
  };
}

function createActivity(
  actor: Profile,
  action: string,
  entityType: ActivityLog['entity_type'],
  entityId: string,
  metadata: Record<string, unknown>
): ActivityLog {
  return {
    id: crypto.randomUUID(),
    actor_id: actor.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
    created_at: new Date().toISOString(),
    actor
  };
}

export function useFilamentVault(currentProfile: Profile | null, isDemo: boolean): VaultState {
  const [profiles, setProfiles] = useState<Profile[]>(demoProfiles);
  const [rolls, setRolls] = useState<FilamentRoll[]>(attachRollRelations(demoRolls, demoProfiles));
  const [usage, setUsage] = useState<FilamentUsage[]>(attachUsageRelations(demoUsage, demoRolls, demoProfiles));
  const [activity, setActivity] = useState<ActivityLog[]>(attachActivityRelations(demoActivity, demoProfiles));
  const [loading, setLoading] = useState(!isDemo);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isDemo || !supabase) {
      setProfiles((existing) => (existing.length ? existing : demoProfiles));
      setRolls((existing) => attachRollRelations(existing.length ? existing : demoRolls, demoProfiles));
      setUsage((existing) => attachUsageRelations(existing.length ? existing : demoUsage, demoRolls, demoProfiles));
      setActivity((existing) => attachActivityRelations(existing.length ? existing : demoActivity, demoProfiles));
      setLoading(false);
      return;
    }

    if (!currentProfile) {
      setLoading(true);
      return;
    }

    setLoading(true);
    setError(null);

    const [profilesResult, rollsResult, usageResult, activityResult] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name', { ascending: true }),
      supabase
        .from('filament_rolls')
        .select('*, buyer:profiles!filament_rolls_buyer_id_fkey(id, full_name, email)')
        .order('updated_at', { ascending: false }),
      supabase
        .from('filament_usage')
        .select(
          '*, user:profiles!filament_usage_user_id_fkey(id, full_name, email), roll:filament_rolls!filament_usage_roll_id_fkey(id, manufacturer, material, color, price, original_weight_g)'
        )
        .order('used_at', { ascending: false }),
      supabase
        .from('activity_log')
        .select('*, actor:profiles!activity_log_actor_id_fkey(id, full_name, email)')
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    const firstError = profilesResult.error || rollsResult.error || usageResult.error || activityResult.error;
    if (firstError) {
      setError(firstError.message);
      setLoading(false);
      return;
    }

    setProfiles(((profilesResult.data || []) as Profile[]).map(normalizeProfile));
    setRolls((rollsResult.data || []) as FilamentRoll[]);
    setUsage((usageResult.data || []) as FilamentUsage[]);
    setActivity((activityResult.data || []) as ActivityLog[]);
    setLoading(false);
  }, [currentProfile, isDemo]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addRoll = useCallback(
    async (values: RollFormValues) => {
      if (!currentProfile) {
        throw new Error('Kein Benutzer aktiv.');
      }

      if (isDemo || !supabase) {
        const created: FilamentRoll = {
          ...values,
          id: crypto.randomUUID(),
          notes: values.notes || null,
          created_by: currentProfile.id,
          updated_by: currentProfile.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          buyer: profiles.find((profile) => profile.id === values.buyer_id) || null
        };
        setRolls((items) => [created, ...items]);
        setActivity((items) => [
          createActivity(currentProfile, 'roll_created', 'roll', created.id, {
            roll: `${created.manufacturer} ${created.material} ${created.color}`,
            remaining_weight_g: created.remaining_weight_g
          }),
          ...items
        ]);
        return;
      }

      const { error: insertError } = await supabase.from('filament_rolls').insert({
        ...values,
        notes: values.notes || null,
        created_by: currentProfile.id,
        updated_by: currentProfile.id
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      await refresh();
    },
    [currentProfile, isDemo, profiles, refresh]
  );

  const updateRoll = useCallback(
    async (id: string, values: RollFormValues) => {
      if (!currentProfile) {
        throw new Error('Kein Benutzer aktiv.');
      }

      if (isDemo || !supabase) {
        setRolls((items) =>
          items.map((roll) =>
            roll.id === id
              ? {
                  ...roll,
                  ...values,
                  notes: values.notes || null,
                  status: values.remaining_weight_g <= 0 ? 'leer' : values.status,
                  updated_by: currentProfile.id,
                  updated_at: new Date().toISOString(),
                  buyer: profiles.find((profile) => profile.id === values.buyer_id) || null
                }
              : roll
          )
        );
        setActivity((items) => [
          createActivity(currentProfile, 'roll_updated', 'roll', id, {
            remaining_weight_g: values.remaining_weight_g,
            status: values.remaining_weight_g <= 0 ? 'leer' : values.status
          }),
          ...items
        ]);
        return;
      }

      const { error: updateError } = await supabase
        .from('filament_rolls')
        .update({
          ...values,
          notes: values.notes || null,
          updated_by: currentProfile.id
        })
        .eq('id', id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await refresh();
    },
    [currentProfile, isDemo, profiles, refresh]
  );

  const markRollEmpty = useCallback(
    async (roll: FilamentRoll) => {
      await updateRoll(roll.id, {
        manufacturer: roll.manufacturer,
        material: roll.material,
        color: roll.color,
        original_weight_g: roll.original_weight_g,
        remaining_weight_g: 0,
        purchase_date: roll.purchase_date,
        price: roll.price,
        buyer_id: roll.buyer_id,
        storage_location: roll.storage_location,
        notes: roll.notes || '',
        status: 'leer'
      });
    },
    [updateRoll]
  );

  const deleteRoll = useCallback(
    async (roll: FilamentRoll) => {
      if (!currentProfile) {
        throw new Error('Kein Benutzer aktiv.');
      }

      if (isDemo || !supabase) {
        setRolls((items) => items.filter((item) => item.id !== roll.id));
        setUsage((items) => items.filter((item) => item.roll_id !== roll.id));
        setActivity((items) => [
          createActivity(currentProfile, 'roll_deleted', 'roll', roll.id, {
            roll: `${roll.manufacturer} ${roll.material} ${roll.color}`
          }),
          ...items
        ]);
        return;
      }

      const { error: deleteError } = await supabase.from('filament_rolls').delete().eq('id', roll.id);
      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await refresh();
    },
    [currentProfile, isDemo, refresh]
  );

  const addUsage = useCallback(
    async (values: UsageFormValues) => {
      if (!currentProfile) {
        throw new Error('Kein Benutzer aktiv.');
      }

      const roll = rolls.find((item) => item.id === values.roll_id);
      if (!roll) {
        throw new Error('Filamentrolle nicht gefunden.');
      }

      if (values.used_weight_g > roll.remaining_weight_g) {
        throw new Error('Der Verbrauch ist groesser als das Restgewicht der Rolle.');
      }

      if (isDemo || !supabase) {
        const cost = (roll.price / roll.original_weight_g) * values.used_weight_g;
        const created: FilamentUsage = {
          id: crypto.randomUUID(),
          roll_id: values.roll_id,
          user_id: currentProfile.id,
          project_name: values.project_name,
          used_weight_g: values.used_weight_g,
          used_at: values.used_at,
          note: values.note || null,
          cost_eur: cost,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          roll,
          user: currentProfile
        };

        setUsage((items) => [created, ...items]);
        setRolls((items) =>
          items.map((item) => {
            if (item.id !== values.roll_id) {
              return item;
            }
            const remaining = Math.max(0, item.remaining_weight_g - values.used_weight_g);
            return {
              ...item,
              remaining_weight_g: remaining,
              status: remaining === 0 ? 'leer' : item.status,
              updated_by: currentProfile.id,
              updated_at: new Date().toISOString()
            };
          })
        );
        setActivity((items) => [
          createActivity(currentProfile, 'usage_logged', 'usage', created.id, {
            project_name: values.project_name,
            used_weight_g: values.used_weight_g,
            roll: `${roll.manufacturer} ${roll.material} ${roll.color}`
          }),
          ...items
        ]);
        return;
      }

      const { error: insertError } = await supabase.from('filament_usage').insert({
        roll_id: values.roll_id,
        user_id: currentProfile.id,
        project_name: values.project_name,
        used_weight_g: values.used_weight_g,
        used_at: values.used_at,
        note: values.note || null
      });

      if (insertError) {
        throw new Error(insertError.message);
      }

      await refresh();
    },
    [currentProfile, isDemo, refresh, rolls]
  );

  const updateProfileRole = useCallback(
    async (profileId: string, role: AppRole) => {
      if (!currentProfile) {
        throw new Error('Kein Benutzer aktiv.');
      }

      if (currentProfile.role !== 'admin') {
        throw new Error('Nur Admins dürfen Rollen ändern.');
      }

      if (isDemo || !supabase) {
        const target = profiles.find((profile) => profile.id === profileId);
        setProfiles((items) =>
          items.map((profile) =>
            profile.id === profileId ? { ...profile, role, updated_at: new Date().toISOString() } : profile
          )
        );
        setActivity((items) => [
          createActivity(currentProfile, 'profile_role_updated', 'profile', profileId, {
            profile: target?.full_name || target?.email || 'Profil',
            old_role: target?.role,
            new_role: role
          }),
          ...items
        ]);
        return;
      }

      const { error: updateError } = await supabase.from('profiles').update({ role }).eq('id', profileId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      await refresh();
    },
    [currentProfile, isDemo, profiles, refresh]
  );

  return useMemo(
    () => ({
      profiles,
      rolls,
      usage,
      activity: sortByCreatedAt(activity),
      loading,
      error,
      refresh,
      addRoll,
      updateRoll,
      markRollEmpty,
      deleteRoll,
      addUsage,
      updateProfileRole
    }),
    [
      activity,
      addRoll,
      addUsage,
      deleteRoll,
      error,
      loading,
      markRollEmpty,
      profiles,
      refresh,
      rolls,
      updateProfileRole,
      updateRoll,
      usage
    ]
  );
}
