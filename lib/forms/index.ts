import type { FormSchema } from "./schema";
import { snapSampleForm } from "./snap-sample";

/** Forms the server can draft into. Add new forms here. */
const FORMS: Record<string, FormSchema> = {
  [snapSampleForm.id]: snapSampleForm,
};

export function getForm(id: string): FormSchema | undefined {
  return FORMS[id];
}
