import type { RuleResult } from '../../../store/queryStore';

export const MOCK_STAGE1_REPORT = {
  passed: false,
  user_row_count: 2,
  ref_row_count: 1000,
  user_hash: 'abc',
  ref_hash: 'def',
  hash_match: false,
  except_ran: true,
  extra_rows: {
    total: 2,
    rows: [
      ["Alfreds Futterkiste", "Maria Anders"],
      ["Ana Trujillo Emparedados", "Ana Trujillo"]
    ]
  },
  missing_rows: {
    total: 1000,
    rows: [
      ["Bottom-Dollar Markets", "Elizabeth Lincoln", "23 Tsawassen Blvd.", "Tsawassen", "BC", "T2F 8M4", "Canada", "(604) 555-4729", "(604) 555-3745", "1"],
      ["B's Beverages", "Victoria Ashworth", "Fauntleroy Circus", "London", "NULL", "EC2 5NT", "UK", "(171) 555-1212", "NULL", "2"],
      ["Cactus Comidas para llevar", "Patricio Simpson", "Cerrito 333", "Buenos Aires", "NULL", "1010", "Argentina", "(1) 135-5555", "(1) 135-4892", "3"],
      ["Centro comercial Moctezuma", "Francisco Chang", "Sierras de Granada 9993", "México D.F.", "NULL", "05022", "Mexico", "(5) 555-3392", "(5) 555-7293", "4"],
      ["Chop-suey Chinese", "Yang Wang", "Hauptstr. 29", "Bern", "NULL", "3012", "Switzerland", "0452-076545", "NULL", "5"]
    ]
  },
  order_matters: true,
  order_passed: null,
  sql_error: null,
};

export const MOCK_STAGE2_REPORT = {
  ran: true,
  all_blocking_passed: false,
  rules: [
    {
      rule_id: 1,
      category: 'construct',
      condition: 'required',
      params: { target: 'JOIN' },
      severity: 'blocking',
      message: 'construct.required [JOIN]',
      sort_order: 1,
      passed: true,
      actual_value: 2,
      detail_msg: 'JOIN найден (2 шт.)',
    },
    {
      rule_id: 2,
      category: 'construct',
      condition: 'count_max',
      params: { target: 'SUBQUERY', value: 0 },
      severity: 'blocking',
      message: 'construct.count_max [SUBQUERY=0]',
      sort_order: 2,
      passed: false,
      actual_value: 1,
      detail_msg: 'Найдено: подзапрос использован 1 раз (допустимо 0)',
    },
    {
      rule_id: 3,
      category: 'select_star',
      condition: 'forbidden',
      params: {},
      severity: 'warning',
      message: 'select_star.forbidden',
      sort_order: 3,
      passed: false,
      actual_value: true,
      detail_msg: 'Найдено: SELECT * на верхнем уровне запроса',
    },
    {
      rule_id: 4,
      category: 'function',
      condition: 'required',
      params: { function_name: 'COALESCE' },
      severity: 'blocking',
      message: 'function.required [COALESCE]',
      sort_order: 4,
      passed: false,
      actual_value: false,
      detail_msg: 'Найдено: функция COALESCE не используется (требуется)',
    },
    {
      rule_id: 5,
      category: 'performance',
      condition: 'no_seqscan',
      params: { table_name: 'orders' },
      severity: 'blocking',
      message: 'performance.no_seqscan [orders]',
      sort_order: 5,
      passed: true,
      actual_value: null,
      detail_msg: 'Полное сканирование (Seq Scan) по таблице orders не обнаружено',
    }
  ] as RuleResult[]
};

export const MOCK_HISTORY = Array.from({ length: 14 }).map((_, i) => ({
  id: `attempt-db-id-${i + 1}`,
  date: new Date(Date.now() - i * 1000 * 60 * 60 * 3), // Every 3 hours back
  durationMs: Math.round(Math.random() * 50 + 10),
  verdict: i === 5 || i === 8 || i === 12,
  sql: `SELECT * \nFROM customers\n${i % 2 === 0 ? "WHERE country = 'UK'" : "LIMIT 10"};`
}));

export const MOCK_REFERENCE_SQL = `-- Эталонное решение автора\nSELECT \n  c.company_name, \n  o.order_id \nFROM customers c\nLEFT JOIN orders o ON c.customer_id = o.customer_id\nORDER BY c.company_name;`;
