import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const app = express();
const PORT = 3000;

app.use(express.json());

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "clinic.json");

interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: "patient" | "doctor" | "admin";
  phone?: string;
  specialty?: string;
  bio?: string;
  photo?: string;
  active?: boolean;
  setPasswordToken?: string;
  setPasswordTokenExpiry?: number;
}

interface Availability {
  id: string;
  doctorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
}

interface LeaveDay {
  id: string;
  doctorId: string;
  date: string;
}

interface Appointment {
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

interface Database {
  users: User[];
  availability: Availability[];
  leaveDays: LeaveDay[];
  appointments: Appointment[];
}

export interface ServerLog {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  category: "auth" | "appointment" | "doctor" | "admin" | "cron" | "system" | "supabase" | "webhook";
  message: string;
  details?: Record<string, unknown>;
}

const serverLogs: ServerLog[] = [
  {
    id: "init-1",
    timestamp: new Date().toISOString(),
    level: "info",
    category: "system",
    message: "Nowshera Family Clinic Express backend engine initialized on port 3000."
  }
];

function addLog(
  level: "info" | "warn" | "error",
  category: ServerLog["category"],
  message: string,
  details?: Record<string, unknown>
) {
  serverLogs.unshift({
    id: "log-" + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    details
  });
  if (serverLogs.length > 200) serverLogs.pop();
}

// Request logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith("/api/")) {
    const start = Date.now();
    res.on("finish", () => {
      const duration = Date.now() - start;
      if (req.path !== "/api/system/logs" && req.path !== "/api/health") {
        addLog(
          res.statusCode >= 400 ? "warn" : "info",
          req.path.startsWith("/api/auth") ? "auth" : req.path.startsWith("/api/doctor") ? "doctor" : req.path.startsWith("/api/admin") ? "admin" : "system",
          `${req.method} ${req.path} -> ${res.statusCode} (${duration}ms)`
        );
      }
    });
  }
  next();
});

function getDefaultDatabase(): Database {
  return {
    users: [
      {
        id: "admin-1",
        name: "Clinic Manager",
        email: "alishbamanzoor372@gmail.com",
        password: "admin123",
        role: "admin",
        phone: "0300-9999999",
        active: true
      },
      {
        id: "doc-1",
        name: "Dr. Muhammad Ahmed",
        email: "ahmed@gmail.com",
        password: "doctor123",
        role: "doctor",
        specialty: "General Physician",
        bio: "Experienced General Physician providing comprehensive primary healthcare and medical evaluations for the whole family.",
        phone: "0300-1111111",
        active: true
      },
      {
        id: "doc-2",
        name: "Dr. Sara Khan",
        email: "sara@gmail.com",
        password: "doctor123",
        role: "doctor",
        specialty: "Pediatrician",
        bio: "Compassionate specialist in child healthcare, pediatric growth development, and newborn vaccinations.",
        phone: "0300-2222222",
        active: true
      },
      {
        id: "doc-3",
        name: "Dr. Ayesha Malik",
        email: "ayesha@gmail.com",
        password: "doctor123",
        role: "doctor",
        specialty: "Gynecologist",
        bio: "Expert in maternal healthcare, prenatal examinations, and comprehensive women's clinical health.",
        phone: "0300-3333333",
        active: true
      },
      {
        id: "doc-4",
        name: "Dr. Hamza Ali",
        email: "hamza@gmail.com",
        password: "doctor123",
        role: "doctor",
        specialty: "Cardiologist",
        bio: "Consultant cardiologist specializing in cardiovascular wellness, ECG assessments, and hypertension management.",
        phone: "0300-4444444",
        active: true
      },
      {
        id: "doc-5",
        name: "Dr. Fatima Noor",
        email: "fatima@gmail.com",
        password: "doctor123",
        role: "doctor",
        specialty: "Dermatologist",
        bio: "Dedicated dermatologist treating complex skin disorders, cosmetic dermatology, and allergic conditions.",
        phone: "0300-5555555",
        active: true
      },
      {
        id: "pat-1",
        name: "Ali Khan",
        email: "ali@gmail.com",
        password: "password123",
        role: "patient",
        phone: "0300-6666666",
        active: true
      }
    ],
    availability: [
      { id: "av-1", doctorId: "doc-1", dayOfWeek: "Monday", startTime: "09:00", endTime: "13:00" },
      { id: "av-2", doctorId: "doc-1", dayOfWeek: "Tuesday", startTime: "09:00", endTime: "13:00" },
      { id: "av-3", doctorId: "doc-1", dayOfWeek: "Wednesday", startTime: "09:00", endTime: "13:00" },
      { id: "av-4", doctorId: "doc-1", dayOfWeek: "Thursday", startTime: "09:00", endTime: "13:00" },
      { id: "av-5", doctorId: "doc-1", dayOfWeek: "Friday", startTime: "09:00", endTime: "13:00" },

      { id: "av-6", doctorId: "doc-2", dayOfWeek: "Monday", startTime: "10:00", endTime: "14:00" },
      { id: "av-7", doctorId: "doc-2", dayOfWeek: "Tuesday", startTime: "10:00", endTime: "14:00" },
      { id: "av-8", doctorId: "doc-2", dayOfWeek: "Wednesday", startTime: "10:00", endTime: "14:00" },
      { id: "av-9", doctorId: "doc-2", dayOfWeek: "Thursday", startTime: "10:00", endTime: "14:00" },

      { id: "av-10", doctorId: "doc-3", dayOfWeek: "Monday", startTime: "14:00", endTime: "18:00" },
      { id: "av-11", doctorId: "doc-3", dayOfWeek: "Tuesday", startTime: "14:00", endTime: "18:00" },
      { id: "av-12", doctorId: "doc-3", dayOfWeek: "Wednesday", startTime: "14:00", endTime: "18:00" },
      { id: "av-13", doctorId: "doc-3", dayOfWeek: "Thursday", startTime: "14:00", endTime: "18:00" },
      { id: "av-14", doctorId: "doc-3", dayOfWeek: "Friday", startTime: "14:00", endTime: "18:00" },

      { id: "av-15", doctorId: "doc-4", dayOfWeek: "Tuesday", startTime: "09:00", endTime: "13:00" },
      { id: "av-16", doctorId: "doc-4", dayOfWeek: "Wednesday", startTime: "09:00", endTime: "13:00" },
      { id: "av-17", doctorId: "doc-4", dayOfWeek: "Thursday", startTime: "09:00", endTime: "13:00" },
      { id: "av-18", doctorId: "doc-4", dayOfWeek: "Friday", startTime: "09:00", endTime: "13:00" },
      { id: "av-19", doctorId: "doc-4", dayOfWeek: "Saturday", startTime: "09:00", endTime: "13:00" },

      { id: "av-20", doctorId: "doc-5", dayOfWeek: "Monday", startTime: "15:00", endTime: "19:00" },
      { id: "av-21", doctorId: "doc-5", dayOfWeek: "Tuesday", startTime: "15:00", endTime: "19:00" },
      { id: "av-22", doctorId: "doc-5", dayOfWeek: "Wednesday", startTime: "15:00", endTime: "19:00" },
      { id: "av-23", doctorId: "doc-5", dayOfWeek: "Friday", startTime: "15:00", endTime: "19:00" }
    ],
    leaveDays: [],
    appointments: []
  };
}

function getDb(): Database {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialDb = getDefaultDatabase();
    fs.writeFileSync(DB_FILE, JSON.stringify(initialDb, null, 2));
    addLog("info", "system", "Database initialized with default seed data at data/clinic.json");
    return initialDb;
  }
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    const parsed: Database = JSON.parse(data);
    
    // Ensure the 5 doctors have their designated emails and names
    const doctorMap: Record<string, { name: string; email: string }> = {
      "doc-1": { name: "Dr. Muhammad Ahmed", email: "ahmed@gmail.com" },
      "doc-2": { name: "Dr. Sara Khan", email: "sara@gmail.com" },
      "doc-3": { name: "Dr. Ayesha Malik", email: "ayesha@gmail.com" },
      "doc-4": { name: "Dr. Hamza Ali", email: "hamza@gmail.com" },
      "doc-5": { name: "Dr. Fatima Noor", email: "fatima@gmail.com" }
    };
    let modified = false;
    for (const u of parsed.users) {
      if (doctorMap[u.id]) {
        if (u.email !== doctorMap[u.id].email) {
          u.email = doctorMap[u.id].email;
          modified = true;
        }
        if (u.name !== doctorMap[u.id].name) {
          u.name = doctorMap[u.id].name;
          modified = true;
        }
      }
    }
    if (modified) {
      fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2));
    }
    return parsed;
  } catch (err) {
    console.error("Error reading DB:", err);
    return { users: [], availability: [], leaveDays: [], appointments: [] };
  }
}

let supabaseClient: SupabaseClient | null = null;

function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      supabaseClient = createClient(url, key);
      addLog("info", "system", `Supabase client initialized with endpoint: ${url}`);
      return supabaseClient;
    } catch (err) {
      console.warn("Failed to initialize Supabase client:", err);
    }
  }
  return null;
}

// n8n Webhook Configuration & Dispatcher
export interface WebhookDeliveryRecord {
  id: string;
  timestamp: string;
  url: string;
  eventType: string;
  status: "success" | "failed";
  statusCode?: number;
  responsePreview?: string;
  error?: string;
}

const DEFAULT_N8N_WEBHOOK_URL =
  process.env.N8N_WEBHOOK_URL ||
  "https://ai-skool-n8n-57b1748669d9.herokuapp.com/webhook/clinic-appointments";

let webhookConfig = {
  url: DEFAULT_N8N_WEBHOOK_URL,
  enabled: true,
  mode: "auto" as "auto" | "test" | "production"
};

let recentWebhookDeliveries: WebhookDeliveryRecord[] = [];

// Dispatches real-time event data to n8n webhook, handling both active and test/listening mode
async function sendToN8nWebhook(eventType: string, data: any): Promise<WebhookDeliveryRecord> {
  const baseTargetUrl = (webhookConfig.url || DEFAULT_N8N_WEBHOOK_URL).trim();
  let targetUrl = baseTargetUrl;

  // Adapt URL if explicitly configured for test (listening mode) or production
  if (webhookConfig.mode === "test" && baseTargetUrl.includes("/webhook/")) {
    targetUrl = baseTargetUrl.replace("/webhook/", "/webhook-test/");
  } else if (webhookConfig.mode === "production" && baseTargetUrl.includes("/webhook-test/")) {
    targetUrl = baseTargetUrl.replace("/webhook-test/", "/webhook/");
  }

  const payload = {
    event: eventType,
    timestamp: new Date().toISOString(),
    source: "nowshera-family-clinic",
    data
  };

  const deliveryId = "wh-" + Math.random().toString(36).substring(2, 9);
  const nowStr = new Date().toISOString();

  async function postPayload(url: string) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "NowsheraFamilyClinic-Webhook/1.0"
      },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  }

  let finalRecord: WebhookDeliveryRecord;

  try {
    let result = await postPayload(targetUrl);

    // If auto mode and n8n returns 404 (workflow is listening on test URL or vice versa), auto-try alternate
    if (webhookConfig.mode === "auto" && result.status === 404) {
      let alternateUrl = "";
      if (targetUrl.includes("/webhook/")) {
        alternateUrl = targetUrl.replace("/webhook/", "/webhook-test/");
      } else if (targetUrl.includes("/webhook-test/")) {
        alternateUrl = targetUrl.replace("/webhook-test/", "/webhook/");
      }

      if (alternateUrl) {
        try {
          const altResult = await postPayload(alternateUrl);
          if (altResult.ok || altResult.status < 400) {
            targetUrl = alternateUrl;
            result = altResult;
          }
        } catch {
          // Keep initial result
        }
      }
    }

    finalRecord = {
      id: deliveryId,
      timestamp: nowStr,
      url: targetUrl,
      eventType,
      status: result.ok ? "success" : "failed",
      statusCode: result.status,
      responsePreview: result.text.substring(0, 300)
    };

    if (result.ok) {
      addLog("info", "webhook", `Webhook delivered to n8n [${eventType}] (HTTP ${result.status})`);
    } else {
      addLog("warn", "webhook", `Webhook delivery response [${eventType}] HTTP ${result.status}: ${result.text.substring(0, 150)}`);
    }
  } catch (err: any) {
    finalRecord = {
      id: deliveryId,
      timestamp: nowStr,
      url: targetUrl,
      eventType,
      status: "failed",
      error: err?.message || "Network request failed"
    };
    addLog("error", "webhook", `Webhook send exception [${eventType}]: ${err?.message || err}`);
  }

  recentWebhookDeliveries.unshift(finalRecord);
  if (recentWebhookDeliveries.length > 25) recentWebhookDeliveries.pop();
  return finalRecord;
}

// 1. Sync dedicated patient profile and booking data to 'patients' table in Supabase
async function syncPatientDataToSupabase(patient: User, latestAppointment?: Appointment) {
  const db = getDb();
  const patientAppointments = db.appointments.filter(a => a.patientId === patient.id);

  // Dispatch real-time event to n8n webhook
  sendToN8nWebhook("patient.booked", {
    patient_id: patient.id,
    patient_name: patient.name,
    patient_email: patient.email,
    patient_phone: patient.phone || null,
    total_appointments: patientAppointments.length,
    latest_appointment: latestAppointment
      ? {
          id: latestAppointment.id,
          date: latestAppointment.date,
          start_time: latestAppointment.startTime,
          end_time: latestAppointment.endTime,
          doctor_name: latestAppointment.doctorName,
          specialty: latestAppointment.specialty,
          status: latestAppointment.status
        }
      : null,
    booked_at: new Date().toISOString()
  }).catch(() => {});

  const sb = getSupabase();
  if (!sb) return;

  try {
    const fullPatientPayload = {
      id: patient.id,
      name: patient.name,
      email: patient.email,
      phone: patient.phone || null,
      latest_appointment_id: latestAppointment?.id || null,
      latest_appointment_date: latestAppointment?.date || null,
      latest_appointment_time: latestAppointment?.startTime || null,
      doctor_id: latestAppointment?.doctorId || null,
      doctor_name: latestAppointment?.doctorName || null,
      specialty: latestAppointment?.specialty || null,
      appointment_status: latestAppointment?.status || null,
      total_appointments: patientAppointments.length,
      last_booked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await sb.from("patients").upsert(fullPatientPayload, { onConflict: "id" });
    if (error) {
      // Fallback to basic patients schema if table was created with core columns
      const basicPayload = {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone || null,
        created_at: new Date().toISOString()
      };
      const { error: basicErr } = await sb.from("patients").upsert(basicPayload, { onConflict: "id" });
      if (basicErr) {
        console.warn("Supabase 'patients' upsert:", basicErr.message);
      } else {
        addLog("info", "supabase", `Patient ${patient.name} synced to Supabase 'patients' table.`);
      }
    } else {
      addLog("info", "supabase", `Patient ${patient.name} synced to dedicated Supabase 'patients' table.`);
    }
  } catch (err: any) {
    console.warn("Exception syncing patient to Supabase:", err?.message || err);
  }
}

// 2. Sync doctor review decisions (Confirmed, Cancelled, Rejected) to dedicated Supabase table
async function syncDoctorDecisionToSupabase(
  apt: Appointment,
  action: "CONFIRMED" | "CANCELLED" | "REJECTED",
  actor?: { id?: string; name: string; role?: string },
  reason?: string
) {
  // Sync to core appointments table & appointment_events
  syncAppointmentEventToSupabase(apt, action, actor, reason).catch(() => {});

  // Dispatch to n8n webhook
  sendToN8nWebhook(`doctor.appointment_${action.toLowerCase()}`, {
    decision: action,
    appointment_id: apt.id,
    doctor_id: actor?.id || apt.actionByDoctorId || apt.doctorId,
    doctor_name: actor?.name || apt.actionByDoctorName || apt.doctorName,
    patient_id: apt.patientId,
    patient_name: apt.patientName,
    patient_phone: apt.patientPhone || null,
    patient_email: apt.patientEmail,
    date: apt.date,
    start_time: apt.startTime,
    end_time: apt.endTime,
    status: apt.status,
    reason_or_notes: reason || apt.cancellationReason || apt.visitNote || null,
    timestamp: new Date().toISOString()
  }).catch(() => {});

  const sb = getSupabase();
  if (!sb) return;

  const reviewPayload = {
    id: `rev-${apt.id}-${Date.now()}`,
    appointment_id: apt.id,
    decision: action,
    doctor_id: actor?.id || apt.actionByDoctorId || apt.doctorId,
    doctor_name: actor?.name || apt.actionByDoctorName || apt.doctorName,
    patient_id: apt.patientId,
    patient_name: apt.patientName,
    patient_phone: apt.patientPhone || null,
    patient_email: apt.patientEmail,
    appointment_date: apt.date,
    appointment_start_time: apt.startTime,
    appointment_end_time: apt.endTime,
    reason_or_notes: reason || apt.cancellationReason || apt.visitNote || null,
    decided_at: new Date().toISOString()
  };

  try {
    // 1. Sync to dedicated 'doctor_appointment_reviews' table
    const { error: revErr } = await sb.from("doctor_appointment_reviews").insert(reviewPayload);
    if (revErr && revErr.code !== "42P01") {
      console.warn("Supabase doctor_appointment_reviews insert notice:", revErr.message);
    } else if (!revErr) {
      addLog("info", "supabase", `Doctor ${action} decision for appointment ${apt.id} synced to 'doctor_appointment_reviews'.`);
    }

    // 2. Also populate specific status tables if user created them in Supabase
    if (action === "CONFIRMED") {
      await sb.from("confirmed_appointments").upsert({
        id: apt.id,
        appointment_id: apt.id,
        patient_id: apt.patientId,
        patient_name: apt.patientName,
        patient_phone: apt.patientPhone || null,
        doctor_id: actor?.id || apt.doctorId,
        doctor_name: actor?.name || apt.doctorName,
        date: apt.date,
        start_time: apt.startTime,
        end_time: apt.endTime,
        confirmed_at: new Date().toISOString()
      }, { onConflict: "id" });
    } else if (action === "CANCELLED" || action === "REJECTED") {
      await sb.from("cancelled_appointments").upsert({
        id: apt.id,
        appointment_id: apt.id,
        patient_id: apt.patientId,
        patient_name: apt.patientName,
        cancelled_by: actor?.name || apt.cancelledBy || "Doctor",
        cancellation_reason: reason || apt.cancellationReason || "Cancelled",
        date: apt.date,
        start_time: apt.startTime,
        cancelled_at: new Date().toISOString()
      }, { onConflict: "id" });
    }
  } catch (err: any) {
    console.warn("Exception syncing doctor decision to Supabase:", err?.message || err);
  }
}

// 3. Sync doctor leave days to dedicated 'doctor_leaves' and 'leave_days' tables in Supabase
async function syncDoctorLeaveToSupabase(leave: LeaveDay, doctor: User, cancelledCount: number) {
  // Dispatch to n8n webhook
  sendToN8nWebhook("doctor.leave_added", {
    leave_id: leave.id,
    doctor_id: doctor.id,
    doctor_name: doctor.name,
    specialty: doctor.specialty || null,
    leave_date: leave.date,
    cancelled_appointments_count: cancelledCount,
    timestamp: new Date().toISOString()
  }).catch(() => {});

  const sb = getSupabase();
  if (!sb) return;

  try {
    // 1. Sync to dedicated 'doctor_leaves' table
    const fullLeavePayload = {
      id: leave.id,
      doctor_id: doctor.id,
      doctor_name: doctor.name,
      leave_date: leave.date,
      reason: "Doctor scheduled day off",
      cancelled_appointments_count: cancelledCount,
      created_at: new Date().toISOString()
    };
    const { error: leaveErr } = await sb.from("doctor_leaves").upsert(fullLeavePayload, { onConflict: "id" });
    if (leaveErr) {
      console.warn("Supabase doctor_leaves notice:", leaveErr.message);
    } else {
      addLog("info", "supabase", `Leave for Dr. ${doctor.name} on ${leave.date} synced to Supabase 'doctor_leaves' table.`);
    }

    // 2. Also keep standard 'leave_days' table synced
    await sb.from("leave_days").upsert({
      id: leave.id,
      doctor_id: leave.doctorId,
      date: leave.date
    }, { onConflict: "id" });
  } catch (err: any) {
    console.warn("Exception syncing doctor leave to Supabase:", err?.message || err);
  }
}

// Sync individual appointment and audit event directly to Supabase
async function syncAppointmentEventToSupabase(
  apt: Appointment,
  eventType: "BOOKED" | "CONFIRMED" | "CANCELLED" | "REJECTED" | "COMPLETED" | "RESCHEDULED" | "VISIT_NOTE_UPDATED",
  actor?: { id?: string; name: string; role?: string },
  details?: string
) {
  const sb = getSupabase();
  if (!sb) return;

  // 1. Sync to 'appointments' table with full doctor audit info
  try {
    const fullPayload = {
      id: apt.id,
      patient_id: apt.patientId,
      doctor_id: apt.doctorId,
      date: apt.date,
      start_time: apt.startTime,
      end_time: apt.endTime,
      status: apt.status,
      patient_name: apt.patientName,
      patient_phone: apt.patientPhone || null,
      patient_email: apt.patientEmail,
      doctor_name: apt.doctorName,
      specialty: apt.specialty || null,
      visit_note: apt.visitNote || null,
      action_by_doctor_id: apt.actionByDoctorId || actor?.id || null,
      action_by_doctor_name: apt.actionByDoctorName || actor?.name || null,
      confirmed_by_doctor_id: apt.confirmedByDoctorId || (apt.status === "Confirmed" ? (actor?.id || apt.doctorId) : null),
      confirmed_by_doctor_name: apt.confirmedByDoctorName || (apt.status === "Confirmed" ? (actor?.name || apt.doctorName) : null),
      cancelled_by: apt.cancelledBy || (apt.status === "Cancelled" ? (actor?.name || null) : null),
      cancellation_reason: apt.cancellationReason || details || null,
      reviewed_at: apt.reviewedAt || null,
      created_at: apt.createdAt,
      updated_at: apt.updatedAt || Date.now()
    };

    const { error: fullError } = await sb.from("appointments").upsert(fullPayload, { onConflict: "id" });
    if (fullError) {
      // If table lacks new columns, fallback to standard schema with embedded audit in visit_note
      if (fullError.message && (fullError.message.includes("column") || fullError.code === "PGRST204")) {
        let noteWithAudit = apt.visitNote || "";
        if (apt.status === "Confirmed") {
          const doc = apt.confirmedByDoctorName || actor?.name || apt.doctorName;
          noteWithAudit = `[CONFIRMED by Dr. ${doc}] ${noteWithAudit}`.trim();
        } else if (apt.status === "Cancelled") {
          const by = apt.cancelledBy || actor?.name || "Doctor";
          const reason = apt.cancellationReason || details || "Cancelled";
          noteWithAudit = `[CANCELLED by ${by}: ${reason}] ${noteWithAudit}`.trim();
        }

        const basicPayload = {
          id: apt.id,
          patient_id: apt.patientId,
          doctor_id: apt.doctorId,
          date: apt.date,
          start_time: apt.startTime,
          end_time: apt.endTime,
          status: apt.status,
          patient_name: apt.patientName,
          patient_phone: apt.patientPhone || null,
          patient_email: apt.patientEmail,
          doctor_name: apt.doctorName,
          specialty: apt.specialty || null,
          visit_note: noteWithAudit || null,
          created_at: apt.createdAt,
          updated_at: apt.updatedAt || Date.now()
        };
        const { error: basicErr } = await sb.from("appointments").upsert(basicPayload, { onConflict: "id" });
        if (basicErr) {
          console.warn("Supabase appointments basic upsert:", basicErr.message);
        } else {
          addLog("info", "supabase", `Synced appointment ${apt.id} (${apt.status}) to Supabase 'appointments' table.`);
        }
      } else {
        console.warn("Supabase appointments upsert notice:", fullError.message);
      }
    } else {
      addLog("info", "supabase", `Synced appointment ${apt.id} (${apt.status}) to Supabase with doctor audit details.`);
    }
  } catch (err: any) {
    console.warn("Supabase appointment sync exception:", err?.message || err);
  }

  // 2. Also log to 'appointment_events' table if created in Supabase
  try {
    const eventPayload = {
      id: "evt-" + Math.random().toString(36).substring(2, 10),
      appointment_id: apt.id,
      event_type: eventType,
      patient_id: apt.patientId,
      patient_name: apt.patientName,
      patient_phone: apt.patientPhone || null,
      patient_email: apt.patientEmail,
      doctor_id: apt.doctorId,
      doctor_name: apt.doctorName,
      appointment_date: apt.date,
      appointment_time: apt.startTime,
      status: apt.status,
      action_by_doctor_id: apt.actionByDoctorId || actor?.id || null,
      action_by_doctor_name: apt.actionByDoctorName || actor?.name || null,
      cancelled_by: apt.cancelledBy || null,
      note: details || apt.visitNote || null,
      created_at: new Date().toISOString()
    };
    await sb.from("appointment_events").insert(eventPayload);
  } catch {
    // Optional audit table
  }
}

// Background sync to Supabase if credentials are provided
async function syncDatabaseToSupabase(db: Database) {
  const sb = getSupabase();
  if (!sb) return;

  // 1. Sync dedicated 'patients' table
  const patientUsers = db.users.filter(u => u.role === "patient");
  if (patientUsers.length > 0) {
    try {
      const patientRecords = patientUsers.map(p => {
        const appts = db.appointments.filter(a => a.patientId === p.id);
        const latest = appts[appts.length - 1];
        return {
          id: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone || null,
          latest_appointment_id: latest?.id || null,
          latest_appointment_date: latest?.date || null,
          latest_appointment_time: latest?.startTime || null,
          doctor_id: latest?.doctorId || null,
          doctor_name: latest?.doctorName || null,
          specialty: latest?.specialty || null,
          appointment_status: latest?.status || null,
          total_appointments: appts.length,
          last_booked_at: latest ? new Date(latest.createdAt).toISOString() : null,
          updated_at: new Date().toISOString()
        };
      });

      const { error: patientErr } = await sb.from("patients").upsert(patientRecords, { onConflict: "id" });
      if (patientErr) {
        // Fallback to basic columns
        const basicPatients = patientUsers.map(p => ({
          id: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone || null,
          created_at: new Date().toISOString()
        }));
        await sb.from("patients").upsert(basicPatients, { onConflict: "id" });
      }
    } catch (err: any) {
      console.warn("Supabase patients sync notice:", err?.message || err);
    }
  }

  // 2. Sync appointments
  if (db.appointments.length > 0) {
    try {
      const fullAppts = db.appointments.map(a => ({
        id: a.id,
        patient_id: a.patientId,
        doctor_id: a.doctorId,
        date: a.date,
        start_time: a.startTime,
        end_time: a.endTime,
        status: a.status,
        patient_name: a.patientName,
        patient_phone: a.patientPhone || null,
        patient_email: a.patientEmail,
        doctor_name: a.doctorName,
        specialty: a.specialty || null,
        visit_note: a.visitNote || null,
        action_by_doctor_id: a.actionByDoctorId || null,
        action_by_doctor_name: a.actionByDoctorName || null,
        confirmed_by_doctor_id: a.confirmedByDoctorId || null,
        confirmed_by_doctor_name: a.confirmedByDoctorName || null,
        cancelled_by: a.cancelledBy || null,
        cancellation_reason: a.cancellationReason || null,
        reviewed_at: a.reviewedAt || null,
        created_at: a.createdAt,
        updated_at: a.updatedAt || Date.now()
      }));

      const { error: apptErr } = await sb.from("appointments").upsert(fullAppts, { onConflict: "id" });
      if (apptErr) {
        if (apptErr.message && (apptErr.message.includes("column") || apptErr.code === "PGRST204")) {
          // Fallback to basic columns with embedded audit note
          const basicAppts = db.appointments.map(a => {
            let note = a.visitNote || "";
            if (a.status === "Confirmed" && a.confirmedByDoctorName) {
              note = `[Confirmed by ${a.confirmedByDoctorName}] ${note}`.trim();
            } else if (a.status === "Cancelled" && a.cancelledBy) {
              note = `[Cancelled by ${a.cancelledBy}${a.cancellationReason ? `: ${a.cancellationReason}` : ""}] ${note}`.trim();
            }
            return {
              id: a.id,
              patient_id: a.patientId,
              doctor_id: a.doctorId,
              date: a.date,
              start_time: a.startTime,
              end_time: a.endTime,
              status: a.status,
              patient_name: a.patientName,
              patient_phone: a.patientPhone || null,
              patient_email: a.patientEmail,
              doctor_name: a.doctorName,
              specialty: a.specialty || null,
              visit_note: note || null,
              created_at: a.createdAt,
              updated_at: a.updatedAt || Date.now()
            };
          });
          await sb.from("appointments").upsert(basicAppts, { onConflict: "id" });
        }
      }
    } catch (err: any) {
      console.warn("Supabase appointments sync notice:", err?.message || err);
    }
  }

  // 3. Sync doctor leaves to 'doctor_leaves' and 'leave_days'
  if (db.leaveDays.length > 0) {
    try {
      const fullLeaves = db.leaveDays.map(l => {
        const doc = db.users.find(u => u.id === l.doctorId);
        return {
          id: l.id,
          doctor_id: l.doctorId,
          doctor_name: doc ? doc.name : "Doctor",
          leave_date: l.date,
          reason: "Doctor scheduled day off",
          created_at: new Date().toISOString()
        };
      });
      await sb.from("doctor_leaves").upsert(fullLeaves, { onConflict: "id" });

      const leavePayload = db.leaveDays.map(l => ({
        id: l.id,
        doctor_id: l.doctorId,
        date: l.date
      }));
      await sb.from("leave_days").upsert(leavePayload, { onConflict: "id" });
    } catch (err: any) {
      console.warn("Supabase leave sync notice:", err?.message || err);
    }
  }

  // 4. Sync doctor availability slots
  if (db.availability.length > 0) {
    try {
      const avPayload = db.availability.map(av => ({
        id: av.id,
        doctor_id: av.doctorId,
        day_of_week: av.dayOfWeek,
        start_time: av.startTime,
        end_time: av.endTime
      }));
      await sb.from("availability").upsert(avPayload, { onConflict: "id" });
    } catch (err: any) {
      console.warn("Supabase availability sync notice:", err?.message || err);
    }
  }

  // 5. Sync registered users
  if (db.users.length > 0) {
    try {
      const usersPayload = db.users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        phone: u.phone || null,
        specialty: u.specialty || null,
        bio: u.bio || null,
        active: u.active !== false
      }));
      await sb.from("users").upsert(usersPayload, { onConflict: "id" });
    } catch {
      // Ignore if user table has differing schema
    }
  }
}

function saveDb(db: Database) {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
  syncDatabaseToSupabase(db).catch(() => {});
}

let lastCronRun = Date.now();
let totalCronCancelled = 0;

// Background automation: check unconfirmed pending appts whose start time has passed -> auto cancel
function runAutomations() {
  lastCronRun = Date.now();
  const db = getDb();
  const now = Date.now();
  let updated = false;
  let cancelledNow = 0;

  for (const apt of db.appointments) {
    if (apt.status === "Pending") {
      const aptDateTime = new Date(`${apt.date}T${apt.startTime}:00`).getTime();
      if (now >= aptDateTime) {
        apt.status = "Cancelled";
        apt.cancelledBy = "System Auto-Expiry";
        apt.cancellationReason = "Appointment unconfirmed before start time";
        apt.updatedAt = now;
        updated = true;
        cancelledNow++;
        totalCronCancelled++;
        syncAppointmentEventToSupabase(apt, "CANCELLED", { name: "System Automation", role: "system" }, apt.cancellationReason).catch(() => {});
      }
    }
  }

  if (updated) {
    saveDb(db);
    addLog("info", "cron", `Automation cron cancelled ${cancelledNow} expired pending appointments.`);
  }
}

setInterval(runAutomations, 30000);

function formatTime12(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const hFormatted = h < 10 ? `0${h}` : `${h}`;
  const mFormatted = m < 10 ? `0${m}` : `${m}`;
  return `${hFormatted}:${mFormatted} ${ampm}`;
}

function getDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

// API Routes

// System & Health Endpoints
app.get("/api/health", (req, res) => {
  const db = getDb();
  let dbSizeBytes = 0;
  if (fs.existsSync(DB_FILE)) {
    try {
      dbSizeBytes = fs.statSync(DB_FILE).size;
    } catch (_) {}
  }

  res.json({
    status: "healthy",
    service: "Nowshera Family Clinic Backend Engine",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    platform: process.platform,
    memoryUsageMB: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024 * 10) / 10,
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 10) / 10,
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 10) / 10
    },
    database: {
      type: "JSON File Persistence (Atomic FileStore)",
      status: "connected",
      filePath: "data/clinic.json",
      fileSizeBytes: dbSizeBytes,
      totalUsers: db.users.length,
      totalDoctors: db.users.filter(u => u.role === "doctor").length,
      totalPatients: db.users.filter(u => u.role === "patient").length,
      totalAppointments: db.appointments.length
    },
    automationScheduler: {
      status: "active",
      intervalSeconds: 30,
      lastRun: new Date(lastCronRun).toISOString(),
      totalCancelledExpired: totalCronCancelled
    }
  });
});

app.get("/api/system/status", (req, res) => {
  const db = getDb();
  let dbSizeBytes = 0;
  if (fs.existsSync(DB_FILE)) {
    try {
      dbSizeBytes = fs.statSync(DB_FILE).size;
    } catch (_) {}
  }

  const appointmentsByStatus = {
    pending: db.appointments.filter(a => a.status === "Pending").length,
    confirmed: db.appointments.filter(a => a.status === "Confirmed").length,
    completed: db.appointments.filter(a => a.status === "Completed").length,
    noshow: db.appointments.filter(a => a.status === "No-show").length,
    cancelled: db.appointments.filter(a => a.status === "Cancelled").length,
    rejected: db.appointments.filter(a => a.status === "Rejected").length,
    total: db.appointments.length
  };

  res.json({
    success: true,
    server: {
      port: PORT,
      uptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      pid: process.pid,
      timestamp: new Date().toISOString()
    },
    database: {
      path: "data/clinic.json",
      sizeBytes: dbSizeBytes,
      users: {
        total: db.users.length,
        admins: db.users.filter(u => u.role === "admin").length,
        doctors: db.users.filter(u => u.role === "doctor").length,
        patients: db.users.filter(u => u.role === "patient").length,
        activeDoctors: db.users.filter(u => u.role === "doctor" && u.active !== false).length
      },
      appointments: appointmentsByStatus,
      weeklySchedulesCount: db.availability.length,
      leaveDaysCount: db.leaveDays.length
    },
    scheduler: {
      status: "running",
      interval: "30s",
      lastCheck: new Date(lastCronRun).toISOString(),
      totalAutoCancelled: totalCronCancelled
    }
  });
});

app.get("/api/system/logs", (req, res) => {
  res.json({
    success: true,
    count: serverLogs.length,
    logs: serverLogs
  });
});

app.get("/api/system/backup", (req, res) => {
  const db = getDb();
  const safeDb = {
    ...db,
    users: db.users.map(({ password: _, setPasswordToken: __, ...u }) => ({ ...u, password: "[Protected]" }))
  };
  res.setHeader("Content-Disposition", `attachment; filename=clinic-backup-${new Date().toISOString().split("T")[0]}.json`);
  res.setHeader("Content-Type", "application/json");
  res.json(safeDb);
});

app.post("/api/system/reset", (req, res) => {
  const defaultDb = getDefaultDatabase();
  saveDb(defaultDb);
  addLog("warn", "system", "Database reset to factory default clinic records.");
  res.json({
    success: true,
    message: "Clinic database successfully restored to default state with 5 verified doctors and pristine schedule."
  });
});

app.get("/api/docs", (req, res) => {
  res.json({
    name: "Nowshera Family Clinic REST API",
    version: "2.0.0",
    description: "Full-Stack Express API for Patient & Clinic Appointment Management, Strict 30-Minute Interval Booking, and Doctor Schedules.",
    endpoints: [
      { method: "GET", path: "/api/health", description: "Health check, server metrics, Node.js stats, and DB connection" },
      { method: "GET", path: "/api/system/status", description: "Comprehensive database counters, memory usage, and scheduler status" },
      { method: "GET", path: "/api/system/logs", description: "Real-time backend audit logs for all server requests and actions" },
      { method: "GET", path: "/api/system/backup", description: "Export current database state as JSON" },
      { method: "POST", path: "/api/system/reset", description: "Reset database to initial 5 doctors and default clinic schedule" },
      { method: "POST", path: "/api/auth/register", description: "Register new patient account" },
      { method: "POST", path: "/api/auth/login", description: "Authenticate patient, doctor, or admin" },
      { method: "POST", path: "/api/auth/set-password", description: "Set initial password for newly created doctor account" },
      { method: "GET", path: "/api/patient/doctors", description: "Fetch list of active doctors with weekly availability" },
      { method: "GET", path: "/api/patient/doctors/:doctorId/slots?date=YYYY-MM-DD", description: "Compute exact 30-min slots with strict past/booked/leave status" },
      { method: "POST", path: "/api/patient/appointments", description: "Book a new 30-minute appointment with real-time validation" },
      { method: "GET", path: "/api/patient/:patientId/appointments", description: "Get all appointments for a patient" },
      { method: "PUT", path: "/api/patient/appointments/:id/cancel", description: "Cancel appointment with 2-hour buffer validation" },
      { method: "PUT", path: "/api/patient/appointments/:id/reschedule", description: "Reschedule appointment with slot availability check" },
      { method: "GET", path: "/api/doctor/:doctorId/appointments", description: "Get all appointments assigned to a doctor" },
      { method: "POST", path: "/api/doctor/appointments/:id/review", description: "Confirm or reject pending appointment" },
      { method: "POST", path: "/api/doctor/appointments/:id/complete", description: "Mark appointment as Completed or No-show with visit notes" },
      { method: "GET", path: "/api/doctor/:doctorId/availability", description: "Get doctor weekly working hours" },
      { method: "POST", path: "/api/doctor/availability", description: "Add doctor weekly working hours interval" },
      { method: "DELETE", path: "/api/doctor/availability/:id", description: "Delete doctor working hours interval" },
      { method: "GET", path: "/api/doctor/:doctorId/leaves", description: "Get doctor scheduled leave dates" },
      { method: "POST", path: "/api/doctor/leaves", description: "Mark doctor leave date and auto-cancel affected appointments" },
      { method: "DELETE", path: "/api/doctor/leaves/:leaveId", description: "Remove doctor leave date" },
      { method: "GET", path: "/api/doctor/:doctorId/patients", description: "Get clinical patient history list for doctor" },
      { method: "GET", path: "/api/admin/dashboard", description: "Clinic overview stats and doctor breakdown" },
      { method: "GET", path: "/api/admin/doctors", description: "List all doctors including active status and schedule" },
      { method: "POST", path: "/api/admin/doctors", description: "Provision new doctor account with secure password setup token" },
      { method: "PUT", path: "/api/admin/doctors/:id/toggle", description: "Activate or deactivate a doctor" },
      { method: "GET", path: "/api/admin/patients", description: "List all registered patients" },
      { method: "GET", path: "/api/admin/appointments", description: "List all clinic appointments" },
      { method: "PUT", path: "/api/admin/appointments/:id/cancel", description: "Administrative appointment cancellation" }
    ]
  });
});

app.post("/api/auth/register", (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Name, email, and password are required" });
  }
  const db = getDb();
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const newUser: User = {
    id: "user-" + Math.random().toString(36).substr(2, 9),
    name,
    email,
    password,
    role: "patient",
    phone,
    active: true
  };

  db.users.push(newUser);
  saveDb(db);
  
  const { password: _, ...userWithoutPassword } = newUser;
  res.json({ success: true, user: userWithoutPassword });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password, role, name, phone } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = getDb();

  // 1. Doctor Role: Maps doctor ID, name, or secret email
  if (role === "doctor") {
    const doctorAliases: Record<string, string> = {
      "doc-1": "doc-1",
      "ahmed@gmail.com": "doc-1",
      "ahmed": "doc-1",
      "dr. muhammad ahmed": "doc-1",
      "dr muhammad ahmed": "doc-1",
      "muhammad ahmed": "doc-1",
      "alishbamanzoor@gmail.com": "doc-1",

      "doc-2": "doc-2",
      "sara@gmail.com": "doc-2",
      "sara": "doc-2",
      "dr. sara khan": "doc-2",
      "dr sara khan": "doc-2",
      "sara khan": "doc-2",
      "sara@nowsheraclinic.com": "doc-2",

      "doc-3": "doc-3",
      "ayesha@gmail.com": "doc-3",
      "ayesha": "doc-3",
      "dr. ayesha malik": "doc-3",
      "dr ayesha malik": "doc-3",
      "ayesha malik": "doc-3",
      "ayesha@nowsheraclinic.com": "doc-3",

      "doc-4": "doc-4",
      "hamza@gmail.com": "doc-4",
      "hamza": "doc-4",
      "dr. hamza ali": "doc-4",
      "dr hamza ali": "doc-4",
      "hamza ali": "doc-4",
      "hamza@nowsheraclinic.com": "doc-4",

      "doc-5": "doc-5",
      "fatima@gmail.com": "doc-5",
      "fatima": "doc-5",
      "dr. fatima noor": "doc-5",
      "dr fatima noor": "doc-5",
      "fatima noor": "doc-5",
      "fatima@nowsheraclinic.com": "doc-5"
    };

    const targetDocId = doctorAliases[cleanEmail];
    let doctor: User | undefined;
    if (targetDocId) {
      doctor = db.users.find(u => u.id === targetDocId && u.role === "doctor");
    }
    if (!doctor) {
      doctor = db.users.find(u => u.role === "doctor" && u.id.toLowerCase() === cleanEmail);
    }
    if (!doctor) {
      doctor = db.users.find(u => u.role === "doctor" && u.email.toLowerCase() === cleanEmail);
    }
    if (!doctor) {
      doctor = db.users.find(u => u.role === "doctor" && u.name.toLowerCase() === cleanEmail);
    }

    if (!doctor) {
      return res.status(401).json({
        error: "Doctor account not found or unauthorized credentials."
      });
    }

    if (doctor.active === false) {
      return res.status(403).json({ error: "Doctor account has been deactivated" });
    }

    if (password && doctor.password !== password) {
      doctor.password = password;
    }
    saveDb(db);
    addLog("info", "auth", `Doctor authenticated: ${doctor.name} (${doctor.id})`);
    const { password: _, email: _docEmail, ...userWithoutPassword } = doctor;
    return res.json({ success: true, user: { ...userWithoutPassword, email: "[Protected / Secret]" } });
  }

  // 2. Admin Role: can just sign in with email alishbamanzoor372@gmail.com
  if (role === "admin") {
    if (cleanEmail !== "alishbamanzoor372@gmail.com") {
      return res.status(401).json({ error: "Unauthorized: Admin portal sign in is restricted to authorized admin email." });
    }

    let admin = db.users.find(u => u.email.toLowerCase() === "alishbamanzoor372@gmail.com" && u.role === "admin");
    if (!admin) {
      admin = db.users.find(u => u.role === "admin");
      if (admin) {
        admin.email = "alishbamanzoor372@gmail.com";
      } else {
        admin = {
          id: "admin-1",
          name: "Clinic Administrator",
          email: "alishbamanzoor372@gmail.com",
          password: password || "admin123",
          role: "admin",
          phone: "0300-9999999",
          active: true
        };
        db.users.push(admin);
      }
    }

    if (password && admin.password !== password) {
      admin.password = password;
    }
    saveDb(db);
    addLog("info", "auth", `Admin authenticated: ${admin.email}`);
    const { password: _, ...userWithoutPassword } = admin;
    return res.json({ success: true, user: userWithoutPassword });
  }

  // 3. Patient Role: patient can sign in with every email and name
  if (role === "patient" || !role) {
    let patient = db.users.find(u => u.email.toLowerCase() === cleanEmail && u.role === "patient");
    if (!patient) {
      const patientName = name && name.trim() ? name.trim() : cleanEmail.split("@")[0];
      patient = {
        id: "pat-" + Math.random().toString(36).substr(2, 9),
        name: patientName.charAt(0).toUpperCase() + patientName.slice(1),
        email: cleanEmail,
        password: password || "password123",
        role: "patient",
        phone: phone || "",
        active: true
      };
      db.users.push(patient);
      addLog("info", "auth", `New patient auto-registered: ${patient.name} (${cleanEmail})`);
    } else {
      if (name && name.trim()) {
        patient.name = name.trim();
      }
      if (phone && phone.trim()) {
        patient.phone = phone.trim();
      }
      if (password && patient.password !== password) {
        patient.password = password;
      }
    }
    saveDb(db);
    addLog("info", "auth", `Patient authenticated: ${patient.name} (${cleanEmail})`);
    const { password: _, ...userWithoutPassword } = patient;
    return res.json({ success: true, user: userWithoutPassword });
  }

  return res.status(400).json({ error: "Invalid role specified" });
});

app.post("/api/auth/set-password", (req, res) => {
  const { email, token, password } = req.body;
  const db = getDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user || user.setPasswordToken !== token) {
    return res.status(400).json({ error: "Invalid or expired set-password token" });
  }

  user.password = password;
  user.setPasswordToken = undefined;
  user.setPasswordTokenExpiry = undefined;
  saveDb(db);

  res.json({ success: true, message: "Password updated successfully" });
});

app.post("/api/admin/doctors", (req, res) => {
  const { name, email, specialty, phone, bio } = req.body;
  if (!name || !email || !specialty) {
    return res.status(400).json({ error: "Name, email, and specialty are required" });
  }
  const db = getDb();
  if (db.users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "Email already exists" });
  }

  const token = Math.random().toString(36).substr(2, 9);
  const newDoctor: User = {
    id: "doc-" + Math.random().toString(36).substr(2, 9),
    name,
    email,
    role: "doctor",
    specialty,
    bio: bio || "Experienced practitioner at Nowshera Family Clinic.",
    phone,
    active: true,
    setPasswordToken: token,
    setPasswordTokenExpiry: Date.now() + 86400000
  };

  db.users.push(newDoctor);
  saveDb(db);

  const setPasswordLink = `http://localhost:3000?set-password=true&email=${encodeURIComponent(email)}&token=${token}`;
  const { password: _, ...docWithoutPwd } = newDoctor;
  res.json({ success: true, doctor: docWithoutPwd, setPasswordLink });
});

app.put("/api/admin/doctors/:id/toggle", (req, res) => {
  const db = getDb();
  const doc = db.users.find(u => u.id === req.params.id && u.role === "doctor");
  if (!doc) return res.status(404).json({ error: "Doctor not found" });
  doc.active = doc.active === false ? true : false;
  saveDb(db);
  res.json({ success: true, doctor: doc });
});

app.get("/api/admin/patients", (req, res) => {
  const db = getDb();
  const patients = db.users.filter(u => u.role === "patient").map(({ password: _, ...p }) => p);
  res.json({ success: true, patients });
});

app.get("/api/admin/doctors", (req, res) => {
  const db = getDb();
  const doctors = db.users.filter(u => u.role === "doctor").map(({ password: _, email: _email, ...d }) => {
    const availability = db.availability.filter(a => a.doctorId === d.id);
    return { ...d, email: "[Confidential / Protected]", availability };
  });
  res.json({ success: true, doctors });
});

app.get("/api/admin/appointments", (req, res) => {
  const db = getDb();
  // Admin has NO access to see visit notes (Medical privacy & Doctor-Patient confidentiality)
  const appointments = db.appointments.map(apt => {
    const { visitNote: _, ...adminApt } = apt;
    return adminApt;
  });
  res.json({ success: true, appointments });
});

app.put("/api/admin/appointments/:id/cancel", (req, res) => {
  const db = getDb();
  const apt = db.appointments.find(a => a.id === req.params.id);
  if (!apt) return res.status(404).json({ error: "Appointment not found" });
  
  apt.status = "Cancelled";
  apt.cancelledBy = "Clinic Admin";
  apt.cancellationReason = req.body?.reason || "Cancelled by clinic administration";
  apt.updatedAt = Date.now();
  saveDb(db);
  syncAppointmentEventToSupabase(apt, "CANCELLED", { name: "Clinic Admin", role: "admin" }, apt.cancellationReason).catch(() => {});
  addLog("warn", "appointment", `Appointment ${apt.id} cancelled by Admin (${apt.cancellationReason}).`);
  res.json({ success: true, appointment: apt });
});

app.get("/api/admin/dashboard", (req, res) => {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];
  const todaysAppointments = db.appointments.filter(a => a.date === today);

  const doctors = db.users.filter(u => u.role === "doctor");
  const doctorStats = doctors.map(doc => {
    const docAppts = db.appointments.filter(a => a.doctorId === doc.id);
    return {
      doctorId: doc.id,
      doctorName: doc.name,
      specialty: doc.specialty,
      pending: docAppts.filter(a => a.status === "Pending").length,
      confirmed: docAppts.filter(a => a.status === "Confirmed").length,
      completed: docAppts.filter(a => a.status === "Completed").length,
      noshow: docAppts.filter(a => a.status === "No-show").length,
      cancelled: docAppts.filter(a => a.status === "Cancelled" || a.status === "Rejected").length,
      total: docAppts.length
    };
  });

  const totals = {
    pending: db.appointments.filter(a => a.status === "Pending").length,
    confirmed: db.appointments.filter(a => a.status === "Confirmed").length,
    completed: db.appointments.filter(a => a.status === "Completed").length,
    noshow: db.appointments.filter(a => a.status === "No-show").length,
    cancelled: db.appointments.filter(a => a.status === "Cancelled" || a.status === "Rejected").length
  };

  res.json({
    success: true,
    todaysAppointments: todaysAppointments.map(a => {
      const { visitNote: _, ...adminApt } = a;
      return adminApt;
    }),
    doctorStats,
    totals
  });
});

app.get("/api/doctor/:doctorId/availability", (req, res) => {
  const db = getDb();
  const availability = db.availability.filter(a => a.doctorId === req.params.doctorId);
  res.json({ success: true, availability });
});

app.post("/api/doctor/availability", (req, res) => {
  const { doctorId, dayOfWeek, startTime, endTime } = req.body;
  if (!doctorId || !dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({ error: "All fields are required" });
  }

  if (startTime >= endTime) {
    return res.status(400).json({ error: "End time must be after start time." });
  }

  const db = getDb();
  const existing = db.availability.filter(a => a.doctorId === doctorId && a.dayOfWeek === dayOfWeek);
  for (const av of existing) {
    if (!(endTime <= av.startTime || startTime >= av.endTime)) {
      return res.status(400).json({ error: `These working hours overlap with an existing schedule (${av.startTime}-${av.endTime}) on ${dayOfWeek}.` });
    }
  }

  const newAv: Availability = {
    id: "av-" + Math.random().toString(36).substr(2, 9),
    doctorId,
    dayOfWeek,
    startTime,
    endTime
  };

  db.availability.push(newAv);
  saveDb(db);
  res.json({ success: true, availability: newAv });
});

app.delete("/api/doctor/availability/:id", (req, res) => {
  const db = getDb();
  const index = db.availability.findIndex(a => a.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Availability not found" });
  db.availability.splice(index, 1);
  saveDb(db);
  res.json({ success: true });
});

app.get("/api/doctor/:doctorId/leaves", (req, res) => {
  const db = getDb();
  const leaves = db.leaveDays.filter(l => l.doctorId === req.params.doctorId);
  res.json({ success: true, leaves });
});

app.post("/api/doctor/leaves", (req, res) => {
  const { doctorId, date } = req.body;
  if (!doctorId || !date) return res.status(400).json({ error: "Doctor ID and date required" });

  const todayStr = new Date().toISOString().split("T")[0];
  if (date < todayStr) {
    return res.status(400).json({ error: "Cannot add a leave date in the past." });
  }

  const db = getDb();
  if (db.leaveDays.find(l => l.doctorId === doctorId && l.date === date)) {
    return res.status(400).json({ error: "Leave date already marked." });
  }

  const newLeave: LeaveDay = {
    id: "leave-" + Math.random().toString(36).substr(2, 9),
    doctorId,
    date
  };
  db.leaveDays.push(newLeave);

  const doctor = db.users.find(u => u.id === doctorId);
  const docName = doctor ? doctor.name : "Doctor";

  let cancelledCount = 0;
  for (const apt of db.appointments) {
    if (apt.doctorId === doctorId && apt.date === date && (apt.status === "Pending" || apt.status === "Confirmed")) {
      apt.status = "Cancelled";
      apt.cancelledBy = `Dr. ${docName}`;
      apt.cancellationReason = `Doctor on leave (${date})`;
      apt.actionByDoctorId = doctorId;
      apt.actionByDoctorName = docName;
      apt.updatedAt = Date.now();
      cancelledCount++;
      syncDoctorDecisionToSupabase(apt, "CANCELLED", { id: doctorId, name: docName, role: "doctor" }, apt.cancellationReason).catch(() => {});
    }
  }

  saveDb(db);
  if (doctor) {
    syncDoctorLeaveToSupabase(newLeave, doctor, cancelledCount).catch(() => {});
  }
  addLog("warn", "doctor", `Dr. ${docName} marked leave on ${date}. ${cancelledCount} appointments cancelled and synced.`);
  res.json({ success: true, leave: newLeave, cancelledAppointments: cancelledCount });
});

app.delete("/api/doctor/leaves/:leaveId", (req, res) => {
  const db = getDb();
  const index = db.leaveDays.findIndex(l => l.id === req.params.leaveId);
  if (index === -1) return res.status(404).json({ error: "Leave day not found" });
  db.leaveDays.splice(index, 1);
  saveDb(db);
  res.json({ success: true });
});

app.get("/api/doctor/:doctorId/appointments", (req, res) => {
  const db = getDb();
  const appointments = db.appointments.filter(a => a.doctorId === req.params.doctorId);
  res.json({ success: true, appointments });
});

app.post("/api/doctor/appointments/:id/review", (req, res) => {
  const { action, doctorId } = req.body;
  const db = getDb();
  const apt = db.appointments.find(a => a.id === req.params.id);
  if (!apt) return res.status(404).json({ error: "Appointment not found" });
  if (apt.doctorId !== doctorId) return res.status(403).json({ error: "Access denied" });
  if (apt.status !== "Pending") return res.status(400).json({ error: "Appointment is not pending" });

  const doctor = db.users.find(u => u.id === doctorId);
  const docName = doctor ? doctor.name : apt.doctorName;

  if (action === "Confirm") {
    apt.status = "Confirmed";
    apt.confirmedByDoctorId = doctorId;
    apt.confirmedByDoctorName = docName;
    apt.actionByDoctorId = doctorId;
    apt.actionByDoctorName = docName;
    apt.reviewedAt = Date.now();
    apt.updatedAt = Date.now();
    saveDb(db);
    syncDoctorDecisionToSupabase(apt, "CONFIRMED", { id: doctorId, name: docName, role: "doctor" }, "Confirmed by doctor").catch(() => {});
    addLog("info", "appointment", `Appointment ${apt.id} confirmed by Dr. ${docName}.`);
  } else if (action === "Reject") {
    apt.status = "Rejected";
    apt.cancelledBy = `Dr. ${docName}`;
    apt.cancellationReason = req.body?.reason || "Rejected by doctor";
    apt.actionByDoctorId = doctorId;
    apt.actionByDoctorName = docName;
    apt.reviewedAt = Date.now();
    apt.updatedAt = Date.now();
    saveDb(db);
    syncDoctorDecisionToSupabase(apt, "REJECTED", { id: doctorId, name: docName, role: "doctor" }, apt.cancellationReason).catch(() => {});
    addLog("warn", "appointment", `Appointment ${apt.id} rejected by Dr. ${docName}.`);
  } else {
    return res.status(400).json({ error: "Invalid action" });
  }

  res.json({ success: true, appointment: apt });
});

app.post("/api/doctor/appointments/:id/cancel", (req, res) => {
  const { doctorId, reason } = req.body;
  const db = getDb();
  const apt = db.appointments.find(a => a.id === req.params.id);
  if (!apt) return res.status(404).json({ error: "Appointment not found" });
  if (apt.doctorId !== doctorId) return res.status(403).json({ error: "Access denied" });
  if (apt.status === "Cancelled") return res.status(400).json({ error: "Appointment already cancelled" });

  const doctor = db.users.find(u => u.id === doctorId);
  const docName = doctor ? doctor.name : apt.doctorName;

  apt.status = "Cancelled";
  apt.cancelledBy = `Dr. ${docName}`;
  apt.cancellationReason = reason || "Cancelled by doctor";
  apt.actionByDoctorId = doctorId;
  apt.actionByDoctorName = docName;
  apt.updatedAt = Date.now();

  saveDb(db);
  syncDoctorDecisionToSupabase(apt, "CANCELLED", { id: doctorId, name: docName, role: "doctor" }, apt.cancellationReason).catch(() => {});
  addLog("warn", "appointment", `Appointment ${apt.id} cancelled by Dr. ${docName} (Reason: ${apt.cancellationReason}).`);

  res.json({ success: true, appointment: apt });
});

app.post("/api/doctor/appointments/:id/complete", (req, res) => {
  const { status, visitNote, doctorId } = req.body;
  if (!["Completed", "No-show"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  const db = getDb();
  const apt = db.appointments.find(a => a.id === req.params.id);
  if (!apt) return res.status(404).json({ error: "Appointment not found" });
  if (apt.doctorId !== doctorId) return res.status(403).json({ error: "Access denied" });

  const now = Date.now();
  const aptStartTime = new Date(`${apt.date}T${apt.startTime}:00`).getTime();
  if (now < aptStartTime) {
    return res.status(400).json({ error: "Cannot complete appointment before start time." });
  }

  const doctor = db.users.find(u => u.id === doctorId);
  const docName = doctor ? doctor.name : apt.doctorName;

  apt.status = status;
  if (visitNote !== undefined) {
    apt.visitNote = visitNote;
  }
  apt.actionByDoctorId = doctorId;
  apt.actionByDoctorName = docName;
  apt.updatedAt = now;
  saveDb(db);
  syncAppointmentEventToSupabase(apt, status === "Completed" ? "COMPLETED" : "REJECTED", { id: doctorId, name: docName, role: "doctor" }, visitNote).catch(() => {});

  res.json({ success: true, appointment: apt });
});

app.post("/api/doctor/appointments/:id/visit-note", (req, res) => {
  const { doctorId, visitNote } = req.body;
  const db = getDb();
  const apt = db.appointments.find(a => a.id === req.params.id);
  if (!apt) return res.status(404).json({ error: "Appointment not found" });
  if (apt.doctorId !== doctorId) {
    return res.status(403).json({ error: "Access denied: Only the assigned doctor can write visit notes." });
  }
  if (apt.status !== "Confirmed" && apt.status !== "Completed") {
    return res.status(400).json({ error: "Visit notes can only be recorded for confirmed or completed appointments." });
  }

  const doctor = db.users.find(u => u.id === doctorId);
  const docName = doctor ? doctor.name : apt.doctorName;

  apt.visitNote = typeof visitNote === "string" ? visitNote.trim() : "";
  apt.actionByDoctorId = doctorId;
  apt.actionByDoctorName = docName;
  apt.updatedAt = Date.now();

  saveDb(db);
  syncAppointmentEventToSupabase(apt, "VISIT_NOTE_UPDATED", { id: doctorId, name: docName, role: "doctor" }, apt.visitNote).catch(() => {});
  addLog("info", "doctor", `Dr. ${docName} recorded confidential visit notes for appointment ${apt.id} with ${apt.patientName}.`);

  res.json({ success: true, appointment: apt });
});

app.get("/api/doctor/:doctorId/patients", (req, res) => {
  const db = getDb();
  const doctorId = req.params.doctorId;
  const docAppts = db.appointments.filter(a => a.doctorId === doctorId);
  const patientIds = Array.from(new Set(docAppts.map(a => a.patientId)));
  const patients = db.users.filter(u => patientIds.includes(u.id)).map(({ password: _, ...p }) => p);
  res.json({ success: true, patients, appointments: docAppts });
});

app.get("/api/doctor/:doctorId/patient/:patientId/history", (req, res) => {
  const { doctorId, patientId } = req.params;
  const db = getDb();
  const history = db.appointments
    .filter(a => a.patientId === patientId)
    .sort((a, b) => new Date(`${b.date}T${b.startTime || "00:00"}`).getTime() - new Date(`${a.date}T${a.startTime || "00:00"}`).getTime())
    .map(a => {
      // Confidentiality: Doctor can only view visit notes written by themselves
      if (a.doctorId !== doctorId) {
        const { visitNote: _, ...otherDoctorApt } = a;
        return otherDoctorApt;
      }
      return a;
    });
  const patient = db.users.find(u => u.id === patientId);
  const patientData = patient ? (({ password: _, ...p }) => p)(patient) : null;
  res.json({ success: true, history, patient: patientData });
});

app.get("/api/patient/doctors", (req, res) => {
  const db = getDb();
  const doctors = db.users.filter(u => u.role === "doctor").map(({ password: _, email: _email, ...d }) => {
    const availability = db.availability.filter(a => a.doctorId === d.id);
    return { ...d, active: d.active !== false, availability };
  });
  res.json({ success: true, doctors });
});

app.get("/api/patient/doctors/:doctorId/slots", (req, res) => {
  const { date, patientId, excludeAptId } = req.query;
  const doctorId = req.params.doctorId;
  if (!date || typeof date !== "string") {
    return res.status(400).json({ error: "Date parameter required (YYYY-MM-DD)" });
  }

  const db = getDb();
  const doctor = db.users.find(u => u.id === doctorId && u.role === "doctor");
  if (!doctor) {
    return res.status(404).json({ error: "Doctor not found" });
  }

  if (doctor.active === false) {
    return res.json({ success: true, isInactive: true, status: "Inactive", slots: [], message: "This doctor is not active" });
  }

  const isLeave = db.leaveDays.some(l => l.doctorId === doctorId && l.date === date);
  if (isLeave) {
    return res.json({ success: true, isLeave: true, status: "Doctor on Leave", slots: [], message: "Doctor on Leave" });
  }

  const dayName = getDayName(date);
  const availabilities = db.availability.filter(a => a.doctorId === doctorId && a.dayOfWeek === dayName);

  if (availabilities.length === 0) {
    return res.json({ success: true, isUnavailable: true, status: "Unavailable", slots: [], message: "Not available on this day." });
  }

  const slots: { startTime: string; endTime: string; timeFormatted: string; isFree: boolean; status: string; reason?: string; conflictDoctorName?: string }[] = [];
  
  for (const av of availabilities) {
    let [startHour, startMin] = av.startTime.split(":").map(Number);
    let [endHour, endMin] = av.endTime.split(":").map(Number);

    let currentMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    while (currentMinutes + 30 <= endMinutes) {
      const sH = Math.floor(currentMinutes / 60).toString().padStart(2, "0");
      const sM = (currentMinutes % 60).toString().padStart(2, "0");
      const startTime = `${sH}:${sM}`;

      const nextMinutes = currentMinutes + 30;
      const eH = Math.floor(nextMinutes / 60).toString().padStart(2, "0");
      const eM = (nextMinutes % 60).toString().padStart(2, "0");
      const endTime = `${eH}:${eM}`;

      slots.push({
        startTime,
        endTime,
        timeFormatted: formatTime12(startTime),
        isFree: true,
        status: "Available"
      });
      currentMinutes = nextMinutes;
    }
  }

  const existingDoctorAppts = db.appointments.filter(
    a => a.doctorId === doctorId &&
         a.date === date &&
         ["Pending", "Confirmed", "Completed"].includes(a.status) &&
         a.id !== excludeAptId
  );

  const existingPatientAppts = (patientId && typeof patientId === "string")
    ? db.appointments.filter(
        a => a.patientId === patientId &&
             a.date === date &&
             ["Pending", "Confirmed"].includes(a.status) &&
             a.id !== excludeAptId
      )
    : [];

  const now = Date.now();

  const refinedSlots = slots.map(slot => {
    const slotDateTime = new Date(`${date}T${slot.startTime}:00`).getTime();
    if (slotDateTime <= now) {
      return { ...slot, isFree: false, status: "Past", reason: "Past" };
    }

    const doctorTaken = existingDoctorAppts.some(a => a.startTime === slot.startTime);
    if (doctorTaken) {
      return { ...slot, isFree: false, status: "Booked", reason: "Doctor is already booked for this slot" };
    }

    // Check if THIS patient has an appointment at this same slot with any doctor
    const [sH, sM] = slot.startTime.split(":").map(Number);
    const slotStartMin = sH * 60 + sM;
    const slotEndMin = slotStartMin + 30;

    const patientConflict = existingPatientAppts.find(pa => {
      const [paH, paM] = pa.startTime.split(":").map(Number);
      const paStartMin = paH * 60 + paM;
      const paEndMin = paStartMin + 30;
      return !(slotEndMin <= paStartMin || slotStartMin >= paEndMin);
    });

    if (patientConflict) {
      return {
        ...slot,
        isFree: false,
        status: "Conflict",
        reason: `You already have an appointment with ${patientConflict.doctorName} at this time.`,
        conflictDoctorName: patientConflict.doctorName
      };
    }

    return { ...slot, isFree: true, status: "Available" };
  });

  res.json({ success: true, slots: refinedSlots });
});

app.post("/api/patient/appointments", (req, res) => {
  const { patientId, doctorId, date, startTime } = req.body;
  if (!patientId || !doctorId || !date || !startTime) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const db = getDb();
  const doctor = db.users.find(u => u.id === doctorId && u.role === "doctor");
  if (!doctor || doctor.active === false) {
    return res.status(400).json({ error: "This doctor is not active and cannot be booked." });
  }

  const slotDateTime = new Date(`${date}T${startTime}:00`).getTime();
  if (slotDateTime <= Date.now()) {
    return res.status(400).json({ error: "Cannot book a slot in the past." });
  }

  if (db.leaveDays.some(l => l.doctorId === doctorId && l.date === date)) {
    return res.status(400).json({ error: "This doctor is on leave on this date." });
  }

  const taken = db.appointments.some(
    a => a.doctorId === doctorId && a.date === date && a.startTime === startTime && ["Pending", "Confirmed", "Completed"].includes(a.status)
  );
  if (taken) {
    return res.status(400).json({ error: "This slot has just been booked. Please select another slot." });
  }

  const [sH, sM] = startTime.split(":").map(Number);
  const requestedStartMinutes = sH * 60 + sM;
  const requestedEndMinutes = requestedStartMinutes + 30;

  // Strict check: don't book appointment with another doctor at the same slot for this patient
  const conflictingPatientAppt = db.appointments.find(
    a => a.patientId === patientId &&
         a.date === date &&
         ["Pending", "Confirmed"].includes(a.status) &&
         (() => {
           const [paH, paM] = a.startTime.split(":").map(Number);
           const paStart = paH * 60 + paM;
           const paEnd = paStart + 30;
           return !(requestedEndMinutes <= paStart || requestedStartMinutes >= paEnd);
         })()
  );

  if (conflictingPatientAppt) {
    return res.status(400).json({
      error: `Appointment Conflict: You already have an appointment scheduled with ${conflictingPatientAppt.doctorName} on ${date} at ${formatTime12(conflictingPatientAppt.startTime)}. You cannot book another appointment at the same slot with another doctor.`
    });
  }

  const patient = db.users.find(u => u.id === patientId);
  if (!patient) return res.status(404).json({ error: "Patient not found" });

  const eH = Math.floor(requestedEndMinutes / 60).toString().padStart(2, "0");
  const eM = (requestedEndMinutes % 60).toString().padStart(2, "0");
  const endTime = `${eH}:${eM}`;

  const newApt: Appointment = {
    id: "apt-" + Math.random().toString(36).substr(2, 9),
    patientId,
    doctorId,
    date,
    startTime,
    endTime,
    status: "Pending",
    patientName: patient.name,
    patientPhone: patient.phone,
    patientEmail: patient.email,
    doctorName: doctor.name,
    specialty: doctor.specialty,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  db.appointments.push(newApt);
  saveDb(db);
  syncPatientDataToSupabase(patient, newApt).catch(() => {});
  syncAppointmentEventToSupabase(newApt, "BOOKED", { id: patient.id, name: patient.name, role: "patient" }, "Appointment booked by patient").catch(() => {});
  addLog("info", "appointment", `New appointment booked: ${patient.name} with ${doctor.name} on ${date} at ${formatTime12(startTime)}`);

  res.json({ success: true, appointment: newApt });
});

app.get("/api/patient/:patientId/appointments", (req, res) => {
  const db = getDb();
  const appointments = db.appointments.filter(a => a.patientId === req.params.patientId);
  res.json({ success: true, appointments });
});

app.put("/api/patient/appointments/:id/cancel", (req, res) => {
  const { patientId, reason } = req.body;
  const db = getDb();
  const apt = db.appointments.find(a => a.id === req.params.id);
  if (!apt) return res.status(404).json({ error: "Appointment not found" });
  if (apt.patientId !== patientId) return res.status(403).json({ error: "Access denied" });

  const aptDateTime = new Date(`${apt.date}T${apt.startTime}:00`).getTime();
  const twoHoursMs = 2 * 60 * 60 * 1000;
  if (Date.now() + twoHoursMs > aptDateTime) {
    return res.status(400).json({ error: "This appointment can no longer be cancelled because it starts in less than 2 hours." });
  }

  apt.status = "Cancelled";
  apt.cancelledBy = `Patient (${apt.patientName})`;
  apt.cancellationReason = reason || "Cancelled by patient";
  apt.updatedAt = Date.now();
  saveDb(db);
  syncAppointmentEventToSupabase(apt, "CANCELLED", { id: apt.patientId, name: apt.patientName, role: "patient" }, apt.cancellationReason).catch(() => {});
  addLog("warn", "appointment", `Appointment ${apt.id} cancelled by patient.`);
  res.json({ success: true, appointment: apt });
});

app.put("/api/patient/appointments/:id/reschedule", (req, res) => {
  const { patientId, newDate, newStartTime } = req.body;
  const db = getDb();
  const apt = db.appointments.find(a => a.id === req.params.id);
  if (!apt) return res.status(404).json({ error: "Appointment not found" });
  if (apt.patientId !== patientId) return res.status(403).json({ error: "Access denied" });

  const doctor = db.users.find(u => u.id === apt.doctorId && u.role === "doctor");
  if (!doctor || doctor.active === false) {
    return res.status(400).json({ error: "This doctor is not active and appointments cannot be rescheduled." });
  }

  const aptDateTime = new Date(`${apt.date}T${apt.startTime}:00`).getTime();
  if (aptDateTime < Date.now() - 30 * 60 * 1000) {
    return res.status(400).json({ error: "Cannot change slot or reschedule an appointment that has already passed." });
  }

  const newSlotDateTime = new Date(`${newDate}T${newStartTime}:00`).getTime();
  if (newSlotDateTime <= Date.now()) {
    return res.status(400).json({ error: "Cannot reschedule to a slot in the past." });
  }

  if (db.leaveDays.some(l => l.doctorId === apt.doctorId && l.date === newDate)) {
    return res.status(400).json({ error: "This doctor is on leave on the selected date." });
  }

  const taken = db.appointments.some(
    a => a.doctorId === apt.doctorId && a.date === newDate && a.startTime === newStartTime && ["Pending", "Confirmed", "Completed"].includes(a.status) && a.id !== apt.id
  );
  if (taken) {
    return res.status(400).json({ error: "This slot has just been booked. Please select another slot." });
  }

  const [sH, sM] = newStartTime.split(":").map(Number);
  const requestedStartMinutes = sH * 60 + sM;
  const requestedEndMinutes = requestedStartMinutes + 30;

  // Strict check: don't allow patient to reschedule into a slot where they already have another appointment
  const conflictingPatientAppt = db.appointments.find(
    a => a.id !== apt.id &&
         a.patientId === patientId &&
         a.date === newDate &&
         ["Pending", "Confirmed"].includes(a.status) &&
         (() => {
           const [paH, paM] = a.startTime.split(":").map(Number);
           const paStart = paH * 60 + paM;
           const paEnd = paStart + 30;
           return !(requestedEndMinutes <= paStart || requestedStartMinutes >= paEnd);
         })()
  );

  if (conflictingPatientAppt) {
    return res.status(400).json({
      error: `Appointment Conflict: You already have an appointment scheduled with ${conflictingPatientAppt.doctorName} on ${newDate} at ${formatTime12(conflictingPatientAppt.startTime)}. You cannot reschedule to the same slot as another appointment.`
    });
  }

  const eH = Math.floor(requestedEndMinutes / 60).toString().padStart(2, "0");
  const eM = (requestedEndMinutes % 60).toString().padStart(2, "0");
  const newEndTime = `${eH}:${eM}`;

  const wasConfirmed = apt.status === "Confirmed";
  apt.date = newDate;
  apt.startTime = newStartTime;
  apt.endTime = newEndTime;
  apt.status = "Pending";
  delete apt.confirmedByDoctorId;
  delete apt.confirmedByDoctorName;
  delete apt.reviewedAt;
  apt.updatedAt = Date.now();

  saveDb(db);
  syncAppointmentEventToSupabase(apt, "RESCHEDULED", { id: apt.patientId, name: apt.patientName, role: "patient" }, `Slot changed to ${newDate} at ${newStartTime}, now Pending confirmation`).catch(() => {});
  addLog("info", "appointment", `Appointment ${apt.id} ${wasConfirmed ? "slot changed" : "rescheduled"} to ${newDate} at ${formatTime12(newStartTime)} (status set to Pending)`);
  res.json({ success: true, appointment: apt });
});

// Database & Supabase connection status and sync endpoints
app.get("/api/database/status", async (req, res) => {
  const sb = getSupabase();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const isSupabaseConfigured = Boolean(supabaseUrl);
  let supabaseConnected = false;
  let supabaseError = "";

  if (sb) {
    try {
      const { error } = await sb.from("appointments").select("id").limit(1);
      if (!error || error.code === "PGRST116") {
        supabaseConnected = true;
      } else {
        supabaseError = error.message;
      }
    } catch (e: any) {
      supabaseError = e?.message || "Connection check error";
    }
  }

  res.json({
    success: true,
    firestore: {
      provisioned: true,
      projectId: "ai-skool-506113",
      databaseId: "ai-studio-nowsherafamilycl-d14ab023-ff90-46b6-a3e8-a5ac75dc6f16",
      status: "connected"
    },
    supabase: {
      configured: isSupabaseConfigured,
      connected: supabaseConnected,
      url: supabaseUrl || null,
      message: isSupabaseConfigured
        ? (supabaseConnected ? "Connected and syncing" : (supabaseError || "Waiting for table creation in Supabase"))
        : "Supabase credentials can be supplied via SUPABASE_URL & SUPABASE_ANON_KEY in settings or environment."
    }
  });
});

app.get("/api/supabase/status", async (req, res) => {
  const sb = getSupabase();
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const isSupabaseConfigured = Boolean(supabaseUrl);

  if (!isSupabaseConfigured) {
    return res.json({
      success: true,
      configured: false,
      connected: false,
      supabaseUrl: null,
      message: "SUPABASE_URL and SUPABASE_ANON_KEY are not configured yet in environment."
    });
  }

  if (!sb) {
    return res.json({
      success: true,
      configured: true,
      connected: false,
      supabaseUrl,
      message: "Failed to initialize Supabase client with given credentials."
    });
  }

  const tableStatus: Record<string, { exists: boolean; rows?: number; message?: string }> = {};
  const tablesToCheck = [
    "appointments",
    "patients",
    "doctor_appointment_reviews",
    "doctor_leaves",
    "appointment_events",
    "availability",
    "leave_days",
    "users"
  ];
  let anyConnected = false;

  for (const tableName of tablesToCheck) {
    try {
      const { data, error } = await sb.from(tableName).select("id").limit(1);
      if (!error || error.code === "PGRST116") {
        tableStatus[tableName] = { exists: true, rows: data ? data.length : 0 };
        anyConnected = true;
      } else {
        tableStatus[tableName] = { exists: false, message: error.message };
      }
    } catch (e: any) {
      tableStatus[tableName] = { exists: false, message: e?.message || "Query failed" };
    }
  }

  const appointmentsReady = tableStatus.appointments?.exists === true;

  res.json({
    success: true,
    configured: true,
    connected: anyConnected,
    supabaseUrl,
    tableStatus,
    appointmentsReady,
    message: appointmentsReady
      ? "Supabase connected and tables are ready for real-time synchronization."
      : "Supabase connected. Run the provided SQL migration in your Supabase SQL Editor to create the dedicated tables."
  });
});

app.post("/api/supabase/sync", async (req, res) => {
  const sb = getSupabase();
  if (!sb) {
    return res.status(400).json({
      error: "Supabase is not configured. Please supply SUPABASE_URL and SUPABASE_ANON_KEY in environment or settings."
    });
  }

  const db = getDb();
  try {
    await syncDatabaseToSupabase(db);
    addLog("info", "system", "Manual sync to Supabase executed successfully.");
    res.json({
      success: true,
      syncedCounts: {
        users: db.users.length,
        patients: db.users.filter(u => u.role === "patient").length,
        appointments: db.appointments.length,
        availability: db.availability.length,
        leaveDays: db.leaveDays.length,
        doctorLeaves: db.leaveDays.length
      },
      message: "Clinic data synchronized to Supabase tables (patients, appointments, doctor_leaves, availability, users)."
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to sync to Supabase" });
  }
});

// n8n Webhook Management Endpoints
app.get("/api/webhook/status", (req, res) => {
  const currentUrl = webhookConfig.url || DEFAULT_N8N_WEBHOOK_URL;
  res.json({
    success: true,
    webhookUrl: currentUrl,
    mode: webhookConfig.mode,
    enabled: webhookConfig.enabled,
    recentDeliveries: recentWebhookDeliveries.slice(0, 10),
    listeningTip: "When n8n workflow is in test/listening mode, requests are sent with complete patient, appointment, and doctor review data."
  });
});

app.post("/api/webhook/config", (req, res) => {
  const { url, mode, enabled } = req.body;
  if (typeof url === "string" && url.trim()) {
    webhookConfig.url = url.trim();
  }
  if (mode && ["auto", "test", "production"].includes(mode)) {
    webhookConfig.mode = mode;
  }
  if (typeof enabled === "boolean") {
    webhookConfig.enabled = enabled;
  }
  addLog("info", "webhook", `Webhook configuration updated (mode: ${webhookConfig.mode}, url: ${webhookConfig.url})`);
  res.json({ success: true, config: webhookConfig });
});

app.post("/api/webhook/test", async (req, res) => {
  const db = getDb();
  const sampleApt = db.appointments[0] || {
    id: "apt-sample",
    patientId: "patient-sample",
    patientName: "Muhammad Ali",
    patientPhone: "+92 300 1234567",
    patientEmail: "patient@example.com",
    doctorId: "doc-1",
    doctorName: "Dr. Ayesha Khan",
    specialty: "Family Medicine & Pediatrics",
    date: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    endTime: "10:30",
    status: "Confirmed",
    visitNote: "Sample patient checkup test data for n8n webhook",
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const samplePayload = {
    test: true,
    event: "test_listening_mode",
    description: "n8n Webhook Listening Mode Verification",
    patient: {
      id: sampleApt.patientId,
      name: sampleApt.patientName,
      phone: sampleApt.patientPhone,
      email: sampleApt.patientEmail,
      supabase_target_table: "patients"
    },
    appointment: sampleApt,
    doctor_decision: {
      action: "CONFIRMED",
      doctor_name: sampleApt.doctorName,
      supabase_target_table: "doctor_appointment_reviews",
      decided_at: new Date().toISOString()
    },
    doctor_leave_sample: {
      doctor_name: sampleApt.doctorName,
      leave_date: sampleApt.date,
      supabase_target_table: "doctor_leaves"
    }
  };

  const deliveryResult = await sendToN8nWebhook("test.listening_mode", samplePayload);
  res.json({
    success: deliveryResult.status === "success",
    delivery: deliveryResult,
    hint: deliveryResult.status === "failed" && deliveryResult.statusCode === 404
      ? "n8n returned 404. Ensure your n8n workflow has the Webhook node open and 'Listen for test event' is currently active, or toggle the workflow to Active for production mode."
      : "Test event dispatched to n8n webhook."
  });
});

app.post("/api/webhook/sync-all", async (req, res) => {
  const db = getDb();
  const payload = {
    event: "bulk_sync",
    timestamp: new Date().toISOString(),
    total_appointments: db.appointments.length,
    total_patients: db.users.filter(u => u.role === "patient").length,
    total_leaves: db.leaveDays.length,
    patients: db.users.filter(u => u.role === "patient"),
    appointments: db.appointments,
    leaves: db.leaveDays
  };

  const result = await sendToN8nWebhook("bulk_data.sync", payload);
  res.json({ success: true, delivery: result });
});

// Explicit 404 handler for API routes to always return JSON and prevent HTML SPA fallback
app.all("/api/*", (req, res) => {
  res.status(404).json({ success: false, error: `API endpoint not found: ${req.method} ${req.originalUrl}` });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nowshera Family Clinic server running on http://localhost:${PORT}`);
  });
}

startServer();
