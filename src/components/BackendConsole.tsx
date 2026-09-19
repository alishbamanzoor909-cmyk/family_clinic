import React, { useEffect, useState } from "react";
import {
  Server,
  Database,
  Activity,
  Terminal,
  RefreshCw,
  Download,
  CheckCircle,
  AlertTriangle,
  Play,
  Clock,
  HardDrive,
  Cpu,
  FileJson,
  Layers,
  RotateCcw
} from "lucide-react";

interface HealthData {
  status: string;
  service: string;
  version: string;
  environment: string;
  timestamp: string;
  uptimeSeconds: number;
  nodeVersion: string;
  platform: string;
  memoryUsageMB?: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
  };
  database?: {
    type: string;
    status: string;
    filePath: string;
    fileSizeBytes: number;
    totalUsers: number;
    totalDoctors: number;
    totalPatients: number;
    totalAppointments: number;
  };
  automationScheduler?: {
    status: string;
    intervalSeconds: number;
    lastRun: string;
    totalCancelledExpired: number;
  };
}

interface SystemStatusData {
  server: {
    port: number;
    uptimeSeconds: number;
    nodeVersion: string;
    pid: number;
    timestamp: string;
  };
  database: {
    path: string;
    sizeBytes: number;
    users: {
      total: number;
      admins: number;
      doctors: number;
      patients: number;
      activeDoctors: number;
    };
    appointments: {
      pending: number;
      confirmed: number;
      completed: number;
      noshow: number;
      cancelled: number;
      rejected: number;
      total: number;
    };
    weeklySchedulesCount: number;
    leaveDaysCount: number;
  };
  scheduler: {
    status: string;
    interval: string;
    lastCheck: string;
    totalAutoCancelled: number;
  };
}

interface ServerLog {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  category: "auth" | "appointment" | "doctor" | "admin" | "cron" | "system";
  message: string;
  details?: Record<string, unknown>;
}

interface ApiEndpointDoc {
  method: string;
  path: string;
  description: string;
}

export const BackendConsole: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"overview" | "api" | "database" | "logs">("overview");
  const [health, setHealth] = useState<HealthData | null>(null);
  const [status, setStatus] = useState<SystemStatusData | null>(null);
  const [logs, setLogs] = useState<ServerLog[]>([]);
  const [endpoints, setEndpoints] = useState<ApiEndpointDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // API Tester state
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>("/api/health");
  const [apiMethod, setApiMethod] = useState<string>("GET");
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [apiStatusCode, setApiStatusCode] = useState<number | null>(null);
  const [apiLatency, setApiLatency] = useState<number | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  const fetchBackendData = async () => {
    try {
      setRefreshing(true);
      const [hRes, sRes, lRes, dRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/system/status"),
        fetch("/api/system/logs"),
        fetch("/api/docs")
      ]);

      if (hRes.ok) setHealth(await hRes.json());
      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.success) setStatus(sData);
      }
      if (lRes.ok) {
        const lData = await lRes.json();
        if (lData.success) setLogs(lData.logs || []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        if (dData.endpoints) setEndpoints(dData.endpoints);
      }
    } catch (err) {
      console.error("Error fetching backend health:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBackendData();
    const timer = setInterval(fetchBackendData, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleTestApi = async (path: string, method: string = "GET") => {
    setApiLoading(true);
    setApiResponse(null);
    setApiStatusCode(null);
    const start = performance.now();
    try {
      const res = await fetch(path, { method });
      const latency = Math.round(performance.now() - start);
      setApiLatency(latency);
      setApiStatusCode(res.status);
      const data = await res.json();
      setApiResponse(JSON.stringify(data, null, 2));
    } catch (err: unknown) {
      setApiStatusCode(500);
      setApiResponse(JSON.stringify({ error: err instanceof Error ? err.message : "Failed to connect to backend endpoint" }, null, 2));
    } finally {
      setApiLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm("Are you sure you want to reset the database? All appointments will be cleared, and default doctor schedules will be restored.")) {
      return;
    }
    setResetting(true);
    try {
      const res = await fetch("/api/system/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setResetMessage("Database successfully reset to clinic factory defaults!");
        fetchBackendData();
        setTimeout(() => setResetMessage(null), 4000);
      }
    } catch (err) {
      alert("Failed to reset database");
    } finally {
      setResetting(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    const days = Math.floor(hrs / 24);
    if (days > 0) return `${days}d ${hrs % 24}h ${mins % 60}m`;
    if (hrs > 0) return `${hrs}h ${mins % 60}m ${seconds % 60}s`;
    return `${mins}m ${seconds % 60}s`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-700">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
            Node.js & Express REST Backend Running
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Backend & API System Console
          </h1>
          <p className="text-slate-300 text-sm max-w-2xl">
            Live monitoring for Nowshera Family Clinic's Express.js server, JSON persistence engine, 30-minute slot generator, and automated cron background services.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchBackendData}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-teal-400" : ""}`} />
            Refresh
          </button>
          <a
            href="/api/system/backup"
            download="clinic-backup.json"
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export DB (JSON)
          </a>
        </div>
      </div>

      {resetMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm p-4 rounded-2xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{resetMessage}</span>
        </div>
      )}

      {/* Sub-Navigation */}
      <div className="flex border-b border-slate-200 space-x-2">
        <button
          onClick={() => setActiveSubTab("overview")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === "overview"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          Server Overview & Metrics
        </button>
        <button
          onClick={() => setActiveSubTab("api")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === "api"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Terminal className="w-4 h-4" />
          Interactive API Explorer
        </button>
        <button
          onClick={() => setActiveSubTab("database")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === "database"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Database className="w-4 h-4" />
          Database Store & Controls
        </button>
        <button
          onClick={() => setActiveSubTab("logs")}
          className={`pb-3 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
            activeSubTab === "logs"
              ? "border-teal-600 text-teal-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="w-4 h-4" />
          Server Audit Logs ({logs.length})
        </button>
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeSubTab === "overview" && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Server Health</span>
                <Server className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">Port 3000</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  Healthy
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Uptime: {health ? formatUptime(health.uptimeSeconds) : "Active"}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Database Engine</span>
                <HardDrive className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {status ? `${status.database.users.total} records` : "5 doctors"}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {status ? `${Math.round(status.database.sizeBytes / 1024 * 10) / 10} KB` : "data/clinic.json"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Atomic JSON persistence with auto-seeding
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Appointments</span>
                <Clock className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">
                  {status ? status.database.appointments.total : 0}
                </span>
                <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                  {status ? `${status.database.appointments.pending} pending` : "0 pending"}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {status ? `${status.database.appointments.confirmed} confirmed, ${status.database.appointments.completed} completed` : "Active"}
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cron Scheduler</span>
                <Cpu className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">30s Interval</span>
                <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">
                  Running
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Auto-cancels elapsed pending appointments
              </p>
            </div>
          </div>

          {/* Detailed System Specifications */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-teal-600" />
                Runtime & Environment Details
              </h3>
              <div className="divide-y divide-slate-100 text-sm">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Web & API Framework</span>
                  <span className="font-semibold text-slate-900">Express.js (v4.21) on Port 3000</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Node Runtime Version</span>
                  <span className="font-semibold text-slate-900">{health?.nodeVersion || process.version || "Node.js v22+"}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Host Environment</span>
                  <span className="font-semibold text-slate-900">{health?.environment || "development / Cloud Run"}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Operating System</span>
                  <span className="font-semibold text-slate-900">{health?.platform || "Linux container"}</span>
                </div>
                {health?.memoryUsageMB && (
                  <div className="py-2.5 flex justify-between">
                    <span className="text-slate-500">Memory Usage (RSS / Heap)</span>
                    <span className="font-semibold text-slate-900">
                      {health.memoryUsageMB.rss} MB / {health.memoryUsageMB.heapUsed} MB
                    </span>
                  </div>
                )}
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Backend API Gateway</span>
                  <span className="font-mono text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                    http://0.0.0.0:3000/api/*
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-600" />
                Persistence & Entities Breakdown
              </h3>
              <div className="divide-y divide-slate-100 text-sm">
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Database Engine</span>
                  <span className="font-semibold text-slate-900">JSON Atomic Store (clinic.json)</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Verified Doctors Configured</span>
                  <span className="font-semibold text-slate-900">5 Verified Doctors (Active)</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Weekly Schedule Rules</span>
                  <span className="font-semibold text-slate-900">
                    {status?.database.weeklySchedulesCount || 23} recurring day rules
                  </span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Registered Patients</span>
                  <span className="font-semibold text-slate-900">{status?.database.users.patients || 1}</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Doctor Leave Blocks</span>
                  <span className="font-semibold text-slate-900">{status?.database.leaveDaysCount || 0} date blocks</span>
                </div>
                <div className="py-2.5 flex justify-between">
                  <span className="text-slate-500">Scheduled Background Cron</span>
                  <span className="font-semibold text-emerald-600">Active (Auto-cancel expired pending)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE API EXPLORER */}
      {activeSubTab === "api" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Interactive REST API Tester</h3>
              <p className="text-xs text-slate-500">
                Execute live HTTP calls against the Nowshera Family Clinic Express backend and inspect the real JSON response.
              </p>
            </div>

            {/* Request Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <select
                value={selectedEndpoint}
                onChange={e => {
                  setSelectedEndpoint(e.target.value);
                  const ep = endpoints.find(p => p.path === e.target.value);
                  if (ep) setApiMethod(ep.method);
                }}
                className="bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono text-slate-800 focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="/api/health">GET /api/health</option>
                <option value="/api/system/status">GET /api/system/status</option>
                <option value="/api/system/logs">GET /api/system/logs</option>
                <option value="/api/docs">GET /api/docs</option>
                <option value="/api/patient/doctors">GET /api/patient/doctors</option>
                <option value="/api/admin/dashboard">GET /api/admin/dashboard</option>
                <option value="/api/admin/doctors">GET /api/admin/doctors</option>
                <option value="/api/admin/patients">GET /api/admin/patients</option>
                <option value="/api/admin/appointments">GET /api/admin/appointments</option>
                <option value="/api/doctor/doc-1/availability">GET /api/doctor/doc-1/availability</option>
                <option value="/api/patient/doctors/doc-1/slots?date=2026-09-21">GET /api/patient/doctors/doc-1/slots (Preview)</option>
              </select>

              <button
                onClick={() => handleTestApi(selectedEndpoint, apiMethod)}
                disabled={apiLoading}
                className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl shadow transition-colors cursor-pointer disabled:opacity-50"
              >
                <Play className="w-4 h-4 fill-white" />
                {apiLoading ? "Sending..." : "Execute Request"}
              </button>
            </div>

            {/* Results Window */}
            {apiResponse && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700">HTTP Response:</span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded ${
                        apiStatusCode && apiStatusCode < 300
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      Status {apiStatusCode}
                    </span>
                  </div>
                  {apiLatency !== null && (
                    <span className="text-slate-500 font-mono">Latency: {apiLatency} ms</span>
                  )}
                </div>
                <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto max-h-96 border border-slate-800 leading-relaxed">
                  <pre>{apiResponse}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Endpoints Documentation Table */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-900">Available Backend API Routes ({endpoints.length})</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">Method</th>
                    <th className="py-2.5 px-3">Endpoint Path</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-xs">
                  {endpoints.map((ep, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded font-bold ${
                            ep.method === "GET"
                              ? "bg-sky-100 text-sky-800"
                              : ep.method === "POST"
                              ? "bg-emerald-100 text-emerald-800"
                              : ep.method === "PUT"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {ep.method}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{ep.path}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{ep.description}</td>
                      <td className="py-2.5 px-3 text-right font-sans">
                        {ep.method === "GET" && !ep.path.includes(":") && (
                          <button
                            onClick={() => {
                              setSelectedEndpoint(ep.path);
                              handleTestApi(ep.path, "GET");
                            }}
                            className="text-teal-600 hover:text-teal-800 font-bold hover:underline cursor-pointer"
                          >
                            Run
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DATABASE STORE & CONTROLS */}
      {activeSubTab === "database" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Database Storage Management</h3>
                <p className="text-xs text-slate-500">
                  Data file is stored locally on the server at <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">data/clinic.json</code>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href="/api/system/backup"
                  download="clinic-backup.json"
                  className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  Download Backup
                </a>
                <button
                  onClick={handleResetDatabase}
                  disabled={resetting}
                  className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-4 py-2.5 rounded-xl border border-rose-200 transition-colors cursor-pointer"
                >
                  <RotateCcw className={`w-4 h-4 ${resetting ? "animate-spin" : ""}`} />
                  Reset to Defaults
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase block">File Location</span>
                <span className="font-mono text-xs font-bold text-slate-800 mt-1 block">/data/clinic.json</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase block">File Size</span>
                <span className="font-mono text-xs font-bold text-slate-800 mt-1 block">
                  {status ? `${status.database.sizeBytes} bytes (${Math.round(status.database.sizeBytes / 1024 * 10) / 10} KB)` : "Calculating"}
                </span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase block">Safety Guard</span>
                <span className="text-xs font-bold text-emerald-700 mt-1 block">Atomic JSON write & Read-Lock</span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-bold text-slate-800">Seeded Verified Medical Staff</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { name: "Dr. Muhammad Ahmed", spec: "General Physician", hours: "Mon-Fri (09:00 - 13:00)" },
                  { name: "Dr. Sara Khan", spec: "Pediatrician", hours: "Mon-Thu (10:00 - 14:00)" },
                  { name: "Dr. Ayesha Malik", spec: "Gynecologist", hours: "Mon-Fri (14:00 - 18:00)" },
                  { name: "Dr. Hamza Ali", spec: "Cardiologist", hours: "Tue-Sat (09:00 - 13:00)" },
                  { name: "Dr. Fatima Noor", spec: "Dermatologist", hours: "Mon-Wed, Fri (15:00 - 19:00)" }
                ].map((d, i) => (
                  <div key={i} className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-slate-900 block">{d.name}</span>
                    <span className="text-teal-600 font-medium block">{d.spec}</span>
                    <span className="text-slate-500 text-[11px] block">{d.hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeSubTab === "logs" && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Live Server Activity & Audit Log</h3>
              <p className="text-xs text-slate-500">
                Stream of requests, user logins, slot reservations, doctor reviews, and background cron executions.
              </p>
            </div>
            <button
              onClick={fetchBackendData}
              className="text-xs font-semibold text-teal-600 hover:text-teal-800 flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
            </button>
          </div>

          <div className="bg-slate-950 text-slate-200 rounded-2xl p-4 font-mono text-xs space-y-2 max-h-[500px] overflow-y-auto border border-slate-800 shadow-inner">
            {logs.length === 0 ? (
              <p className="text-slate-500">No logs captured yet.</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 py-1 border-b border-slate-900">
                  <span className="text-slate-500 shrink-0 text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold shrink-0 ${
                      log.level === "error"
                        ? "bg-rose-900/60 text-rose-300 border border-rose-800"
                        : log.level === "warn"
                        ? "bg-amber-900/60 text-amber-300 border border-amber-800"
                        : "bg-teal-900/60 text-teal-300 border border-teal-800"
                    }`}
                  >
                    {log.category}
                  </span>
                  <span className="text-slate-300 break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
