// src/modules/schedules/Schedule.model.ts
export type Schedule = {
  id: string;
  professionalId: string;
  weekday: number; // 0-6
  startTime: string; // "08:00"
  endTime: string; // "12:00"
  createdAt: Date;
};
