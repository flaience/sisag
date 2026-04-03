import type { AppRole } from "@/lib/auth/permissions";

export function canManageUsers(role: AppRole) {
  return role === "owner";
}

export function canManageWhatsapp(role: AppRole) {
  return role === "owner";
}

export function canManageCompanies(role: AppRole) {
  return role === "owner";
}

export function canManageScheduling(role: AppRole) {
  return role === "owner" || role === "admin";
}

export function canManageProfessionals(role: AppRole) {
  return role === "owner" || role === "admin";
}

export function canManageAppointments(role: AppRole) {
  return role === "owner" || role === "admin";
}

export function canOperateBookings(role: AppRole) {
  return role === "owner" || role === "admin" || role === "staff";
}
