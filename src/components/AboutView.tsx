import React from "react";
import { Stethoscope, Calendar, Shield, CheckCircle2 } from "lucide-react";

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center space-x-2 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold uppercase tracking-wider">
          <Stethoscope className="w-4 h-4" />
          <span>About Us</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900">Nowshera Family Clinic</h1>
        <p className="text-sm text-slate-600">
          Providing organized, reliable healthcare services to our community.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200 shadow-sm space-y-8">
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">About the Clinic</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Nowshera Family Clinic has several doctors and provides healthcare services to patients in an organized environment. Our goal is to make healthcare access streamlined and efficient for everyone.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-slate-900">Our Purpose</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            The system makes appointments easier by allowing patients to find doctors and request available appointment times instead of relying on phone calls, WhatsApp messages, or a paper register.
          </p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100">
          <div className="space-y-3 bg-slate-50 p-6 rounded-2xl">
            <h3 className="font-bold text-slate-900 flex items-center space-x-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              <span>For Patients</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Create an account</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Find doctors</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>View available times</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Request appointments</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>View appointment status</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Cancel & reschedule</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>View visit history</span></li>
            </ul>
          </div>

          <div className="space-y-3 bg-slate-50 p-6 rounded-2xl">
            <h3 className="font-bold text-slate-900 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              <span>For Doctors</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Manage working hours</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Add leave days</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Review requests</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Confirm or reject</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>View schedules</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Complete visits & notes</span></li>
            </ul>
          </div>

          <div className="space-y-3 bg-slate-50 p-6 rounded-2xl">
            <h3 className="font-bold text-slate-900 flex items-center space-x-2">
              <Shield className="w-5 h-5 text-teal-600" />
              <span>For Clinic Admin</span>
            </h3>
            <ul className="space-y-2 text-xs text-slate-600">
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Add doctors</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Deactivate doctors</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>View patients</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Manage appointments</span></li>
              <li className="flex items-center space-x-2"><CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" /><span>Monitor clinic statistics</span></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
