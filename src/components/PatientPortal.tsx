import React, { useEffect, useState } from "react";
import { User, Appointment, DoctorAvailabilitySlot, SlotStatus } from "../types";
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, ArrowRight, Stethoscope, RefreshCw, Eye, Info, UserCheck, CalendarOff, Phone, FileText, Lock, ShieldCheck, Ban } from "lucide-react";
import { formatTime12, formatTimeRange12, getDayOfWeekFromDateStr, parseTimeTo24, add30Minutes } from "../utils/time";

interface PatientPortalProps {
  currentUser: User;
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ currentUser }) => {
  const [subTab, setSubTab] = useState<"dashboard" | "doctors" | "book" | "appointments" | "history">("dashboard");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  // Booking state
  const [selectedDoctor, setSelectedDoctor] = useState<User | null>(null);
  const [bookingDate, setBookingDate] = useState<string>("");
  const [slotsState, setSlotsState] = useState<{
    slots: DoctorAvailabilitySlot[];
    isLeave?: boolean;
    isUnavailable?: boolean;
    isInactive?: boolean;
    message?: string;
  }>({ slots: [] });
  const [selectedSlot, setSelectedSlot] = useState<DoctorAvailabilitySlot | null>(null);
  const [hidePastSlots, setHidePastSlots] = useState<boolean>(true);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Custom written time state (Booking)
  const [writtenTime, setWrittenTime] = useState<string>("");
  const [customTimeCheckResult, setCustomTimeCheckResult] = useState<{
    status: "idle" | "available" | "unavailable" | "invalid" | "suggest";
    message: string;
    slot?: DoctorAvailabilitySlot;
    suggestedSlots?: DoctorAvailabilitySlot[];
  } | null>(null);

  // Reschedule state
  const [reschedulingApt, setReschedulingApt] = useState<Appointment | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newSlotsState, setNewSlotsState] = useState<{
    slots: DoctorAvailabilitySlot[];
    isLeave?: boolean;
    isUnavailable?: boolean;
    isInactive?: boolean;
    message?: string;
  }>({ slots: [] });
  const [selectedNewSlot, setSelectedNewSlot] = useState<DoctorAvailabilitySlot | null>(null);
  const [rescheduleError, setRescheduleError] = useState("");

  // Custom written time state (Reschedule)
  const [rescheduleWrittenTime, setRescheduleWrittenTime] = useState<string>("");
  const [rescheduleTimeCheckResult, setRescheduleTimeCheckResult] = useState<{
    status: "idle" | "available" | "unavailable" | "invalid" | "suggest";
    message: string;
    slot?: DoctorAvailabilitySlot;
    suggestedSlots?: DoctorAvailabilitySlot[];
  } | null>(null);

  // Cancel dialog
  const [cancellingApt, setCancellingApt] = useState<Appointment | null>(null);
  const [cancelError, setCancelError] = useState("");

  const fetchData = async () => {
    try {
      const [aptRes, docRes] = await Promise.all([
        fetch(`/api/patient/${currentUser.id}/appointments`),
        fetch(`/api/patient/doctors`)
      ]);
      const aptData = aptRes.ok ? await aptRes.json() : null;
      const docData = docRes.ok ? await docRes.json() : null;
      if (aptData && aptData.success) setAppointments(aptData.appointments);
      if (docData && docData.success) setDoctors(docData.doctors);
    } catch (err) {
      console.error("Error loading patient portal data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.id]);

  // Fetch slots when doctor and date change
  useEffect(() => {
    if (selectedDoctor && bookingDate) {
      fetch(`/api/patient/doctors/${selectedDoctor.id}/slots?date=${bookingDate}&patientId=${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSlotsState({
              slots: data.slots || [],
              isLeave: data.isLeave,
              isUnavailable: data.isUnavailable,
              isInactive: data.isInactive,
              message: data.message
            });
            setSelectedSlot(null);
          }
        })
        .catch(() => {
          setSlotsState({ slots: [], message: "Failed to load slots." });
        });
    } else {
      setSlotsState({ slots: [] });
      setSelectedSlot(null);
    }
  }, [selectedDoctor, bookingDate, currentUser.id]);

  // Fetch slots for rescheduling
  useEffect(() => {
    if (reschedulingApt && newDate) {
      fetch(`/api/patient/doctors/${reschedulingApt.doctorId}/slots?date=${newDate}&patientId=${currentUser.id}&excludeAptId=${reschedulingApt.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setNewSlotsState({
              slots: data.slots || [],
              isLeave: data.isLeave,
              isUnavailable: data.isUnavailable,
              isInactive: data.isInactive,
              message: data.message
            });
            setSelectedNewSlot(null);
          }
        })
        .catch(() => {
          setNewSlotsState({ slots: [], message: "Failed to load slots." });
        });
    } else {
      setNewSlotsState({ slots: [] });
      setSelectedNewSlot(null);
    }
  }, [reschedulingApt, newDate, currentUser.id]);

  // Clear custom time check when doctor or date changes
  useEffect(() => {
    setWrittenTime("");
    setCustomTimeCheckResult(null);
  }, [selectedDoctor?.id, bookingDate]);

  // Clear custom time check for reschedule when date or apt changes
  useEffect(() => {
    setRescheduleWrittenTime("");
    setRescheduleTimeCheckResult(null);
  }, [newDate, reschedulingApt?.id]);

  const evaluateCustomTime = (
    rawTime: string,
    doctor: User | null,
    date: string,
    slots: DoctorAvailabilitySlot[],
    isLeave?: boolean,
    isUnavailable?: boolean,
    isInactive?: boolean
  ) => {
    if (!rawTime || !rawTime.trim()) {
      return {
        status: "idle" as const,
        message: "Please write or select a time to check Dr. availability."
      };
    }

    const parsed = parseTimeTo24(rawTime);
    if (!parsed) {
      return {
        status: "invalid" as const,
        message: "Invalid time format. Please write time like 10:30 AM, 2:30 PM, or 14:00."
      };
    }

    const docName = doctor ? doctor.name : "Doctor";
    const dayName = date ? getDayOfWeekFromDateStr(date) : "";

    if (isInactive || doctor?.active === false) {
      return {
        status: "unavailable" as const,
        message: `This doctor is not active: Dr. ${docName} is currently deactivated and cannot accept appointment bookings.`
      };
    }

    if (isLeave) {
      return {
        status: "unavailable" as const,
        message: `Doctor is NOT available at this slot: Dr. ${docName} is marked on leave on ${date}. No appointments are available on this date.`
      };
    }

    if (isUnavailable) {
      return {
        status: "unavailable" as const,
        message: `Doctor is NOT available at this slot: Dr. ${docName} has no scheduled working hours on ${dayName}s.`
      };
    }

    const docSchedule = doctor?.availability?.find(a => a.dayOfWeek === dayName);
    if (!docSchedule) {
      return {
        status: "unavailable" as const,
        message: `Doctor is NOT available at this slot: Dr. ${docName} has no scheduled working hours on ${dayName}s.`
      };
    }

    // Check if requested time is outside working hours
    const endTime = add30Minutes(parsed);
    if (parsed < docSchedule.startTime || endTime > docSchedule.endTime) {
      return {
        status: "unavailable" as const,
        message: `Doctor is NOT available at this slot (${formatTime12(parsed)}): Outside working hours. Dr. ${docName}'s consultation hours on ${dayName} are ${formatTimeRange12(docSchedule.startTime, docSchedule.endTime)}.`
      };
    }

    // Check if requested slot has already passed today
    const today = new Date().toISOString().split("T")[0];
    if (date === today) {
      const slotDateTime = new Date(`${date}T${parsed}:00`).getTime();
      if (slotDateTime <= Date.now()) {
        return {
          status: "unavailable" as const,
          message: `Doctor is NOT available at this slot (${formatTime12(parsed)}): This consultation time has already passed today.`
        };
      }
    }

    // Check exact slot in slots array
    const exactSlot = slots.find(s => s.startTime === parsed);
    if (exactSlot) {
      if (exactSlot.status === "Booked" || (!exactSlot.isFree && exactSlot.status !== "Conflict")) {
        return {
          status: "unavailable" as const,
          message: `Doctor is NOT available at this slot (${formatTime12(parsed)}): This slot has already been booked by another patient.`,
          slot: exactSlot
        };
      }
      if (exactSlot.status === "Conflict") {
        return {
          status: "unavailable" as const,
          message: `Doctor is NOT available at this slot (${formatTime12(parsed)}): Appointment Conflict. You already have an appointment scheduled at this time with ${exactSlot.conflictDoctorName || 'another doctor'}.`,
          slot: exactSlot
        };
      }
      if (exactSlot.status === "Past") {
        return {
          status: "unavailable" as const,
          message: `Doctor is NOT available at this slot (${formatTime12(parsed)}): This consultation time has already passed today.`,
          slot: exactSlot
        };
      }
      if (exactSlot.isFree) {
        return {
          status: "available" as const,
          message: `Dr. ${docName} is AVAILABLE at this slot (${formatTime12(exactSlot.startTime)} – ${formatTime12(exactSlot.endTime)})!`,
          slot: exactSlot
        };
      }
    }

    // If time is not on 30-minute boundary (e.g. 10:15)
    const [hStr, mStr] = parsed.split(":");
    const m = parseInt(mStr, 10);
    if (m !== 0 && m !== 30) {
      const lowerMin = Math.floor(m / 30) * 30;
      const lowerTime = `${hStr}:${lowerMin.toString().padStart(2, "0")}`;
      const upperMin = (Math.floor(m / 30) + 1) * 30;
      const upperHour = upperMin >= 60 ? (parseInt(hStr, 10) + 1).toString().padStart(2, "0") : hStr;
      const upperTime = `${upperHour}:${(upperMin % 60).toString().padStart(2, "0")}`;

      const lowerSlot = slots.find(s => s.startTime === lowerTime);
      const upperSlot = slots.find(s => s.startTime === upperTime);
      const suggested = [lowerSlot, upperSlot].filter((s): s is DoctorAvailabilitySlot => Boolean(s));

      return {
        status: "suggest" as const,
        message: `Consultations are scheduled in 30-minute intervals. Would you like to check ${formatTime12(lowerTime)} or ${formatTime12(upperTime)}?`,
        suggestedSlots: suggested
      };
    }

    return {
      status: "unavailable" as const,
      message: `Doctor is NOT available at this slot (${formatTime12(parsed)}): Outside available consultation slots.`
    };
  };

  const handleCheckWrittenTime = (timeVal?: string) => {
    const val = timeVal !== undefined ? timeVal : writtenTime;
    if (!val.trim()) {
      setCustomTimeCheckResult({
        status: "idle",
        message: "Please write or select a time first."
      });
      return;
    }
    const result = evaluateCustomTime(
      val,
      selectedDoctor,
      bookingDate,
      slotsState.slots,
      slotsState.isLeave,
      slotsState.isUnavailable,
      slotsState.isInactive
    );
    setCustomTimeCheckResult(result);
  };

  const handleCheckRescheduleWrittenTime = (timeVal?: string) => {
    const val = timeVal !== undefined ? timeVal : rescheduleWrittenTime;
    if (!val.trim()) {
      setRescheduleTimeCheckResult({
        status: "idle",
        message: "Please write or select a time first."
      });
      return;
    }
    const doc = doctors.find(d => d.id === reschedulingApt?.doctorId) || null;
    const result = evaluateCustomTime(
      val,
      doc,
      newDate,
      newSlotsState.slots,
      newSlotsState.isLeave,
      newSlotsState.isUnavailable,
      newSlotsState.isInactive
    );
    setRescheduleTimeCheckResult(result);
  };

  const handleRequestAppointment = async () => {
    if (!selectedDoctor || !bookingDate || !selectedSlot) return;
    setBookingError("");

    // Client-side conflict check to ensure patient doesn't double book with another doctor
    const existingConflict = appointments.find(
      a => a.date === bookingDate &&
           a.startTime === selectedSlot.startTime &&
           (a.status === "Pending" || a.status === "Confirmed")
    );
    if (existingConflict) {
      setBookingError(
        `Appointment Conflict: You already have an appointment with ${existingConflict.doctorName} on ${bookingDate} at ${formatTime12(existingConflict.startTime)}. You cannot book another appointment at the same time.`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/patient/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: currentUser.id,
          doctorId: selectedDoctor.id,
          date: bookingDate,
          startTime: selectedSlot.startTime
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to book appointment");
      }
      setBookingSuccess(true);
      fetchData();
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (aptId: string) => {
    setCancelError("");
    try {
      const res = await fetch(`/api/patient/appointments/${aptId}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId: currentUser.id })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to cancel appointment");
      }
      setCancellingApt(null);
      fetchData();
    } catch (err: any) {
      setCancelError(err.message);
    }
  };

  const handleReschedule = async () => {
    if (!reschedulingApt || !newDate || !selectedNewSlot) return;
    setRescheduleError("");
    try {
      const res = await fetch(`/api/patient/appointments/${reschedulingApt.id}/reschedule`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: currentUser.id,
          newDate,
          newStartTime: selectedNewSlot.startTime
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to reschedule appointment");
      }
      setReschedulingApt(null);
      setNewDate("");
      setSelectedNewSlot(null);
      fetchData();
    } catch (err: any) {
      setRescheduleError(err.message);
    }
  };

  const upcomingApt = appointments.find(
    a => (a.status === "Pending" || a.status === "Confirmed") &&
         new Date(`${a.date}T${a.startTime}:00`).getTime() >= Date.now()
  );

  const pendingCount = appointments.filter(a => a.status === "Pending").length;
  const confirmedCount = appointments.filter(a => a.status === "Confirmed").length;
  const completedCount = appointments.filter(a => a.status === "Completed").length;
  const cancelledCount = appointments.filter(a => a.status === "Cancelled" || a.status === "Rejected").length;

  const todayStr = new Date().toISOString().split("T")[0];

  const getSlotDisplayStatus = (slot: DoctorAvailabilitySlot, isSelected: boolean): SlotStatus => {
    if (isSelected) return "Selected";
    if (slot.status === "Past") return "Past";
    if (slot.status === "Conflict") return "Conflict";
    if (!slot.isFree || slot.status === "Booked") return "Booked";
    return "Available";
  };

  const selectedDayOfWeek = bookingDate ? getDayOfWeekFromDateStr(bookingDate) : "";
  const selectedDoctorDaySchedule = selectedDoctor?.availability?.find(a => a.dayOfWeek === selectedDayOfWeek);

  const displayedSlots = hidePastSlots
    ? slotsState.slots.filter(s => s.status !== "Past")
    : slotsState.slots;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Patient Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">Patient Portal</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Welcome, {currentUser.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 mt-1.5">
            <span>{currentUser.email}</span>
            {currentUser.phone && (
              <>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center space-x-1 text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-medium">
                  <Phone className="w-3 h-3 text-teal-600" />
                  <span>{currentUser.phone}</span>
                </span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Book appointments, track consultation statuses, and view complete doctor weekly schedules.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setSelectedDoctor(null);
              setBookingDate("");
              setSelectedSlot(null);
              setBookingSuccess(false);
              setSubTab("book");
            }}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all shadow-md cursor-pointer flex items-center space-x-2"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Sub navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-4 overflow-x-auto">
        <button
          onClick={() => setSubTab("dashboard")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "dashboard" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Dashboard Overview
        </button>
        <button
          onClick={() => setSubTab("doctors")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "doctors" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Clinic Doctors ({doctors.length})
        </button>
        <button
          onClick={() => setSubTab("book")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "book" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Book Appointment
        </button>
        <button
          onClick={() => setSubTab("appointments")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "appointments" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          My Appointments ({appointments.length})
        </button>
        <button
          onClick={() => setSubTab("history")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "history" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Visit History ({completedCount})
        </button>
      </div>

      {/* Dashboard View */}
      {subTab === "dashboard" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</span>
              <div className="text-3xl font-extrabold text-amber-600">{pendingCount}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirmed</span>
              <div className="text-3xl font-extrabold text-teal-600">{confirmedCount}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed</span>
              <div className="text-3xl font-extrabold text-blue-600">{completedCount}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancelled / Rejected</span>
              <div className="text-3xl font-extrabold text-rose-600">{cancelledCount}</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Upcoming Appointment</h2>
            {upcomingApt ? (
              <div className="bg-teal-50/50 border border-teal-100 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-block px-2.5 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded-lg">
                    {upcomingApt.status}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{upcomingApt.doctorName}</h3>
                  <p className="text-xs text-teal-700 font-medium">{upcomingApt.specialty}</p>
                  <div className="flex items-center space-x-4 text-xs text-slate-600 pt-1">
                    <span className="flex items-center space-x-1"><Calendar className="w-4 h-4 text-teal-600" /><span>{upcomingApt.date}</span></span>
                    <span className="flex items-center space-x-1"><Clock className="w-4 h-4 text-teal-600" /><span>{formatTimeRange12(upcomingApt.startTime, upcomingApt.endTime)}</span></span>
                  </div>
                </div>
                <button
                  onClick={() => setSubTab("appointments")}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  Manage Appointment
                </button>
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <p className="text-sm text-slate-500">You don't have any upcoming appointments.</p>
                <button
                  onClick={() => setSubTab("book")}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all shadow-md cursor-pointer"
                >
                  Book an Appointment
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Doctors Tab */}
      {subTab === "doctors" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Clinic Doctors & Weekly Availability</h2>
              <p className="text-xs text-slate-500">Select any of our five clinic doctors to view their working schedule and book a consultation slot.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map(doc => {
              const isInactive = doc.active === false;
              return (
                <div
                  key={doc.id}
                  className={`rounded-3xl p-6 border shadow-sm space-y-4 flex flex-col justify-between transition-all ${
                    isInactive ? "bg-slate-50/70 border-rose-200/90 shadow-xs" : "bg-white border-slate-200"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center space-x-4">
                      <div className={`w-14 h-14 rounded-2xl text-white font-bold text-lg flex items-center justify-center shadow-sm ${
                        isInactive ? "bg-slate-400" : "bg-teal-600"
                      }`}>
                        {doc.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{doc.name}</h3>
                        <div className="flex flex-wrap gap-1.5 items-center mt-1">
                          <span className="text-xs text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded-md inline-block">
                            {doc.specialty}
                          </span>
                          {isInactive && (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[11px] rounded-full">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>This doctor is not active</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isInactive && (
                      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-900 flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold block text-rose-950">This doctor is not active</span>
                          <span className="text-[11px] text-rose-800 leading-snug">
                            Dr. {doc.name} is currently deactivated by clinic administration and cannot accept new bookings.
                          </span>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-600 leading-relaxed">{doc.bio}</p>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                      <span className="font-bold text-slate-700 flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>Weekly Schedule:</span>
                      </span>
                      {doc.availability && doc.availability.length > 0 ? (
                        <div className="space-y-1 text-[11px] text-slate-600">
                          {doc.availability.map(av => (
                            <div key={av.id} className="flex justify-between">
                              <span className="font-medium text-slate-700">{av.dayOfWeek}:</span>
                              <span className="font-semibold text-teal-700">{formatTimeRange12(av.startTime, av.endTime)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400">No working hours defined.</p>
                      )}
                    </div>
                  </div>

                  {isInactive ? (
                    <button
                      type="button"
                      disabled
                      className="w-full bg-rose-50 text-rose-700 border border-rose-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 cursor-not-allowed opacity-90"
                    >
                      <Ban className="w-3.5 h-3.5 text-rose-500" />
                      <span>This doctor is not active</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedDoctor(doc);
                        setBookingDate("");
                        setSelectedSlot(null);
                        setSubTab("book");
                      }}
                      className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm flex items-center justify-center space-x-1.5"
                    >
                      <span>Book with {doc.name}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Book Appointment Step-by-Step */}
      {subTab === "book" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Book an Appointment</h2>
            <p className="text-xs text-slate-500">
              Appointments are strictly divided into 30-minute consultation slots during the doctor's working hours.
            </p>
          </div>

          {bookingSuccess ? (
            <div className="bg-teal-50 border border-teal-200 rounded-3xl p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-teal-600 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Appointment Requested</h3>
              <div className="inline-block px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full">
                Status: Pending
              </div>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Your appointment request has been submitted successfully and is waiting for the doctor's confirmation.
              </p>
              <button
                onClick={() => {
                  setBookingSuccess(false);
                  setSelectedDoctor(null);
                  setBookingDate("");
                  setSelectedSlot(null);
                  setSubTab("appointments");
                }}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all cursor-pointer shadow-md"
              >
                View My Appointments
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Step 1: Choose Doctor */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-extrabold">1</span>
                    <span>Choose Doctor ({doctors.length} Doctors)</span>
                  </h3>
                  {selectedDoctor && (
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      selectedDoctor.active === false
                        ? "text-rose-700 bg-rose-50 border border-rose-200"
                        : "text-teal-700 bg-teal-50"
                    }`}>
                      Selected: {selectedDoctor.name} {selectedDoctor.active === false ? "• This doctor is not active" : ""}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {doctors.map(doc => {
                    const isSelected = selectedDoctor?.id === doc.id;
                    const isInactive = doc.active === false;
                    return (
                      <div
                        key={doc.id}
                        onClick={() => {
                          setSelectedDoctor(doc);
                          setBookingDate("");
                          setSelectedSlot(null);
                          setBookingError("");
                        }}
                        className={`p-5 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                          isSelected
                            ? isInactive
                              ? "border-rose-400 bg-rose-50/50 ring-2 ring-rose-400/20 shadow-sm"
                              : "border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20 shadow-sm"
                            : isInactive
                            ? "border-rose-200 bg-slate-50/70 hover:border-rose-300"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-sm text-slate-900 block">{doc.name}</span>
                            <span className="text-xs font-semibold text-teal-600 block">{doc.specialty}</span>
                          </div>
                          {isSelected && (
                            <CheckCircle2 className={`w-4 h-4 shrink-0 ${isInactive ? "text-rose-600" : "text-teal-600"}`} />
                          )}
                        </div>

                        {isInactive ? (
                          <div className="space-y-1 pt-1">
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 font-extrabold text-[11px] rounded-full">
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>This doctor is not active</span>
                            </span>
                          </div>
                        ) : (
                          <div className="text-[11px] text-slate-500 pt-1">
                            {doc.availability && doc.availability.length > 0
                              ? `${doc.availability.map(a => a.dayOfWeek.slice(0, 3)).join(", ")} availability`
                              : "No schedule set"}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inactive Doctor Notice if selected */}
              {selectedDoctor && selectedDoctor.active === false && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 text-rose-950 space-y-3 shadow-xs">
                  <div className="flex items-start space-x-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-extrabold text-rose-950">
                          This doctor is not active
                        </h4>
                        <span className="bg-rose-200 text-rose-900 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                          Unavailable
                        </span>
                      </div>
                      <p className="text-xs text-rose-900 font-medium leading-relaxed">
                        Dr. {selectedDoctor.name} ({selectedDoctor.specialty}) has been deactivated by clinic administration. This doctor is not active and cannot accept new appointment requests or consultation bookings.
                      </p>
                      <p className="text-xs text-rose-800 font-semibold">
                        Please select an active doctor from the list above to proceed with booking.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Choose Date */}
              {selectedDoctor && selectedDoctor.active !== false && (
                <div className="space-y-4 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-extrabold">2</span>
                      <span>Choose Consultation Date</span>
                    </h3>
                    {bookingDate && (
                      <span className="text-xs text-slate-600 font-semibold">
                        Day: <strong className="text-slate-900">{selectedDayOfWeek}</strong>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <input
                      type="date"
                      min={todayStr}
                      value={bookingDate}
                      onChange={e => {
                        setBookingDate(e.target.value);
                        setSelectedSlot(null);
                      }}
                      className="px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-600 bg-white w-full sm:w-64"
                    />

                    {selectedDoctorDaySchedule ? (
                      <div className="text-xs text-teal-800 bg-teal-50 px-4 py-2.5 rounded-xl border border-teal-100 font-medium">
                        Working Hours on {selectedDayOfWeek}: <strong>{formatTimeRange12(selectedDoctorDaySchedule.startTime, selectedDoctorDaySchedule.endTime)}</strong>
                      </div>
                    ) : bookingDate ? (
                      <div className="text-xs text-amber-800 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200 font-medium">
                        {selectedDoctor.name} has no scheduled working hours on {selectedDayOfWeek}.
                      </div>
                    ) : null}
                  </div>

                  {/* Inform user if they already have scheduled appointments on this date */}
                  {bookingDate && appointments.some(a => a.date === bookingDate && ["Pending", "Confirmed"].includes(a.status)) && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <span className="font-bold">Notice: You have existing appointments scheduled on this date:</span>
                        <div className="space-y-0.5">
                          {appointments
                            .filter(a => a.date === bookingDate && ["Pending", "Confirmed"].includes(a.status))
                            .map(a => (
                              <div key={a.id} className="text-amber-800 font-medium">
                                • {formatTime12(a.startTime)} to {formatTime12(a.endTime)} with {a.doctorName} ({a.status})
                              </div>
                            ))}
                        </div>
                        <p className="text-[11px] text-amber-700">
                          Overlapping slots with another doctor will be automatically locked to prevent double-booking.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Choose Available Time (30-min slots) */}
              {selectedDoctor && bookingDate && (
                <div className="space-y-5 pt-6 border-t border-slate-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-xs font-extrabold">3</span>
                      <span>Select Consultation Time Slot</span>
                    </h3>

                    {/* Filter Past Slots Toggle */}
                    {bookingDate === todayStr && slotsState.slots.some(s => s.status === "Past") && (
                      <label className="flex items-center space-x-2 text-xs text-slate-600 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={hidePastSlots}
                          onChange={e => setHidePastSlots(e.target.checked)}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>Hide slots that have already passed</span>
                      </label>
                    )}
                  </div>

                  {/* Feature: Patient Write Time & Instant Availability Checker */}
                  <div className="bg-gradient-to-r from-teal-50/70 via-white to-slate-50 border border-teal-200/90 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            Write / Enter Preferred Time
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Type or select your desired consultation time. We will instantly verify if Dr. {selectedDoctor.name} is available.
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] font-bold text-teal-800 bg-teal-100/80 px-2.5 py-1 rounded-full w-fit">
                        Live Availability Check
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Write time (e.g. 10:30 AM, 2:30 PM, or 14:00)"
                          value={writtenTime}
                          onChange={e => {
                            const val = e.target.value;
                            setWrittenTime(val);
                            if (val.trim()) {
                              handleCheckWrittenTime(val);
                            } else {
                              setCustomTimeCheckResult(null);
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCheckWrittenTime();
                            }
                          }}
                          className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-600 bg-white"
                        />
                        <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center">
                          <input
                            type="time"
                            step="1800"
                            title="Pick from clock"
                            onChange={e => {
                              if (e.target.value) {
                                const formatted = formatTime12(e.target.value);
                                setWrittenTime(formatted);
                                handleCheckWrittenTime(formatted);
                              }
                            }}
                            className="w-6 h-6 opacity-60 hover:opacity-100 cursor-pointer bg-transparent"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCheckWrittenTime()}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer shrink-0"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>Check Availability</span>
                      </button>
                    </div>

                    {/* Quick Pick Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Quick Picks:</span>
                      {["09:00 AM", "10:30 AM", "11:30 AM", "02:00 PM", "03:30 PM", "05:00 PM"].map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setWrittenTime(t);
                            handleCheckWrittenTime(t);
                          }}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                            writtenTime === t
                              ? "bg-teal-600 text-white border-teal-600"
                              : "bg-white text-slate-600 border-slate-200 hover:border-teal-400 hover:bg-teal-50/40"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>

                    {/* Live Availability Feedback */}
                    {customTimeCheckResult && (
                      <div className="pt-1">
                        {customTimeCheckResult.status === "available" && customTimeCheckResult.slot && (
                          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                            <div className="flex items-start space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                                <CheckCircle2 className="w-5 h-5" />
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-2">
                                  <h5 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">
                                    Doctor is AVAILABLE at this slot!
                                  </h5>
                                  <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.2 rounded-md">
                                    Slot Open
                                  </span>
                                </div>
                                <p className="text-xs text-emerald-900 font-medium">
                                  {customTimeCheckResult.message}
                                </p>
                                <div className="text-[11px] text-emerald-700">
                                  Doctor: <strong>Dr. {selectedDoctor.name}</strong> • Date: <strong>{bookingDate}</strong> • Slot: <strong>{formatTime12(customTimeCheckResult.slot.startTime)} – {formatTime12(customTimeCheckResult.slot.endTime)}</strong>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (customTimeCheckResult.slot) {
                                  setSelectedSlot(customTimeCheckResult.slot);
                                  setBookingError("");
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all shadow-sm shrink-0 cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Select & Use this Slot</span>
                            </button>
                          </div>
                        )}

                        {customTimeCheckResult.status === "unavailable" && (
                          <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 flex items-start space-x-3 shadow-xs">
                            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                              <XCircle className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <h5 className="text-xs font-extrabold text-rose-950 uppercase tracking-wider">
                                  Doctor is NOT Available at this Slot
                                </h5>
                                <span className="text-[10px] font-extrabold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                                  Unavailable
                                </span>
                              </div>
                              <p className="text-xs text-rose-900 font-semibold leading-relaxed">
                                {customTimeCheckResult.message}
                              </p>
                              <p className="text-[11px] text-rose-700">
                                Please try writing another time or choose from the available green slots in the schedule below.
                              </p>
                            </div>
                          </div>
                        )}

                        {customTimeCheckResult.status === "suggest" && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2.5">
                            <div className="flex items-start space-x-2.5">
                              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                              <p className="text-xs text-blue-950 font-semibold">{customTimeCheckResult.message}</p>
                            </div>
                            {customTimeCheckResult.suggestedSlots && customTimeCheckResult.suggestedSlots.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {customTimeCheckResult.suggestedSlots.map(s => {
                                  const isFree = s.isFree && s.status === "Available";
                                  return (
                                    <button
                                      key={s.startTime}
                                      type="button"
                                      onClick={() => {
                                        const formatted = formatTime12(s.startTime);
                                        setWrittenTime(formatted);
                                        handleCheckWrittenTime(formatted);
                                      }}
                                      className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                        isFree
                                          ? "bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                                          : "bg-slate-100 text-slate-500 border-slate-200 line-through"
                                      }`}
                                    >
                                      {formatTime12(s.startTime)} ({isFree ? "Available" : s.status})
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {customTimeCheckResult.status === "invalid" && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start space-x-2.5 text-xs text-amber-900">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>{customTimeCheckResult.message}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Section Divider & Slot Grid Header */}
                  <div className="pt-2">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>Or Choose from 30-Minute Schedule</span>
                      <span className="text-[11px] font-normal text-slate-400">Click any available slot</span>
                    </div>

                    {/* Status Legend Bar */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs mb-3">
                      <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider mr-1">Slot Legend:</span>
                      <span className="inline-flex items-center space-x-1.5 bg-white border border-emerald-300 px-2.5 py-1 rounded-lg text-emerald-800 font-semibold shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span>Available</span>
                      </span>
                      <span className="inline-flex items-center space-x-1.5 bg-teal-600 text-white px-2.5 py-1 rounded-lg font-semibold shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        <span>Selected</span>
                      </span>
                      <span className="inline-flex items-center space-x-1.5 bg-rose-50 border border-rose-300 text-rose-900 px-2.5 py-1 rounded-lg font-semibold shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>Your Appt (Conflict)</span>
                      </span>
                      <span className="inline-flex items-center space-x-1.5 bg-amber-50 border border-amber-300 text-amber-900 px-2.5 py-1 rounded-lg font-semibold shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>Booked by Others</span>
                      </span>
                      <span className="inline-flex items-center space-x-1.5 bg-slate-100 border border-slate-300 text-slate-500 px-2.5 py-1 rounded-lg font-semibold shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        <span>Past</span>
                      </span>
                      <span className="inline-flex items-center space-x-1.5 bg-rose-50 border border-rose-300 text-rose-800 px-2.5 py-1 rounded-lg font-semibold shadow-xs">
                        <CalendarOff className="w-3 h-3 text-rose-600" />
                        <span>Doctor on Leave</span>
                      </span>
                    </div>
                  </div>

                  {/* Doctor on Leave state */}
                  {slotsState.isLeave ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-2">
                      <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold uppercase tracking-wider">
                        <CalendarOff className="w-4 h-4" />
                        <span>Doctor on Leave</span>
                      </div>
                      <h4 className="text-base font-bold text-rose-900">Dr. {selectedDoctor.name} is on Leave</h4>
                      <p className="text-xs text-rose-700 max-w-md mx-auto">
                        This doctor is marked on leave on {bookingDate}. No appointment slots are available. Please select another date or doctor.
                      </p>
                    </div>
                  ) : slotsState.isInactive ? (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-2">
                      <div className="inline-flex items-center space-x-2 px-3 py-1 bg-rose-100 text-rose-800 rounded-full text-xs font-bold uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span>This doctor is not active</span>
                      </div>
                      <h4 className="text-base font-bold text-rose-950">This doctor is not active</h4>
                      <p className="text-xs text-rose-800 max-w-md mx-auto">
                        Dr. {selectedDoctor.name} is currently deactivated by clinic administration and cannot accept appointment bookings.
                      </p>
                    </div>
                  ) : slotsState.isUnavailable || slotsState.slots.length === 0 ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-2">
                      <div className="inline-flex items-center space-x-2 px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold uppercase tracking-wider">
                        <span>Unavailable</span>
                      </div>
                      <h4 className="text-base font-bold text-amber-900">Not Available on {selectedDayOfWeek}</h4>
                      <p className="text-xs text-amber-700 max-w-md mx-auto">
                        Dr. {selectedDoctor.name} has no scheduled working hours on {selectedDayOfWeek}s. Please choose a different date that falls on their working days.
                      </p>
                    </div>
                  ) : displayedSlots.length === 0 ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-2 text-slate-600 text-xs">
                      All consultation slots for today have already passed. Please select a future date.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {displayedSlots.map(slot => {
                        const isSelected = selectedSlot?.startTime === slot.startTime;
                        const status = getSlotDisplayStatus(slot, isSelected);
                        const isSelectable = status === "Available" || status === "Selected";

                        return (
                          <button
                            key={slot.startTime}
                            type="button"
                            disabled={!isSelectable}
                            onClick={() => {
                              if (isSelectable) {
                                setSelectedSlot(slot);
                                setBookingError("");
                                const formatted = formatTime12(slot.startTime);
                                setWrittenTime(formatted);
                                handleCheckWrittenTime(formatted);
                              }
                            }}
                            className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-center space-y-1.5 ${
                              status === "Selected"
                                ? "bg-teal-600 text-white border-teal-600 shadow-md ring-2 ring-teal-500/30 cursor-pointer"
                                : status === "Available"
                                ? "bg-white text-slate-800 border-emerald-300 hover:border-teal-600 hover:bg-teal-50/30 cursor-pointer shadow-xs"
                                : status === "Conflict"
                                ? "bg-rose-50/70 text-rose-900 border-rose-300 cursor-not-allowed"
                                : status === "Booked"
                                ? "bg-amber-50/70 text-amber-900/60 border-amber-200 cursor-not-allowed"
                                : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                            }`}
                            title={
                              status === "Conflict"
                                ? `You already have an appointment at this time${slot.conflictDoctorName ? ` with Dr. ${slot.conflictDoctorName}` : ""}.`
                                : undefined
                            }
                          >
                            <div className="font-extrabold text-sm tracking-tight">
                              {formatTime12(slot.startTime)}
                            </div>
                            <div className="text-[10px] opacity-75">
                              to {formatTime12(slot.endTime)}
                            </div>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                status === "Selected"
                                  ? "bg-white/20 text-white"
                                  : status === "Available"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : status === "Conflict"
                                  ? "bg-rose-200 text-rose-900 font-extrabold"
                                  : status === "Booked"
                                  ? "bg-amber-200 text-amber-900"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {status === "Conflict" ? "Your Appt" : status}
                            </span>
                            {status === "Conflict" && slot.conflictDoctorName && (
                              <span className="text-[9px] text-rose-700 font-semibold truncate max-w-[110px]">
                                w/ {slot.conflictDoctorName}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Step 4: Booking Summary & Submit */}
              {selectedDoctor && bookingDate && selectedSlot && (
                <div className="space-y-4 pt-6 border-t border-slate-100 bg-slate-50 p-6 rounded-2xl">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Booking Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500 block">Doctor</span>
                      <span className="font-bold text-slate-900 text-sm">{selectedDoctor.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Date & Day</span>
                      <span className="font-bold text-slate-900 text-sm">{bookingDate} ({selectedDayOfWeek})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Time Slot</span>
                      <span className="font-bold text-slate-900 text-sm">
                        {formatTime12(selectedSlot.startTime)} — {formatTime12(selectedSlot.endTime)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Duration</span>
                      <span className="font-bold text-slate-900 text-sm">30 minutes</span>
                    </div>
                  </div>

                  {bookingError && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                      {bookingError}
                    </div>
                  )}

                  <button
                    onClick={handleRequestAppointment}
                    disabled={loading}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-8 py-3.5 rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {loading ? "Requesting..." : "Confirm & Request Appointment"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* My Appointments View */}
      {subTab === "appointments" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">My Appointments</h2>
            <button
              onClick={() => {
                setSelectedDoctor(null);
                setBookingDate("");
                setSelectedSlot(null);
                setSubTab("book");
              }}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-sm cursor-pointer"
            >
              + Book New
            </button>
          </div>

          {appointments.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 text-slate-500 text-sm">
              No appointments found. Book your first appointment with one of our five doctors.
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map(apt => {
                const aptTime = new Date(`${apt.date}T${apt.startTime}:00`).getTime();
                const isPast = aptTime < Date.now() - 30 * 60 * 1000;
                const canCancelOrReschedule =
                  (apt.status === "Pending" || apt.status === "Confirmed") && !isPast;
                const docObj = doctors.find(d => d.id === apt.doctorId);
                const isDocInactive = docObj?.active === false;

                return (
                  <div
                    key={apt.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                            apt.status === "Pending"
                              ? "bg-amber-100 text-amber-800"
                              : apt.status === "Confirmed"
                              ? "bg-teal-100 text-teal-800"
                              : apt.status === "Completed"
                              ? "bg-blue-100 text-blue-800"
                              : apt.status === "No-show"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {apt.status}
                        </span>
                        <h3 className="font-bold text-slate-900 text-base">{apt.doctorName}</h3>
                        <span className="text-xs text-slate-500">({apt.specialty})</span>
                        {isDocInactive && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-extrabold rounded-full">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>This doctor is not active</span>
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-4">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          <span>{apt.date} ({getDayOfWeekFromDateStr(apt.date)})</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-teal-600" />
                          <span>{formatTimeRange12(apt.startTime, apt.endTime)} (30 mins)</span>
                        </span>
                      </div>

                      {apt.status === "Confirmed" && (
                        <div className="text-xs text-teal-800 bg-teal-50 border border-teal-200 px-3 py-1.5 rounded-xl font-medium inline-flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                          <span>Confirmed by Dr. {apt.confirmedByDoctorName || apt.doctorName}</span>
                        </div>
                      )}

                      {(apt.status === "Cancelled" || apt.status === "Rejected") && (
                        <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl font-medium inline-flex items-center space-x-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-600"></span>
                          <span>
                            Cancelled by {apt.cancelledBy || "Doctor"}
                            {apt.cancellationReason ? ` (${apt.cancellationReason})` : ""}
                          </span>
                        </div>
                      )}

                      {/* Doctor Visit Notes for Confirmed/Active Appointment */}
                      {apt.visitNote && (
                        <div className="bg-teal-50/80 border border-teal-200 rounded-2xl p-4 text-xs space-y-2 mt-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-teal-950 flex items-center space-x-1.5">
                              <FileText className="w-4 h-4 text-teal-700" />
                              <span>Clinical Visit Note from Dr. {apt.doctorName}</span>
                            </span>
                            <span className="text-[10px] bg-teal-100/90 text-teal-800 font-semibold px-2 py-0.5 rounded-full inline-flex items-center space-x-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Private Record</span>
                            </span>
                          </div>
                          <div className="bg-white p-3.5 rounded-xl border border-teal-100 text-slate-800 whitespace-pre-wrap leading-relaxed shadow-xs">
                            {apt.visitNote}
                          </div>
                          <p className="text-[11px] text-teal-700">
                            Strictly confidential between you and Dr. {apt.doctorName}. Clinic administration cannot view or edit this note.
                          </p>
                        </div>
                      )}
                    </div>

                    {canCancelOrReschedule && (
                      <div className="flex items-center space-x-2">
                        {isDocInactive ? (
                          <span
                            title="Dr. is inactive and cannot be rescheduled"
                            className="bg-slate-100 text-rose-700 border border-rose-200 font-bold px-3 py-2 rounded-xl text-xs flex items-center space-x-1.5 cursor-not-allowed opacity-90"
                          >
                            <Ban className="w-3.5 h-3.5 text-rose-500" />
                            <span>This doctor is not active</span>
                          </span>
                        ) : apt.status === "Confirmed" ? (
                          <button
                            onClick={() => {
                              setReschedulingApt(apt);
                              setNewDate(apt.date);
                              setSelectedNewSlot(null);
                              setRescheduleError("");
                            }}
                            className="bg-white border border-teal-600 hover:bg-teal-50 text-teal-700 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-xs flex items-center space-x-1.5"
                          >
                            <Clock className="w-3.5 h-3.5 text-teal-600" />
                            <span>Change Slot</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setReschedulingApt(apt);
                              setNewDate(apt.date);
                              setSelectedNewSlot(null);
                              setRescheduleError("");
                            }}
                            className="bg-white border border-slate-200 hover:border-teal-600 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                          >
                            Reschedule
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setCancellingApt(apt);
                            setCancelError("");
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Visit History View */}
      {subTab === "history" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Visit History & Records</h2>
          {appointments.filter(a => a.status === "Completed").length === 0 ? (
            <p className="text-sm text-slate-500">No completed visits in your history.</p>
          ) : (
            <div className="space-y-4">
              {appointments
                .filter(a => a.status === "Completed")
                .map(apt => (
                  <div key={apt.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900">{apt.doctorName}</h3>
                        <span className="text-xs text-slate-500">
                          {apt.specialty} • {apt.date} at {formatTimeRange12(apt.startTime, apt.endTime)}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-lg">Completed</span>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <FileText className="w-3.5 h-3.5 text-teal-600" />
                          <span>Doctor Visit Note (Dr. {apt.doctorName}):</span>
                        </span>
                        <span className="text-[10px] bg-teal-50 text-teal-700 font-semibold px-2 py-0.5 rounded border border-teal-100 flex items-center space-x-1">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Doctor-Patient Confidential</span>
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 font-normal">
                        {apt.visitNote || "No clinical notes recorded for this visit."}
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {cancellingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Cancel Appointment</h3>
            <p className="text-sm text-slate-600">
              Are you sure you want to cancel your consultation with <strong>{cancellingApt.doctorName}</strong> on{" "}
              <strong>{cancellingApt.date}</strong> at <strong>{formatTimeRange12(cancellingApt.startTime, cancellingApt.endTime)}</strong>?
            </p>
            {cancelError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                {cancelError}
              </div>
            )}
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setCancellingApt(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleCancel(cancellingApt.id)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
              >
                Yes, Cancel Appointment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Modal */}
      {reschedulingApt && (() => {
        const reschedDoc = doctors.find(d => d.id === reschedulingApt.doctorId);
        const isReschedDocInactive = reschedDoc?.active === false || newSlotsState.isInactive;

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">
                {reschedulingApt.status === "Confirmed" ? "Change Appointment Slot" : "Reschedule Appointment"}
              </h3>
              {isReschedDocInactive && (
                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 text-[11px] font-extrabold rounded-full">
                  <AlertCircle className="w-3 h-3 text-rose-600" />
                  <span>This doctor is not active</span>
                </span>
              )}
            </div>

            {isReschedDocInactive ? (
              <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 text-rose-950 space-y-3 shadow-xs">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-rose-950">
                      This doctor is not active
                    </h4>
                    <p className="text-xs text-rose-900 font-medium leading-relaxed">
                      Dr. {reschedulingApt.doctorName} is currently deactivated by clinic administration. You cannot reschedule an appointment with an inactive doctor.
                    </p>
                    <p className="text-xs text-rose-800">
                      You can cancel this booking or schedule a new consultation with any of our active clinic doctors.
                    </p>
                  </div>
                </div>
              </div>
            ) : reschedulingApt.status === "Confirmed" ? (
              <p className="text-xs text-amber-800 bg-amber-50 p-3.5 rounded-xl border border-amber-200 leading-relaxed">
                <strong>Notice:</strong> Changing the slot of your confirmed appointment will return its status to <strong>Pending</strong> in both your portal and the doctor's portal, awaiting confirmation from Dr. {reschedulingApt.doctorName}.
              </p>
            ) : (
              <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                The appointment will return to Pending status after rescheduling, awaiting doctor confirmation.
              </p>
            )}

            {!isReschedDocInactive && (

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Select New Date</label>
                <input
                  type="date"
                  min={todayStr}
                  value={newDate}
                  onChange={e => {
                    setNewDate(e.target.value);
                    setSelectedNewSlot(null);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-600 bg-white"
                />
              </div>

              {newDate && (
                <div className="space-y-3">
                  {/* Reschedule Write Time Feature Card */}
                  <div className="bg-gradient-to-r from-teal-50/70 via-white to-slate-50 border border-teal-200/90 rounded-2xl p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-teal-600" />
                        <h4 className="text-xs font-bold text-slate-900">
                          Write / Check Preferred Time
                        </h4>
                      </div>
                      <span className="text-[10px] font-bold text-teal-800 bg-teal-100/80 px-2 py-0.5 rounded-full">
                        Live Check
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="e.g. 10:30 AM or 14:00"
                          value={rescheduleWrittenTime}
                          onChange={e => {
                            const val = e.target.value;
                            setRescheduleWrittenTime(val);
                            if (val.trim()) {
                              handleCheckRescheduleWrittenTime(val);
                            } else {
                              setRescheduleTimeCheckResult(null);
                            }
                          }}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCheckRescheduleWrittenTime();
                            }
                          }}
                          className="w-full pl-8 pr-9 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:border-teal-600 bg-white"
                        />
                        <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <input
                            type="time"
                            step="1800"
                            title="Pick from clock"
                            onChange={e => {
                              if (e.target.value) {
                                const formatted = formatTime12(e.target.value);
                                setRescheduleWrittenTime(formatted);
                                handleCheckRescheduleWrittenTime(formatted);
                              }
                            }}
                            className="w-5 h-5 opacity-60 hover:opacity-100 cursor-pointer bg-transparent"
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCheckRescheduleWrittenTime()}
                        className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition-all shadow-xs cursor-pointer shrink-0"
                      >
                        Check
                      </button>
                    </div>

                    {/* Reschedule Availability Feedback */}
                    {rescheduleTimeCheckResult && (
                      <div className="pt-0.5">
                        {rescheduleTimeCheckResult.status === "available" && rescheduleTimeCheckResult.slot && (
                          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center justify-between gap-2 shadow-xs">
                            <div className="flex items-center space-x-2">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="text-xs font-bold text-emerald-900">
                                Doctor is AVAILABLE at this slot ({formatTime12(rescheduleTimeCheckResult.slot.startTime)})!
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                if (rescheduleTimeCheckResult.slot) {
                                  setSelectedNewSlot(rescheduleTimeCheckResult.slot);
                                  setRescheduleError("");
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition-all shadow-xs cursor-pointer shrink-0"
                            >
                              Use Slot
                            </button>
                          </div>
                        )}

                        {rescheduleTimeCheckResult.status === "unavailable" && (
                          <div className="bg-rose-50 border border-rose-300 rounded-xl p-3 flex items-start space-x-2 shadow-xs">
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-rose-950 block">
                                Doctor is NOT Available at this Slot
                              </span>
                              <p className="text-[11px] text-rose-800 leading-snug">
                                {rescheduleTimeCheckResult.message}
                              </p>
                            </div>
                          </div>
                        )}

                        {rescheduleTimeCheckResult.status === "suggest" && (
                          <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-xs text-blue-900 space-y-1.5">
                            <div className="flex items-center space-x-1.5 font-medium">
                              <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{rescheduleTimeCheckResult.message}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {rescheduleTimeCheckResult.suggestedSlots?.map(s => (
                                <button
                                  key={s.startTime}
                                  type="button"
                                  onClick={() => {
                                    const formatted = formatTime12(s.startTime);
                                    setRescheduleWrittenTime(formatted);
                                    handleCheckRescheduleWrittenTime(formatted);
                                  }}
                                  className="text-[11px] font-bold px-2.5 py-1 bg-white border border-blue-200 rounded-lg text-blue-900 hover:bg-blue-50 cursor-pointer"
                                >
                                  {formatTime12(s.startTime)}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {rescheduleTimeCheckResult.status === "invalid" && (
                          <div className="bg-amber-50 border border-amber-200 rounded-xl p-2 text-xs text-amber-900 flex items-center space-x-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>{rescheduleTimeCheckResult.message}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-1">
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Or Select from Available 30-Min Slots
                    </label>
                    {newSlotsState.isLeave ? (
                      <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200">
                        Doctor on Leave on this date.
                      </p>
                    ) : newSlotsState.slots.length === 0 ? (
                      <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200">
                        No available slots on this date.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {newSlotsState.slots.map(slot => {
                          const isConflict = slot.status === "Conflict";
                          const isFree = slot.isFree && slot.status !== "Past" && slot.status !== "Booked" && !isConflict;
                          const isSelected = selectedNewSlot?.startTime === slot.startTime;
                          return (
                            <button
                              key={slot.startTime}
                              type="button"
                              disabled={!isFree}
                              onClick={() => {
                                if (isFree) {
                                  setSelectedNewSlot(slot);
                                  setRescheduleError("");
                                  const formatted = formatTime12(slot.startTime);
                                  setRescheduleWrittenTime(formatted);
                                  handleCheckRescheduleWrittenTime(formatted);
                                }
                              }}
                              className={`p-3 rounded-xl border text-xs font-bold transition-all ${
                                isSelected
                                  ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                                  : isFree
                                  ? "bg-white text-slate-800 border-slate-200 hover:border-teal-600 cursor-pointer"
                                  : isConflict
                                  ? "bg-rose-50 text-rose-800 border-rose-200 cursor-not-allowed"
                                  : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed line-through"
                              }`}
                              title={isConflict ? `You already have an appointment at this time with ${slot.conflictDoctorName || 'another doctor'}.` : undefined}
                            >
                              <div>{formatTime12(slot.startTime)}</div>
                              <span className="text-[10px] block opacity-75 font-normal">
                                {isSelected ? "Selected" : isFree ? "Available" : isConflict ? `Your Appt (${slot.conflictDoctorName || 'Conflict'})` : slot.status || "Booked"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {rescheduleError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                  {rescheduleError}
                </div>
              )}
            </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setReschedulingApt(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                {isReschedDocInactive ? "Close" : "Cancel"}
              </button>
              {!isReschedDocInactive && (
                <button
                  onClick={handleReschedule}
                  disabled={!newDate || !selectedNewSlot}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {reschedulingApt.status === "Confirmed" ? "Confirm Slot Change" : "Confirm Reschedule"}
                </button>
              )}
            </div>
          </div>
        </div>
      );
    })()}
    </div>
  );
};
