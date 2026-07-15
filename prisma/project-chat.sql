-- SiteVerify — Project chat (homeowner ↔ admin)
-- Run in Supabase SQL Editor after prisma/schema.sql

CREATE TABLE IF NOT EXISTS project_chats (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT
);

CREATE TABLE IF NOT EXISTS project_chat_messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL REFERENCES project_chats(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('homeowner', 'admin', 'inspector', 'system')),
  sender_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat ON project_chat_messages (chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_project ON project_chat_messages (project_id, created_at);

ALTER TABLE project_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat visible to admin, project homeowner, and assigned inspector
DROP POLICY IF EXISTS "Chat select by project access" ON project_chats;
CREATE POLICY "Chat select by project access" ON project_chats
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_chats.project_id
        AND (p.owner_id = auth.uid() OR p.inspector_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Chat insert by project access" ON project_chats;
CREATE POLICY "Chat insert by project access" ON project_chats
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_chats.project_id
        AND (p.owner_id = auth.uid() OR p.inspector_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Chat update by project access" ON project_chats;
CREATE POLICY "Chat update by project access" ON project_chats
  FOR UPDATE USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_chats.project_id
        AND (p.owner_id = auth.uid() OR p.inspector_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Messages select by project access" ON project_chat_messages;
CREATE POLICY "Messages select by project access" ON project_chat_messages
  FOR SELECT USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_chat_messages.project_id
        AND (p.owner_id = auth.uid() OR p.inspector_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Messages insert by participants" ON project_chat_messages;
CREATE POLICY "Messages insert by participants" ON project_chat_messages
  FOR INSERT WITH CHECK (
    public.is_admin()
    OR (
      sender_role = 'homeowner'
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_chat_messages.project_id AND p.owner_id = auth.uid()
      )
    )
    OR (
      sender_role = 'inspector'
      AND EXISTS (
        SELECT 1 FROM projects p
        WHERE p.id = project_chat_messages.project_id AND p.inspector_id = auth.uid()
      )
    )
  );

COMMENT ON TABLE project_chats IS 'One chat thread per project (homeowner ↔ admin). Auto-created when project is opened.';
COMMENT ON TABLE project_chat_messages IS 'Messages in a project chat thread.';
