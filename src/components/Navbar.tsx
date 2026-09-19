import React from "react";
import { User } from "../types";
import { Stethoscope, LogOut, User as UserIcon } from "lucide-react";

interface NavbarProps {
  currentUser: User | null;
  onOpenLogin: () => void;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenLogin,
  onLogout,
  activeTab,
  setActiveTab
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <div
          onClick={() => setActiveTab(currentUser ? currentUser.role : "home")}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-md group-hover:bg-teal-700 transition-colors">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-lg tracking-tight block">
              Nowshera Family Clinic
            </span>
            <span className="text-xs text-slate-500 font-medium block">
              Appointment & Patient System
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center space-x-8">
          {!currentUser ? (
            <>
              <button
                onClick={() => setActiveTab("home")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "home" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Home
              </button>
              <button
                onClick={() => setActiveTab("about")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "about" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                About
              </button>
            </>
          ) : currentUser.role === "patient" ? (
            <>
              <button
                onClick={() => setActiveTab("patient-dashboard")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "patient-dashboard" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("patient-doctors")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "patient-doctors" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Doctors
              </button>
              <button
                onClick={() => setActiveTab("patient-book")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "patient-book" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Book Appointment
              </button>
              <button
                onClick={() => setActiveTab("patient-appointments")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "patient-appointments" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Appointments
              </button>
              <button
                onClick={() => setActiveTab("patient-history")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "patient-history" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Visit History
              </button>
            </>
          ) : currentUser.role === "doctor" ? (
            <>
              <button
                onClick={() => setActiveTab("doctor-dashboard")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "doctor-dashboard" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("doctor-requests")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "doctor-requests" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Appointment Requests
              </button>
              <button
                onClick={() => setActiveTab("doctor-schedule")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "doctor-schedule" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Schedule
              </button>
              <button
                onClick={() => setActiveTab("doctor-leaves")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "doctor-leaves" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Leave Days
              </button>
              <button
                onClick={() => setActiveTab("doctor-patients")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "doctor-patients" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                My Patients
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveTab("admin-dashboard")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "admin-dashboard" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("admin-doctors")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "admin-doctors" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Doctors
              </button>
              <button
                onClick={() => setActiveTab("admin-patients")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "admin-patients" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Patients
              </button>
              <button
                onClick={() => setActiveTab("admin-appointments")}
                className={`text-sm font-semibold transition-colors cursor-pointer ${
                  activeTab === "admin-appointments" ? "text-teal-600" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Appointments
              </button>
            </>
          )}
        </nav>

        <div className="flex items-center space-x-3">
          {!currentUser ? (
            <button
              onClick={onOpenLogin}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm cursor-pointer"
            >
              Sign In
            </button>
          ) : (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-slate-100 px-3 py-1.5 rounded-xl">
                <UserIcon className="w-4 h-4 text-slate-600" />
                <span className="text-xs font-bold text-slate-800">{currentUser.name}</span>
                <span className="text-[10px] bg-teal-600 text-white px-1.5 py-0.5 rounded uppercase font-bold">
                  {currentUser.role}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 p-2 rounded-xl transition-all cursor-pointer"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
