type RefreshRegistration = { refresh: () => Promise<unknown>; onError: (error: unknown) => void };
let registration: RefreshRegistration | null = null;

/** Runtime bootstrap supplies the shared scheduler and both-domain replan callback. */
export function configureTimetableReminderRefresh(input: RefreshRegistration): () => void {
  registration = input;
  return () => { if (registration === input) registration = null; };
}

/** Backend import success stays success; notification failure has its own explicit reporting seam. */
export async function refreshRemindersAfterTimetableImport(): Promise<void> {
  const current = registration;
  if (!current) return;
  try { await current.refresh(); } catch (error) { current.onError(error); }
}
