import React, { useEffect, useState } from "react";
import { User } from "./types";
import { Navbar } from "./components/Navbar";
import { LoginModal } from "./components/LoginModal";
import { HomeView } from "./components/HomeView";
import { DoctorsView } from "./components/DoctorsView";
import { AboutView } from "./components/AboutView";
import { PatientPortal } from "./components/PatientPortal";
import { DoctorPortal } from "./components/DoctorPortal";
import { AdminPortal } from "./components/AdminPortal";
import { BackendConsole } from "./components/BackendConsole";
import "./lib/firebase";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("clinic_user");
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    const savedUser = localStorage.getItem("clinic_user");
    if (!savedUser) return "home";
    const user: User = JSON.parse(savedUser);
    return `${user.role}-dashboard`;
  });

  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("clinic_user", JSON.stringify(user));
    setActiveTab(`${user.role}-dashboard`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("clinic_user");
    setActiveTab("home");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans antialiased selection:bg-teal-500 selection:text-white">
      <Navbar
        currentUser={currentUser}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="flex-1">
        {activeTab === "home" && (
          <HomeView
            onOpenLogin={() => setIsLoginOpen(true)}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === "doctors" && (
          <DoctorsView
            onOpenLogin={() => setIsLoginOpen(true)}
            isLoggedInPatient={currentUser?.role === "patient"}
            onBookWithDoctor={() => setActiveTab("patient-book")}
          />
        )}
        {activeTab === "about" && <AboutView />}

        {/* Patient Tabs */}
        {currentUser && currentUser.role === "patient" && (
          <>
            {(activeTab === "patient-dashboard" || activeTab === "patient") && <PatientPortal currentUser={currentUser} />}
            {activeTab === "patient-doctors" && <DoctorsView onOpenLogin={() => {}} isLoggedInPatient={true} onBookWithDoctor={() => setActiveTab("patient-book")} />}
            {activeTab === "patient-book" && <PatientPortal currentUser={currentUser} />}
            {activeTab === "patient-appointments" && <PatientPortal currentUser={currentUser} />}
            {activeTab === "patient-history" && <PatientPortal currentUser={currentUser} />}
          </>
        )}

        {/* Doctor Tabs */}
        {currentUser && currentUser.role === "doctor" && (
          <DoctorPortal currentUser={currentUser} />
        )}

        {/* Admin Tabs */}
        {currentUser && currentUser.role === "admin" && (
          <AdminPortal currentUser={currentUser} />
        )}

        {/* Backend & API Management Console */}
        {activeTab === "backend" && <BackendConsole />}
      </main>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
