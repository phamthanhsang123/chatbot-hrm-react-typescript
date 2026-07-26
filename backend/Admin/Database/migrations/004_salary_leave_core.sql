-- Core schema cho module luong va nghi phep.
-- Backend cung tu dong ap dung cac bang/cot nay khi khoi dong.

CREATE TABLE IF NOT EXISTS leave_types (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    Name VARCHAR(100) NOT NULL UNIQUE
);

INSERT INTO leave_types (Id, Name) VALUES
    (1, 'Nghỉ phép năm'),
    (2, 'Nghỉ ốm'),
    (3, 'Nghỉ không lương'),
    (4, 'Nghỉ thai sản'),
    (5, 'Nghỉ cưới'),
    (6, 'Nghỉ tang')
ON DUPLICATE KEY UPDATE Name = VALUES(Name);

CREATE TABLE IF NOT EXISTS leave_requests (
    leave_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    leave_type_id INT NOT NULL DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT NOT NULL DEFAULT 1,
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'Chờ duyệt',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_leave_requests_employee (employee_id),
    INDEX idx_leave_requests_status (status),
    CONSTRAINT fk_leave_requests_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_leave_requests_type
        FOREIGN KEY (leave_type_id) REFERENCES leave_types(Id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

UPDATE leave_requests SET reason = '' WHERE reason IS NULL;
UPDATE leave_requests SET status = 'Chờ duyệt' WHERE status IS NULL OR TRIM(status) = '';
UPDATE leave_requests
SET total_days = DATEDIFF(end_date, start_date) + 1
WHERE total_days IS NULL
   OR total_days <> DATEDIFF(end_date, start_date) + 1;

CREATE TABLE IF NOT EXISTS payroll (
    Id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    Month INT NOT NULL,
    Year INT NOT NULL,
    salary_base DECIMAL(15,2) NOT NULL DEFAULT 0,
    Bonus DECIMAL(15,2) NOT NULL DEFAULT 0,
    Deductions DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
    Status VARCHAR(30) NOT NULL DEFAULT 'Chờ duyệt',
    UNIQUE KEY uq_payroll_employee_period (employee_id, Year, Month),
    INDEX idx_payroll_period (Year, Month),
    INDEX idx_payroll_status (Status),
    CONSTRAINT fk_payroll_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON UPDATE CASCADE ON DELETE CASCADE
);
