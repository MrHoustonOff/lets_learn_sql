export const DIFFICULTY_TIERS = [
  { key: "easy", label: "Легкий", color: "bg-success", text: "text-success" },
  { key: "medium", label: "Средний", color: "bg-warning", text: "text-warning-text" },
  { key: "hard", label: "Тяжелый", color: "bg-destructive", text: "text-destructive" },
];

export const DIFFICULTY_LEVELS = DIFFICULTY_TIERS.flatMap((tier) =>
  [1, 2, 3].map((level) => ({
    id: `${tier.key}-${level}`,
    tier: tier.key,
    level,
    label: `${tier.label} ${level}/3`,
    color: tier.color,
    text: tier.text,
  }))
);

export const MOCK_DATABASES = [
  { id: "northwind", label: "Northwind" },
  { id: "chinook", label: "Chinook" },
  { id: "hr_demo", label: "HR Demo" },
];

export const MOCK_COURSES = [
  { id: "sql_basics", label: "SQL: с нуля" },
  { id: "joins_deep", label: "JOIN-ы глубоко" },
  { id: "window_funcs", label: "Оконные функции" },
];

export const MOCK_TAGS = [
  "JOIN",
  "GROUP BY",
  "Подзапросы",
  "Оконные функции",
  "Агрегаты",
  "CTE",
  "Индексы",
  "DISTINCT",
];

export const RULE_CATEGORIES = [
  { key: "construct", label: "Конструкция SQL" },
  { key: "object", label: "Таблица / колонка" },
  { key: "function", label: "Функция" },
  { key: "select_star", label: "SELECT *" },
  { key: "alias", label: "Алиасы" },
  { key: "performance", label: "Производительность" },
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
  no_seqscan: "без Seq Scan",
};
