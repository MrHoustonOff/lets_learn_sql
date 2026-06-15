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

