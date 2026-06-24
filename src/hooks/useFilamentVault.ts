import { useCallback, useEffect, useMemo, useState } from 'react';
import { demoActivity, demoProfiles, demoRolls, demoUsage } from '../lib/demoData';
import { supabase } from '../lib/supabase';
import {
  ActivityLog,
  AppRole,
  FilamentRoll,
  FilamentUsage,
  MemberFormValues,
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
  createMember: (values: MemberFormValues) => Promise<void>;
  deleteMember: (profile: Profile) => Promise<void>;
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

  const createMember = useCallback(
    async (values: MemberFormValues) => {
      if (!currentProfile) {
        throw new Error('Kein Benutzer aktiv.');
      }

      if (currentProfile.role !== 'admin') {
        throw new Error('Nur Admins duerfen Mitglieder anlegen.');
      }

      const email = values.email.trim().toLowerCase();
      const fullName = values.full_name.trim();

      if (!email || !fullName || values.password.length < 8) {
        throw new Error('E-Mail, Name und ein Passwort mit mindestens 8 Zeichen sind erforderlich.');
      }

      if (isDemo || !supabase) {
        if (profiles.some((profile) => profile.email?.toLowerCase() === email)) {
          throw new Error('Diese E-Mail existiert bereits.');
        }

        const created: Profile = {
          id: crypto.randomUUID(),
          email,
          full_name: fullName,
          avatar_url: null,
          role: values.role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        setProfiles((items) => [...items, created].sort((a, b) => displayProfileName(a).localeCompare(displayProfileName(b))));
        setActivity((items) => [
          createActivity(currentProfile, 'profile_created', 'profile', created.id, {
            profile: fullName,
            email,
            role: values.role
          }),
          ...items
        ]);
        return;
      }

      const { error: createError } = await supabase.rpc('admin_create_member', {
        p_email: email,
        p_full_name: fullName,
        p_password: values.password,
        p_role: values.role
      });

      if (createError) {
        throw new Error(createError.message);
      }

      await refresh();
    },
    [currentProfile, isDemo, profiles, refresh]
  );

  const deleteMember = useCallback(
    async (profile: Profile) => {
      if (!currentProfile) {
        throw new Error('Kein Benutzer aktiv.');
      }

      if (currentProfile.role !== 'admin') {
        throw new Error('Nur Admins duerfen Mitglieder loeschen.');
      }

      if (profile.id === currentProfile.id) {
        throw new Error('Du kannst deinen eigenen Admin-Zugang nicht loeschen.');
      }

      if (profile.role === 'admin' && profiles.filter((item) => item.role === 'admin').length <= 1) {
        throw new Error('Mindestens ein Admin muss erhalten bleiben.');
      }

      if (isDemo || !supabase) {
        setProfiles((items) => items.filter((item) => item.id !== profile.id));
        setRolls((items) =>
          items.map((roll) => ({
            ...roll,
            buyer_id: roll.buyer_id === profile.id ? currentProfile.id : roll.buyer_id,
            created_by: roll.created_by === profile.id ? currentProfile.id : roll.created_by,
            updated_by: roll.updated_by === profile.id ? currentProfile.id : roll.updated_by,
            buyer: roll.buyer_id === profile.id ? currentProfile : roll.buyer
          }))
        );
        setUsage((items) =>
          items.map((entry) => ({
            ...entry,
            user_id: entry.user_id === profile.id ? currentProfile.id : entry.user_id,
            user: entry.user_id === profile.id ? currentProfile : entry.user
          }))
        );
        setActivity((items) => [
          createActivity(currentProfile, 'profile_deleted', 'profile', profile.id, {
            profile: profile.full_name || profile.email || 'Profil',
            email: profile.email,
            role: profile.role
          }),
          ...items
        ]);
        return;
      }

      const { error: deleteError } = await supabase.rpc('admin_delete_member', {
        p_profile_id: profile.id
      });

      if (deleteError) {
        throw new Error(deleteError.message);
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
      updateProfileRole,
      createMember,
      deleteMember
    }),
    [
      activity,
      addRoll,
      addUsage,
      createMember,
      deleteMember,
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

function displayProfileName(profile: Pick<Profile, 'full_name' | 'email'>) {
  return profile.full_name || profile.email || '';
}
