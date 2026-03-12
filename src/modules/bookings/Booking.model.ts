//src/modules/bookings/Booking.model.ts

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";

export type Booking = {
  id: string;

  companyId: string;
  clientId: string;

  startTime: Date;
  status: BookingStatus;

  notes: string | null;

  createdAt: Date;
  updatedAt: Date;
};

export type BookingItem = {
  id: string;

  bookingId: string;
  serviceId: string;

  durationMinutes: number;
  price: string | null; // numeric vem como string geralmente

  startTime: Date;
  endTime: Date;

  createdAt: Date;
};

export type BookingItemAllocation = {
  id: string;

  bookingItemId: string;
  resourceId: string;

  startTime: Date | null;
  endTime: Date | null;

  createdAt: Date;
};
