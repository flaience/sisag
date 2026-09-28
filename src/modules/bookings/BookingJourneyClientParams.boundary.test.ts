import fs from "node:fs";
import { describe, expect, it } from "vitest";

const page = fs.readFileSync("src/app/admin/bookings/[id]/journey/page.tsx", "utf8");

describe("booking journey client params", () => {
  it("reads the booking id from the client router", () => {
    expect(page).toContain('useParams<{ id: string }>()');
    expect(page).toContain('typeof routeParams?.id === "string"');
    expect(page).toContain('/api/v1/bookings/${bookingId}/journey');
    expect(page).not.toContain("params.id");
  });

  it("does not call the API without a booking id", () => {
    const request = page.slice(page.indexOf("async function loadJourneyRequest"), page.indexOf("async function loadJourney(options"));
    expect(request.indexOf("if (!bookingId)")).toBeLessThan(request.indexOf("actionRequest<BookingJourneyResponse>"));
    expect(request).toContain("booking_id_required");
  });

  it("shows the API message before its machine-readable error code", () => {
    const loader = page.slice(page.indexOf("async function loadJourney(options"), page.indexOf("useEffect(() =>"));
    expect(loader.indexOf('"message" in result')).toBeLessThan(loader.indexOf('"error" in result'));
  });
});
