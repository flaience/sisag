// src/app/admin/bookings/[id]/journey/JourneyFeedbackBanner.tsx
"use client";

import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import type { ActionFeedback } from "./types";

function getFeedbackClasses(type: NonNullable<ActionFeedback>["type"]) {
  switch (type) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900";
    case "error":
      return "border-rose-200 bg-rose-50 text-rose-900";
    case "info":
      return "border-sky-200 bg-sky-50 text-sky-900";
    default:
      return "border-slate-200 bg-slate-50 text-slate-900";
  }
}

const feedbackIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const;

type Props = {
  feedback: ActionFeedback;
  onClose: () => void;
};

export function JourneyFeedbackBanner({ feedback, onClose }: Props) {
  if (!feedback) return null;

  const Icon = feedbackIcons[feedback.type];

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${getFeedbackClasses(feedback.type)}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">{feedback.message}</div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 hover:bg-black/5"
          aria-label="Fechar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}