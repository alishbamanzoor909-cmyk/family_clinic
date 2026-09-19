import React, { useState } from "react";
import { User, UserRole } from "../types";
import { X, Stethoscope, Shield, Calendar, User as UserIcon, Lock, Mail, Phone, ArrowRight } from "lucide-react";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [role, setRole] = useState<UserRole>("patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (role === "admin" && cleanEmail !== "alishbamanzoor372@gmail.com") {
      setLoading(false);
      setError("Admin sign in is restricted. Only authorized admin email is allowed.");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          role,
          name: role === "patient" ? name : undefined,
          phone: role === "patient" ? phone : undefined
        })
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Authentication failed");
      }
      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 p-2 rounded-xl transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold mx-auto shadow-md">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Welcome to Nowshera Family Clinic</h2>
          <p className="text-xs text-slate-500 font-medium">Select your role and sign in to access your portal</p>
        </div>

        {/* Role Selector */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Select Role</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => { setRole("patient"); setError(""); }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                role === "patient"
                  ? "border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <UserIcon className={`w-5 h-5 ${role === "patient" ? "text-teal-600" : "text-slate-500"}`} />
              <span className="font-bold text-sm block text-slate-900">Patient</span>
              <span className="text-[10px] text-slate-500 block leading-tight">Patient portal</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole("doctor"); setError(""); }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                role === "doctor"
                  ? "border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Calendar className={`w-5 h-5 ${role === "doctor" ? "text-teal-600" : "text-slate-500"}`} />
              <span className="font-bold text-sm block text-slate-900">Doctor</span>
              <span className="text-[10px] text-slate-500 block leading-tight">Doctor sign in</span>
            </button>

            <button
              type="button"
              onClick={() => { setRole("admin"); setError(""); }}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer space-y-1 ${
                role === "admin"
                  ? "border-teal-600 bg-teal-50/50 ring-2 ring-teal-600/20 shadow-sm"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Shield className={`w-5 h-5 ${role === "admin" ? "text-teal-600" : "text-slate-500"}`} />
              <span className="font-bold text-sm block text-slate-900">Admin</span>
              <span className="text-[10px] text-slate-500 block leading-tight">Admin portal</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs p-3 rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {role === "patient" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="e.g. 0300-1234567"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              {role === "doctor" ? "Doctor Email Address" : role === "admin" ? "Admin Email Address" : "Email Address"}
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={
                  role === "doctor"
                    ? "Enter your doctor email address"
                    : role === "admin"
                    ? "alishbamanzoor372@gmail.com"
                    : "Enter your email address"
                }
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-teal-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer disabled:opacity-50"
          >
            <span>
              {loading
                ? "Please wait..."
                : `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
