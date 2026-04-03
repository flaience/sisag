import { actionRequest } from "@/lib/ui/actionRequest";

export async function sendSuggestedMessageRequest(params: {
  bookingId: string;
  type: "pre" | "post";
}) {
  return await actionRequest<{
    ok: true;
    bookingId: string;
    type: "pre" | "post";
    message: string;
    toPhone: string;
  }>(`/api/v1/bookings/${params.bookingId}/send-message`, {
    method: "POST",
    body: JSON.stringify({
      type: params.type,
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function confirmBookingRequest(bookingId: string) {
  return await actionRequest<{
    ok: true;
    bookingId: string;
    startTime: string;
    message: string;
  }>(`/api/v1/bookings/${bookingId}/confirm`, {
    method: "POST",
  });
}

export async function cancelBookingRequest(bookingId: string) {
  return await actionRequest<{
    ok: true;
    bookingId: string;
    startTime: string;
    message: string;
  }>(`/api/v1/bookings/${bookingId}/cancel`, {
    method: "POST",
  });
}

export async function rescheduleBookingRequest(params: {
  bookingId: string;
  newStartTime: string;
  reason?: string | null;
}) {
  return await actionRequest<{
    ok: true;
    bookingId: string;
    oldStartTime: string;
    newStartTime: string;
    status: string;
    message: string;
  }>(`/api/v1/bookings/${params.bookingId}/reschedule`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newStartTime: params.newStartTime,
      reason: params.reason ?? null,
    }),
  });
}

export async function recreateBookingRequest(params: {
  bookingId: string;
  newStartTime: string;
  reason?: string | null;
}) {
  return await actionRequest<{
    ok: true;
    originalBookingId: string;
    newBookingId: string;
    startTime: string;
    status: string;
    message: string;
  }>(`/api/v1/bookings/${params.bookingId}/recreate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      newStartTime: params.newStartTime,
      reason: params.reason ?? null,
    }),
  });
}
