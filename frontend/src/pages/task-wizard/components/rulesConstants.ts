export const RULE_CATEGORIES = [
  { key: "construct", label: "Конструкция SQL" },
  { key: "object", label: "Таблица / колонка" },
  { key: "function", label: "Функция" },
  { key: "select_star", label: "SELECT *" },
  { key: "alias", label: "Алиасы" },
];

export const CONSTRUCT_TARGETS = [
  "JOIN",
  "INNER_JOIN",
  "LEFT_JOIN",
  "RIGHT_JOIN",
  "FULL_JOIN",
  "GROUP_BY",
  "HAVING",
  "SUBQUERY",
  "WINDOW_FUNCTION",
  "CTE",
  "DISTINCT",
  "UNION",
  "CASE",
  "AGGREGATE_FUNCTION",
];

export const CONDITIONS_WITH_VALUE = ["count_min", "count_max", "count_exact"];

export const CONDITION_LABELS: Record<string, string> = {
  required: "обязательна",
  forbidden: "запрещена",
  count_min: "минимум раз",
  count_max: "максимум раз",
  count_exact: "ровно раз",
};
