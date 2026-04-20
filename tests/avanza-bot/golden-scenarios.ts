export type GoldenScenario = {
  id: string;
  title: string;
  inbound: string;
  expected: {
    explicit_client_choice: "new" | "existing" | "";
    advisor_intent: boolean;
    should_not_count_as_affirmative_choice: boolean;
  };
};

export const GOLDEN_SCENARIOS: GoldenScenario[] = [
  {
    id: "client-choice-new-explicit-1",
    title: "Cliente nuevo por opción numérica",
    inbound: "1",
    expected: {
      explicit_client_choice: "new",
      advisor_intent: false,
      should_not_count_as_affirmative_choice: false,
    },
  },
  {
    id: "client-choice-existing-explicit-2",
    title: "Cliente existente por opción numérica",
    inbound: "2",
    expected: {
      explicit_client_choice: "existing",
      advisor_intent: false,
      should_not_count_as_affirmative_choice: false,
    },
  },
  {
    id: "client-choice-do-not-promote-affirmative",
    title: "Afirmación corta no clasifica cliente",
    inbound: "si",
    expected: {
      explicit_client_choice: "",
      advisor_intent: false,
      should_not_count_as_affirmative_choice: true,
    },
  },
  {
    id: "advisor-intent-cita",
    title: "Escalamiento explícito a asesora",
    inbound: "quiero agendar una cita con asesor",
    expected: {
      explicit_client_choice: "",
      advisor_intent: true,
      should_not_count_as_affirmative_choice: false,
    },
  },
];
