import type { FormSchema } from "./schema";

/**
 * A SIMPLIFIED, MADE-UP SNAP-style application for the prototype.
 * Not the real Ohio form. Spanish labels here count as "approved" and win
 * over machine translation. Leave `es` off a label to see machine translation.
 */
export const snapSampleForm: FormSchema = {
  id: "snap-sample-v1",
  title: { en: "Food Assistance (SNAP) Application: Sample", es: "Solicitud de Asistencia Alimentaria (SNAP): Muestra" },
  disclaimer: {
    en: "Practice form with made-up data. Nothing here is submitted to any agency.",
    es: "Formulario de práctica con datos inventados. Nada se envía a ninguna agencia.",
  },
  sections: [
    {
      id: "applicant",
      title: { en: "About you", es: "Sobre usted" },
      fields: [
        { id: "fullName", type: "text", required: true, label: { en: "Full name", es: "Nombre completo" } },
        { id: "dob", type: "date", required: true, label: { en: "Date of birth", es: "Fecha de nacimiento" } },
        { id: "phone", type: "phone", label: { en: "Phone number", es: "Número de teléfono" } },
        { id: "address", type: "text", required: true, label: { en: "Home address", es: "Dirección de su casa" } },
        {
          id: "preferredLanguage",
          type: "select",
          required: true,
          label: { en: "Preferred language", es: "Idioma preferido" },
          options: [
            { value: "es", label: { en: "Spanish", es: "Español" } },
            { value: "en", label: { en: "English", es: "Inglés" } },
            { value: "other", label: { en: "Other", es: "Otro" } },
          ],
        },
      ],
    },
    {
      id: "household",
      title: { en: "Your household", es: "Su hogar" },
      fields: [
        {
          id: "householdSize",
          type: "number",
          required: true,
          label: { en: "How many people are in your household?", es: "¿Cuántas personas hay en su hogar?" },
          help: {
            en: "People who live with you and buy and prepare food with you.",
            es: "Personas que viven con usted y compran y preparan comida con usted.",
          },
        },
        {
          id: "hasChildrenUnder18",
          type: "yesno",
          required: true,
          // No `es` on purpose: demonstrates runtime machine translation of labels.
          label: { en: "Are there children under 18 in your household?" },
        },
      ],
    },
    {
      id: "income",
      title: { en: "Income", es: "Ingresos" },
      fields: [
        {
          id: "grossMonthlyIncome",
          type: "money",
          required: true,
          label: { en: "Gross monthly income (before taxes)", es: "Ingresos brutos mensuales (antes de impuestos)" },
          help: {
            en: "Total pay before taxes or deductions for everyone in the household.",
            es: "Pago total antes de impuestos o deducciones de todas las personas del hogar.",
          },
        },
        {
          id: "netMonthlyIncome",
          type: "money",
          label: { en: "Net monthly income (after taxes)", es: "Ingresos netos mensuales (después de impuestos)" },
        },
        {
          id: "incomeSource",
          type: "select",
          required: true,
          label: { en: "Main source of income", es: "Fuente principal de ingresos" },
          options: [
            { value: "job", label: { en: "Job", es: "Trabajo" } },
            { value: "selfEmployed", label: { en: "Self-employed", es: "Trabajo por cuenta propia" } },
            { value: "ssi", label: { en: "SSI / Social Security", es: "SSI / Seguro Social" } },
            { value: "childSupport", label: { en: "Child support", es: "Manutención de menores" } },
            { value: "none", label: { en: "No income", es: "Sin ingresos" } },
          ],
        },
      ],
    },
    {
      id: "expenses",
      title: { en: "Housing costs", es: "Gastos de vivienda" },
      fields: [
        { id: "monthlyRent", type: "money", label: { en: "Monthly rent or mortgage", es: "Renta o hipoteca mensual" } },
        { id: "paysUtilities", type: "yesno", label: { en: "Do you pay utilities (gas, electric, water)?", es: "¿Paga usted servicios públicos (gas, luz, agua)?" } },
      ],
    },
  ],
};
