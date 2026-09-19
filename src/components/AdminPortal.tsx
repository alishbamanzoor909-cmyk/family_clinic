import React, { useEffect, useState } from "react";
import { User, Appointment } from "../types";
import { Users, Calendar, Shield, Search, Plus, Trash2, Power, Eye, Clock, Database, Cloud, RefreshCw, CheckCircle2, Copy, ArrowRight, ShieldCheck, AlertCircle, ExternalLink, Check, FileText } from "lucide-react";
import { formatTimeRange12 } from "../utils/time";

interface AdminPortalProps {
  currentUser: User;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ currentUser }) => {
  const [subTab, setSubTab] = useState<"dashboard" | "doctors" | "patients" | "appointments" | "database">("dashboard");
  const [dashboardData, setDashboardData] = useState<{
    todaysAppointments: Appointment[];
    doctorStats: Array<{
      doctorId: string;
      doctorName: string;
      specialty: string;
      pending: number;
      confirmed: number;
      completed: number;
      noshow: number;
      cancelled: number;
      total: number;
    }>;
    totals: {
      pending: number;
      confirmed: number;
      completed: number;
      noshow: number;
      cancelled: number;
    };
  } | null>(null);

  const [doctors, setDoctors] = useState<User[]>([]);
  const [patients, setPatients] = useState<User[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Cloud & Database Status
  const [dbStatus, setDbStatus] = useState<{
    firestore?: { provisioned: boolean; projectId: string; databaseId: string; status: string };
    supabase?: { configured: boolean; connected: boolean; url: string | null; message: string };
  } | null>(null);
  const [supabaseDetails, setSupabaseDetails] = useState<{
    configured: boolean;
    connected: boolean;
    tableStatus?: Record<string, { exists: boolean; rows?: number; message?: string }>;
    message?: string;
  } | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [copiedSql, setCopiedSql] = useState(false);

  // Add Doctor Form
  const [newDocName, setNewDocName] = useState("");
  const [newDocEmail, setNewDocEmail] = useState("");
  const [newDocSpecialty, setNewDocSpecialty] = useState("General Medicine");
  const [newDocPhone, setNewDocPhone] = useState("");
  const [newDocBio, setNewDocBio] = useState("");
  const [docError, setDocError] = useState("");
  const [docSuccess, setDocSuccess] = useState("");

  // Patient Search
  const [patientSearch, setPatientSearch] = useState("");

  // Appointment Filters
  const [filterDoctor, setFilterDoctor] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchData = async () => {
    try {
      const [dashRes, docRes, patRes, aptRes, dbRes, sbRes] = await Promise.all([
        fetch("/api/admin/dashboard"),
        fetch("/api/admin/doctors"),
        fetch("/api/admin/patients"),
        fetch("/api/admin/appointments"),
        fetch("/api/database/status"),
        fetch("/api/supabase/status")
      ]);
      const dashData = dashRes.ok ? await dashRes.json() : null;
      const docData = docRes.ok ? await docRes.json() : null;
      const patData = patRes.ok ? await patRes.json() : null;
      const aptData = aptRes.ok ? await aptRes.json() : null;
      const databaseData = dbRes.ok ? await dbRes.json() : null;
      const sbData = sbRes.ok ? await sbRes.json() : null;

      if (dashData && dashData.success) setDashboardData(dashData);
      if (docData && docData.success) setDoctors(docData.doctors);
      if (patData && patData.success) setPatients(patData.patients);
      if (aptData && aptData.success) setAppointments(aptData.appointments);
      if (databaseData && databaseData.success) setDbStatus(databaseData);
      if (sbData && sbData.success) setSupabaseDetails(sbData);
    } catch (err) {
      console.error("Error loading admin portal data:", err);
    }
  };

  const handleSyncSupabase = async () => {
    setIsSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/supabase/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg(`Sync completed! ${data.syncedCounts?.patients || 0} patients, ${data.syncedCounts?.appointments || 0} appointments, and ${data.syncedCounts?.doctorLeaves || 0} doctor leaves synchronized to Supabase.`);
      } else {
        setSyncMsg(`Sync notice: ${data.error || "Could not sync"}`);
      }
      fetchData();
    } catch (err: any) {
      setSyncMsg(`Sync error: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setDocError("");
    setDocSuccess("");
    try {
      const res = await fetch("/api/admin/doctors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newDocName,
          email: newDocEmail,
          specialty: newDocSpecialty,
          phone: newDocPhone,
          bio: newDocBio
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to add doctor");
      setDocSuccess(`Doctor added successfully. Set-password link: ${data.setPasswordLink}`);
      setNewDocName("");
      setNewDocEmail("");
      setNewDocPhone("");
      setNewDocBio("");
      fetchData();
    } catch (err: any) {
      setDocError(err.message);
    }
  };

  const handleToggleDoctor = async (doctorId: string) => {
    try {
      await fetch(`/api/admin/doctors/${doctorId}/toggle`, { method: "PUT" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancelAppointment = async (aptId: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;
    try {
      await fetch(`/api/admin/appointments/${aptId}/cancel`, { method: "PUT" });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.email.toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.phone && p.phone.includes(patientSearch))
  );

  const filteredAppointments = appointments.filter(a => {
    if (filterDoctor !== "all" && a.doctorId !== filterDoctor) return false;
    if (filterDate && a.date !== filterDate) return false;
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
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
          onClick={() => setSubTab("doctors")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "doctors" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Doctors
        </button>
        <button
          onClick={() => setSubTab("patients")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "patients" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Patients
        </button>
        <button
          onClick={() => setSubTab("appointments")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
            subTab === "appointments" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          Appointments
        </button>
        <button
          onClick={() => setSubTab("database")}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center space-x-1.5 ${
            subTab === "database" ? "bg-teal-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Cloud & Supabase</span>
        </button>
      </div>

      {/* Dashboard View */}
      {subTab === "dashboard" && dashboardData && (
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending</span>
              <div className="text-3xl font-extrabold text-amber-600">{dashboardData.totals.pending}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Confirmed</span>
              <div className="text-3xl font-extrabold text-teal-600">{dashboardData.totals.confirmed}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed</span>
              <div className="text-3xl font-extrabold text-blue-600">{dashboardData.totals.completed}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">No-show</span>
              <div className="text-3xl font-extrabold text-purple-600">{dashboardData.totals.noshow}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cancelled</span>
              <div className="text-3xl font-extrabold text-rose-600">{dashboardData.totals.cancelled}</div>
            </div>
          </div>

          {/* Doctor-by-Doctor Statistics Table */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Doctor Appointment Statistics</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 font-bold">Doctor</th>
                    <th className="py-3 px-4 font-bold">Pending</th>
                    <th className="py-3 px-4 font-bold">Confirmed</th>
                    <th className="py-3 px-4 font-bold">Completed</th>
                    <th className="py-3 px-4 font-bold">No-show</th>
                    <th className="py-3 px-4 font-bold">Cancelled</th>
                    <th className="py-3 px-4 font-bold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {dashboardData.doctorStats.map(stat => (
                    <tr key={stat.doctorId} className="hover:bg-slate-50">
                      <td className="py-4 px-4 font-bold text-slate-900">
                        {stat.doctorName}
                        <span className="text-xs font-normal text-slate-500 block">{stat.specialty}</span>
                      </td>
                      <td className="py-4 px-4 font-semibold text-amber-600">{stat.pending}</td>
                      <td className="py-4 px-4 font-semibold text-teal-600">{stat.confirmed}</td>
                      <td className="py-4 px-4 font-semibold text-blue-600">{stat.completed}</td>
                      <td className="py-4 px-4 font-semibold text-purple-600">{stat.noshow}</td>
                      <td className="py-4 px-4 font-semibold text-rose-600">{stat.cancelled}</td>
                      <td className="py-4 px-4 font-bold text-slate-900">{stat.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Today's Appointments</h2>
            {dashboardData.todaysAppointments.length === 0 ? (
              <p className="text-sm text-slate-500">No appointments scheduled for today.</p>
            ) : (
              <div className="space-y-4">
                {dashboardData.todaysAppointments.map(apt => (
                  <div key={apt.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-bold text-slate-900">{apt.patientName}</span>
                        <span className="text-xs text-teal-600 font-semibold">with {apt.doctorName}</span>
                      </div>
                      <span className="text-xs text-slate-500 block">{apt.startTime} — {apt.endTime}</span>
                    </div>
                    <span className="px-2.5 py-1 bg-teal-100 text-teal-800 text-xs font-bold rounded-lg">{apt.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Doctors Management View */}
      {subTab === "doctors" && (
        <div className="space-y-8">
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Add New Doctor</h2>
            <form onSubmit={handleAddDoctor} className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Doctor Name</label>
                  <input
                    type="text"
                    required
                    value={newDocName}
                    onChange={e => setNewDocName(e.target.value)}
                    placeholder="Dr. John Doe"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    required
                    value={newDocEmail}
                    onChange={e => setNewDocEmail(e.target.value)}
                    placeholder="john@nowsheraclinic.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Specialty</label>
                  <select
                    value={newDocSpecialty}
                    onChange={e => setNewDocSpecialty(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-teal-600"
                  >
                    <option value="General Medicine">General Medicine</option>
                    <option value="Cardiology">Cardiology</option>
                    <option value="Pediatrics">Pediatrics</option>
                    <option value="Dermatology">Dermatology</option>
                    <option value="Orthopedics">Orthopedics</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Phone Number</label>
                  <input
                    type="text"
                    value={newDocPhone}
                    onChange={e => setNewDocPhone(e.target.value)}
                    placeholder="0300-1112233"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Professional Bio</label>
                <textarea
                  rows={2}
                  value={newDocBio}
                  onChange={e => setNewDocBio(e.target.value)}
                  placeholder="Short professional description..."
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>

              {docError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
                  {docError}
                </div>
              )}

              {docSuccess && (
                <div className="bg-teal-50 border border-teal-200 text-teal-700 text-xs p-3 rounded-xl font-medium break-all">
                  {docSuccess}
                </div>
              )}

              <button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl text-xs transition-all cursor-pointer shadow-sm"
              >
                Add Doctor
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <h2 className="text-xl font-bold text-slate-900">Clinic Doctors</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4 font-bold">Doctor</th>
                    <th className="py-3 px-4 font-bold">Specialty</th>
                    <th className="py-3 px-4 font-bold">Staff ID</th>
                    <th className="py-3 px-4 font-bold">Weekly Schedule</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {doctors.map(doc => (
                    <tr key={doc.id} className="hover:bg-slate-50">
                      <td className="py-4 px-4 font-bold text-slate-900">{doc.name}</td>
                      <td className="py-4 px-4 text-slate-600">{doc.specialty}</td>
                      <td className="py-4 px-4 text-xs">
                        <span className="font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-semibold">{doc.id}</span>
                        <span className="block text-[10px] text-teal-700 font-medium mt-0.5">Email Protected</span>
                      </td>
                      <td className="py-4 px-4 text-xs">
                        {doc.availability && doc.availability.length > 0 ? (
                          <div className="space-y-1">
                            {doc.availability.map(av => (
                              <div key={av.id} className="text-[11px] text-slate-600">
                                <span className="font-semibold text-slate-800">{av.dayOfWeek.slice(0, 3)}:</span>{" "}
                                <span className="text-teal-700 font-medium">{formatTimeRange12(av.startTime, av.endTime)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">None</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                          doc.active !== false ? "bg-teal-100 text-teal-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {doc.active !== false ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleDoctor(doc.id)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            doc.active !== false ? "bg-rose-50 text-rose-700 hover:bg-rose-100" : "bg-teal-50 text-teal-700 hover:bg-teal-100"
                          }`}
                        >
                          {doc.active !== false ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Patients Management View */}
      {subTab === "patients" && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-slate-900">Registered Patients</h2>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={patientSearch}
                onChange={e => setPatientSearch(e.target.value)}
                placeholder="Search patients..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Patient Name</th>
                  <th className="py-3 px-4 font-bold">Email</th>
                  <th className="py-3 px-4 font-bold">Phone</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredPatients.map(pat => (
                  <tr key={pat.id} className="hover:bg-slate-50">
                    <td className="py-4 px-4 font-bold text-slate-900">{pat.name}</td>
                    <td className="py-4 px-4 text-slate-600">{pat.email}</td>
                    <td className="py-4 px-4 text-slate-600">{pat.phone || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Appointments Management View */}
      {subTab === "appointments" && (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
          <h2 className="text-xl font-bold text-slate-900">All Clinic Appointments</h2>

          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">Filter by Doctor</label>
              <select
                value={filterDoctor}
                onChange={e => setFilterDoctor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="all">All Doctors</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">Filter by Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-teal-600"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:border-teal-600"
              >
                <option value="all">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="No-show">No-show</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Patient</th>
                  <th className="py-3 px-4 font-bold">Doctor</th>
                  <th className="py-3 px-4 font-bold">Date & Time</th>
                  <th className="py-3 px-4 font-bold">Status</th>
                  <th className="py-3 px-4 font-bold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredAppointments.map(apt => (
                  <tr key={apt.id} className="hover:bg-slate-50">
                    <td className="py-4 px-4 font-bold text-slate-900">{apt.patientName}</td>
                    <td className="py-4 px-4 text-slate-700">{apt.doctorName}</td>
                    <td className="py-4 px-4 text-slate-600">{apt.date} ({apt.startTime})</td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${
                        apt.status === "Pending" ? "bg-amber-100 text-amber-800" :
                        apt.status === "Confirmed" ? "bg-teal-100 text-teal-800" :
                        apt.status === "Completed" ? "bg-blue-100 text-blue-800" : "bg-rose-100 text-rose-800"
                      }`}>
                        {apt.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {(apt.status === "Pending" || apt.status === "Confirmed") && (
                        <button
                          onClick={() => handleCancelAppointment(apt.id)}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-all cursor-pointer"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start space-x-3 text-xs text-slate-600">
            <ShieldCheck className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900 block">Doctor-Patient Medical Confidentiality</span>
              <span>
                Clinical visit notes, prescriptions, and medical remarks are strictly private between the consulting doctor and their patient. In compliance with medical confidentiality standards, clinic administrators cannot view or author clinical visit notes.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Cloud & Supabase Dedicated Tables View */}
      {subTab === "database" && (
        <div className="space-y-8">
          {/* Top Status Cards: Cloud & Supabase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Firestore Cloud Status */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Cloud Firestore</h3>
                    <p className="text-xs text-slate-500">Primary Persistent Storage</p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Active
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono">
                <div><span className="text-slate-400 font-sans font-medium">Project ID:</span> ai-skool-506113</div>
                <div><span className="text-slate-400 font-sans font-medium">Database:</span> ai-studio-nowsherafamilycl...</div>
                <div><span className="text-slate-400 font-sans font-medium">Status:</span> Connected</div>
              </div>
              <p className="text-xs text-slate-500">
                All clinic operations, patient accounts, and bookings are durably stored in Cloud Firestore.
              </p>
            </div>

            {/* Supabase Multi-Table Sync Status */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Supabase Sync</h3>
                    <p className="text-xs text-slate-500">PostgreSQL Dedicated Tables</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                  dbStatus?.supabase?.connected
                    ? "bg-emerald-100 text-emerald-800"
                    : dbStatus?.supabase?.configured
                    ? "bg-blue-100 text-blue-800"
                    : "bg-amber-100 text-amber-800"
                }`}>
                  {dbStatus?.supabase?.connected ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Connected
                    </>
                  ) : dbStatus?.supabase?.configured ? (
                    "Configured"
                  ) : (
                    "Ready to Connect"
                  )}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-100 font-mono">
                <div>
                  <span className="text-slate-400 font-sans font-medium">Supabase URL:</span>{" "}
                  {dbStatus?.supabase?.url || "Not configured (set in Settings)"}
                </div>
                <div>
                  <span className="text-slate-400 font-sans font-medium">Status:</span>{" "}
                  {dbStatus?.supabase?.message || "Awaiting credentials"}
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={handleSyncSupabase}
                  disabled={isSyncing}
                  className="flex-1 inline-flex items-center justify-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{isSyncing ? "Syncing..." : "Sync All Tables"}</span>
                </button>
                <button
                  onClick={fetchData}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-2 rounded-xl text-xs transition-all cursor-pointer"
                  title="Check Connection"
                >
                  Refresh
                </button>
              </div>

              {syncMsg && (
                <div className="text-xs p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{syncMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Architecture Mapping: Dedicated Tables */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Dedicated Supabase Tables Architecture</h3>
              <p className="text-xs text-slate-500">
                Clinic operations automatically route and synchronize into dedicated PostgreSQL tables:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Box 1: Patient Data */}
              <div className="p-5 rounded-2xl bg-teal-50/70 border border-teal-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-teal-700" />
                    <h4 className="font-extrabold text-teal-950 text-sm">1. Patient Bookings</h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-teal-200/60 text-teal-900 rounded-full font-mono">
                    Table: patients
                  </span>
                </div>
                <p className="text-xs text-teal-900 leading-relaxed">
                  When a patient books an appointment, patient demographics, booking counts, and appointment summary are stored directly in the dedicated <strong>patients</strong> Supabase table.
                </p>
                <div className="text-[11px] bg-white p-2.5 rounded-xl border border-teal-200 text-teal-950 font-mono space-y-1">
                  <div><strong>Table:</strong> `patients`</div>
                  <div><strong>Columns:</strong> id, name, email, phone, doctor_name, specialty, latest_appointment_date, total_appointments</div>
                </div>
              </div>

              {/* Box 2: Doctor Decisions */}
              <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="w-4 h-4 text-blue-700" />
                    <h4 className="font-extrabold text-blue-950 text-sm">2. Doctor Reviews</h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-200/60 text-blue-900 rounded-full font-mono">
                    Table: doctor_appointment_reviews
                  </span>
                </div>
                <p className="text-xs text-blue-900 leading-relaxed">
                  When a doctor <strong>confirms</strong>, <strong>cancels</strong>, or <strong>rejects</strong> an appointment, the decision, doctor details, and reasons are written to the dedicated review audit table.
                </p>
                <div className="text-[11px] bg-white p-2.5 rounded-xl border border-blue-200 text-blue-950 font-mono space-y-1">
                  <div><strong>Table:</strong> `doctor_appointment_reviews`</div>
                  <div><strong>Statuses:</strong> `confirmed_appointments` & `cancelled_appointments`</div>
                </div>
              </div>

              {/* Box 3: Doctor Leaves */}
              <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-amber-700" />
                    <h4 className="font-extrabold text-amber-950 text-sm">3. Doctor Leaves</h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-200/60 text-amber-900 rounded-full font-mono">
                    Table: doctor_leaves
                  </span>
                </div>
                <p className="text-xs text-amber-900 leading-relaxed">
                  When a doctor schedules a leave day, it is stored in the dedicated <strong>doctor_leaves</strong> table alongside affected appointment metrics.
                </p>
                <div className="text-[11px] bg-white p-2.5 rounded-xl border border-amber-200 text-amber-950 font-mono space-y-1">
                  <div><strong>Table:</strong> `doctor_leaves` & `leave_days`</div>
                  <div><strong>Columns:</strong> id, doctor_id, doctor_name, leave_date, cancelled_appointments_count</div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Setup Instructions & Dedicated Supabase SQL Schema */}
          <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Dedicated Supabase SQL Migration Script</h3>
              <p className="text-xs text-slate-500">
                Run this complete SQL script in your Supabase SQL Editor to provision all dedicated tables for patients, doctor reviews, doctor leaves, and appointments.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">1</span>
                  <span>Set Supabase Credentials</span>
                </div>
                <p className="text-slate-600">
                  Add to your project environment or secrets:
                </p>
                <code className="block bg-white p-2 rounded-lg border border-slate-200 text-slate-700 font-mono text-[11px]">
                  SUPABASE_URL=https://xyz.supabase.co<br />
                  SUPABASE_ANON_KEY=eyJ...
                </code>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">2</span>
                  <span>Execute SQL Migration</span>
                </div>
                <p className="text-slate-600">
                  Copy the SQL script below and paste it into the <strong>SQL Editor</strong> in your Supabase dashboard to create the tables.
                </p>
                <button
                  onClick={() => {
                    const sql = `-- Supabase SQL Schema for Nowshera Family Clinic
-- Dedicated tables for Patients, Doctor Reviews, Doctor Leaves, and Appointments

-- 1. Dedicated Patient Table (Populated when patient books)
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  latest_appointment_id TEXT,
  latest_appointment_date DATE,
  latest_appointment_time TIME,
  doctor_id TEXT,
  doctor_name TEXT,
  specialty TEXT,
  appointment_status TEXT,
  total_appointments INTEGER DEFAULT 1,
  last_booked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dedicated Doctor Decisions Table (Populated on Confirm, Reject, Cancel)
CREATE TABLE IF NOT EXISTS doctor_appointment_reviews (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  decision TEXT NOT NULL, -- 'CONFIRMED', 'CANCELLED', 'REJECTED'
  doctor_id TEXT,
  doctor_name TEXT NOT NULL,
  patient_id TEXT,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  patient_email TEXT,
  appointment_date DATE NOT NULL,
  appointment_start_time TIME,
  appointment_end_time TIME,
  reason_or_notes TEXT,
  decided_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confirmed_appointments (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  patient_phone TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  date DATE,
  start_time TIME,
  end_time TIME,
  confirmed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cancelled_appointments (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  date DATE,
  start_time TIME,
  cancelled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dedicated Doctor Leaves Table (Populated when doctor adds leave)
CREATE TABLE IF NOT EXISTS doctor_leaves (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  leave_date DATE NOT NULL,
  reason TEXT DEFAULT 'Doctor scheduled day off',
  cancelled_appointments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Clinic Appointments & Master Tables
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  doctor_id TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  patient_name TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  doctor_name TEXT,
  specialty TEXT,
  visit_note TEXT,
  action_by_doctor_id TEXT,
  action_by_doctor_name TEXT,
  confirmed_by_doctor_id TEXT,
  confirmed_by_doctor_name TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  reviewed_at BIGINT,
  created_at BIGINT,
  updated_at BIGINT
);

CREATE TABLE IF NOT EXISTS appointment_events (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  event_type TEXT NOT NULL,
  patient_id TEXT,
  patient_name TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  appointment_date DATE,
  appointment_time TEXT,
  status TEXT,
  action_by_doctor_id TEXT,
  action_by_doctor_name TEXT,
  cancelled_by TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS availability (
  id TEXT PRIMARY KEY,
  doctor_id TEXT,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_days (
  id TEXT PRIMARY KEY,
  doctor_id TEXT,
  date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  specialty TEXT,
  bio TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;
                    navigator.clipboard.writeText(sql);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 3000);
                  }}
                  className="inline-flex items-center space-x-1.5 text-teal-700 font-bold hover:underline cursor-pointer pt-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedSql ? "Copied SQL to clipboard!" : "Copy SQL Script"}</span>
                </button>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <div className="font-bold text-slate-900 flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px]">3</span>
                  <span>Automatic Realtime Sync</span>
                </div>
                <p className="text-slate-600">
                  Every patient booking, doctor review decision, and doctor leave automatically syncs to its dedicated Supabase table and dispatches to n8n.
                </p>
              </div>
            </div>

            {/* SQL Code Block */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">Dedicated Supabase Schema (schema.sql)</span>
                <button
                  onClick={() => {
                    const sql = `-- Supabase SQL Schema for Nowshera Family Clinic
-- Dedicated tables for Patients, Doctor Reviews, Doctor Leaves, and Appointments

-- 1. Dedicated Patient Table (Populated when patient books)
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  latest_appointment_id TEXT,
  latest_appointment_date DATE,
  latest_appointment_time TIME,
  doctor_id TEXT,
  doctor_name TEXT,
  specialty TEXT,
  appointment_status TEXT,
  total_appointments INTEGER DEFAULT 1,
  last_booked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dedicated Doctor Decisions Table (Populated on Confirm, Reject, Cancel)
CREATE TABLE IF NOT EXISTS doctor_appointment_reviews (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  decision TEXT NOT NULL, -- 'CONFIRMED', 'CANCELLED', 'REJECTED'
  doctor_id TEXT,
  doctor_name TEXT NOT NULL,
  patient_id TEXT,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  patient_email TEXT,
  appointment_date DATE NOT NULL,
  appointment_start_time TIME,
  appointment_end_time TIME,
  reason_or_notes TEXT,
  decided_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confirmed_appointments (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  patient_phone TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  date DATE,
  start_time TIME,
  end_time TIME,
  confirmed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cancelled_appointments (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  date DATE,
  start_time TIME,
  cancelled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dedicated Doctor Leaves Table (Populated when doctor adds leave)
CREATE TABLE IF NOT EXISTS doctor_leaves (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  leave_date DATE NOT NULL,
  reason TEXT DEFAULT 'Doctor scheduled day off',
  cancelled_appointments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Master Clinic Operations Tables
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  doctor_id TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  patient_name TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  doctor_name TEXT,
  specialty TEXT,
  visit_note TEXT,
  action_by_doctor_id TEXT,
  action_by_doctor_name TEXT,
  confirmed_by_doctor_id TEXT,
  confirmed_by_doctor_name TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  reviewed_at BIGINT,
  created_at BIGINT,
  updated_at BIGINT
);

CREATE TABLE IF NOT EXISTS appointment_events (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  event_type TEXT NOT NULL,
  patient_id TEXT,
  patient_name TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  appointment_date DATE,
  appointment_time TEXT,
  status TEXT,
  action_by_doctor_id TEXT,
  action_by_doctor_name TEXT,
  cancelled_by TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS availability (
  id TEXT PRIMARY KEY,
  doctor_id TEXT,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_days (
  id TEXT PRIMARY KEY,
  doctor_id TEXT,
  date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  specialty TEXT,
  bio TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`;
                    navigator.clipboard.writeText(sql);
                    setCopiedSql(true);
                    setTimeout(() => setCopiedSql(false), 3000);
                  }}
                  className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center space-x-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedSql ? "Copied!" : "Copy SQL"}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-200 text-xs font-mono overflow-x-auto leading-relaxed max-h-72">
{`-- Supabase SQL Schema for Nowshera Family Clinic
-- Dedicated tables for Patients, Doctor Reviews, Doctor Leaves, and Appointments

-- 1. Dedicated Patient Table (Populated when patient books)
CREATE TABLE IF NOT EXISTS patients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  latest_appointment_id TEXT,
  latest_appointment_date DATE,
  latest_appointment_time TIME,
  doctor_id TEXT,
  doctor_name TEXT,
  specialty TEXT,
  appointment_status TEXT,
  total_appointments INTEGER DEFAULT 1,
  last_booked_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dedicated Doctor Decisions Table (Populated on Confirm, Reject, Cancel)
CREATE TABLE IF NOT EXISTS doctor_appointment_reviews (
  id TEXT PRIMARY KEY,
  appointment_id TEXT NOT NULL,
  decision TEXT NOT NULL, -- 'CONFIRMED', 'CANCELLED', 'REJECTED'
  doctor_id TEXT,
  doctor_name TEXT NOT NULL,
  patient_id TEXT,
  patient_name TEXT NOT NULL,
  patient_phone TEXT,
  patient_email TEXT,
  appointment_date DATE NOT NULL,
  appointment_start_time TIME,
  appointment_end_time TIME,
  reason_or_notes TEXT,
  decided_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS confirmed_appointments (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  patient_phone TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  date DATE,
  start_time TIME,
  end_time TIME,
  confirmed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cancelled_appointments (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  patient_id TEXT,
  patient_name TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  date DATE,
  start_time TIME,
  cancelled_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Dedicated Doctor Leaves Table (Populated when doctor adds leave)
CREATE TABLE IF NOT EXISTS doctor_leaves (
  id TEXT PRIMARY KEY,
  doctor_id TEXT NOT NULL,
  doctor_name TEXT NOT NULL,
  leave_date DATE NOT NULL,
  reason TEXT DEFAULT 'Doctor scheduled day off',
  cancelled_appointments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Master Clinic Operations Tables
CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT,
  doctor_id TEXT,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  patient_name TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  doctor_name TEXT,
  specialty TEXT,
  visit_note TEXT,
  action_by_doctor_id TEXT,
  action_by_doctor_name TEXT,
  confirmed_by_doctor_id TEXT,
  confirmed_by_doctor_name TEXT,
  cancelled_by TEXT,
  cancellation_reason TEXT,
  reviewed_at BIGINT,
  created_at BIGINT,
  updated_at BIGINT
);

CREATE TABLE IF NOT EXISTS appointment_events (
  id TEXT PRIMARY KEY,
  appointment_id TEXT,
  event_type TEXT NOT NULL,
  patient_id TEXT,
  patient_name TEXT,
  patient_phone TEXT,
  patient_email TEXT,
  doctor_id TEXT,
  doctor_name TEXT,
  appointment_date DATE,
  appointment_time TEXT,
  status TEXT,
  action_by_doctor_id TEXT,
  action_by_doctor_name TEXT,
  cancelled_by TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS availability (
  id TEXT PRIMARY KEY,
  doctor_id TEXT,
  day_of_week TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

CREATE TABLE IF NOT EXISTS leave_days (
  id TEXT PRIMARY KEY,
  doctor_id TEXT,
  date DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  phone TEXT,
  specialty TEXT,
  bio TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
