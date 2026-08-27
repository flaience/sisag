import { describe, expect, it } from "vitest";

import { parseCurrentBookingCompanyResponse } from "./Booking.current-company-response";

describe("current booking company response", () => {
  it("reads the company from the API item envelope", () => {
    expect(
      parseCurrentBookingCompanyResponse({
        ok: true,
        item: {
          id: "9af03377-1d22-40be-9460-dbe07b2709d5",
          name: "Clínica piloto",
        },
      }),
    ).toEqual({
      id: "9af03377-1d22-40be-9460-dbe07b2709d5",
      name: "Clínica piloto",
    });
  });

  it.each([
    null,
    {},
    { ok: false, item: null },
    { ok: true },
    { ok: true, item: {} },
    { ok: true, item: { id: "", name: "Clínica" } },
    { ok: true, item: { id: "company", name: "" } },
    { id: "legacy-direct-shape", name: "Clínica" },
  ])("rejects malformed response %#", (value) => {
    expect(parseCurrentBookingCompanyResponse(value)).toBeNull();
  });
});
