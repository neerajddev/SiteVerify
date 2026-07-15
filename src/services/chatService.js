/**
 * Project chat — one thread per project (homeowner ↔ admin).
 * Auto-created when a project is opened. Works in demo (localStorage) and Supabase.
 */
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { isDemoMode } from '../data/demoAccounts';
import { isDemoBypassActive } from './demoAuthService';

const LOCAL_KEY = 'siteverify_project_chats';
const SCHEMA_KEY = 'siteverify_chat_schema';
const SCHEMA_VERSION = '1.0.0';

let useLocal = false;
let tablesMissing = false;

function preferLocal() {
  if (isDemoMode() || isDemoBypassActive() || !isSupabaseConfigured || tablesMissing) return true;
  return useLocal;
}

function loadLocal() {
  try {
    if (localStorage.getItem(SCHEMA_KEY) !== SCHEMA_VERSION) {
      localStorage.setItem(SCHEMA_KEY, SCHEMA_VERSION);
    }
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : { threads: {}, messages: {} };
  } catch {
    return { threads: {}, messages: {} };
  }
}

function saveLocal(store) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(store));
  localStorage.setItem(SCHEMA_KEY, SCHEMA_VERSION);
  window.dispatchEvent(new CustomEvent('siteverify-chat-updated'));
}

function chatIdFor(projectId) {
  return `chat_${projectId}`;
}

function newId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Ensure a chat thread exists for this project. Safe to call on every open.
 */
export async function ensureProjectChat(project, options = {}) {
  if (!project?.id) return null;
  const chatId = chatIdFor(project.id);
  const siteName = project.projectName || project.homeownerName || project.homeowner || 'Project';

  if (!preferLocal()) {
    try {
      const { data: existing, error } = await supabase
        .from('project_chats')
        .select('*')
        .eq('project_id', project.id)
        .maybeSingle();
      if (error) throw error;
      if (existing) return mapChat(existing);

      const row = {
        id: chatId,
        project_id: project.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_message_at: null,
        last_message_preview: null,
      };
      const { data, error: insErr } = await supabase
        .from('project_chats')
        .upsert(row, { onConflict: 'id' })
        .select()
        .single();
      if (insErr) throw insErr;

      // Welcome system message
      await sendChatMessage({
        projectId: project.id,
        senderRole: 'system',
        senderName: 'SiteVerify',
        senderId: null,
        body: `Chat opened for ${siteName}. Homeowner and SiteVerify admin can message here about this site.`,
      });

      return mapChat(data);
    } catch (e) {
      const msg = e?.message || String(e);
      if (/relation .* does not exist|Could not find the table/i.test(msg)) {
        tablesMissing = true;
        console.warn('[SiteVerify Chat] Tables missing — using local chat. Run prisma/project-chat.sql');
      } else {
        console.warn('[SiteVerify Chat] Falling back to local:', msg);
        useLocal = true;
      }
    }
  }

  const store = loadLocal();
  if (!store.threads[project.id]) {
    store.threads[project.id] = {
      id: chatId,
      projectId: project.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessageAt: null,
      lastMessagePreview: null,
    };
    const welcomeId = newId('msg');
    if (!store.messages[project.id]) store.messages[project.id] = [];
    store.messages[project.id].push({
      id: welcomeId,
      chatId,
      projectId: project.id,
      senderId: null,
      senderRole: 'system',
      senderName: 'SiteVerify',
      body: `Chat opened for ${siteName}. Homeowner and SiteVerify admin can message here about this site.`,
      createdAt: new Date().toISOString(),
    });
    store.threads[project.id].lastMessageAt = new Date().toISOString();
    store.threads[project.id].lastMessagePreview = 'Chat opened';
    saveLocal(store);

    if (options.openWelcome === false) {
      /* keep welcome */
    }
  }
  return store.threads[project.id];
}

export async function getChatMessages(projectId) {
  if (!projectId) return [];

  if (!preferLocal()) {
    try {
      const { data, error } = await supabase
        .from('project_chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapMessage);
    } catch (e) {
      const msg = e?.message || String(e);
      if (/relation .* does not exist|Could not find the table/i.test(msg)) {
        tablesMissing = true;
      }
      useLocal = true;
    }
  }

  const store = loadLocal();
  return store.messages[projectId] || [];
}

export async function sendChatMessage({
  projectId,
  senderId,
  senderRole,
  senderName,
  body,
}) {
  const text = (body || '').trim();
  if (!projectId || !text) return null;

  await ensureProjectChat({ id: projectId });
  const chatId = chatIdFor(projectId);
  const message = {
    id: newId('msg'),
    chatId,
    projectId,
    senderId: senderId || null,
    senderRole: senderRole || 'homeowner',
    senderName: senderName || 'User',
    body: text,
    createdAt: new Date().toISOString(),
  };

  if (!preferLocal()) {
    try {
      const row = {
        id: message.id,
        chat_id: chatId,
        project_id: projectId,
        sender_id: senderId || null,
        sender_role: message.senderRole,
        sender_name: message.senderName,
        body: text,
        created_at: message.createdAt,
      };
      const { error } = await supabase.from('project_chat_messages').insert(row);
      if (error) throw error;
      await supabase
        .from('project_chats')
        .update({
          updated_at: message.createdAt,
          last_message_at: message.createdAt,
          last_message_preview: text.slice(0, 120),
        })
        .eq('id', chatId);
      return message;
    } catch (e) {
      console.warn('[SiteVerify Chat] Send failed, using local:', e.message);
      useLocal = true;
    }
  }

  const store = loadLocal();
  if (!store.messages[projectId]) store.messages[projectId] = [];
  store.messages[projectId].push(message);
  if (!store.threads[projectId]) {
    store.threads[projectId] = {
      id: chatId,
      projectId,
      createdAt: message.createdAt,
      updatedAt: message.createdAt,
    };
  }
  store.threads[projectId].updatedAt = message.createdAt;
  store.threads[projectId].lastMessageAt = message.createdAt;
  store.threads[projectId].lastMessagePreview = text.slice(0, 120);
  saveLocal(store);
  return message;
}

function mapChat(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastMessageAt: row.last_message_at,
    lastMessagePreview: row.last_message_preview,
  };
}

function mapMessage(row) {
  return {
    id: row.id,
    chatId: row.chat_id,
    projectId: row.project_id,
    senderId: row.sender_id,
    senderRole: row.sender_role,
    senderName: row.sender_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

/** Try Supabase first when not in demo; still soft-fails to local. */
export function enableSupabaseChatIfAvailable() {
  if (!isDemoMode() && !isDemoBypassActive() && isSupabaseConfigured) {
    useLocal = false;
    tablesMissing = false;
  }
}
