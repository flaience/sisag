import type { AppRole } from "@/lib/auth/permissions";

export function canConfirmBooking(role: AppRole) {
  return role === "owner" || role === "admin" || role === "staff";
}

export function canCancelBooking(role: AppRole) {
  return role === "owner" || role === "admin" || role === "staff";
}

export function canSendBookingMessage(role: AppRole) {
  return role === "owner" || role === "admin" || role === "staff";
}

export function canRescheduleBooking(role: AppRole) {
  return role === "owner" || role === "admin";
}

export function canRecreateBooking(role: AppRole) {
  return role === "owner" || role === "admin";
}
