export type ServiceAttendanceMode = "scheduled_time" | "arrival_order";

export type ServiceAttendancePolicy = {
  mode: ServiceAttendanceMode;
  requiresExactTime: boolean;
  requiresServicePeriod: boolean;
  queuePositionAssignedAtCheckIn: boolean;
};

const policies: Record<ServiceAttendanceMode, ServiceAttendancePolicy> = {
  scheduled_time: {
    mode: "scheduled_time",
    requiresExactTime: true,
    requiresServicePeriod: false,
    queuePositionAssignedAtCheckIn: false,
  },
  arrival_order: {
    mode: "arrival_order",
    requiresExactTime: false,
    requiresServicePeriod: true,
    queuePositionAssignedAtCheckIn: true,
  },
};

export function getServiceAttendancePolicy(mode: ServiceAttendanceMode): ServiceAttendancePolicy {
  return policies[mode];
}
