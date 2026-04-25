"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const SYMPTOMS = [
  "Chest pain",
  "Difficulty breathing",
  "Severe headache",
  "Abdominal pain",
  "Nausea/vomiting",
  "Dizziness",
  "Fever",
  "Injury/trauma",
];

const CRITICAL_SYMPTOMS = new Set(["Chest pain", "Difficulty breathing"]);

/**
 * Multi-step patient symptom intake form.
 * @param {{ onSubmit: (formData: { name: string, dob: string, symptoms: string[], painLevel: number, notes: string }) => void }} props
 */
export default function SymptomForm({ onSubmit }) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [symptoms, setSymptoms] = useState([]);
  const [painLevel, setPainLevel] = useState(5);
  const [notes, setNotes] = useState("");
  const [hardStop, setHardStop] = useState(false);

  // --- Symptom toggle ---
  function toggleSymptom(symptom) {
    if (CRITICAL_SYMPTOMS.has(symptom)) {
      setHardStop(true);
      return;
    }
    setSymptoms((prev) =>
      prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
    );
  }

  // --- Submit ---
  function handleSubmit() {
    onSubmit({ name, dob, symptoms, painLevel, notes });
  }

  // --- Hard stop screen ---
  if (hardStop) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-600 text-white px-8 text-center">
        <span className="text-6xl mb-6">⚠️</span>
        <h1 className="text-3xl font-bold mb-4">Alert Staff Now</h1>
        <p className="text-lg max-w-md mb-8">
          Your symptoms may require immediate attention. Please alert the front desk
          immediately or call 911.
        </p>
        <Button
          variant="outline"
          className="border-white text-white hover:bg-red-700"
          onClick={() => setHardStop(false)}
        >
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-white">
        <CardHeader>
          <CardTitle className="text-gray-900">Patient Intake</CardTitle>
          <p className="text-sm text-gray-600">Step {step} of 2</p>
        </CardHeader>

        <CardContent>
          {/* --- Step 1: Name + DOB --- */}
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-900">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  placeholder="Jane Doe"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-900">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
              </div>

              <button
                type="button"
                disabled={!name.trim() || !dob}
                onClick={() => setStep(2)}
                className={`bg-black text-white w-full py-2 rounded-lg font-medium transition-opacity ${
                  !name.trim() || !dob ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"
                }`}
              >
                Next
              </button>
            </div>
          )}

          {/* --- Step 2: Symptoms + pain + notes --- */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-900">Select all that apply</label>
                <div className="grid grid-cols-2 gap-2">
                  {SYMPTOMS.map((symptom) => {
                    const selected = symptoms.includes(symptom);
                    return (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => toggleSymptom(symptom)}
                        className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                          selected
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-gray-900 border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {symptom}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* --- Pain level slider --- */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-900">
                  Pain Level: <span className="text-blue-600 font-bold">{painLevel}</span> / 10
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={painLevel}
                  onChange={(e) => setPainLevel(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>1 (Minimal)</span>
                  <span>10 (Severe)</span>
                </div>
              </div>

              {/* --- Additional notes --- */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-900">
                  Additional Notes <span className="text-gray-500">(optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white"
                  placeholder="Any other details you'd like to share..."
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="text-gray-900" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  className="flex-1"
                  disabled={symptoms.length === 0}
                  onClick={handleSubmit}
                >
                  Submit
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
