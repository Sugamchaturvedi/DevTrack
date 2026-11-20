BEGIN;

CREATE TABLE alembic_version (
    version_num VARCHAR(32) NOT NULL, 
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Running upgrade  -> e4dc2300ade1

CREATE TABLE academic_sessions (
    id SERIAL NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    start_year INTEGER NOT NULL, 
    end_year INTEGER NOT NULL, 
    is_current BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_academic_sessions_id ON academic_sessions (id);

CREATE UNIQUE INDEX ix_academic_sessions_name ON academic_sessions (name);

CREATE TABLE schools (
    id SERIAL NOT NULL, 
    name VARCHAR(150) NOT NULL, 
    code VARCHAR(50) NOT NULL, 
    description TEXT, 
    dean_name VARCHAR(100), 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_schools_code ON schools (code);

CREATE INDEX ix_schools_id ON schools (id);

CREATE TABLE departments (
    id SERIAL NOT NULL, 
    name VARCHAR(150) NOT NULL, 
    code VARCHAR(50) NOT NULL, 
    description TEXT, 
    school_id INTEGER, 
    hod_id INTEGER, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(school_id) REFERENCES schools (id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX ix_departments_code ON departments (code);

CREATE INDEX ix_departments_hod_id ON departments (hod_id);

CREATE INDEX ix_departments_id ON departments (id);

CREATE INDEX ix_departments_school_id ON departments (school_id);

CREATE TABLE university_profiles (
    id SERIAL NOT NULL, 
    name VARCHAR(200) NOT NULL, 
    code VARCHAR(50) NOT NULL, 
    address TEXT, 
    contact_email VARCHAR(255), 
    contact_phone VARCHAR(50), 
    website VARCHAR(255), 
    logo_url VARCHAR(255), 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id)
);

CREATE UNIQUE INDEX ix_university_profiles_code ON university_profiles (code);

CREATE INDEX ix_university_profiles_id ON university_profiles (id);

CREATE TABLE users (
    id SERIAL NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    email VARCHAR(255) NOT NULL, 
    password_hash VARCHAR(255) NOT NULL, 
    role VARCHAR(50) NOT NULL, 
    phone VARCHAR(30), 
    avatar VARCHAR(255), 
    is_active BOOLEAN NOT NULL, 
    department_id INTEGER, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE SET NULL
);

CREATE INDEX ix_users_department_id ON users (department_id);

CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE INDEX ix_users_id ON users (id);

CREATE INDEX ix_users_role ON users (role);

ALTER TABLE departments ADD CONSTRAINT fk_departments_hod_id FOREIGN KEY(hod_id) REFERENCES users (id) ON DELETE SET NULL;

CREATE TABLE activity_logs (
    id SERIAL NOT NULL, 
    user_id INTEGER, 
    entity_type VARCHAR(50) NOT NULL, 
    entity_id INTEGER, 
    action VARCHAR(100) NOT NULL, 
    details TEXT, 
    timestamp TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_activity_logs_entity_id ON activity_logs (entity_id);

CREATE INDEX ix_activity_logs_entity_type ON activity_logs (entity_type);

CREATE INDEX ix_activity_logs_id ON activity_logs (id);

CREATE INDEX ix_activity_logs_timestamp ON activity_logs (timestamp);

CREATE INDEX ix_activity_logs_user_id ON activity_logs (user_id);

CREATE TABLE announcements (
    id SERIAL NOT NULL, 
    title VARCHAR(200) NOT NULL, 
    content TEXT NOT NULL, 
    target_role VARCHAR(50) NOT NULL, 
    department_id INTEGER, 
    created_by_id INTEGER NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE CASCADE, 
    FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE SET NULL
);

CREATE INDEX ix_announcements_department_id ON announcements (department_id);

CREATE INDEX ix_announcements_id ON announcements (id);

CREATE TABLE faculty_profiles (
    id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    employee_id VARCHAR(50) NOT NULL, 
    department_id INTEGER, 
    designation VARCHAR(100) NOT NULL, 
    specialization VARCHAR(200), 
    max_project_load INTEGER NOT NULL, 
    current_project_load INTEGER NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE SET NULL, 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_faculty_profiles_department_id ON faculty_profiles (department_id);

CREATE UNIQUE INDEX ix_faculty_profiles_employee_id ON faculty_profiles (employee_id);

CREATE INDEX ix_faculty_profiles_id ON faculty_profiles (id);

CREATE UNIQUE INDEX ix_faculty_profiles_user_id ON faculty_profiles (user_id);

CREATE TABLE notifications (
    id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    title VARCHAR(200) NOT NULL, 
    message TEXT NOT NULL, 
    notification_type VARCHAR(50) NOT NULL, 
    reference_link VARCHAR(255), 
    is_read BOOLEAN NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_notifications_created_at ON notifications (created_at);

CREATE INDEX ix_notifications_id ON notifications (id);

CREATE INDEX ix_notifications_is_read ON notifications (is_read);

CREATE INDEX ix_notifications_user_id ON notifications (user_id);

CREATE TABLE programs (
    id SERIAL NOT NULL, 
    name VARCHAR(150) NOT NULL, 
    code VARCHAR(50) NOT NULL, 
    degree_type VARCHAR(50) NOT NULL, 
    duration_years INTEGER NOT NULL, 
    department_id INTEGER NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX ix_programs_code ON programs (code);

CREATE INDEX ix_programs_department_id ON programs (department_id);

CREATE INDEX ix_programs_id ON programs (id);

CREATE TABLE projects (
    id SERIAL NOT NULL, 
    name VARCHAR(150) NOT NULL, 
    code VARCHAR(50), 
    description TEXT, 
    objectives TEXT, 
    scope TEXT, 
    category VARCHAR(50) NOT NULL, 
    tech_stack VARCHAR(255), 
    start_date TIMESTAMP WITHOUT TIME ZONE, 
    deadline TIMESTAMP WITHOUT TIME ZONE, 
    priority VARCHAR(50) NOT NULL, 
    status VARCHAR(50) NOT NULL, 
    owner_id INTEGER NOT NULL, 
    department_id INTEGER, 
    faculty_mentor_id INTEGER, 
    project_manager_id INTEGER, 
    completion_percentage INTEGER NOT NULL, 
    repo_url VARCHAR(255), 
    live_demo_url VARCHAR(255), 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE SET NULL, 
    FOREIGN KEY(faculty_mentor_id) REFERENCES users (id) ON DELETE SET NULL, 
    FOREIGN KEY(owner_id) REFERENCES users (id) ON DELETE CASCADE, 
    FOREIGN KEY(project_manager_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX ix_projects_category ON projects (category);

CREATE UNIQUE INDEX ix_projects_code ON projects (code);

CREATE INDEX ix_projects_department_id ON projects (department_id);

CREATE INDEX ix_projects_faculty_mentor_id ON projects (faculty_mentor_id);

CREATE INDEX ix_projects_id ON projects (id);

CREATE INDEX ix_projects_name ON projects (name);

CREATE INDEX ix_projects_owner_id ON projects (owner_id);

CREATE INDEX ix_projects_priority ON projects (priority);

CREATE INDEX ix_projects_project_manager_id ON projects (project_manager_id);

CREATE INDEX ix_projects_status ON projects (status);

CREATE TABLE discussions (
    id SERIAL NOT NULL, 
    project_id INTEGER NOT NULL, 
    user_id INTEGER NOT NULL, 
    title VARCHAR(200) NOT NULL, 
    content TEXT NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE, 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_discussions_id ON discussions (id);

CREATE INDEX ix_discussions_project_id ON discussions (project_id);

CREATE INDEX ix_discussions_user_id ON discussions (user_id);

CREATE TABLE meetings (
    id SERIAL NOT NULL, 
    project_id INTEGER NOT NULL, 
    title VARCHAR(200) NOT NULL, 
    description TEXT, 
    meeting_link VARCHAR(255), 
    scheduled_time TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    duration_minutes INTEGER NOT NULL, 
    notes TEXT, 
    created_by_id INTEGER NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(created_by_id) REFERENCES users (id) ON DELETE CASCADE, 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE INDEX ix_meetings_id ON meetings (id);

CREATE INDEX ix_meetings_project_id ON meetings (project_id);

CREATE TABLE project_members (
    id SERIAL NOT NULL, 
    project_id INTEGER NOT NULL, 
    user_id INTEGER NOT NULL, 
    role_in_project VARCHAR(50) NOT NULL, 
    joined_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE, 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_project_members_id ON project_members (id);

CREATE INDEX ix_project_members_project_id ON project_members (project_id);

CREATE INDEX ix_project_members_user_id ON project_members (user_id);

CREATE TABLE project_milestones (
    id SERIAL NOT NULL, 
    project_id INTEGER NOT NULL, 
    title VARCHAR(200) NOT NULL, 
    description TEXT, 
    due_date TIMESTAMP WITHOUT TIME ZONE, 
    status VARCHAR(50) NOT NULL, 
    completion_date TIMESTAMP WITHOUT TIME ZONE, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE INDEX ix_project_milestones_id ON project_milestones (id);

CREATE INDEX ix_project_milestones_project_id ON project_milestones (project_id);

CREATE TABLE project_teams (
    id SERIAL NOT NULL, 
    project_id INTEGER NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    leader_id INTEGER, 
    description TEXT, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(leader_id) REFERENCES users (id) ON DELETE SET NULL, 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE INDEX ix_project_teams_id ON project_teams (id);

CREATE INDEX ix_project_teams_leader_id ON project_teams (leader_id);

CREATE INDEX ix_project_teams_project_id ON project_teams (project_id);

CREATE TABLE semesters (
    id SERIAL NOT NULL, 
    program_id INTEGER NOT NULL, 
    academic_session_id INTEGER NOT NULL, 
    semester_number INTEGER NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(academic_session_id) REFERENCES academic_sessions (id) ON DELETE CASCADE, 
    FOREIGN KEY(program_id) REFERENCES programs (id) ON DELETE CASCADE
);

CREATE INDEX ix_semesters_academic_session_id ON semesters (academic_session_id);

CREATE INDEX ix_semesters_id ON semesters (id);

CREATE INDEX ix_semesters_program_id ON semesters (program_id);

CREATE TABLE sprints (
    id SERIAL NOT NULL, 
    project_id INTEGER NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    goal TEXT, 
    start_date TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    end_date TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    status VARCHAR(50) NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE INDEX ix_sprints_id ON sprints (id);

CREATE INDEX ix_sprints_project_id ON sprints (project_id);

CREATE TABLE discussion_replies (
    id SERIAL NOT NULL, 
    discussion_id INTEGER NOT NULL, 
    user_id INTEGER NOT NULL, 
    content TEXT NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(discussion_id) REFERENCES discussions (id) ON DELETE CASCADE, 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_discussion_replies_discussion_id ON discussion_replies (discussion_id);

CREATE INDEX ix_discussion_replies_id ON discussion_replies (id);

CREATE INDEX ix_discussion_replies_user_id ON discussion_replies (user_id);

CREATE TABLE sections (
    id SERIAL NOT NULL, 
    semester_id INTEGER NOT NULL, 
    name VARCHAR(50) NOT NULL, 
    batch_year INTEGER NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(semester_id) REFERENCES semesters (id) ON DELETE CASCADE
);

CREATE INDEX ix_sections_id ON sections (id);

CREATE INDEX ix_sections_semester_id ON sections (semester_id);

CREATE TABLE tasks (
    id SERIAL NOT NULL, 
    title VARCHAR(200) NOT NULL, 
    description TEXT, 
    status VARCHAR(50) NOT NULL, 
    priority VARCHAR(50) NOT NULL, 
    project_id INTEGER NOT NULL, 
    assigned_to_id INTEGER, 
    assigned_by_id INTEGER, 
    team_id INTEGER, 
    sprint_id INTEGER, 
    parent_task_id INTEGER, 
    start_date TIMESTAMP WITHOUT TIME ZONE, 
    due_date TIMESTAMP WITHOUT TIME ZONE, 
    estimated_hours FLOAT NOT NULL, 
    actual_hours FLOAT NOT NULL, 
    progress_percentage INTEGER NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(assigned_by_id) REFERENCES users (id) ON DELETE SET NULL, 
    FOREIGN KEY(assigned_to_id) REFERENCES users (id) ON DELETE SET NULL, 
    FOREIGN KEY(parent_task_id) REFERENCES tasks (id) ON DELETE CASCADE, 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE, 
    FOREIGN KEY(sprint_id) REFERENCES sprints (id) ON DELETE SET NULL, 
    FOREIGN KEY(team_id) REFERENCES project_teams (id) ON DELETE SET NULL
);

CREATE INDEX ix_tasks_assigned_by_id ON tasks (assigned_by_id);

CREATE INDEX ix_tasks_assigned_to_id ON tasks (assigned_to_id);

CREATE INDEX ix_tasks_due_date ON tasks (due_date);

CREATE INDEX ix_tasks_id ON tasks (id);

CREATE INDEX ix_tasks_parent_task_id ON tasks (parent_task_id);

CREATE INDEX ix_tasks_priority ON tasks (priority);

CREATE INDEX ix_tasks_project_id ON tasks (project_id);

CREATE INDEX ix_tasks_sprint_id ON tasks (sprint_id);

CREATE INDEX ix_tasks_status ON tasks (status);

CREATE INDEX ix_tasks_team_id ON tasks (team_id);

CREATE INDEX ix_tasks_title ON tasks (title);

CREATE TABLE team_members (
    id SERIAL NOT NULL, 
    team_id INTEGER NOT NULL, 
    user_id INTEGER NOT NULL, 
    role_in_team VARCHAR(50) NOT NULL, 
    joined_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(team_id) REFERENCES project_teams (id) ON DELETE CASCADE, 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_team_members_id ON team_members (id);

CREATE INDEX ix_team_members_team_id ON team_members (team_id);

CREATE INDEX ix_team_members_user_id ON team_members (user_id);

CREATE TABLE user_stories (
    id SERIAL NOT NULL, 
    project_id INTEGER NOT NULL, 
    sprint_id INTEGER, 
    title VARCHAR(200) NOT NULL, 
    description TEXT, 
    acceptance_criteria TEXT, 
    story_points INTEGER NOT NULL, 
    priority VARCHAR(50) NOT NULL, 
    status VARCHAR(50) NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE, 
    FOREIGN KEY(sprint_id) REFERENCES sprints (id) ON DELETE SET NULL
);

CREATE INDEX ix_user_stories_id ON user_stories (id);

CREATE INDEX ix_user_stories_project_id ON user_stories (project_id);

CREATE INDEX ix_user_stories_sprint_id ON user_stories (sprint_id);

CREATE TABLE student_profiles (
    id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    enrollment_number VARCHAR(50) NOT NULL, 
    program_id INTEGER, 
    department_id INTEGER, 
    semester_id INTEGER, 
    section_id INTEGER, 
    batch_year INTEGER, 
    cgpa FLOAT NOT NULL, 
    academic_status VARCHAR(50) NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(department_id) REFERENCES departments (id) ON DELETE SET NULL, 
    FOREIGN KEY(program_id) REFERENCES programs (id) ON DELETE SET NULL, 
    FOREIGN KEY(section_id) REFERENCES sections (id) ON DELETE SET NULL, 
    FOREIGN KEY(semester_id) REFERENCES semesters (id) ON DELETE SET NULL, 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_student_profiles_department_id ON student_profiles (department_id);

CREATE UNIQUE INDEX ix_student_profiles_enrollment_number ON student_profiles (enrollment_number);

CREATE INDEX ix_student_profiles_id ON student_profiles (id);

CREATE INDEX ix_student_profiles_program_id ON student_profiles (program_id);

CREATE INDEX ix_student_profiles_section_id ON student_profiles (section_id);

CREATE INDEX ix_student_profiles_semester_id ON student_profiles (semester_id);

CREATE UNIQUE INDEX ix_student_profiles_user_id ON student_profiles (user_id);

CREATE TABLE task_comments (
    id SERIAL NOT NULL, 
    task_id INTEGER NOT NULL, 
    user_id INTEGER NOT NULL, 
    content TEXT NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(task_id) REFERENCES tasks (id) ON DELETE CASCADE, 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_task_comments_id ON task_comments (id);

CREATE INDEX ix_task_comments_task_id ON task_comments (task_id);

CREATE INDEX ix_task_comments_user_id ON task_comments (user_id);

CREATE TABLE task_dependencies (
    id SERIAL NOT NULL, 
    task_id INTEGER NOT NULL, 
    depends_on_task_id INTEGER NOT NULL, 
    dependency_type VARCHAR(50) NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(depends_on_task_id) REFERENCES tasks (id) ON DELETE CASCADE, 
    FOREIGN KEY(task_id) REFERENCES tasks (id) ON DELETE CASCADE
);

CREATE INDEX ix_task_dependencies_depends_on_task_id ON task_dependencies (depends_on_task_id);

CREATE INDEX ix_task_dependencies_id ON task_dependencies (id);

CREATE INDEX ix_task_dependencies_task_id ON task_dependencies (task_id);

CREATE TABLE project_submissions (
    id SERIAL NOT NULL, 
    project_id INTEGER NOT NULL, 
    student_id INTEGER NOT NULL, 
    submission_type VARCHAR(50) NOT NULL, 
    title VARCHAR(200) NOT NULL, 
    description TEXT, 
    file_path VARCHAR(255), 
    repo_url VARCHAR(255), 
    status VARCHAR(50) NOT NULL, 
    submitted_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE, 
    FOREIGN KEY(student_id) REFERENCES student_profiles (id) ON DELETE CASCADE
);

CREATE INDEX ix_project_submissions_id ON project_submissions (id);

CREATE INDEX ix_project_submissions_project_id ON project_submissions (project_id);

CREATE INDEX ix_project_submissions_student_id ON project_submissions (student_id);

CREATE TABLE project_evaluations (
    id SERIAL NOT NULL, 
    submission_id INTEGER NOT NULL, 
    reviewer_id INTEGER NOT NULL, 
    marks_obtained FLOAT NOT NULL, 
    max_marks FLOAT NOT NULL, 
    grade VARCHAR(10) NOT NULL, 
    feedback TEXT, 
    evaluation_criteria_json TEXT, 
    evaluated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(reviewer_id) REFERENCES users (id) ON DELETE CASCADE, 
    FOREIGN KEY(submission_id) REFERENCES project_submissions (id) ON DELETE CASCADE
);

CREATE INDEX ix_project_evaluations_id ON project_evaluations (id);

CREATE INDEX ix_project_evaluations_reviewer_id ON project_evaluations (reviewer_id);

CREATE INDEX ix_project_evaluations_submission_id ON project_evaluations (submission_id);

INSERT INTO alembic_version (version_num) VALUES ('e4dc2300ade1') RETURNING alembic_version.version_num;

-- Running upgrade e4dc2300ade1 -> f8b91a2c3d4e

ALTER TABLE tasks ADD COLUMN issue_key VARCHAR(50);

ALTER TABLE tasks ADD COLUMN issue_type VARCHAR(50) DEFAULT 'task' NOT NULL;

ALTER TABLE tasks ADD COLUMN epic_id INTEGER;

ALTER TABLE tasks ADD COLUMN reporter_id INTEGER;

ALTER TABLE tasks ADD COLUMN story_points INTEGER DEFAULT '0' NOT NULL;

ALTER TABLE tasks ADD COLUMN labels VARCHAR(255);

ALTER TABLE tasks ADD COLUMN order_rank FLOAT DEFAULT '0.0' NOT NULL;

CREATE UNIQUE INDEX ix_tasks_issue_key ON tasks (issue_key);

CREATE INDEX ix_tasks_issue_type ON tasks (issue_type);

CREATE INDEX ix_tasks_epic_id ON tasks (epic_id);

CREATE INDEX ix_tasks_reporter_id ON tasks (reporter_id);

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_epic_id FOREIGN KEY(epic_id) REFERENCES tasks (id) ON DELETE SET NULL;

ALTER TABLE tasks ADD CONSTRAINT fk_tasks_reporter_id FOREIGN KEY(reporter_id) REFERENCES users (id) ON DELETE SET NULL;

UPDATE tasks SET issue_key = 'DEV-' || (1000 + id) WHERE issue_key IS NULL;

CREATE TABLE work_logs (
    id SERIAL NOT NULL, 
    task_id INTEGER NOT NULL, 
    user_id INTEGER NOT NULL, 
    hours_spent FLOAT NOT NULL, 
    description TEXT, 
    logged_date TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(task_id) REFERENCES tasks (id) ON DELETE CASCADE, 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_work_logs_id ON work_logs (id);

CREATE INDEX ix_work_logs_task_id ON work_logs (task_id);

CREATE INDEX ix_work_logs_user_id ON work_logs (user_id);

CREATE INDEX ix_work_logs_logged_date ON work_logs (logged_date);

CREATE TABLE project_workflows (
    id SERIAL NOT NULL, 
    project_id INTEGER, 
    name VARCHAR(100) NOT NULL, 
    description TEXT, 
    project_type VARCHAR(50) DEFAULT 'standard' NOT NULL, 
    is_default BOOLEAN DEFAULT 'false' NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE INDEX ix_project_workflows_id ON project_workflows (id);

CREATE INDEX ix_project_workflows_project_id ON project_workflows (project_id);

CREATE TABLE workflow_statuses (
    id SERIAL NOT NULL, 
    workflow_id INTEGER NOT NULL, 
    code VARCHAR(50) NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    category VARCHAR(50) DEFAULT 'in_progress' NOT NULL, 
    color VARCHAR(20) DEFAULT '#3b82f6' NOT NULL, 
    order_index INTEGER DEFAULT '0' NOT NULL, 
    wip_limit INTEGER DEFAULT '0' NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(workflow_id) REFERENCES project_workflows (id) ON DELETE CASCADE
);

CREATE INDEX ix_workflow_statuses_id ON workflow_statuses (id);

CREATE INDEX ix_workflow_statuses_workflow_id ON workflow_statuses (workflow_id);

CREATE TABLE workflow_transitions (
    id SERIAL NOT NULL, 
    workflow_id INTEGER NOT NULL, 
    from_status_code VARCHAR(50) NOT NULL, 
    to_status_code VARCHAR(50) NOT NULL, 
    name VARCHAR(100), 
    required_role VARCHAR(50), 
    PRIMARY KEY (id), 
    FOREIGN KEY(workflow_id) REFERENCES project_workflows (id) ON DELETE CASCADE
);

CREATE INDEX ix_workflow_transitions_id ON workflow_transitions (id);

CREATE INDEX ix_workflow_transitions_workflow_id ON workflow_transitions (workflow_id);

CREATE TABLE automation_rules (
    id SERIAL NOT NULL, 
    project_id INTEGER, 
    name VARCHAR(150) NOT NULL, 
    trigger_event VARCHAR(100) NOT NULL, 
    conditions_json TEXT, 
    actions_json TEXT NOT NULL, 
    is_active BOOLEAN DEFAULT 'true' NOT NULL, 
    execution_count INTEGER DEFAULT '0' NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE INDEX ix_automation_rules_id ON automation_rules (id);

CREATE INDEX ix_automation_rules_project_id ON automation_rules (project_id);

CREATE TABLE automation_logs (
    id SERIAL NOT NULL, 
    rule_id INTEGER NOT NULL, 
    trigger_event VARCHAR(100) NOT NULL, 
    entity_type VARCHAR(50) NOT NULL, 
    entity_id INTEGER, 
    status VARCHAR(50) DEFAULT 'success' NOT NULL, 
    details TEXT, 
    executed_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(rule_id) REFERENCES automation_rules (id) ON DELETE CASCADE
);

CREATE INDEX ix_automation_logs_id ON automation_logs (id);

CREATE INDEX ix_automation_logs_rule_id ON automation_logs (rule_id);

CREATE INDEX ix_automation_logs_executed_at ON automation_logs (executed_at);

CREATE TABLE project_risks (
    id SERIAL NOT NULL, 
    project_id INTEGER NOT NULL, 
    title VARCHAR(200) NOT NULL, 
    description TEXT, 
    category VARCHAR(50) DEFAULT 'Technical' NOT NULL, 
    probability VARCHAR(50) DEFAULT 'Medium' NOT NULL, 
    impact VARCHAR(50) DEFAULT 'Medium' NOT NULL, 
    severity VARCHAR(50) DEFAULT 'Medium' NOT NULL, 
    owner_id INTEGER, 
    mitigation_plan TEXT, 
    status VARCHAR(50) DEFAULT 'identified' NOT NULL, 
    review_date TIMESTAMP WITHOUT TIME ZONE, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(owner_id) REFERENCES users (id) ON DELETE SET NULL, 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE INDEX ix_project_risks_id ON project_risks (id);

CREATE INDEX ix_project_risks_project_id ON project_risks (project_id);

CREATE TABLE wiki_pages (
    id SERIAL NOT NULL, 
    project_id INTEGER NOT NULL, 
    title VARCHAR(200) NOT NULL, 
    slug VARCHAR(200) NOT NULL, 
    category VARCHAR(100) DEFAULT 'General' NOT NULL, 
    content TEXT NOT NULL, 
    version INTEGER DEFAULT '1' NOT NULL, 
    author_id INTEGER, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(author_id) REFERENCES users (id) ON DELETE SET NULL, 
    FOREIGN KEY(project_id) REFERENCES projects (id) ON DELETE CASCADE
);

CREATE INDEX ix_wiki_pages_id ON wiki_pages (id);

CREATE INDEX ix_wiki_pages_project_id ON wiki_pages (project_id);

CREATE INDEX ix_wiki_pages_slug ON wiki_pages (slug);

CREATE TABLE saved_filters (
    id SERIAL NOT NULL, 
    user_id INTEGER NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    filter_criteria TEXT NOT NULL, 
    is_favorite BOOLEAN DEFAULT 'false' NOT NULL, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id), 
    FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX ix_saved_filters_id ON saved_filters (id);

CREATE INDEX ix_saved_filters_user_id ON saved_filters (user_id);

CREATE TABLE project_templates (
    id SERIAL NOT NULL, 
    name VARCHAR(100) NOT NULL, 
    category VARCHAR(50) DEFAULT 'Software' NOT NULL, 
    description TEXT, 
    default_structure_json TEXT, 
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL, 
    PRIMARY KEY (id)
);

CREATE INDEX ix_project_templates_id ON project_templates (id);

UPDATE alembic_version SET version_num='f8b91a2c3d4e' WHERE alembic_version.version_num = 'e4dc2300ade1';

COMMIT;

