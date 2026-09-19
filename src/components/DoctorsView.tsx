import React, { useEffect, useState } from "react";
import { User, Availability } from "../types";
import { Stethoscope, Calendar, ArrowRight, Clock, CheckCircle2, ChevronDown, ChevronUp, AlertCircle, Ban } from "lucide-react";
import { formatTimeRange12, generate30MinSlots, formatTime12 } from "../utils/time";

interface DoctorsViewProps {
  onOpenLogin: () => void;
  onBookWithDoctor?: (doctorId: string) => void;
  isLoggedInPatient?: boolean;
}

const ALL_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const DoctorsView: React.FC<DoctorsViewProps> = ({ onOpenLogin, onBookWithDoctor, isLoggedInPatient }) => {
  const [doctors, setDoctors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDocId, setExpandedDocId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/patient/doctors")
      .then(res => (res.ok ? res.json() : { success: false, doctors: [] }))
      .then(data => {
        if (data && data.success) {
          setDoctors(data.doctors || []);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getDoctorScheduleSummary = (availability?: Availability[]) => {
    if (!availability || availability.length === 0) return "No weekly schedule set";
    const daysWithHours = availability.map(a => `${a.dayOfWeek.slice(0, 3)}: ${formatTimeRange12(a.startTime, a.endTime)}`);
    return daysWithHours.join(" • ");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold uppercase tracking-wider">
          <Stethoscope className="w-4 h-4" />
          <span>Specialist Care</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Our Doctors & Schedules</h1>
        <p className="text-sm text-slate-600">
          Meet our five verified medical specialists at Nowshera Family Clinic. All consultations are scheduled in exact 30-minute intervals during doctor working hours.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-500 font-medium">Loading doctors...</div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
          No doctors available at the moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {doctors.map(doc => {
            const isExpanded = expandedDocId === doc.id;
            const docAvailabilities = doc.availability || [];
            const isInactive = doc.active === false;

            return (
              <div
                key={doc.id}
                className={`rounded-3xl p-6 border transition-all flex flex-col justify-between space-y-6 ${
                  isInactive
                    ? "bg-slate-50/70 border-rose-200/90 shadow-xs"
                    : "bg-white border-slate-200 shadow-sm hover:shadow-md"
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-2xl font-bold text-xl flex items-center justify-center shrink-0 shadow-md ${
                      isInactive ? "bg-slate-400 text-white" : "bg-teal-600 text-white"
                    }`}>
                      {doc.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-lg text-slate-900">{doc.name}</h3>
                      </div>
                      <div className="flex flex-wrap gap-1.5 items-center mt-1">
                        <span className="inline-block px-2.5 py-0.5 bg-teal-50 text-teal-700 font-semibold text-xs rounded-full">
                          {doc.specialty}
                        </span>
                        {isInactive && (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-rose-100/90 text-rose-800 border border-rose-300 font-extrabold text-[11px] rounded-full">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>This doctor is not active</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isInactive && (
                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs text-rose-900 flex items-start space-x-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-extrabold block text-rose-950">This doctor is not active</span>
                        <p className="text-[11px] text-rose-800 leading-snug">
                          Dr. {doc.name} is currently deactivated by clinic administration and is unavailable for new appointments.
                        </p>
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-slate-600 leading-relaxed">
                    {doc.bio || "Experienced practitioner dedicated to patient health and clinical excellence."}
                  </p>

                  {/* Weekly Working Hours Summary */}
                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>Weekly Working Hours</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setExpandedDocId(isExpanded ? null : doc.id)}
                        className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center space-x-0.5 cursor-pointer"
                      >
                        <span>{isExpanded ? "Hide Slots" : "View 30m Slots"}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600">
                      {ALL_DAYS.map(day => {
                        const dayAv = docAvailabilities.find(a => a.dayOfWeek === day);
                        return (
                          <div key={day} className="flex items-center justify-between py-0.5">
                            <span className="font-medium text-slate-700">{day}</span>
                            {dayAv ? (
                              <span className="font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded text-[11px]">
                                {formatTimeRange12(dayAv.startTime, dayAv.endTime)}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px]">Not available</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expanded 30-min slot details */}
                  {isExpanded && (
                    <div className="bg-teal-50/50 rounded-2xl p-4 border border-teal-100 space-y-3 animate-fadeIn">
                      <div className="text-xs font-bold text-teal-900">
                        30-Minute Bookable Slots Breakdown:
                      </div>
                      <div className="space-y-2 text-xs">
                        {docAvailabilities.map(av => {
                          const slots = generate30MinSlots(av.startTime, av.endTime);
                          return (
                            <div key={av.id} className="space-y-1 bg-white p-2.5 rounded-xl border border-teal-100">
                              <div className="font-bold text-slate-800 flex items-center justify-between">
                                <span>{av.dayOfWeek} ({formatTimeRange12(av.startTime, av.endTime)})</span>
                                <span className="text-[10px] text-teal-700 font-semibold">{slots.length} slots</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1 pt-1">
                                {slots.map(s => (
                                  <div
                                    key={s.startTime}
                                    className="bg-teal-50 text-teal-800 text-[10px] font-semibold text-center py-1 rounded border border-teal-200/60"
                                  >
                                    {formatTime12(s.startTime)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">{doc.phone || "0300-Clinic"}</span>
                  {isInactive ? (
                    <button
                      type="button"
                      disabled
                      className="bg-rose-50 text-rose-700 border border-rose-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 cursor-not-allowed opacity-90"
                    >
                      <Ban className="w-3.5 h-3.5 text-rose-500" />
                      <span>This doctor is not active</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (isLoggedInPatient && onBookWithDoctor) {
                          onBookWithDoctor(doc.id);
                        } else {
                          onOpenLogin();
                        }
                      }}
                      className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <span>{isLoggedInPatient ? "Book Appointment" : "Sign in to Book"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
