import React from "react";
export function RecoveryCaseAssignment({ assignedTo, assignedName }: { assignedTo: string | null; assignedName?: string | null }) {
 return <p className="mt-2 text-sm font-medium">{!assignedTo ? "Sem responsável" : assignedName?.trim() ? "Responsável: " + assignedName : "Responsável (ID): " + assignedTo}</p>;
}
