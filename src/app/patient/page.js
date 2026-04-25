"use client";

import { useRouter } from "next/navigation";
import SymptomForm from "@/components/SymptomForm";

export default function PatientPage() {
  const router = useRouter();

  async function handleSubmit(formData) {
    const response = await fetch("/api/intake", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      router.push("/patient/confirmation");
    }
  }

  return <SymptomForm onSubmit={handleSubmit} />;
}
