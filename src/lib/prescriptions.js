/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {{ patient_id: string, prescribed_by: string, medications: string, dosage_notes: string, recovery_steps: string, follow_up_date: string, notes: string, audio_url: string|null }} data
 * @returns {Promise<{ ok: boolean, data?: object, error?: string }>}
 */
export async function createPrescription(supabase, data) {
  try {
    const { data: inserted, error } = await supabase
      .from("prescriptions")
      .insert({
        patient_id: data.patient_id,
        prescribed_by: data.prescribed_by,
        medications: data.medications,
        dosage_notes: data.dosage_notes,
        recovery_steps: data.recovery_steps,
        follow_up_date: data.follow_up_date,
        notes: data.notes,
        audio_url: data.audio_url ?? null,
      })
      .select()
      .single();

    if (error) return { ok: false, error: error.message };
    return { ok: true, data: inserted };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} patientId
 * @returns {Promise<{ ok: boolean, data: object|null }>}
 */
export async function getPrescriptionByPatientId(supabase, patientId) {
  try {
    const { data, error } = await supabase
      .from("prescriptions")
      .select("*")
      .eq("patient_id", patientId)
      .single();

    if (error) return { ok: false, data: null };
    return { ok: true, data };
  } catch {
    return { ok: false, data: null };
  }
}
