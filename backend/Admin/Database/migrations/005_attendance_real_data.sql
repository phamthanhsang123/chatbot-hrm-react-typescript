-- Real attendance persistence for check-in/out reports and employee planned shifts.

ALTER TABLE attendance
    ADD COLUMN IF NOT EXISTS work_report_title VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS work_report_description TEXT NULL,
    ADD COLUMN IF NOT EXISTS work_report_note TEXT NULL,
    ADD COLUMN IF NOT EXISTS created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE attendance_requests
    ADD COLUMN IF NOT EXISTS work_report_title VARCHAR(255) NULL,
    ADD COLUMN IF NOT EXISTS work_report_description TEXT NULL;

CREATE TABLE IF NOT EXISTS attendance_shifts (
    shift_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PLANNED',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_attendance_shifts_employee_date (employee_id, work_date),
    CONSTRAINT fk_attendance_shift_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_attendance_shift_status
        CHECK (status IN ('PLANNED', 'WORKING', 'COMPLETED', 'CANCELLED'))
);
