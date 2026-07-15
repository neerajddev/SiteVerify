/**
 * One-off backfill: push all current projects into normalized tables.
 * Usage (browser console after logging into admin):
 *   import('/src/services/backfillNormalized.js').then(m => m.backfillNormalizedTables())
 * Or call from Hub once migration SQL is applied.
 */
import { getProjects, isSupabaseMode } from './projectService';
import { syncNormalizedProject, resetNormalizedSyncFlag } from './normalizedSync';
import { supabase } from '../supabaseClient';

export async function backfillNormalizedTables() {
  if (!isSupabaseMode() || !supabase) {
    return { ok: false, message: 'Supabase mode required (turn off demo / connect).' };
  }

  resetNormalizedSyncFlag();
  const projects = await getProjects();
  let synced = 0;
  let failed = 0;

  for (const project of projects) {
    const ok = await syncNormalizedProject(supabase, project);
    if (ok) synced += 1;
    else failed += 1;
  }

  return {
    ok: failed === 0,
    synced,
    failed,
    total: projects.length,
    message:
      failed === 0
        ? `Synced ${synced} projects into visits/tests/photos.`
        : `Synced ${synced}, failed ${failed}. Run prisma/normalized-visits.sql if tables are missing.`,
  };
}
