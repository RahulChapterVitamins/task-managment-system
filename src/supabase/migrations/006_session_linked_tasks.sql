-- Allow a session to link to multiple main tasks (many-to-many),
-- replacing the single sessions.linked_task_id column going forward.
-- The old column is left in place (unused by the app after this migration)
-- so nothing breaks if it's still read anywhere; existing single links are
-- carried over into the new table below.

CREATE TABLE IF NOT EXISTS public.session_linked_tasks (
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.tasks (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, task_id)
);

CREATE INDEX IF NOT EXISTS session_linked_tasks_session_id_idx
  ON public.session_linked_tasks (session_id);

CREATE INDEX IF NOT EXISTS session_linked_tasks_task_id_idx
  ON public.session_linked_tasks (task_id);

DROP TRIGGER IF EXISTS session_linked_tasks_set_user_id ON public.session_linked_tasks;
CREATE TRIGGER session_linked_tasks_set_user_id
  BEFORE INSERT ON public.session_linked_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_id();

ALTER TABLE public.session_linked_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "session_linked_tasks_select_own"
  ON public.session_linked_tasks FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "session_linked_tasks_insert_own"
  ON public.session_linked_tasks FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.sessions
      WHERE sessions.id = session_linked_tasks.session_id
        AND sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "session_linked_tasks_delete_own"
  ON public.session_linked_tasks FOR DELETE
  USING (user_id = auth.uid());

-- Carry over any existing single links so they aren't lost.
INSERT INTO public.session_linked_tasks (session_id, task_id, user_id)
SELECT id, linked_task_id, user_id
FROM public.sessions
WHERE linked_task_id IS NOT NULL
ON CONFLICT (session_id, task_id) DO NOTHING;
