import type {
  AppointmentSummary,
  AvailableSlot,
  CancelAppointmentInput,
  CompleteAppointmentInput,
  ConfirmAppointmentInput,
  CreateAppointmentInput,
  FindAvailableSlotsInput,
  RescheduleAppointmentInput,
  SchedulingAppointmentState,
  SchedulingOperationContext,
  SchedulingOperationResult,
  SchedulingOperationsPort,
} from "../index";

export class SisagSchedulingAdapter implements SchedulingOperationsPort {
  async findAvailableSlots(
    _context: SchedulingOperationContext,
    _input: FindAvailableSlotsInput,
  ): Promise<SchedulingOperationResult<AvailableSlot[]>> {
    throw new Error(
      "SisagSchedulingAdapter.findAvailableSlots not implemented.",
    );
  }

  async createAppointment(
    _context: SchedulingOperationContext,
    _input: CreateAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    throw new Error(
      "SisagSchedulingAdapter.createAppointment not implemented.",
    );
  }

  async confirmAppointment(
    _context: SchedulingOperationContext,
    _input: ConfirmAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    throw new Error(
      "SisagSchedulingAdapter.confirmAppointment not implemented.",
    );
  }

  async cancelAppointment(
    _context: SchedulingOperationContext,
    _input: CancelAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    throw new Error(
      "SisagSchedulingAdapter.cancelAppointment not implemented.",
    );
  }

  async rescheduleAppointment(
    _context: SchedulingOperationContext,
    _input: RescheduleAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    throw new Error(
      "SisagSchedulingAdapter.rescheduleAppointment not implemented.",
    );
  }

  async completeAppointment(
    _context: SchedulingOperationContext,
    _input: CompleteAppointmentInput,
  ): Promise<SchedulingOperationResult<AppointmentSummary>> {
    throw new Error(
      "SisagSchedulingAdapter.completeAppointment not implemented.",
    );
  }

  async listAppointments(
    _context: SchedulingOperationContext,
    _input?: {
      state?: SchedulingAppointmentState;
      from?: string;
      to?: string;
      clientId?: string;
      professionalId?: string;
    },
  ): Promise<SchedulingOperationResult<AppointmentSummary[]>> {
    throw new Error("SisagSchedulingAdapter.listAppointments not implemented.");
  }

  async getAppointmentJourney(
    _context: SchedulingOperationContext,
    _input: {
      appointmentId: string;
    },
  ): Promise<SchedulingOperationResult<unknown>> {
    throw new Error(
      "SisagSchedulingAdapter.getAppointmentJourney not implemented.",
    );
  }
}
