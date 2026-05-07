-- Seed practice_problems table with sample SQL problems
-- Run this in Supabase SQL Editor

-- Sample Practice Problems for Students

INSERT INTO practice_problems (title, description, difficulty, dataset_id, expected_output, solution_sql, order_sensitive, position)
VALUES
  (
    'Count Total Rows',
    'Write a query to count the total number of records in the employees table.',
    'basic',
    NULL,
    '[{"count": 3}]'::jsonb,
    'SELECT COUNT(*) as count FROM employees;',
    false,
    1
  ),
  (
    'Select All Employees',
    'Write a query to retrieve all employee records.',
    'basic',
    NULL,
    '[{"id": 1, "name": "Alice", "salary": 50000}, {"id": 2, "name": "Bob", "salary": 60000}, {"id": 3, "name": "Charlie", "salary": 75000}]'::jsonb,
    'SELECT * FROM employees;',
    true,
    2
  ),
  (
    'Find High Earners',
    'Write a query to find all employees earning more than $55,000.',
    'basic',
    NULL,
    '[{"id": 2, "name": "Bob", "salary": 60000}, {"id": 3, "name": "Charlie", "salary": 75000}]'::jsonb,
    'SELECT * FROM employees WHERE salary > 55000;',
    false,
    3
  ),
  (
    'Calculate Average Salary',
    'Write a query to calculate the average salary of all employees.',
    'intermediate',
    NULL,
    '[{"average_salary": 61666.67}]'::jsonb,
    'SELECT AVG(salary) as average_salary FROM employees;',
    false,
    4
  ),
  (
    'Group by Salary Range',
    'Write a query to group employees by salary ranges (< 55000, 55000-70000, > 70000).',
    'intermediate',
    NULL,
    '[{"range": "< 55000", "count": 1}, {"range": "55000-70000", "count": 1}, {"range": "> 70000", "count": 1}]'::jsonb,
    'SELECT 
      CASE 
        WHEN salary < 55000 THEN ''< 55000''
        WHEN salary <= 70000 THEN ''55000-70000''
        ELSE ''> 70000''
      END as range,
      COUNT(*) as count
    FROM employees
    GROUP BY range;',
    false,
    5
  ),
  (
    'Find Employee with Max Salary',
    'Write a query to find the employee with the highest salary.',
    'intermediate',
    NULL,
    '[{"name": "Charlie", "salary": 75000}]'::jsonb,
    'SELECT name, MAX(salary) as salary FROM employees;',
    false,
    6
  ),
  (
    'Order Employees by Salary',
    'Write a query to list all employees ordered by salary in descending order.',
    'basic',
    NULL,
    '[{"id": 3, "name": "Charlie", "salary": 75000}, {"id": 2, "name": "Bob", "salary": 60000}, {"id": 1, "name": "Alice", "salary": 50000}]'::jsonb,
    'SELECT * FROM employees ORDER BY salary DESC;',
    true,
    7
  ),
  (
    'Limit Results',
    'Write a query to retrieve only the top 2 employees by ID.',
    'basic',
    NULL,
    '[{"id": 1, "name": "Alice", "salary": 50000}, {"id": 2, "name": "Bob", "salary": 60000}]'::jsonb,
    'SELECT * FROM employees LIMIT 2;',
    true,
    8
  ),
  (
    'Complex Join Query',
    'Write a query to find employees with above-average salary.',
    'advanced',
    NULL,
    '[{"id": 2, "name": "Bob", "salary": 60000}, {"id": 3, "name": "Charlie", "salary": 75000}]'::jsonb,
    'SELECT e.* FROM employees e
     WHERE e.salary > (SELECT AVG(salary) FROM employees);',
    false,
    9
  ),
  (
    'String Pattern Matching',
    'Write a query to find employees whose name starts with ''C''.',
    'intermediate',
    NULL,
    '[{"id": 3, "name": "Charlie", "salary": 75000}]'::jsonb,
    'SELECT * FROM employees WHERE name LIKE ''C%'';',
    false,
    10
  );

-- Verify insertion
SELECT COUNT(*) as total_problems FROM practice_problems;
