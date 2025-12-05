import { CompanyRepository } from "./Company.repository";

export class CompanyService {
  static list() {
    return CompanyRepository.findAll();
  }

  static getById(id: string) {
    return CompanyRepository.findById(id);
  }

  static create(data: any) {
    return CompanyRepository.create(data);
  }

  static update(id: string, data: any) {
    return CompanyRepository.update(id, data);
  }

  static remove(id: string) {
    return CompanyRepository.delete(id);
  }
}
