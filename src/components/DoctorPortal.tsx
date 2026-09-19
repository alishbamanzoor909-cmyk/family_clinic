import React, { useEffect, useState } from "react";
import { User, Appointment, Availability, LeaveDay } from "../types";
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Plus, Trash2, Eye, ChevronDown, ChevronUp, Stethoscope, ShieldCheck, Mail, FileText, Lock, Edit3, Save, Search, Filter } from "lucide-react";
import { formatTimeRange12, generate30MinSlots, formatTime12 } from "../utils/time";

interface DoctorPortalProps {
  currentUser: User;
}

export const DoctorPortal: React.FC<DoctorPortalProps> = ({ currentUser }) => {
  const [subTab, setSubTab] = useState<"dashboard" | "requests" | "confirmed" | "schedule" | "leaves" | "patients">("dashboard");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [leaves, setLeaves] = useState<LeaveDay[]>([]);
  const [patients, setPatients] = useState<User[]>([]);

  // Schedule form
  const [dayOfWeek, setDayOfWeek] = useState("Monday");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("13:00");
  const [scheduleError, setScheduleError] = useState("");

  // Leave form
  const [leaveDate, setLeaveDate] = useState("");
  const [leaveError, setLeaveError] = useState("");
  const [leaveSuccess, setLeaveSuccess] = useState("");

  // Visit completion modal
  const [completingApt, setCompletingApt] = useState<Appointment | null>(null);
  const [visitStatus, setVisitStatus] = useState<"Completed" | "No-show">("Completed");
  const [visitNote, setVisitNote] = useState("");
  const [visitError, setVisitError] = useState("");

  // Doctor visit note modal for Confirmed / Completed visits
  const [editingNoteApt, setEditingNoteApt] = useState<Appointment | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteModalError, setNoteModalError] = useState("");
  const [noteModalSuccess, setNoteModalSuccess] = useState("");

  // Confirmed appointments tab filter & search
  const [confirmedFilter, setConfirmedFilter] = useState<"all" | "Confirmed" | "Completed">("all");
  const [confirmedSearch, setConfirmedSearch] = useState("");

  // Selected patient history modal
  const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<User | null>(null);
  const [patientHistoryList, setPatientHistoryList] = useState<Appointment[]>([]);

  const fetchData = async () => {
    try {
      const [aptRes, avRes, leaveRes, patRes] = await Promise.all([
        fetch(`/api/doctor/${currentUser.id}/appointments`),
        fetch(`/api/doctor/${currentUser.id}/availability`),
        fetch(`/api/doctor/${currentUser.id}/leaves`),
        fetch(`/api/doctor/${currentUser.id}/patients`)
      ]);
      const aptData = aptRes.ok ? await aptRes.json() : null;
      const avData = avRes.ok ? await avRes.json() : null;
      const leaveData = leaveRes.ok ? await leaveRes.json() : null;
      const patData = patRes.ok ? await patRes.json() : null;

      if (aptData && aptData.success) setAppointments(aptData.appointments);
      if (avData && avData.success) setAvailability(avData.availability);
      if (leaveData && leaveData.success) setLeaves(leaveData.leaves);
      if (patData && patData.success) setPatients(patData.patients);
    } catch (err) {
      console.error("Error fetching doctor portal data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.id]);

  const handleAddAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleError("");
    try {
      const res = await fetch("/api/doctor/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: currentUser.id, dayOfWeek, startTime, endTime })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to add availability");
      fetchData();
    } catch (err: any) {
      setScheduleError(err.message);
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      await fetch(`/api/doctor/availability/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeaveError("");
    setLeaveSuccess("");
    try {
      const res = await fetch("/api/doctor/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: currentUser.id, date: leaveDate })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to add leave date");
      setLeaveSuccess(`Leave date added successfully. ${data.cancelledAppointments} affected appointments were cancelled.`);
      setLeaveDate("");
      fetchData();
    } catch (err: any) {
      setLeaveError(err.message);
    }
  };

  const handleDeleteLeave = async (id: string) => {
    try {
      await fetch(`/api/doctor/leaves/${id}`, { method: "DELETE" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReviewAppointment = async (id: string, action: "Confirm" | "Reject") => {
    try {
      const res = await fetch(`/api/doctor/appointments/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: currentUser.id, action })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    const reason = window.prompt("Enter cancellation reason for patient and clinic record:", "Doctor emergency / unavailable");
    if (reason === null) return;
    try {
      const res = await fetch(`/api/doctor/appointments/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId: currentUser.id, reason: reason.trim() || "Cancelled by doctor" })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      fetchData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCompleteVisit = async () => {
    if (!completingApt) return;
    setVisitError("");
    try {
      const res = await fetch(`/api/doctor/appointments/${completingApt.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: currentUser.id,
          status: visitStatus,
          visitNote: visitStatus === "Completed" ? visitNote : undefined
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to complete visit");
      setCompletingApt(null);
      setVisitNote("");
      fetchData();
    } catch (err: any) {
      setVisitError(err.message);
    }
  };

  const openVisitNoteModal = (apt: Appointment) => {
    setEditingNoteApt(apt);
    setEditingNoteText(apt.visitNote || "");
    setNoteModalError("");
    setNoteModalSuccess("");
  };

  const handleSaveVisitNote = async () => {
    if (!editingNoteApt) return;
    setSavingNote(true);
    setNoteModalError("");
    setNoteModalSuccess("");
    try {
      const res = await fetch(`/api/doctor/appointments/${editingNoteApt.id}/visit-note`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId: currentUser.id,
          visitNote: editingNoteText
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to save clinical visit note");
      setNoteModalSuccess("Visit note saved successfully!");
      await fetchData();
      setTimeout(() => {
        setEditingNoteApt(null);
        setNoteModalSuccess("");
      }, 700);
    } catch (err: any) {
      setNoteModalError(err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const openPatientHistory = async (patient: User) => {
    setSelectedPatientForHistory(patient);
    try {
      const res = await fetch(`/api/doctor/${currentUser.id}/patient/${patient.id}/history`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          setPatientHistoryList(data.history || []);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const todaysAppointments = appointments.filter(a => a.date === todayStr);

  const pendingCount = appointments.filter(a => a.status === "Pending").length;
  const confirmedCount = appointments.filter(a => a.status === "Confirmed").length;
  const completedCount = appointments.filter(a => a.status === "Completed").length;
  const noshowCount = appointments.filter(a => a.status === "No-show").length;
  const cancelledCount = appointments.filter(a => a.status === "Cancelled" || a.status === "Rejected").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Doctor Identity Banner */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-teal-700/40">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-600/40 text-teal-200 text-xs font-semibold backdrop-blur-sm border border-teal-500/30">
            <Stethoscope className="w-3.5 h-3.5 text-teal-300" />
            <span>{currentUser.specialty || "Medical Specialist"}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span className="text-emerald-300 font-bold">Verified Doctor</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            {currentUser.name} Dashboard
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-teal-100/90">
            <span className="flex items-center space-x-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span className="font-semibold text-white">Staff ID: {currentUser.id}</span>
            </span>
            <span>•</span>
            <span className="bg-teal-700/50 px-2.5 py-1 rounded-lg text-teal-200 font-medium">Doctor Portal Session</span>
            <span>•</span>
            <span>30-minute interval slots</span>
          </div>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-xs space-y-1.5 md:text-right shrink-0 w-full md:w-auto">
          <div className="flex md:justify-end items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-white font-bold">Authenticated Portal Session</span>
          </div>
          <p className="text-teal-200/80 text-[11px]">
            Connected to Nowshera Clinic Management System
          </p>
        </div>
      </div>

      {/* Sub-nav */}
      <div className="flex items-center space-x-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
        <button
          onClick={() => setSubTab("dashboard")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "dashboard" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setSubTab("requests")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "requests" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Appointment Requests {pendingCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px]">{pendingCount}</span>}
        </button>
        <button
          onClick={() => setSubTab("confirmed")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
            subTab === "confirmed" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Confirmed & Visit Notes</span>
          {confirmedCount > 0 && (
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              subTab === "confirmed" ? "bg-white text-teal-800" : "bg-teal-100 text-teal-800"
            }`}>
              {confirmedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setSubTab("schedule")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "schedule" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          My Schedule
        </button>
        <button
          onClick={() => setSubTab("leaves")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "leaves" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Leave Days
        </button>
        <button
          onClick={() => setSubTab("patients")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "patients" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          My Patients
        </button>
      </div>

      {/* Dashboard View */}
      {subTab === "dashboard" && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">No-show</span>
              <div className="text-3xl font-extrabold text-purple-600">{noshowCount}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancelled</span>
              <div className="text-3xl font-extrabold text-rose-600">{cancelledCount}</div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Today's Schedule ({todayStr})</h2>
            {todaysAppointments.length === 0 ? (
              <p className="text-sm text-slate-500">No appointments scheduled for today.</p>
            ) : (
              <div className="space-y-4">
                {todaysAppointments.map(apt => (
                  <div key={apt.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-slate-900 text-base">{apt.patientName}</span>
                        <span className={`px-2 py-0.5 text-xs font-bold rounded-lg ${
                          apt.status === "Confirmed" ? "bg-teal-100 text-teal-800" :
                          apt.status === "Completed" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-700"
                        }`}>{apt.status}</span>
                      </div>
                      <div className="text-xs text-slate-600 flex items-center space-x-3">
                        <span>{apt.startTime} — {apt.endTime}</span>
                        <span>{apt.patientPhone || "No phone provided"}</span>
                      </div>
                      {apt.status === "Confirmed" && apt.confirmedByDoctorName && (
                        <div className="text-[11px] text-teal-700 font-medium pt-0.5">
                          Confirmed by Dr. {apt.confirmedByDoctorName}
                        </div>
                      )}
                      {apt.status === "Cancelled" && (
                        <div className="text-[11px] text-rose-700 font-medium pt-0.5">
                          Cancelled by {apt.cancelledBy || "Doctor"} {apt.cancellationReason ? `(${apt.cancellationReason})` : ""}
                        </div>
                      )}

                      {/* Confidential Doctor Visit Notes Snippet */}
                      {apt.visitNote ? (
                        <div className="mt-2 bg-teal-50/80 border border-teal-200 rounded-xl p-3 text-xs text-slate-800 space-y-1 max-w-2xl">
                          <div className="flex items-center justify-between font-bold text-teal-950">
                            <span className="flex items-center space-x-1.5">
                              <FileText className="w-3.5 h-3.5 text-teal-600" />
                              <span>Doctor Visit Note:</span>
                            </span>
                            <span className="text-[10px] text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded font-semibold flex items-center space-x-1">
                              <Lock className="w-2.5 h-2.5" />
                              <span>Doctor-Patient Only</span>
                            </span>
                          </div>
                          <p className="line-clamp-2 text-slate-700 whitespace-pre-wrap leading-relaxed">{apt.visitNote}</p>
                        </div>
                      ) : apt.status === "Confirmed" ? (
                        <div className="text-[11px] text-slate-400 italic pt-1">
                          No visit note recorded yet for this confirmed visit.
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Doctor Write / Edit Visit Notes button for Confirmed appointments */}
                      {apt.status === "Confirmed" && (
                        <button
                          onClick={() => openVisitNoteModal(apt)}
                          className="bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer inline-flex items-center space-x-1.5 shadow-2xs"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                          <span>{apt.visitNote ? "Edit Notes" : "Write Visit Notes"}</span>
                        </button>
                      )}

                      {/* Also allow viewing/editing notes if completed */}
                      {apt.status === "Completed" && (
                        <button
                          onClick={() => openVisitNoteModal(apt)}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition-all cursor-pointer inline-flex items-center space-x-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span>{apt.visitNote ? "Edit Notes" : "Add Notes"}</span>
                        </button>
                      )}

                      {(apt.status === "Confirmed" || apt.status === "Pending") && (
                        <>
                          <button
                            onClick={() => { setCompletingApt(apt); setVisitStatus("Completed"); setVisitNote(apt.visitNote || ""); }}
                            className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-xs"
                          >
                            Complete Visit
                          </button>
                          <button
                            onClick={() => handleCancelAppointment(apt.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-2 rounded-xl text-xs transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Appointment Requests View */}
      {subTab === "requests" && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Appointment Requests</h2>
          {appointments.filter(a => a.status === "Pending").length === 0 ? (
            <p className="text-sm text-slate-500">No pending appointment requests.</p>
          ) : (
            <div className="space-y-4">
              {appointments.filter(a => a.status === "Pending").map(apt => (
                <div key={apt.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-xs font-bold rounded-lg">Pending Request</span>
                    <h3 className="font-bold text-slate-900 text-base">{apt.patientName}</h3>
                    <div className="text-xs text-slate-600 flex items-center space-x-4">
                      <span>Date: {apt.date}</span>
                      <span>Time: {apt.startTime} — {apt.endTime}</span>
                      <span>Phone: {apt.patientPhone || "N/A"}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleReviewAppointment(apt.id, "Confirm")}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => handleReviewAppointment(apt.id, "Reject")}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-5 py-2.5 rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirmed & Visit Notes View */}
      {subTab === "confirmed" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Confirmed Appointments & Clinical Visit Notes</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Write, manage, and update confidential clinical visit notes and prescriptions for patients whose appointments are confirmed.
              </p>
            </div>

            {/* Strict confidentiality indicator */}
            <div className="bg-teal-50 border border-teal-200/80 rounded-2xl px-4 py-2.5 flex items-center space-x-2 text-xs text-teal-900 shrink-0">
              <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
              <span className="font-semibold text-[11px]">Strict Confidentiality: Admins cannot view or write notes</span>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs">
              <button
                type="button"
                onClick={() => setConfirmedFilter("all")}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  confirmedFilter === "all" ? "bg-white text-teal-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Handled
              </button>
              <button
                type="button"
                onClick={() => setConfirmedFilter("Confirmed")}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  confirmedFilter === "Confirmed" ? "bg-white text-teal-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Confirmed ({appointments.filter(a => a.status === "Confirmed").length})
              </button>
              <button
                type="button"
                onClick={() => setConfirmedFilter("Completed")}
                className={`px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  confirmedFilter === "Completed" ? "bg-white text-teal-800 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Completed ({appointments.filter(a => a.status === "Completed").length})
              </button>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search patient, phone, or date..."
                value={confirmedSearch}
                onChange={e => setConfirmedSearch(e.target.value)}
                className="w-full sm:w-64 pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-600 bg-slate-50/50"
              />
            </div>
          </div>

          {/* List of appointments */}
          {(() => {
            const list = appointments
              .filter(a => {
                if (confirmedFilter === "all") return a.status === "Confirmed" || a.status === "Completed";
                return a.status === confirmedFilter;
              })
              .filter(a => {
                if (!confirmedSearch.trim()) return true;
                const q = confirmedSearch.toLowerCase();
                return (
                  a.patientName.toLowerCase().includes(q) ||
                  (a.patientPhone && a.patientPhone.toLowerCase().includes(q)) ||
                  a.date.includes(q)
                );
              });

            if (list.length === 0) {
              return (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-sm font-bold text-slate-700">No appointments found</p>
                  <p className="text-xs text-slate-500">
                    {confirmedSearch ? "No matches for your search query." : "You do not have any confirmed or completed appointments matching this filter yet."}
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {list.map(apt => (
                  <div
                    key={apt.id}
                    className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-2xl p-6 transition-all space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                      <div>
                        <div className="flex items-center space-x-3">
                          <h3 className="font-bold text-slate-900 text-base">{apt.patientName}</h3>
                          <span
                            className={`px-2.5 py-0.5 text-xs font-bold rounded-lg ${
                              apt.status === "Confirmed"
                                ? "bg-teal-100 text-teal-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {apt.status}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-3 mt-1">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-teal-600" />
                            <strong className="text-slate-700">{apt.date}</strong>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-teal-600" />
                            <span>{formatTimeRange12(apt.startTime, apt.endTime)}</span>
                          </span>
                          {apt.patientPhone && (
                            <span className="text-slate-600">• Phone: {apt.patientPhone}</span>
                          )}
                          {apt.patientEmail && (
                            <span className="text-slate-500">• {apt.patientEmail}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => openVisitNoteModal(apt)}
                          className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer shadow-xs inline-flex items-center space-x-1.5"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{apt.visitNote ? "Edit Visit Notes" : "Write Visit Notes"}</span>
                        </button>

                        {apt.status === "Confirmed" && (
                          <button
                            type="button"
                            onClick={() => {
                              setCompletingApt(apt);
                              setVisitStatus("Completed");
                              setVisitNote(apt.visitNote || "");
                            }}
                            className="bg-white border border-teal-600 text-teal-700 hover:bg-teal-50 font-bold px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer"
                          >
                            Complete Visit
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Visit Notes Box */}
                    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-teal-600" />
                          <span className="text-xs font-bold text-slate-900">
                            Doctor Clinical Visit Notes & Prescriptions:
                          </span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] text-teal-800 bg-teal-50 border border-teal-200/60 px-2 py-0.5 rounded-full font-medium">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Visible only to Dr. {currentUser.name} & {apt.patientName}</span>
                        </div>
                      </div>

                      {apt.visitNote ? (
                        <div className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed bg-slate-50/60 p-3.5 rounded-lg border border-slate-100 font-mono">
                          {apt.visitNote}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-amber-50/60 border border-amber-200/60 rounded-lg text-xs text-amber-900">
                          <span>
                            No visit notes written yet for this patient. Write clinical recommendations, diagnosis, and prescriptions.
                          </span>
                          <button
                            type="button"
                            onClick={() => openVisitNoteModal(apt)}
                            className="text-teal-700 font-bold hover:underline shrink-0 text-left"
                          >
                            + Write Notes Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* My Schedule View */}
      {subTab === "schedule" && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">My Schedule & Working Hours</h2>
            <p className="text-xs text-slate-500">Define the days and hours you work. The system automatically divides working hours into 30-minute appointment slots.</p>
          </div>

          <form onSubmit={handleAddAvailability} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Add Working Hours</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Day of Week</label>
                <select
                  value={dayOfWeek}
                  onChange={e => setDayOfWeek(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-teal-600"
                >
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Start Time</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">End Time</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            {/* Live Preview of 30-min slots */}
            {startTime && endTime && (
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">
                    Slot Preview ({formatTimeRange12(startTime, endTime)}):
                  </span>
                  <span className="text-teal-700 font-semibold bg-teal-50 px-2 py-0.5 rounded">
                    {generate30MinSlots(startTime, endTime).length} slots of 30 minutes
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {generate30MinSlots(startTime, endTime).map(s => (
                    <span key={s.startTime} className="bg-teal-50 text-teal-800 text-[11px] font-semibold px-2 py-0.5 rounded border border-teal-100">
                      {formatTime12(s.startTime)}
                    </span>
                  ))}
                  {generate30MinSlots(startTime, endTime).length === 0 && (
                    <span className="text-xs text-amber-600">End time must be at least 30 minutes after start time.</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Note: The {formatTime12(endTime)} ending time is not bookable.
                </p>
              </div>
            )}

            {scheduleError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                {scheduleError}
              </div>
            )}

            <button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all cursor-pointer shadow-sm flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Save Availability</span>
            </button>
          </form>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Current Working Hours & Bookable Slots</h3>
            {availability.length === 0 ? (
              <p className="text-sm text-slate-500">No working hours defined yet.</p>
            ) : (
              <div className="space-y-4">
                {availability.map(av => {
                  const slots = generate30MinSlots(av.startTime, av.endTime);
                  return (
                    <div key={av.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-slate-900 text-base">{av.dayOfWeek}</span>
                          <span className="text-xs text-teal-700 font-bold ml-3 bg-teal-50 px-2.5 py-1 rounded-md border border-teal-100">
                            {formatTimeRange12(av.startTime, av.endTime)}
                          </span>
                          <span className="text-xs text-slate-500 ml-2">
                            ({slots.length} bookable 30-min slots)
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteAvailability(av.id)}
                          className="text-slate-400 hover:text-rose-600 p-2 rounded-xl transition-colors cursor-pointer"
                          title="Delete working hours"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap gap-1.5">
                        {slots.map(s => (
                          <span key={s.startTime} className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2 py-0.5 rounded border border-slate-200">
                            {formatTime12(s.startTime)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Leave Days View */}
      {subTab === "leaves" && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900">Manage Leave Days</h2>
            <p className="text-xs text-slate-500">Select future leave dates. Any pending or confirmed appointments on leave dates will be automatically cancelled.</p>
          </div>

          <form onSubmit={handleAddLeave} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 max-w-xl">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Select Leave Date</label>
              <input
                type="date"
                required
                min={todayStr}
                value={leaveDate}
                onChange={e => setLeaveDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            {leaveError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                {leaveError}
              </div>
            )}

            {leaveSuccess && (
              <div className="bg-teal-50 border border-teal-200 text-teal-700 text-xs p-3 rounded-xl font-medium">
                {leaveSuccess}
              </div>
            )}

            <button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
            >
              Add Leave Day
            </button>
          </form>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Scheduled Leave Days</h3>
            {leaves.length === 0 ? (
              <p className="text-sm text-slate-500">No leave days scheduled.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {leaves.map(l => (
                  <div key={l.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-sm">{l.date}</span>
                    <button
                      onClick={() => handleDeleteLeave(l.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-xl transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Patients View */}
      {subTab === "patients" && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900">My Patients</h2>
          {patients.length === 0 ? (
            <p className="text-sm text-slate-500">No patients found.</p>
          ) : (
            <div className="space-y-4">
              {patients.map(pat => (
                <div key={pat.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-base">{pat.name}</h3>
                    <p className="text-xs text-slate-600">{pat.email} • {pat.phone || "No phone"}</p>
                  </div>
                  <button
                    onClick={() => openPatientHistory(pat)}
                    className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm flex items-center space-x-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View History</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Visit Completion Modal */}
      {completingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl space-y-6">
            <h3 className="text-xl font-bold text-slate-900">Complete Visit for {completingApt.patientName}</h3>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Outcome</label>
                <select
                  value={visitStatus}
                  onChange={e => setVisitStatus(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-teal-600"
                >
                  <option value="Completed">Completed</option>
                  <option value="No-show">No-show</option>
                </select>
              </div>

              {visitStatus === "Completed" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Visit Note (Confidential)</label>
                  <textarea
                    rows={4}
                    value={visitNote}
                    onChange={e => setVisitNote(e.target.value)}
                    placeholder="Enter clinical notes, diagnosis, or recommendations..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>
              )}

              {visitError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                  {visitError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => setCompletingApt(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteVisit}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
              >
                Save Visit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Patient History Modal */}
      {selectedPatientForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900">Patient History: {selectedPatientForHistory.name}</h3>
              <button
                onClick={() => setSelectedPatientForHistory(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                Close
              </button>
            </div>

            {patientHistoryList.length === 0 ? (
              <p className="text-sm text-slate-500">No previous appointments found with this patient.</p>
            ) : (
              <div className="space-y-4">
                {patientHistoryList.map(apt => (
                  <div key={apt.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">{apt.date} ({apt.startTime} — {apt.endTime})</span>
                      <span className="px-2 py-0.5 bg-teal-100 text-teal-800 text-xs font-bold rounded-lg">{apt.status}</span>
                    </div>
                    {apt.visitNote && (
                      <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-700">
                        <span className="font-bold text-slate-900 block mb-1">Visit Note:</span>
                        {apt.visitNote}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Doctor Visit Notes Modal */}
      {editingNoteApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 max-h-[92vh] overflow-y-auto border border-slate-100">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-extrabold text-slate-900">Clinical Visit Notes</h3>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-lg ${
                    editingNoteApt.status === "Confirmed" ? "bg-teal-100 text-teal-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {editingNoteApt.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Patient: <strong className="text-slate-800">{editingNoteApt.patientName}</strong> • {editingNoteApt.date} at {formatTimeRange12(editingNoteApt.startTime, editingNoteApt.endTime)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingNoteApt(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1.5 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Strict Medical Privacy Notice */}
            <div className="bg-teal-50/90 border border-teal-200/80 rounded-2xl p-4 flex items-start space-x-3 text-xs text-teal-950">
              <ShieldCheck className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-teal-950 text-xs">Medical Confidentiality Guaranteed</span>
                <span className="text-[11px] text-teal-800 leading-relaxed block mt-0.5">
                  These clinical notes and prescriptions are only visible to you (<strong>Dr. {currentUser.name}</strong>) and your patient (<strong>{editingNoteApt.patientName}</strong>). Clinic administrators are strictly restricted from reading or modifying these notes.
                </span>
              </div>
            </div>

            {/* Quick Insert Clinical Templates */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Quick Template Snippets:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "+ Diagnosis", text: "\nDiagnosis: " },
                  { label: "+ Symptoms", text: "\nSymptoms & Clinical Findings: " },
                  { label: "+ Prescription (Rx)", text: "\nPrescription / Rx:\n1. Medicine: \n   Dosage: \n   Duration: " },
                  { label: "+ Instructions", text: "\nPatient Instructions: " },
                  { label: "+ Follow-up", text: "\nFollow-up: Review in 1-2 weeks." }
                ].map(tpl => (
                  <button
                    key={tpl.label}
                    type="button"
                    onClick={() => setEditingNoteText(prev => (prev ? prev.trim() + tpl.text : tpl.text.trim()))}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-800 text-slate-700 rounded-lg text-xs font-medium transition-colors border border-slate-200 cursor-pointer"
                  >
                    {tpl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visit Note Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                <span>Clinical Notes, Findings & Prescriptions:</span>
                <span className="text-[11px] text-slate-400 font-normal">{editingNoteText.length} characters</span>
              </label>
              <textarea
                rows={7}
                value={editingNoteText}
                onChange={e => setEditingNoteText(e.target.value)}
                placeholder="Enter patient assessment, diagnosis, prescribed medicines, dosages, and medical instructions..."
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-teal-600 font-normal leading-relaxed text-slate-800 bg-white"
              />
            </div>

            {noteModalError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                {noteModalError}
              </div>
            )}

            {noteModalSuccess && (
              <div className="bg-teal-50 border border-teal-200 text-teal-800 text-xs p-3 rounded-xl font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>{noteModalSuccess}</span>
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingNoteApt(null)}
                disabled={savingNote}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveVisitNote}
                disabled={savingNote}
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-all cursor-pointer shadow-sm inline-flex items-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingNote ? "Saving..." : "Save Visit Notes"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
