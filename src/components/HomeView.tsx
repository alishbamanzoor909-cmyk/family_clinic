import React from "react";
import { Stethoscope, Calendar, Shield, ArrowRight, CheckCircle2 } from "lucide-react";

interface HomeViewProps {
  onOpenLogin: () => void;
  onNavigate?: (tab: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onOpenLogin, onNavigate }) => {
  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-teal-900 via-teal-800 to-slate-900 text-white py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-teal-800/80 border border-teal-600 text-teal-200 rounded-full text-xs font-bold uppercase tracking-wider">
              <Stethoscope className="w-4 h-4" />
              <span>Nowshera Family Clinic</span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight">
              Your Health, <br />
              <span className="text-teal-400">Our Priority</span>
            </h1>
            <p className="text-lg text-teal-100 max-w-xl font-normal leading-relaxed">
              Welcome to Nowshera Family Clinic's appointment management system. Easily find specialist doctors, check real-time available appointment times, and request your visits online without phone calls or paper registers.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
              <button
                onClick={onOpenLogin}
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 text-base cursor-pointer"
              >
                <span>Sign In</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl space-y-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-500 flex items-center justify-center text-white font-bold">
                  <Calendar className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">Streamlined Bookings</h3>
                  <p className="text-xs text-teal-200">Zero double-bookings with instant slot locking</p>
                </div>
              </div>
              <div className="space-y-3 text-sm text-teal-100">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                  <span>30-minute precise appointment slots</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                  <span>Doctor confirmation and automated schedule updates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                  <span>Secure patient visit history & confidential notes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12">
          <h2 className="text-3xl font-extrabold text-slate-900">Dedicated Portals for Every Role</h2>
          <p className="text-sm text-slate-600">Built specifically for Nowshera Family Clinic to ensure seamless clinic operations.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">For Patients</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Create an account, find specialist doctors, view available 30-minute slots, request appointments, and track your appointment status or past visit notes.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">For Doctors</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Manage your working hours, set leave days, review and confirm/reject pending appointment requests, view schedules, and complete visits with confidential notes.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">For Clinic Admin</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Add and manage doctors, activate/deactivate accounts, view patient directories, monitor all appointments with powerful filters, and inspect clinic statistics.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
