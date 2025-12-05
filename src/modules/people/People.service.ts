import { PeopleRepository } from "./People.repository";

export class PeopleService {
  static list() {
    return PeopleRepository.list();
  }

  static getById(id: string) {
    return PeopleRepository.findById(id);
  }

  static create(data: any) {
    return PeopleRepository.create(data);
  }

  static update(id: string, data: any) {
    return PeopleRepository.update(id, data);
  }

  static remove(id: string) {
    return PeopleRepository.delete(id);
  }
}
