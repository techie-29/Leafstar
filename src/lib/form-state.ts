/*
  What a form's Server Action sends back to the form (used with React's useActionState).
  Field errors sit under the field; `message` is the line above the buttons; `values` refills the
  form after a refused submit so nothing typed is lost.
*/
export interface FormState {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<string, string>>;
  values?: Record<string, string>;
}

export const idleForm: FormState = { status: "idle" };

export function formValues(formData: FormData, keys: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const key of keys) {
    const v = formData.get(key);
    values[key] = typeof v === "string" ? v : "";
  }
  return values;
}

/** zod issues → { field: first message } */
export function fieldErrorsFrom(issues: ReadonlyArray<{ path: ReadonlyArray<PropertyKey>; message: string }>): Partial<Record<string, string>> {
  const out: Partial<Record<string, string>> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
