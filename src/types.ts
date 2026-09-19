export type UserRole = "patient" | "doctor" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  phone?: string;
  specialty?: string;
  bio?: string;
  photo?: string;
  active?: boolean;
  availability?: Availability[];
}

export interface Availability {
  id: string;
  doctorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

export interface LeaveDay {
  id: string;
  doctorId: string;
  date: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "Pending" | "Confirmed" | "Rejected" | "Cancelled" | "Completed" | "No-show";
  visitNote?: string;
  patientName: string;
  patientPhone?: string;
  patientEmail: string;
  doctorName: string;
  specialty?: string;
  actionByDoctorId?: string;
  actionByDoctorName?: string;
  confirmedByDoctorId?: string;
  confirmedByDoctorName?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  reviewedAt?: number;
  createdAt: number;
  updatedAt: number;
}

export type SlotStatus = "Available" | "Selected" | "Booked" | "Past" | "Unavailable" | "Doctor on Leave" | "Conflict";

export interface DoctorAvailabilitySlot {
  startTime: string;
  endTime: string;
  timeFormatted?: string;
  isFree: boolean;
  status?: SlotStatus;
  reason?: string;
  conflictDoctorName?: string;
}
