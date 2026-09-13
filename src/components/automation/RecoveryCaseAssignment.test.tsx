import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { RecoveryCaseAssignment } from "./RecoveryCaseAssignment";
describe("recovery assignment display", () => {
 it("shows an unassigned case", () => expect(renderToStaticMarkup(<RecoveryCaseAssignment assignedTo={null} assignedName="ignored" />)).toContain("Sem responsável"));
 it("shows the assigned profile name", () => expect(renderToStaticMarkup(<RecoveryCaseAssignment assignedTo="user-b" assignedName="SISAG TESTE B" />)).toContain("Responsável: SISAG TESTE B"));
 it("keeps assignment visible without a profile name", () => expect(renderToStaticMarkup(<RecoveryCaseAssignment assignedTo="user-b" assignedName={null} />)).toContain("Responsável (ID): user-b"));
});
