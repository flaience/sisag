// src/modules/schedules/Schedule.service.ts
import { ScheduleRepository } from "./Schedule.repository";
import { ScheduleSchema } from "./Schedule.schema";

export class ScheduleService {
  static list(professionalId: string) {
    return ScheduleRepository.list(professionalId);
  }

  static async create(professionalId: string, data: any) {
    const parsed = ScheduleSchema.parse(data);
    return ScheduleRepository.create(professionalId, parsed);
  }

  static async update(id: string, data: any) {
    const parsed = ScheduleSchema.parse(data);
    return ScheduleRepository.update(id, parsed);
  }

  static remove(id: string) {
    return ScheduleRepository.delete(id);
  }
}
