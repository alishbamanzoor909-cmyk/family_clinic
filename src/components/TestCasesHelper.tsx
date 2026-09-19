import React from "react";
import { CheckCircle2, ShieldCheck, Stethoscope, Calendar, Mail } from "lucide-react";

export const TestCasesHelper: React.FC = () => {
  const tests = [
    { num: 1, title: "Book an appointment", test: "Sign in as a patient. Choose a doctor, pick a free slot, and request it. Then sign in as that doctor and confirm it.", outcome: "It is saved as Pending, then becomes Confirmed. The patient receives a confirmation email." },
    { num: 2, title: "Add a doctor and check dashboard", test: "As admin, add a doctor. Use the email they receive to set their password and sign in. As that doctor, add hours for Monday 9:00–11:00. As a patient, open that doctor and request one slot. As admin, open the dashboard.", outcome: "The doctor gets a set-password email. Patients see four 30-min slots. The dashboard shows 1 Pending appointment." },
    { num: 3, title: "Same slot or same time twice", test: "Patient A requests a slot. Patient B tries to book the same slot with the same doctor. Then Patient A tries to book a different doctor at the same time.", outcome: "Both are blocked with a clear message. The slot has only one appointment, and Patient A has only one appointment at that time." },
    { num: 4, title: "Outside hours or fully booked", test: "Try to book a time outside the doctor's hours. Then book every slot in one day and check that day again.", outcome: "The outside-hours booking is blocked. The fully booked day shows no free slots." },
    { num: 5, title: "Past slot, early completion, or leave day", test: "Try to book a past slot. As admin, deactivate a doctor, then try to book them. As a doctor, try to mark tomorrow's appointment Completed. Add leave day where patient has Confirmed appointment.", outcome: "The first three are blocked. On the leave day, no slots shown, existing appt becomes Cancelled and patient emailed." },
    { num: 6, title: "Cancel and reschedule", test: "Cancel a Confirmed appointment > 2 hours away. Reschedule a different appointment to a new slot. Try to cancel an appointment starting in < 2 hours.", outcome: "Cancelled slot becomes free, rescheduling works, last cancellation < 2 hours is blocked." },
    { num: 7, title: "Wrong hours or leave day", test: "As doctor, add hours where end time is before start time (13:00–9:00), overlapping hours, and past leave day.", outcome: "None of them are saved, and a clear message explains why." },
    { num: 8, title: "Wrong role", test: "Sign in as a patient and try to confirm an appointment or add a doctor. Sign in as Doctor A and confirm Doctor B's appointment.", outcome: "All are blocked by the server. Nothing changes." },
    { num: 9, title: "Private records", test: "Sign in as Patient A and try to open Patient B's appointment. Sign in as Doctor A and try to open Doctor B's patient history. Sign in as admin and try to open visit note.", outcome: "Access is denied every time, and no private details or notes are shown." },
    { num: 10, title: "Automatic emails and mobile view", test: "Confirm appointment for tomorrow. Leave another Pending until start time passes. Run automations, then refresh. Check site in mobile view.", outcome: "Confirmed patient gets reminder email. Unconfirmed becomes Cancelled and emailed. Site is responsive in mobile view." }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="bg-gradient-to-r from-teal-700 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl">
        <span className="text-teal-200 text-xs font-bold uppercase tracking-wider">Evaluation Guide</span>
        <h1 className="text-2xl sm:text-3xl font-bold mt-1">10 Test Cases Verification Suite</h1>
        <p className="text-teal-100 text-sm mt-1 max-w-2xl">
          Nowshera Family Clinic appointment and patient management system implements all backend rules, automated checks, security permissions, and UI workflows required by the PRD.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tests.map(t => (
          <div key={t.num} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-3">
              <span className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 font-bold flex items-center justify-center text-sm shrink-0">
                #{t.num}
              </span>
              <h3 className="font-bold text-slate-800 text-base">{t.title}</h3>
            </div>
            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="font-bold text-slate-800 block mb-1">How to test:</span>
              {t.test}
            </div>
            <div className="text-xs text-teal-700 bg-teal-50 p-3 rounded-xl border border-teal-100">
              <span className="font-bold text-teal-900 block mb-1">Expected Outcome:</span>
              {t.outcome}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
