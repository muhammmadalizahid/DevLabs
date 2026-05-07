-- ============================================================
-- DevLab Platform Datasets
-- Run via: node scripts/seed-platform-datasets.js
-- ============================================================

-- ── Dataset 1: employees (Basic) ─────────────────────────────
-- Schema
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
);
-- Seed
INSERT INTO departments VALUES
  (1,'Engineering','New York'),
  (2,'Design','San Francisco'),
  (3,'Marketing','Chicago'),
  (4,'HR','Austin');
INSERT INTO employees VALUES
  (1,'Sarah Chen','sarah@co.com',1,92000,'2021-03-15'),
  (2,'Ahmed Raza','ahmed@co.com',1,87500,'2020-07-01'),
  (3,'Maria Lopez','maria@co.com',2,71000,'2022-01-10'),
  (4,'James Kim','james@co.com',3,55000,'2019-11-20'),
  (5,'Priya Singh','priya@co.com',4,48000,'2023-04-05'),
  (6,'Tom Baker','tom@co.com',1,76000,'2021-09-22'),
  (7,'Lena Müller','lena@co.com',2,68000,'2020-12-01'),
  (8,'Carlos Rivera','carlos@co.com',3,52000,'2022-06-18');
