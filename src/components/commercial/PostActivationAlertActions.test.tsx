import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@/app/platform/commercial/post-activation/actions", () => ({
  performPostActivationAlertAction: vi.fn(),
}));

import { PostActivationAlertActions } from "./PostActivationAlertActions";

const baseProps = {
  onboardingId: "23164020-8778-4226-afed-189e8d2333cc",
  alertKey: "23164020-8778-4226-afed-189e8d2333cc:human_escalation:welcome",
};

describe("PostActivationAlertActions", () => {
  it("offers acknowledgement for a new alert", () => {
    const html = renderToStaticMarkup(
      <PostActivationAlertActions {...baseProps} lifecycle="new" />,
    );

    expect(html).toContain("Reconhecer");
    expect(html).not.toContain("Resolver");
  });

  it("offers resolution for an acknowledged alert", () => {
    const html = renderToStaticMarkup(
      <PostActivationAlertActions {...baseProps} lifecycle="acknowledged" />,
    );

    expect(html).toContain("Resolver");
    expect(html).not.toContain("Reconhecer");
  });
});
