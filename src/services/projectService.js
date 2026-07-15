import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { PROJECTS_LIST, getBlankStages } from '../data/mockData';
import { buildAssignmentPayload } from '../data/projectAnalytics';
import { isDemoMode, DEMO_ACCOUNTS } from '../data/demoAccounts';
import { isDemoBypassActive } from './demoAuthService';
import { syncNormalizedProject } from './normalizedSync';
import { ensureProjectChat } from './chatService';

const LOCAL_STORAGE_KEY = 'siteverify_projects';
const SCHEMA_VERSION_KEY = 'siteverify_schema_version';
const SCHEMA_VERSION = '2.5.0';

let useFallbackMode = !isSupabaseConfigured;

/** Demo mode always uses shared browser storage so all portals see the same projects. */
function useLocalProjectStore() {
  return isDemoMode() || isDemoBypassActive() || !isSupabaseConfigured || useFallbackMode;
}

export function isSupabaseMode() {
  if (isDemoBypassActive()) return false;
  return isSupabaseConfigured && !useFallbackMode;
}

function loadFromLocalStorage() {
  try {
    const version = localStorage.getItem(SCHEMA_VERSION_KEY);
    if (version !== SCHEMA_VERSION) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION);
      return PROJECTS_LIST;
    }
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('[SiteVerify Service] Error reading localStorage:', e);
  }
  return PROJECTS_LIST;
}

function saveToLocalStorage(projects) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
    localStorage.setItem(SCHEMA_VERSION_KEY, SCHEMA_VERSION);
    window.dispatchEvent(new Event('siteverify-projects-updated'));
  } catch (e) {
    console.error('[SiteVerify Service] Error writing to localStorage:', e);
  }
}

function mapRowToProject(row) {
  const project = { ...row.data };
  project.id = row.id;
  project.homeownerName = row.homeowner_name;
  project.homeowner = row.homeowner_name;
  project.assignedInspector = row.assigned_inspector;
  project.inspector = row.assigned_inspector;
  project.location = row.location;
  project.projectStatus = row.project_status;
  project.status = row.project_status;
  project.foundationType = row.foundation_type;
  project.blueprintFile = row.blueprint_file;
  project.blueprintName = row.blueprint_file;
  project.totalProgress = row.total_progress;
  project.currentPhase = row.current_phase;
  project.ownerId = row.owner_id;
  project.inspectorId = row.inspector_id;
  return project;
}

function projectToRow(project, ownerId) {
  return {
    id: project.id,
    homeowner_name: project.homeownerName || project.homeowner || 'Unknown',
    assigned_inspector: project.assignedInspector || project.inspector || 'Pending Assignment',
    location: project.location || 'Unknown',
    project_status: project.projectStatus || project.status || 'Pending Assignment',
    foundation_type: project.foundationType || 'cf',
    blueprint_file: project.blueprintFile || project.blueprintName || '',
    total_progress: project.totalProgress || 0,
    current_phase: project.currentPhase || '',
    owner_id: project.ownerId || ownerId || null,
    inspector_id: project.inspectorId || null,
    data: project,
    updated_at: new Date().toISOString(),
  };
}

async function getCurrentUserId() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function getProjects() {
  if (!useLocalProjectStore()) {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(mapRowToProject);
    } catch (e) {
      console.warn('[SiteVerify Service] Supabase query failed. Falling back to local storage.', e.message);
      useFallbackMode = true;
      return loadFromLocalStorage();
    }
  }

  return loadFromLocalStorage();
}

export async function saveProject(project) {
  if (!useLocalProjectStore()) {
    try {
      const userId = await getCurrentUserId();
      const row = projectToRow(project, userId);

      const { error } = await supabase.from('projects').upsert(row, { onConflict: 'id' });
      if (error) throw error;

      // Mirror into visits / tests / photos (no-op until SQL migration is run)
      await syncNormalizedProject(supabase, project);
      // Auto-create project chat thread (homeowner ↔ admin)
      await ensureProjectChat(project).catch(() => {});
      return;
    } catch (e) {
      console.warn('[SiteVerify Service] Save to Supabase failed. Saving to local storage.', e.message);
      useFallbackMode = true;
    }
  }

  const projects = loadFromLocalStorage();
  const existingIdx = projects.findIndex((p) => p.id === project.id);
  if (existingIdx !== -1) {
    projects[existingIdx] = project;
  } else {
    projects.push(project);
  }
  saveToLocalStorage(projects);
  await ensureProjectChat(project).catch(() => {});
}

export async function saveProjects(projectsList) {
  for (const project of projectsList) {
    await saveProject(project);
  }
}

export async function assignInspector(projectId, inspectorId, inspectorName, assignmentDetails = null) {
  const projects = await getProjects();
  const project = projects.find((p) => p.id === projectId);
  if (!project) return;

  const assignment = inspectorId
    ? buildAssignmentPayload({
        inspectorId,
        inspectorName,
        scope: assignmentDetails?.scope || 'full',
        visitCodes: assignmentDetails?.visitCodes,
        stageIds: assignmentDetails?.stageIds,
        testIds: assignmentDetails?.testIds,
        scheduledVisitAt: assignmentDetails?.scheduledVisitAt,
        preparationNotes: assignmentDetails?.preparationNotes,
        constructionType: assignmentDetails?.constructionType,
        assignedBy: assignmentDetails?.assignedBy || 'Admin',
      })
    : null;

  const scopeLabel = assignment
    ? assignment.scope === 'full'
      ? 'full project'
      : assignment.scope === 'visit'
        ? `Visit ${(assignment.visitCodes || []).join(', ')}`
        : assignment.scope === 'stage'
          ? `stage(s): ${(assignment.stageIds || []).join(', ')}`
          : `${(assignment.testIds || []).length} test(s)`
    : '';

  const updated = {
    ...project,
    inspectorId: inspectorId || null,
    inspector: inspectorName,
    assignedInspector: inspectorName,
    assignment: inspectorId ? assignment : null,
    projectStatus: inspectorId ? 'Inspecting' : 'Pending Assignment',
    status: inspectorId ? 'Inspecting' : 'Pending Assignment',
    historyLogs: [
      ...(project.historyLogs || []),
      {
        action: inspectorId
          ? `Inspection task assigned to ${inspectorName}${scopeLabel ? ` (${scopeLabel})` : ''}${assignment?.scheduledVisitAt ? ` · Visit ${new Date(assignment.scheduledVisitAt).toLocaleString('en-IN')}` : ''}`
          : 'Inspector unassigned',
        by: 'Admin',
        timestamp: new Date().toISOString(),
      },
    ],
  };

  await saveProject(updated);
  return updated;
}

/** Ensure every project has a stages array (older saves / partial rows). */
export function normalizeProjectStages(project) {
  if (!project) return project;
  if (Array.isArray(project.stages) && project.stages.length > 0) return project;
  return { ...project, stages: getBlankStages() };
}

/** Seed demo project for the demo homeowner when they have no linked sites */
export async function seedDemoProjectIfNeeded(ownerId, ownerName) {
  if (!isDemoMode() || !ownerId) return null;

  const projects = await getProjects();
  const mine = projects.filter((p) => !p.ownerId || p.ownerId === ownerId);
  if (mine.length > 0) return null;

  const template = PROJECTS_LIST[0];
  const demoProject = normalizeProjectStages({
    ...JSON.parse(JSON.stringify(template)),
    id: 'proj_demo_001',
    ownerId,
    homeownerName: ownerName || DEMO_ACCOUNTS.homeowner.fullName,
    homeowner: ownerName || DEMO_ACCOUNTS.homeowner.fullName,
    assignedInspector: template.assignedInspector || 'Arun Kumar',
    inspector: template.inspector || 'Arun Kumar',
    inspectorId: template.inspectorId || null,
    projectStatus: template.projectStatus || 'Inspecting',
    status: template.status || 'Inspecting',
  });

  await saveProject(demoProject);
  return demoProject;
}
