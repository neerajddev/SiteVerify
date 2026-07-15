/**
 * Dual-write: keep projects.data (JSONB) as the UI source of truth,
 * and mirror visits / tests / photos / corrections for SQL queries + RLS.
 *
 * Fails soft if normalized tables are not yet created in Supabase.
 */
import { VISIT_MAP, getVisitByCode } from '../data/visitStructure';
import { WORKFLOW_STATUS } from '../data/testWorkflow';
import { getAllTestsFromProject, isTestNotApplicable, recalcProjectProgress } from '../data/projectAnalytics';
import { getVisitStatus, parseDistrict } from '../data/adminVisits';

let normalizedUnavailable = false;

export function isNormalizedSyncAvailable() {
  return !normalizedUnavailable;
}

export function resetNormalizedSyncFlag() {
  normalizedUnavailable = false;
}

function visitRowId(projectId, code) {
  return `${projectId}_visit_${code}`;
}

function testRowId(projectId, testNumber, fallbackId) {
  return fallbackId || `${projectId}_t${testNumber}`;
}

function photoRowId(testId, index) {
  return `${testId}_photo_${index}`;
}

function mapWorkflowStatus(test) {
  if (isTestNotApplicable(test)) return WORKFLOW_STATUS.NOT_STARTED;
  return test.workflowStatus || WORKFLOW_STATUS.NOT_STARTED;
}

function mapVisitDbStatus(project, code) {
  const st = getVisitStatus(project, code);
  const map = {
    approved: 'approved',
    submitted: 'submitted',
    revision: 'revision',
    in_progress: 'in_progress',
    assigned: 'assigned',
    not_started: 'not_started',
  };
  return map[st.key] || 'not_started';
}

/**
 * Sync one project into visits / tests / photos / corrections.
 * @returns {Promise<boolean>} true if synced, false if skipped/unavailable
 */
export async function syncNormalizedProject(supabase, project) {
  if (!supabase || !project?.id || normalizedUnavailable) return false;

  try {
    const projectId = project.id;
    const progress = recalcProjectProgress(project);
    const district = parseDistrict(project);
    const assignedVisit = project.assignment?.visitCodes?.[0] || null;
    const assignment = project.assignment || {};

    // Probe: ensure visits table exists before writing project extras
    const { error: probeErr } = await supabase.from('visits').select('id').limit(1);
    if (probeErr) throw probeErr;

    // Enrich flat project columns (added by normalized-visits.sql)
    await supabase
      .from('projects')
      .update({
        site_name: project.projectName || null,
        district: district || null,
        pin_code: project.pinCode || null,
        maps_link: project.mapsUrl || null,
        permit_number: project.buildingPermit || project.permitNumber || null,
        progress_pct: progress,
        total_progress: progress,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    const visitRows = VISIT_MAP.map((v) => {
      const isCurrent = assignedVisit === v.code;
      const meta = getVisitByCode(v.code);
      return {
        id: visitRowId(projectId, v.code),
        project_id: projectId,
        visit_code: v.code,
        inspector_id: isCurrent ? project.inspectorId || null : null,
        scheduled_date: isCurrent ? assignment.scheduledVisitAt || null : null,
        status: mapVisitDbStatus(project, v.code),
        admin_notes: isCurrent ? assignment.preparationNotes || null : null,
        pour_date: isCurrent && meta?.requiresPourDate ? assignment.scheduledVisitAt || null : null,
        pour_date_confirmed_at: isCurrent ? assignment.pourDateConfirmedAt || null : null,
        is_unannounced: Boolean(meta?.unannounced),
        assigned_at: isCurrent ? assignment.assignedAt || null : null,
        completed_at: isCurrent ? assignment.completedAt || null : null,
        updated_at: new Date().toISOString(),
      };
    });

    const { error: visitErr } = await supabase.from('visits').upsert(visitRows, {
      onConflict: 'id',
    });
    if (visitErr) throw visitErr;

    const allTests = getAllTestsFromProject(project);
    const byNumber = new Map();
    allTests.forEach((item) => {
      byNumber.set(item.test.testNumber, item);
    });

    const testRows = [];
    const photoRows = [];
    const correctionRows = [];

    VISIT_MAP.forEach((visit) => {
      const visitId = visitRowId(projectId, visit.code);
      visit.testNumbers.forEach((num) => {
        const found = byNumber.get(num);
        const test = found?.test || {
          id: `${projectId}_t${num}`,
          testNumber: num,
          name: `Test ${num}`,
          workflowStatus: WORKFLOW_STATUS.NOT_STARTED,
        };
        const isNa = isTestNotApplicable(test);
        const status = isNa ? WORKFLOW_STATUS.NOT_STARTED : mapWorkflowStatus(test);
        const tid = testRowId(projectId, num, test.id);

        testRows.push({
          id: tid,
          visit_id: visitId,
          project_id: projectId,
          test_number: num,
          name: test.name || `Test ${num}`,
          status: isNa ? 'not_started' : status,
          overall_result: test.overallResult || null,
          condition: test.conditionRating || null,
          measurement: test.measurement || null,
          remarks: test.remarks || null,
          severity: test.severity || null,
          is_na: isNa,
          submitted_at: test.submittedAt || null,
          submitted_by: test.submittedBy || null,
          approved_at: test.approvedAt || null,
          approved_by: test.approvedBy || null,
          admin_qa_note: test.adminNote || null,
          revision_reason: test.revisionReason || null,
          payout_released: Boolean(test.payoutReleased),
          updated_at: new Date().toISOString(),
        });

        const photos = test.photos || [];
        const timestamps = test.photoTimestamps || [];
        const coords = test.photoCoordinates || project.coordinates || null;
        photos.forEach((url, index) => {
          if (!url) return;
          photoRows.push({
            id: photoRowId(tid, index),
            test_id: tid,
            url,
            lat: coords?.lat ?? null,
            lng: coords?.lng ?? null,
            captured_at: timestamps[index] || test.submittedAt || null,
            is_camera_capture: true,
            sort_order: index,
          });
        });

        if (test.revisionReason && test.workflowStatus === WORKFLOW_STATUS.REVISION_REQUESTED) {
          correctionRows.push({
            id: `${tid}_correction_latest`,
            test_id: tid,
            sent_by: null,
            reason: test.revisionReason,
            sent_at: test.revisionRequestedAt || new Date().toISOString(),
            resolved_at: null,
          });
        }
      });
    });

    const { error: testErr } = await supabase.from('tests').upsert(testRows, { onConflict: 'id' });
    if (testErr) throw testErr;

    // Replace photos for these tests (delete then insert keeps counts correct)
    const testIds = testRows.map((t) => t.id);
    if (testIds.length) {
      const { error: delErr } = await supabase.from('photos').delete().in('test_id', testIds);
      if (delErr) throw delErr;
    }
    if (photoRows.length) {
      const { error: photoErr } = await supabase.from('photos').insert(photoRows);
      if (photoErr) throw photoErr;
    }

    if (correctionRows.length) {
      const { error: corrErr } = await supabase.from('corrections').upsert(correctionRows, {
        onConflict: 'id',
      });
      if (corrErr) throw corrErr;
    }

    // Recompute progress from SQL (keeps progress_pct formula consistent)
    await supabase.rpc('recompute_project_progress', { p_project_id: projectId }).catch(() => {});

    return true;
  } catch (e) {
    const msg = e?.message || String(e);
    // Missing relation → tables not migrated yet
    if (/relation .* does not exist|Could not find the table/i.test(msg)) {
      normalizedUnavailable = true;
      console.warn(
        '[SiteVerify] Normalized tables not found. Run prisma/normalized-visits.sql in Supabase. Sync skipped.'
      );
      return false;
    }
    console.warn('[SiteVerify] Normalized sync failed:', msg);
    return false;
  }
}
