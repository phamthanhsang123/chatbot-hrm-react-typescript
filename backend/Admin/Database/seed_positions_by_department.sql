USE chatbot_hrm;

SET @has_department_id_column = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'positions'
      AND COLUMN_NAME = 'department_id'
);

SET @add_department_id_column_sql = IF(
    @has_department_id_column = 0,
    'ALTER TABLE positions ADD COLUMN department_id INT NULL',
    'SELECT 1'
);

PREPARE add_department_id_column_stmt FROM @add_department_id_column_sql;
EXECUTE add_department_id_column_stmt;
DEALLOCATE PREPARE add_department_id_column_stmt;

INSERT INTO departments (department_name)
SELECT 'IT'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE department_name = 'IT');

INSERT INTO departments (department_name)
SELECT 'HR'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE department_name = 'HR');

INSERT INTO departments (department_name)
SELECT 'Marketing'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE department_name = 'Marketing');

INSERT INTO departments (department_name)
SELECT 'Sales'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE department_name = 'Sales');

INSERT INTO departments (department_name)
SELECT 'Kế toán'
WHERE NOT EXISTS (SELECT 1 FROM departments WHERE department_name = 'Kế toán');

INSERT INTO positions (position_name, department_id)
SELECT 'Developer', d.department_id FROM departments d
WHERE d.department_name = 'IT'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'Developer' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'Team Lead', d.department_id FROM departments d
WHERE d.department_name = 'IT'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'Team Lead' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'QA Tester', d.department_id FROM departments d
WHERE d.department_name = 'IT'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'QA Tester' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'DevOps Engineer', d.department_id FROM departments d
WHERE d.department_name = 'IT'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'DevOps Engineer' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'HR Manager', d.department_id FROM departments d
WHERE d.department_name = 'HR'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'HR Manager' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'HR Staff', d.department_id FROM departments d
WHERE d.department_name = 'HR'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'HR Staff' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'Marketing Manager', d.department_id FROM departments d
WHERE d.department_name = 'Marketing'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'Marketing Manager' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'Marketing Executive', d.department_id FROM departments d
WHERE d.department_name = 'Marketing'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'Marketing Executive' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'Content Writer', d.department_id FROM departments d
WHERE d.department_name = 'Marketing'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'Content Writer' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'Sales Manager', d.department_id FROM departments d
WHERE d.department_name = 'Sales'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'Sales Manager' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'Sales Executive', d.department_id FROM departments d
WHERE d.department_name = 'Sales'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'Sales Executive' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'Sales Representative', d.department_id FROM departments d
WHERE d.department_name = 'Sales'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'Sales Representative' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'Kế toán trưởng', d.department_id FROM departments d
WHERE d.department_name = 'Kế toán'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'Kế toán trưởng' AND p.department_id = d.department_id);

INSERT INTO positions (position_name, department_id)
SELECT 'Kế toán viên', d.department_id FROM departments d
WHERE d.department_name = 'Kế toán'
AND NOT EXISTS (SELECT 1 FROM positions p WHERE p.position_name = 'Kế toán viên' AND p.department_id = d.department_id);
