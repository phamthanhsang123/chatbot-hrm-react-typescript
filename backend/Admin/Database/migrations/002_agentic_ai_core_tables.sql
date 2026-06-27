-- Migration: Agentic AI core tables for task-based competency evaluation.
-- Scope: create missing tables only. This script does not delete existing HRM data.

CREATE TABLE IF NOT EXISTS tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    manager_id INT NOT NULL,
    department_id INT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    deadline DATETIME NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(30) NOT NULL DEFAULT 'NEW',
    progress_percent INT NOT NULL DEFAULT 0,
    expected_score DECIMAL(5,2) NOT NULL DEFAULT 100.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_tasks_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(employee_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_tasks_manager
        FOREIGN KEY (manager_id)
        REFERENCES employees(employee_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_tasks_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT chk_tasks_progress_percent
        CHECK (progress_percent >= 0 AND progress_percent <= 100),

    CONSTRAINT chk_tasks_expected_score
        CHECK (expected_score >= 0 AND expected_score <= 100),

    CONSTRAINT chk_tasks_priority
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),

    CONSTRAINT chk_tasks_status
        CHECK (status IN (
            'NEW',
            'IN_PROGRESS',
            'SUBMITTED',
            'APPROVED',
            'REJECTED',
            'REVISION_REQUIRED',
            'OVERDUE'
        )),

    INDEX idx_tasks_employee_id (employee_id),
    INDEX idx_tasks_manager_id (manager_id),
    INDEX idx_tasks_department_id (department_id),
    INDEX idx_tasks_status (status),
    INDEX idx_tasks_deadline (deadline)
);

CREATE TABLE IF NOT EXISTS task_progress_logs (
    progress_id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    employee_id INT NOT NULL,
    progress_percent INT NOT NULL,
    note TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_task_progress_logs_task
        FOREIGN KEY (task_id)
        REFERENCES tasks(task_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_task_progress_logs_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(employee_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT chk_task_progress_logs_percent
        CHECK (progress_percent >= 0 AND progress_percent <= 100),

    INDEX idx_task_progress_logs_task_id (task_id),
    INDEX idx_task_progress_logs_employee_id (employee_id)
);

CREATE TABLE IF NOT EXISTS task_reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    manager_id INT NOT NULL,
    quality_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    deadline_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    decision VARCHAR(30) NOT NULL,
    comment TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_task_reviews_task
        FOREIGN KEY (task_id)
        REFERENCES tasks(task_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_task_reviews_manager
        FOREIGN KEY (manager_id)
        REFERENCES employees(employee_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT chk_task_reviews_quality_score
        CHECK (quality_score >= 0 AND quality_score <= 100),

    CONSTRAINT chk_task_reviews_deadline_score
        CHECK (deadline_score >= 0 AND deadline_score <= 100),

    CONSTRAINT chk_task_reviews_decision
        CHECK (decision IN ('APPROVED', 'REJECTED', 'REVISION_REQUIRED')),

    INDEX idx_task_reviews_task_id (task_id),
    INDEX idx_task_reviews_manager_id (manager_id)
);

CREATE TABLE IF NOT EXISTS competency_reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    manager_id INT NULL,
    department_id INT NULL,
    review_month INT NOT NULL,
    review_year INT NOT NULL,
    attendance_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    task_performance_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    quality_skill_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    discipline_responsibility_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    total_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    rating VARCHAR(50) NOT NULL,
    ai_summary TEXT NULL,
    ai_recommendation TEXT NULL,
    manager_note TEXT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_competency_reviews_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(employee_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,

    CONSTRAINT fk_competency_reviews_manager
        FOREIGN KEY (manager_id)
        REFERENCES employees(employee_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT fk_competency_reviews_department
        FOREIGN KEY (department_id)
        REFERENCES departments(department_id)
        ON UPDATE CASCADE
        ON DELETE SET NULL,

    CONSTRAINT uq_competency_reviews_employee_period
        UNIQUE (employee_id, review_month, review_year),

    CONSTRAINT chk_competency_reviews_month
        CHECK (review_month >= 1 AND review_month <= 12),

    CONSTRAINT chk_competency_reviews_year
        CHECK (review_year >= 2000),

    CONSTRAINT chk_competency_reviews_attendance_score
        CHECK (attendance_score >= 0 AND attendance_score <= 100),

    CONSTRAINT chk_competency_reviews_task_performance_score
        CHECK (task_performance_score >= 0 AND task_performance_score <= 100),

    CONSTRAINT chk_competency_reviews_quality_skill_score
        CHECK (quality_skill_score >= 0 AND quality_skill_score <= 100),

    CONSTRAINT chk_competency_reviews_discipline_score
        CHECK (discipline_responsibility_score >= 0 AND discipline_responsibility_score <= 100),

    CONSTRAINT chk_competency_reviews_total_score
        CHECK (total_score >= 0 AND total_score <= 100),

    CONSTRAINT chk_competency_reviews_status
        CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED')),

    INDEX idx_competency_reviews_employee_id (employee_id),
    INDEX idx_competency_reviews_manager_id (manager_id),
    INDEX idx_competency_reviews_department_id (department_id),
    INDEX idx_competency_reviews_period (review_year, review_month)
);
