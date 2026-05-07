/**
 * Seed platform datasets into Supabase + MySQL sandbox
 * Run with: node scripts/seed-platform-datasets.js
 */
import { createClient } from '@supabase/supabase-js';
import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import 'dotenv/config';

const __dirname = dirname(fileURLToPath(import.meta.url));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const DATASETS = [
  {
    name: 'Employees & Departments',
    description: 'A company HR database with employees and departments. Good for JOINs, aggregations, and filtering.',
    schema_sql: `
CREATE TABLE IF NOT EXISTS departments (
  id INT PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL,
  location VARCHAR(100)
);
CREATE TABLE IF NOT EXISTS employees (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150),
  dept_id INT,
  salary DECIMAL(10,2),
  hire_date DATE,
  FOREIGN KEY (dept_id) REFERENCES departments(id)
);`,
    seed_sql: `
INSERT INTO departments VALUES (1,'Engineering','New York'),(2,'Design','San Francisco'),(3,'Marketing','Chicago'),(4,'HR','Austin');
INSERT INTO employees VALUES
  (1,'Sarah Chen','sarah@co.com',1,92000,'2021-03-15'),
  (2,'Ahmed Raza','ahmed@co.com',1,87500,'2020-07-01'),
  (3,'Maria Lopez','maria@co.com',2,71000,'2022-01-10'),
  (4,'James Kim','james@co.com',3,55000,'2019-11-20'),
  (5,'Priya Singh','priya@co.com',4,48000,'2023-04-05'),
  (6,'Tom Baker','tom@co.com',1,76000,'2021-09-22'),
  (7,'Lena Müller','lena@co.com',2,68000,'2020-12-01'),
  (8,'Carlos Rivera','carlos@co.com',3,52000,'2022-06-18');`,
  },
  {
    name: 'Library Books',
    description: 'A library database with books, authors, and borrowing records. Good for subqueries and GROUP BY.',
    schema_sql: `
CREATE TABLE IF NOT EXISTS authors (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  country VARCHAR(80)
);
CREATE TABLE IF NOT EXISTS books (
  id INT PRIMARY KEY,
  title VARCHAR(200),
  author_id INT,
  genre VARCHAR(80),
  published_year INT,
  copies_available INT,
  FOREIGN KEY (author_id) REFERENCES authors(id)
);
CREATE TABLE IF NOT EXISTS borrows (
  id INT PRIMARY KEY,
  book_id INT,
  member_name VARCHAR(100),
  borrow_date DATE,
  return_date DATE,
  FOREIGN KEY (book_id) REFERENCES books(id)
);`,
    seed_sql: `
INSERT INTO authors VALUES (1,'George Orwell','UK'),(2,'Yuval Harari','Israel'),(3,'J.K. Rowling','UK'),(4,'Frank Herbert','USA');
INSERT INTO books VALUES
  (1,'1984',1,'Dystopian',1949,3),
  (2,'Sapiens',2,'History',2011,5),
  (3,'Harry Potter and the Sorcerer Stone',3,'Fantasy',1997,8),
  (4,'Dune',4,'Sci-Fi',1965,2),
  (5,'Animal Farm',1,'Satire',1945,4),
  (6,'Homo Deus',2,'History',2015,3);
INSERT INTO borrows VALUES
  (1,1,'Alice',  '2026-01-10','2026-01-25'),
  (2,3,'Bob',    '2026-02-01',NULL),
  (3,2,'Alice',  '2026-02-15','2026-03-01'),
  (4,4,'Charlie','2026-03-05',NULL),
  (5,1,'Diana',  '2026-03-10','2026-03-20');`,
  },
  {
    name: 'E-Commerce Orders',
    description: 'An online store with customers, products, and orders. Good for advanced aggregations and window functions.',
    schema_sql: `
CREATE TABLE IF NOT EXISTS customers (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(150),
  city VARCHAR(80),
  joined_date DATE
);
CREATE TABLE IF NOT EXISTS products (
  id INT PRIMARY KEY,
  name VARCHAR(150),
  category VARCHAR(80),
  price DECIMAL(10,2),
  stock INT
);
CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY,
  customer_id INT,
  order_date DATE,
  status VARCHAR(30),
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
CREATE TABLE IF NOT EXISTS order_items (
  id INT PRIMARY KEY,
  order_id INT,
  product_id INT,
  quantity INT,
  unit_price DECIMAL(10,2),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);`,
    seed_sql: `
INSERT INTO customers VALUES
  (1,'Alice Johnson','alice@mail.com','New York','2024-01-15'),
  (2,'Bob Smith','bob@mail.com','Chicago','2024-03-22'),
  (3,'Carol White','carol@mail.com','Los Angeles','2025-01-05'),
  (4,'David Lee','david@mail.com','Houston','2025-06-10');
INSERT INTO products VALUES
  (1,'Laptop Pro 15','Electronics',1299.99,50),
  (2,'Wireless Mouse','Electronics',29.99,200),
  (3,'Desk Chair','Furniture',349.00,30),
  (4,'USB-C Hub','Electronics',49.99,150),
  (5,'Standing Desk','Furniture',599.00,15);
INSERT INTO orders VALUES
  (1,1,'2026-01-10','delivered'),
  (2,1,'2026-02-20','delivered'),
  (3,2,'2026-03-05','shipped'),
  (4,3,'2026-03-15','pending'),
  (5,4,'2026-04-01','delivered');
INSERT INTO order_items VALUES
  (1,1,1,1,1299.99),(2,1,2,1,29.99),
  (3,2,4,2,49.99),
  (4,3,3,1,349.00),
  (5,4,5,1,599.00),(6,4,2,1,29.99),
  (7,5,1,1,1299.99),(8,5,4,1,49.99);`,
  },
];

async function main() {
  console.log('🌱 Seeding platform datasets...\n');

  for (const ds of DATASETS) {
    console.log(`  → ${ds.name}`);

    // Upsert into Supabase
    const { data, error } = await supabase.from('datasets').upsert(
      { name: ds.name, description: ds.description, is_platform: true, owner_id: null, schema_sql: ds.schema_sql, seed_sql: ds.seed_sql },
      { onConflict: 'name', ignoreDuplicates: false }
    ).select().single();

    if (error) { console.error(`    ✗ Supabase error: ${error.message}`); continue; }

    // Provision MySQL
    const dbName = `devlab_ds_${data.id.replace(/-/g, '_')}`;
    const conn = await mysql.createConnection({
      host: process.env.MYSQL_HOST || 'localhost',
      port: parseInt(process.env.MYSQL_PORT || '3306'),
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      multipleStatements: true,
    });

    try {
      await conn.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
      await conn.execute(`USE \`${dbName}\``);
      await conn.query(`SET FOREIGN_KEY_CHECKS=0`);
      const [tables] = await conn.execute(`SELECT table_name FROM information_schema.tables WHERE table_schema='${dbName}'`);
      for (const t of tables) await conn.execute(`DROP TABLE IF EXISTS \`${t.table_name}\``);
      await conn.query(`SET FOREIGN_KEY_CHECKS=1`);
      await conn.query(ds.schema_sql);
      await conn.query(ds.seed_sql);
      console.log(`    ✓ Provisioned ${dbName}`);
    } catch (err) {
      console.error(`    ✗ MySQL error: ${err.message}`);
    } finally {
      await conn.end();
    }

    // Seed practice problems for employees dataset
    if (ds.name === 'Employees & Departments') {
      const problems = [
        { title: 'List All Employees', description: 'Write a query to retrieve all employee names and their salaries.', difficulty: 'basic', expected_output: JSON.stringify([{name:'Sarah Chen',salary:'92000.00'},{name:'Ahmed Raza',salary:'87500.00'},{name:'Maria Lopez',salary:'71000.00'},{name:'Tom Baker',salary:'76000.00'},{name:'James Kim',salary:'55000.00'},{name:'Lena Müller',salary:'68000.00'},{name:'Carlos Rivera',salary:'52000.00'},{name:'Priya Singh',salary:'48000.00'}]), solution_sql: 'SELECT name, salary FROM employees;', position: 1 },
        { title: 'High Earners', description: 'Find all employees with a salary greater than 70,000. Show their name, department, and salary.', difficulty: 'basic', expected_output: '[]', solution_sql: 'SELECT e.name, d.department_name, e.salary FROM employees e JOIN departments d ON e.dept_id = d.id WHERE e.salary > 70000 ORDER BY e.salary DESC;', position: 2 },
        { title: 'Department Headcount', description: 'Show each department name and how many employees are in it.', difficulty: 'intermediate', expected_output: '[]', solution_sql: 'SELECT d.department_name, COUNT(e.id) AS employee_count FROM departments d LEFT JOIN employees e ON d.id = e.dept_id GROUP BY d.id, d.department_name ORDER BY employee_count DESC;', position: 3 },
        { title: 'Average Salary by Department', description: 'Calculate the average salary per department. Round to 2 decimal places.', difficulty: 'intermediate', expected_output: '[]', solution_sql: 'SELECT d.department_name, ROUND(AVG(e.salary), 2) AS avg_salary FROM employees e JOIN departments d ON e.dept_id = d.id GROUP BY d.id, d.department_name;', position: 4 },
        { title: 'Top Earner Per Department', description: 'Find the highest-paid employee in each department.', difficulty: 'advanced', expected_output: '[]', solution_sql: 'SELECT d.department_name, e.name, e.salary FROM employees e JOIN departments d ON e.dept_id = d.id WHERE e.salary = (SELECT MAX(salary) FROM employees WHERE dept_id = e.dept_id);', position: 5 },
      ];

      for (const p of problems) {
        await supabase.from('practice_problems').upsert(
          { ...p, dataset_id: data.id, order_sensitive: false },
          { onConflict: 'title', ignoreDuplicates: true }
        );
      }
      console.log(`    ✓ Seeded ${problems.length} practice problems`);
    }
  }

  console.log('\n✅ Done! Platform datasets seeded successfully.');
  process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
