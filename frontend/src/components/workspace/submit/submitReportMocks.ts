export const MOCK_STAGE1_REPORT: any = {
  passed: false,
  user_row_count: 10,
  ref_row_count: 10,
  user_hash: 'a3f9c1e7b2d84f0a6c5e9b3d1f7a2c84',
  ref_hash: 'e7c2b8a14d6f309c2e8b7a3f1d9c5e60',
  hash_match: false,
  order_matters: false,
  order_passed: true,
  extra_rows: {
    total: 2,
    rows: [
      { name: 'Maria Anders', price: 110.50 },
      { name: 'Hanna Moos', price: 95.00 }
    ]
  },
  missing_rows: {
    total: 2,
    rows: [
      { name: 'Bernd Berglund', price: 1280.30 },
      { name: 'Frédérique Citeaux', price: 980.00 }
    ]
  }
};

export const MOCK_STAGE2_REPORT: any = {
  passed: false,
  rules: [
    {
      rule_id: 'rule1',
      category: 'function',
      condition: 'required',
      params: { function_name: 'ROUND' },
      message: 'Запрос должен использовать функцию ROUND',
      detail_msg: 'функция ROUND используется',
      passed: true,
      severity: 'blocking'
    },
    {
      rule_id: 'rule2',
      category: 'select_star',
      condition: 'forbidden',
      params: {},
      message: 'Использование SELECT * запрещено',
      detail_msg: 'SELECT * на верхнем уровне запроса',
      passed: false,
      severity: 'blocking'
    },
    {
      rule_id: 'rule3',
      category: 'alias',
      condition: 'required',
      params: { scope: 'both' },
      message: 'Необходимо использовать алиасы (AS) для: колонки и таблицы',
      detail_msg: '2 из 3 колонок без алиаса',
      passed: false,
      severity: 'warning'
    }
  ]
};

export const MOCK_HISTORY: any[] = [
  { attempt_id: '12', verdict: false, created_at: '2026-06-13T12:05:00', duration_ms: 142, sql: `SELECT * FROM orders` },
  { attempt_id: '11', verdict: false, created_at: '2026-06-13T11:41:00', duration_ms: 35, sql: `SELECT order_id FROM orders` },
  { attempt_id: '10', verdict: true, created_at: '2026-06-12T20:41:00', duration_ms: 31, sql: `SELECT * FROM orders` },
  { attempt_id: '9', verdict: false, created_at: '2026-06-11T14:22:00', duration_ms: 88, sql: `SELECT COUNT(*) FROM users` },
  { attempt_id: '8', verdict: false, created_at: '2026-06-11T12:10:00', duration_ms: 45, sql: `SELECT id FROM table` },
  { attempt_id: '7', verdict: true, created_at: '2026-06-10T09:15:00', duration_ms: 20, sql: `SELECT 1` },
  { attempt_id: '6', verdict: false, created_at: '2026-06-09T18:30:00', duration_ms: 110, sql: `SELECT * FROM wrong_table` },
  { attempt_id: '5', verdict: false, created_at: '2026-06-09T18:25:00', duration_ms: 95, sql: `SELECT * FROM nothing` }
];

export const MOCK_REFERENCE_SQL = `SELECT
    c.company_name AS company,
    o.order_id AS order_id,
    ROUND(SUM(od.unit_price * od.quantity * (1 - od.discount))::numeric, 2) AS total
FROM customers c
JOIN orders o ON o.customer_id = c.customer_id
JOIN order_details od ON od.order_id = o.order_id
WHERE c.country = 'Germany'
GROUP BY c.company_name, o.order_id
ORDER BY total DESC
LIMIT 10`;
