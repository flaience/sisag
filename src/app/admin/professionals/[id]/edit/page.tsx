import { ProfessionalForm } from "@/components/professionals/ProfessionalForm";
export default async function EditProfessionalPage({ params }: { params: Promise<{ id: string }> }) { return <ProfessionalForm professionalId={(await params).id} />; }
