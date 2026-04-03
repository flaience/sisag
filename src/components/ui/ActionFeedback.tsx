type ActionFeedbackProps = {
  type: "success" | "error" | "info";
  message: string;
};

export function ActionFeedback({ type, message }: ActionFeedbackProps) {
  const styles = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-red-200 bg-red-50 text-red-700",
    info: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-sm ${styles[type]}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
