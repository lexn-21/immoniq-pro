import { toast } from "sonner";

/** Maps known Supabase / network error codes to friendly German messages. */
const FRIENDLY: Record<string, string> = {
  "23505": "Eintrag existiert bereits.",
  "23503": "Verknüpfter Datensatz fehlt.",
  "23514": "Eingabe entspricht nicht den Regeln.",
  "42501": "Keine Berechtigung für diese Aktion.",
  "PGRST301": "Sitzung abgelaufen — bitte neu anmelden.",
  "PGRST116": "Datensatz nicht gefunden.",
};

interface ErrLike {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
}

export function friendlyError(err: unknown): string {
  if (!err) return "Unbekannter Fehler.";
  const e = err as ErrLike;
  if (e.code && FRIENDLY[e.code]) return FRIENDLY[e.code];
  const msg = e.message ?? String(err);
  if (/network|fetch|failed to fetch/i.test(msg)) return "Verbindungsproblem — bitte erneut versuchen.";
  if (/quota|limit/i.test(msg)) return msg; // Quota-Fehler enthalten oft hilfreiche Texte
  if (/jwt|token|auth/i.test(msg)) return "Sitzung abgelaufen — bitte neu anmelden.";
  return msg;
}

interface ToastErrorOpts {
  /** Optional retry callback — adds an "Erneut versuchen" action to the toast */
  onRetry?: () => void;
  /** Override the displayed title */
  title?: string;
}

export function toastError(err: unknown, opts: ToastErrorOpts = {}) {
  const description = friendlyError(err);
  toast.error(opts.title ?? "Hat nicht geklappt", {
    description,
    action: opts.onRetry ? { label: "Erneut versuchen", onClick: opts.onRetry } : undefined,
  });
}

export function toastSuccess(title: string, description?: string) {
  toast.success(title, description ? { description } : undefined);
}
