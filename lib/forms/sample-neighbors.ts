/**
 * FICTIONAL neighbor profiles for demos and testing. Never put real neighbor
 * data in this repo. Real data needs MOFC approval first (see CLAUDE.md).
 */
export interface SampleNeighbor {
  id: string;
  description: string;
  values: Record<string, string>;
  /** Example lines the neighbor might say, for demoing the conversation. */
  sampleLines: string[];
}

export const sampleNeighbors: SampleNeighbor[] = [
  {
    id: "maria",
    description: "Spanish speaker, household of 3, one job",
    values: {
      fullName: "María Ejemplo López",
      dob: "1988-04-12",
      phone: "(614) 555-0142",
      address: "123 Calle Falsa, Columbus, OH 43215",
      preferredLanguage: "es",
      householdSize: "3",
      hasChildrenUnder18: "yes",
      grossIncome: "2100/monthly",
      netIncome: "1850/monthly",
      incomeSource: "job",
      rent: "950/monthly",
      paysUtilities: "yes",
    },
    sampleLines: [
      "Trabajo en un restaurante, me pagan cada dos semanas.",
      "Antes de impuestos gano como dos mil cien al mes.",
      "Vivo con mis dos hijos, de 6 y 9 años.",
      "¿Qué pasa si mis horas cambian el próximo mes?",
    ],
  },
  {
    id: "jose",
    description: "Spanish speaker, lives alone, recently lost job",
    values: {
      fullName: "José Muestra Ramírez",
      dob: "1971-11-02",
      phone: "(614) 555-0199",
      address: "456 Avenida Ficticia, Apt 2, Columbus, OH 43205",
      preferredLanguage: "es",
      householdSize: "1",
      hasChildrenUnder18: "no",
      grossIncome: "0/monthly",
      incomeSource: "none",
      rent: "700/monthly",
      paysUtilities: "no",
    },
    sampleLines: [
      "Perdí mi trabajo hace tres semanas.",
      "El dueño paga la luz y el agua, yo solo pago la renta.",
    ],
  },
];
