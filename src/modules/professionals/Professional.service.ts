/*src/modules/professionals/Professional.service.ts*/

import { ProfessionalRepository } from "./Professional.repository";

export class ProfessionalService {
  static async list(params?: { page?: number; search?: string }) {
    return ProfessionalRepository.list(params);
  }

  static async getById(id: string) {
    return ProfessionalRepository.getById(id);
  }

  static async create(data: any) {
    return ProfessionalRepository.create(data);
  }

  static async update(id: string, data: any) {
    return ProfessionalRepository.update(id, data);
  }

  static async remove(id: string) {
    return ProfessionalRepository.remove(id);
  }
}
