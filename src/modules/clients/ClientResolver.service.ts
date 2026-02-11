import { ClientRepository } from "./Client.repository";

export class ClientResolverService {
  async resolveOrCreate(params: {
    companyId: string;
    phoneE164: string;
    name?: string | null;
  }) {
    const existing = await ClientRepository.findByPhoneE164(
      params.companyId,
      params.phoneE164,
    );

    if (existing) return existing;

    return ClientRepository.createFromWhatsApp({
      companyId: params.companyId,
      phoneE164: params.phoneE164,
      name: params.name ?? "Cliente WhatsApp",
    });
  }
}
