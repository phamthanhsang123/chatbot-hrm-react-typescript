-- Attendance request workflow used by Employee, Manager, Admin and Agentic AI.
-- This migration is idempotent and can be run safely on the current Railway database.

CREATE TABLE IF NOT EXISTS attendance_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    work_date DATE NOT NULL,
    request_type VARCHAR(30) NOT NULL,
    requested_check_in DATETIME NULL,
    requested_check_out DATETIME NULL,
    original_check_in DATETIME NULL,
    original_check_out DATETIME NULL,
    reason TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    reviewed_by INT NULL,
    review_note TEXT NULL,
    submitted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,

    INDEX idx_attendance_requests_employee (employee_id),
    INDEX idx_attendance_requests_date (work_date),
    INDEX idx_attendance_requests_status (status),

    CONSTRAINT fk_attendance_request_employee
        FOREIGN KEY (employee_id) REFERENCES employees(employee_id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_attendance_request_reviewer
        FOREIGN KEY (reviewed_by) REFERENCES employees(employee_id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_attendance_request_type
        CHECK (request_type IN ('SUPPLEMENT', 'ADJUSTMENT')),
    CONSTRAINT chk_attendance_request_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);
