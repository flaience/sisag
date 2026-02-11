export type WhatsAppIntent =
  | "SCHEDULE_REQUEST"
  | "CANCEL_REQUEST"
  | "RESCHEDULE_REQUEST"
  | "HELP"
  | "UNKNOWN";

export type InterpreterSlots = {
  dateIso?: string; // YYYY-MM-DD
  time?: string; // HH:mm
};

export type InterpretResult = {
  intent: WhatsAppIntent;
  slots: InterpreterSlots;
  confidence: number; // 0..1
  normalizedText: string;
};
