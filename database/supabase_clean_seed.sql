SET session_replication_role = replica;
--
-- PostgreSQL database dump
--


-- Dumped from database version 18.6
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: academic_sessions; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.academic_sessions VALUES (1, '2026-2027', 2026, 2027, true, '2026-11-18 16:11:46.575646');
INSERT INTO public.academic_sessions VALUES (2, '2025-2026', 2025, 2026, false, '2026-11-18 16:11:46.579403');


--
-- Data for Name: schools; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.schools VALUES (1, 'School of Computing and Information Sciences', 'SCIS', 'Center of excellence in computer science and software systems', 'Dr. Rajeshwar Rao', '2026-11-18 16:11:46.554448');
INSERT INTO public.schools VALUES (2, 'School of Engineering and Technology', 'SET', 'Advanced research in engineering disciplines', 'Dr. Ananya Mukherjee', '2026-11-18 16:11:46.563214');
INSERT INTO public.schools VALUES (3, 'School of Management & Enterprise Studies', 'SMES', 'Management and innovation studies', 'Dr. Vikram Seth', '2026-11-18 16:11:46.565571');
INSERT INTO public.schools VALUES (4, 'School of Computing & Information Technology', 'SCIT', 'School of Computing', NULL, '2026-11-18 19:58:54.538549');
INSERT INTO public.schools VALUES (5, 'School of Engineering & Applied Sciences', 'SEAS', 'School of Engineering', NULL, '2026-11-18 19:58:54.538549');
INSERT INTO public.schools VALUES (6, 'School of Management & Business Studies', 'SMBS', 'School of Management', NULL, '2026-11-18 19:58:54.538549');


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.departments VALUES (2, 'Artificial Intelligence & Data Science', 'AIDS', 'Deep learning, NLP, and intelligent data systems', 1, NULL, '2026-11-18 16:11:46.593934');
INSERT INTO public.departments VALUES (3, 'Information Technology', 'IT', 'Enterprise networking, web engineering, and cloud systems', 1, NULL, '2026-11-18 16:11:46.59618');
INSERT INTO public.departments VALUES (4, 'Electronics & Communication', 'ECE', 'Embedded systems, IoT, and signal processing', 2, NULL, '2026-11-18 16:11:46.598823');
INSERT INTO public.departments VALUES (1, 'Computer Science & Engineering', 'CSE', 'Core computing, systems, and algorithms', 1, 9, '2026-11-18 16:11:46.588728');
INSERT INTO public.departments VALUES (5, 'Mechanical Engineering', 'MECH', NULL, 5, NULL, '2026-11-18 19:58:54.538549');
INSERT INTO public.departments VALUES (6, 'Management Studies', 'MBA-DEPT', NULL, 6, NULL, '2026-11-18 19:58:54.538549');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.users VALUES (1, 'Test User', 'testuser@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'student', NULL, NULL, true, NULL, '2026-11-18 16:10:56.748917', '2026-11-18 20:30:11.231729');
INSERT INTO public.users VALUES (2, 'Duplicate User', 'duplicate@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'student', NULL, NULL, true, NULL, '2026-11-18 16:10:56.751377', '2026-11-18 20:30:11.231733');
INSERT INTO public.users VALUES (3, 'Login User', 'login@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'student', NULL, NULL, true, NULL, '2026-11-18 16:10:56.751633', '2026-11-18 20:30:11.231734');
INSERT INTO public.users VALUES (4, 'Invalid Password User', 'invalid@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'student', NULL, NULL, true, NULL, '2026-11-18 16:10:56.751826', '2026-11-18 20:30:11.231734');
INSERT INTO public.users VALUES (5, 'Project Owner', 'projectowner@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'faculty', NULL, NULL, true, NULL, '2026-11-18 16:10:56.751999', '2026-11-18 20:30:11.231735');
INSERT INTO public.users VALUES (6, 'Task Owner', 'taskowner@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'faculty', NULL, NULL, true, NULL, '2026-11-18 16:10:56.752171', '2026-11-18 20:30:11.231735');
INSERT INTO public.users VALUES (7, 'System Super Administrator', 'superadmin@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'super_admin', '+91-9876543210', NULL, true, NULL, '2026-11-18 16:11:46.895241', '2026-11-18 20:30:11.231736');
INSERT INTO public.users VALUES (8, 'University Dean Admin', 'admin@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'super_admin', '+91-9876543211', NULL, true, 1, '2026-11-18 16:11:46.900153', '2026-11-18 20:30:11.231736');
INSERT INTO public.users VALUES (9, 'Prof. Alok Verma (HOD CSE)', 'hod.cse@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'hod', '+91-9876543212', NULL, true, 1, '2026-11-18 16:11:46.90267', '2026-11-18 20:30:11.231736');
INSERT INTO public.users VALUES (10, 'Dr. Meera Sharma', 'dr.sharma@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'faculty', '+91-9876543213', NULL, true, 1, '2026-11-18 16:11:46.908409', '2026-11-18 20:30:11.231737');
INSERT INTO public.users VALUES (11, 'Dr. Kunal Patel', 'dr.patel@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'faculty', '+91-9876543214', NULL, true, 2, '2026-11-18 16:11:46.911694', '2026-11-18 20:30:11.231737');
INSERT INTO public.users VALUES (12, 'Rohan Gupta (Project Manager)', 'pm.gupta@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'project_manager', '+91-9876543215', NULL, true, 1, '2026-11-18 16:11:46.914388', '2026-11-18 20:30:11.231738');
INSERT INTO public.users VALUES (13, 'Vikram Aditya (Team Lead)', 'leader.vikram@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'team_leader', '+91-9876543216', NULL, true, 1, '2026-11-18 16:11:46.916873', '2026-11-18 20:30:11.231738');
INSERT INTO public.users VALUES (14, 'Aarav Mehta (Student)', 'student.aarav@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'student', '+91-9876543217', NULL, true, 1, '2026-11-18 16:11:46.919385', '2026-11-18 20:30:11.231738');
INSERT INTO public.users VALUES (15, 'Priya Nair (Student)', 'student.priya@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'student', '+91-9876543218', NULL, true, 1, '2026-11-18 16:11:46.923971', '2026-11-18 20:30:11.231739');
INSERT INTO public.users VALUES (16, 'Dr. Sunita Das (Reviewer)', 'reviewer.das@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'reviewer', '+91-9876543219', NULL, true, 1, '2026-11-18 16:11:46.926608', '2026-11-18 20:30:11.231739');
INSERT INTO public.users VALUES (17, 'Dr. Vikram Sharma', 'univ.admin@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'university_admin', NULL, NULL, true, 1, '2026-11-18 19:58:54.538549', '2026-11-18 20:30:11.231739');
INSERT INTO public.users VALUES (18, 'Dr. Rajesh Mehta', 'faculty.mehta@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'faculty', NULL, NULL, true, 1, '2026-11-18 19:58:54.538549', '2026-11-18 20:30:11.23174');
INSERT INTO public.users VALUES (19, 'Prof. Sunita Rao', 'reviewer.prof@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'reviewer', NULL, NULL, true, 1, '2026-11-18 19:58:54.538549', '2026-11-18 20:30:11.23174');
INSERT INTO public.users VALUES (20, 'Kavita Nair', 'pm.kavita@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'project_manager', NULL, NULL, true, 1, '2026-11-18 19:58:54.538549', '2026-11-18 20:30:11.23174');
INSERT INTO public.users VALUES (21, 'Rahul Verma', 'lead.rahul@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'team_leader', NULL, NULL, true, 1, '2026-11-18 19:58:54.538549', '2026-11-18 20:30:11.231741');
INSERT INTO public.users VALUES (22, 'Amit Patel', 'student.amit@devtrack.edu', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'student', NULL, NULL, true, 1, '2026-11-18 19:58:54.538549', '2026-11-18 20:30:11.231741');
INSERT INTO public.users VALUES (23, 'Auth Test User', 'user_207965.2816197@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'student', NULL, NULL, true, NULL, '2026-11-18 20:11:37.66906', '2026-11-18 20:30:11.231742');
INSERT INTO public.users VALUES (24, 'Duplicate User', 'dup_207965.838623@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'student', NULL, NULL, true, NULL, '2026-11-18 20:11:38.041218', '2026-11-18 20:30:11.231742');
INSERT INTO public.users VALUES (25, 'Login User', 'login_207966.2095352@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'student', NULL, NULL, true, NULL, '2026-11-18 20:11:38.436307', '2026-11-18 20:30:11.231742');
INSERT INTO public.users VALUES (26, 'Invalid User', 'invalid_207966.9959214@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'student', NULL, NULL, true, NULL, '2026-11-18 20:11:39.222361', '2026-11-18 20:30:11.231743');
INSERT INTO public.users VALUES (27, 'Project User', 'proj_user_207972.1862218@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'faculty', NULL, NULL, true, NULL, '2026-11-18 20:11:44.431573', '2026-11-18 20:30:11.231743');
INSERT INTO public.users VALUES (28, 'Project User', 'proj_user_207973.0239718@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'faculty', NULL, NULL, true, NULL, '2026-11-18 20:11:45.289306', '2026-11-18 20:30:11.231743');
INSERT INTO public.users VALUES (29, 'Project User', 'proj_user_207973.8708388@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'faculty', NULL, NULL, true, NULL, '2026-11-18 20:11:46.09177', '2026-11-18 20:30:11.231744');
INSERT INTO public.users VALUES (30, 'Task Test Owner', 'task_owner_207974.6478175@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'faculty', NULL, NULL, true, NULL, '2026-11-18 20:11:46.853109', '2026-11-18 20:30:11.231744');
INSERT INTO public.users VALUES (31, 'Task Test Owner', 'task_owner_207975.3980672@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'faculty', NULL, NULL, true, NULL, '2026-11-18 20:11:47.616648', '2026-11-18 20:30:11.231744');
INSERT INTO public.users VALUES (32, 'Task Test Owner', 'task_owner_207976.1821668@example.com', '$2b$12$xi/GROet4GY.foqaXW2XIOKraC/kOyfZfGRomnZmMh66qkqTkj7zy', 'faculty', NULL, NULL, true, NULL, '2026-11-18 20:11:48.395033', '2026-11-18 20:30:11.231745');


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.activity_logs VALUES (1, 8, 'submission', 2, 'submitted', 'Submitted deliverable ''Initial Architecture Blueprint & DB Schema'' for project ''Cloud-Native University Management Core''', '2026-11-18 20:11:40.351877');
INSERT INTO public.activity_logs VALUES (2, 8, 'evaluation', 2, 'evaluated', 'Evaluated submission ''Initial Architecture Blueprint & DB Schema'' with Grade A+', '2026-11-18 20:11:40.403994');


--
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.alembic_version VALUES ('f8b91a2c3d4e');


--
-- Data for Name: announcements; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.announcements VALUES (1, 'Final Year Capstone Project Defense Schedule (Spring 2026)', 'All student teams must submit their final repository links and documentation reports by the announced deadline. External defense will commence next month.', 'all', 1, 9, '2026-11-18 16:11:47.061249');
INSERT INTO public.announcements VALUES (2, 'Mid-Term Review & Evaluation Window Open', 'Faculty evaluators can now review submitted sprint milestones and assign rubric scores.', 'faculty', 1, 9, '2026-11-18 16:11:47.061253');


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.projects VALUES (2, 'Test Project', 'PRJ-0002', 'Testing project', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-10-19 16:11:46.981826', '2027-01-17 16:11:46.981826', 'medium', 'active', 1, 2, 10, 12, 65, 'https://github.com/DevTrack-University/project-2', NULL, '2026-11-18 16:10:56.763959', '2026-11-18 16:11:46.986109');
INSERT INTO public.projects VALUES (4, 'Task Project', 'PRJ-0004', 'Project for task testing', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-10-19 16:11:46.981826', '2027-01-17 16:11:46.981826', 'high', 'active', 1, 2, 10, 12, 65, 'https://github.com/DevTrack-University/project-4', NULL, '2026-11-18 16:10:56.764535', '2026-11-18 16:11:46.98742');
INSERT INTO public.projects VALUES (5, 'DevTrack Project', 'PRJ-0005', 'Project management application', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-10-19 16:11:46.981826', '2027-01-17 16:11:46.981826', 'medium', 'active', 1, 1, 10, 12, 65, 'https://github.com/DevTrack-University/project-5', NULL, '2026-11-18 16:10:56.764777', '2026-11-18 16:11:46.988035');
INSERT INTO public.projects VALUES (6, 'Test Project', 'PRJ-0006', 'Testing project', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-10-19 16:11:46.981826', '2027-01-17 16:11:46.981826', 'medium', 'active', 1, 2, 10, 12, 65, 'https://github.com/DevTrack-University/project-6', NULL, '2026-11-18 16:10:56.765007', '2026-11-18 16:11:46.988038');
INSERT INTO public.projects VALUES (7, 'Task Project', 'PRJ-0007', 'Project for task testing', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-10-19 16:11:46.981826', '2027-01-17 16:11:46.981826', 'high', 'completed', 1, 1, 10, 12, 100, 'https://github.com/DevTrack-University/project-7', NULL, '2026-11-18 16:10:56.765236', '2026-11-18 16:11:46.989403');
INSERT INTO public.projects VALUES (8, 'Task Project', 'PRJ-0008', 'Project for task testing', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-10-19 16:11:46.981826', '2027-01-17 16:11:46.981826', 'medium', 'completed', 1, 2, 10, 12, 100, 'https://github.com/DevTrack-University/project-8', NULL, '2026-11-18 16:10:56.765432', '2026-11-18 16:11:46.990072');
INSERT INTO public.projects VALUES (9, 'Cloud-Native University Management Core', 'PRJ-0009', 'Enterprise project management test suite verification', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-11-18 20:11:40.145107', NULL, 'high', 'active', 8, NULL, NULL, NULL, 0, NULL, NULL, '2026-11-18 20:11:40.146715', '2026-11-18 20:11:40.146719');
INSERT INTO public.projects VALUES (10, 'DevTrack Test Project', 'PRJ-0010', 'Testing project creation API', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-11-18 20:11:44.847639', NULL, 'high', 'active', 27, NULL, NULL, NULL, 0, NULL, NULL, '2026-11-18 20:11:44.84832', '2026-11-18 20:11:44.848323');
INSERT INTO public.projects VALUES (11, 'Listed Project', 'PRJ-0011', 'Description', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-11-18 20:11:45.675634', NULL, 'medium', 'active', 28, NULL, NULL, NULL, 0, NULL, NULL, '2026-11-18 20:11:45.676221', '2026-11-18 20:11:45.676224');
INSERT INTO public.projects VALUES (12, 'Specific Project', 'PRJ-0012', 'Specific Description', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-11-18 20:11:46.463389', NULL, 'medium', 'active', 29, NULL, NULL, NULL, 0, NULL, NULL, '2026-11-18 20:11:46.464243', '2026-11-18 20:11:46.464247');
INSERT INTO public.projects VALUES (13, 'Task Test Project', 'PRJ-0013', 'Project for task tests', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-11-18 20:11:47.216393', NULL, 'medium', 'active', 30, NULL, NULL, NULL, 0, NULL, NULL, '2026-11-18 20:11:47.217163', '2026-11-18 20:11:47.217166');
INSERT INTO public.projects VALUES (14, 'Task Test Project', 'PRJ-0014', 'Project for task tests', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-11-18 20:11:47.985579', NULL, 'medium', 'active', 31, NULL, NULL, NULL, 0, NULL, NULL, '2026-11-18 20:11:47.986313', '2026-11-18 20:11:47.986318');
INSERT INTO public.projects VALUES (15, 'Task Test Project', 'PRJ-0015', 'Project for task tests', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-11-18 20:11:48.762781', NULL, 'medium', 'active', 32, NULL, NULL, NULL, 0, NULL, NULL, '2026-11-18 20:11:48.763396', '2026-11-18 20:11:48.763398');
INSERT INTO public.projects VALUES (1, 'DevTrack Project', 'PRJ-0001', 'Project management application', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-10-19 16:11:46.981826', '2027-01-17 16:11:46.981826', 'high', 'active', 1, 1, 16, 12, 65, 'https://github.com/DevTrack-University/project-1', NULL, '2026-11-18 16:10:56.76164', '2026-11-18 20:27:10.90759');
INSERT INTO public.projects VALUES (3, 'Task Project', 'PRJ-0003', 'Project for task testing', NULL, NULL, 'Capstone', 'React, Python, FastAPI, PostgreSQL', '2026-10-19 16:11:46.981826', '2027-01-17 16:11:46.981826', 'medium', 'active', 1, 1, 16, 12, 65, 'https://github.com/DevTrack-University/project-3', NULL, '2026-11-18 16:10:56.76428', '2026-11-18 20:27:10.907597');


--
-- Data for Name: automation_rules; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.automation_rules VALUES (1, NULL, 'Notify Supervisor when Task is Blocked', 'status_changed', '{"target_status": "blocked"}', '{"notify_roles": ["mentor", "project_manager"], "message": "Task has been marked as Blocked! Immediate assistance may be required."}', true, 0, '2026-11-18 20:07:01.431948');
INSERT INTO public.automation_rules VALUES (2, NULL, 'Auto-Update Project Progress on Issue Done', 'status_changed', '{"target_status": "done"}', '{"recalculate_project_progress": true, "log_activity": true}', true, 0, '2026-11-18 20:07:01.431953');
INSERT INTO public.automation_rules VALUES (3, NULL, 'Notify Reviewer on Deliverable Submission', 'submission_received', '{}', '{"notify_roles": ["faculty_mentor", "reviewer"], "message": "A new project deliverable has been submitted for evaluation."}', true, 0, '2026-11-18 20:07:01.431955');


--
-- Data for Name: automation_logs; Type: TABLE DATA; Schema: public; Owner: devtrack
--



--
-- Data for Name: discussions; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.discussions VALUES (1, 1, 10, 'Guidance on PostgreSQL Connection Pooling & Alembic Migrations', 'Please review connection pool recycling parameters for the production database to prevent connection timeouts during bulk evaluation imports.', '2026-11-18 16:11:47.072075');


--
-- Data for Name: discussion_replies; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.discussion_replies VALUES (1, 1, 13, 'Thank you Dr. Sharma. We have configured pool_size=20, max_overflow=10 and pool_recycle=1800 with pre-ping enabled.', '2026-11-18 16:11:47.083422');


--
-- Data for Name: faculty_profiles; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.faculty_profiles VALUES (1, 9, 'FAC-CSE-001', 1, 'Professor & HOD', 'Distributed Systems & Cloud Architecture', 10, 2, '2026-11-18 16:11:46.944063');
INSERT INTO public.faculty_profiles VALUES (2, 10, 'FAC-CSE-012', 1, 'Associate Professor', 'Software Engineering & Microservices', 8, 2, '2026-11-18 16:11:46.94709');
INSERT INTO public.faculty_profiles VALUES (3, 11, 'FAC-AIDS-005', 2, 'Assistant Professor', 'Deep Learning & Computer Vision', 6, 2, '2026-11-18 16:11:46.948622');
INSERT INTO public.faculty_profiles VALUES (4, 16, 'FAC-REV-008', 1, 'Professor & Senior Reviewer', 'Cybersecurity & Enterprise Architecture', 12, 2, '2026-11-18 16:11:46.950022');
INSERT INTO public.faculty_profiles VALUES (5, 18, 'FAC-002', 1, 'Associate Professor', 'Software Systems & AI', 8, 3, '2026-11-18 19:58:54.538549');
INSERT INTO public.faculty_profiles VALUES (6, 19, 'FAC-003', 1, 'Professor & External Evaluator', 'Software Systems & AI', 8, 3, '2026-11-18 19:58:54.538549');


--
-- Data for Name: meetings; Type: TABLE DATA; Schema: public; Owner: devtrack
--



--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.notifications VALUES (1, 14, 'Capstone Milestone Approved', 'Your Architecture & Design Milestone (M1) was reviewed and approved with 94.5/100 grade.', 'submission', '/projects/1', false, '2026-11-18 16:11:47.074803');
INSERT INTO public.notifications VALUES (2, 14, 'Sprint 1 Deadline Approaching', 'Sprint 1 review is scheduled in 3 days. Ensure all assigned tasks are updated on the Kanban board.', 'task', '/sprints', false, '2026-11-18 16:11:47.074806');
INSERT INTO public.notifications VALUES (3, 10, 'Capstone Milestone Approved', 'Your Architecture & Design Milestone (M1) was reviewed and approved with 94.5/100 grade.', 'submission', '/projects/1', false, '2026-11-18 16:11:47.074807');
INSERT INTO public.notifications VALUES (4, 10, 'Sprint 1 Deadline Approaching', 'Sprint 1 review is scheduled in 3 days. Ensure all assigned tasks are updated on the Kanban board.', 'task', '/sprints', false, '2026-11-18 16:11:47.074807');
INSERT INTO public.notifications VALUES (5, 9, 'Capstone Milestone Approved', 'Your Architecture & Design Milestone (M1) was reviewed and approved with 94.5/100 grade.', 'submission', '/projects/1', false, '2026-11-18 16:11:47.074808');
INSERT INTO public.notifications VALUES (6, 9, 'Sprint 1 Deadline Approaching', 'Sprint 1 review is scheduled in 3 days. Ensure all assigned tasks are updated on the Kanban board.', 'task', '/sprints', false, '2026-11-18 16:11:47.074808');
INSERT INTO public.notifications VALUES (7, 8, 'System Initialized', 'DevTrack University Project Management System successfully configured with PostgreSQL.', 'info', NULL, false, '2026-11-18 19:58:54.538549');
INSERT INTO public.notifications VALUES (8, 8, 'New Academic Session Active', 'Session 2025-2026 is currently active with 9 programs.', 'info', NULL, false, '2026-11-18 19:58:54.538549');
INSERT INTO public.notifications VALUES (9, 8, 'Project Submission Evaluated', 'Your submission ''Initial Architecture Blueprint & DB Schema'' received Grade ''A+'' (94.5/100.0) with feedback.', 'evaluation', '/projects/9', false, '2026-11-18 20:11:40.406486');


--
-- Data for Name: programs; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.programs VALUES (1, 'B.Tech in Computer Science & Engineering', 'BTECH-CSE', 'B.Tech', 4, 1, '2026-11-18 16:11:46.61004');
INSERT INTO public.programs VALUES (2, 'B.Tech in Artificial Intelligence', 'BTECH-AI', 'B.Tech', 4, 2, '2026-11-18 16:11:46.613967');
INSERT INTO public.programs VALUES (3, 'M.Tech in Software Engineering', 'MTECH-SE', 'M.Tech', 2, 1, '2026-11-18 16:11:46.616');
INSERT INTO public.programs VALUES (4, 'Master of Computer Applications', 'MCA', 'MCA', 2, 3, '2026-11-18 16:11:46.617811');
INSERT INTO public.programs VALUES (5, 'B.Tech in Electronics & Communication', 'BTECH-ECE', 'B.Tech', 4, 4, '2026-11-18 19:58:54.538549');
INSERT INTO public.programs VALUES (6, 'B.Tech in Mechanical Engineering', 'BTECH-MECH', 'B.Tech', 4, 5, '2026-11-18 19:58:54.538549');
INSERT INTO public.programs VALUES (7, 'Bachelor of Computer Applications', 'BCA', 'BCA', 3, 3, '2026-11-18 19:58:54.538549');
INSERT INTO public.programs VALUES (8, 'Master of Business Administration', 'MBA', 'MBA', 2, 6, '2026-11-18 19:58:54.538549');
INSERT INTO public.programs VALUES (9, 'Bachelor of Business Administration', 'BBA', 'BBA', 3, 6, '2026-11-18 19:58:54.538549');
INSERT INTO public.programs VALUES (10, 'Ph.D. in Computer Science', 'PHD-CS', 'PhD', 3, 1, '2026-11-18 19:58:54.538549');


--
-- Data for Name: semesters; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.semesters VALUES (1, 1, 1, 6, 'Semester 6 (Spring 2026)', '2026-11-18 16:11:46.630329');
INSERT INTO public.semesters VALUES (2, 1, 1, 8, 'Semester 8 — Capstone Final (Spring 2026)', '2026-11-18 16:11:46.634236');
INSERT INTO public.semesters VALUES (3, 2, 1, 6, 'Semester 6 (Spring 2026)', '2026-11-18 16:11:46.640892');
INSERT INTO public.semesters VALUES (4, 1, 2, 1, 'Semester 1', '2026-11-18 19:58:54.538549');
INSERT INTO public.semesters VALUES (5, 1, 2, 2, 'Semester 2', '2026-11-18 19:58:54.538549');
INSERT INTO public.semesters VALUES (6, 1, 2, 3, 'Semester 3', '2026-11-18 19:58:54.538549');
INSERT INTO public.semesters VALUES (7, 1, 2, 4, 'Semester 4', '2026-11-18 19:58:54.538549');
INSERT INTO public.semesters VALUES (8, 1, 2, 5, 'Semester 5', '2026-11-18 19:58:54.538549');
INSERT INTO public.semesters VALUES (9, 1, 2, 7, 'Semester 7', '2026-11-18 19:58:54.538549');


--
-- Data for Name: sections; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.sections VALUES (1, 2, 'Section A', 2026, '2026-11-18 16:11:46.648788');
INSERT INTO public.sections VALUES (2, 2, 'Section B', 2026, '2026-11-18 16:11:46.655804');


--
-- Data for Name: student_profiles; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.student_profiles VALUES (1, 14, 'EN2022CSE0104', 1, 1, 2, 1, 2022, 9.12, 'active', '2026-11-18 16:11:46.962374');
INSERT INTO public.student_profiles VALUES (2, 15, 'EN2022CSE0118', 1, 1, 2, 1, 2022, 8.85, 'active', '2026-11-18 16:11:46.967814');
INSERT INTO public.student_profiles VALUES (3, 13, 'EN2022CSE0089', 1, 1, 2, 2, 2022, 9.4, 'active', '2026-11-18 16:11:46.971329');
INSERT INTO public.student_profiles VALUES (4, 21, 'BT22CSE045', 1, 1, 9, NULL, 2022, 8.85, 'active', '2026-11-18 19:58:54.538549');
INSERT INTO public.student_profiles VALUES (5, 22, 'BT22CSE047', 1, 1, 9, NULL, 2022, 8.4, 'active', '2026-11-18 19:58:54.538549');
INSERT INTO public.student_profiles VALUES (6, 8, 'STU-0008', NULL, 1, NULL, NULL, NULL, 0, 'active', '2026-11-18 20:11:40.329364');


--
-- Data for Name: project_submissions; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.project_submissions VALUES (1, 1, 1, 'proposal', 'Capstone Proposal — AI-Driven Distributed Project Engine', 'Comprehensive system design documentation and technical feasibility study.', NULL, 'https://github.com/DevTrack-University/capstone-alpha', 'approved', '2026-11-03 16:11:46.981826');
INSERT INTO public.project_submissions VALUES (2, 9, 6, 'proposal', 'Initial Architecture Blueprint & DB Schema', 'Normalized PostgreSQL schema design with Alembic migrations', NULL, 'https://github.com/devtrack/university-system', 'evaluated', '2026-11-18 20:11:40.334666');


--
-- Data for Name: project_evaluations; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.project_evaluations VALUES (1, 1, 10, 94.5, 100, 'A+', 'Outstanding architecture proposal. The microservice decomposition and database normalization are well justified.', '{"Architecture": 28, "Feasibility": 24, "Novelty": 23, "Presentation": 19.5}', '2026-11-06 16:11:46.981826');
INSERT INTO public.project_evaluations VALUES (2, 2, 8, 94.5, 100, 'A+', 'Outstanding university-level architecture and implementation. Clean code and proper PostgreSQL transactions.', NULL, '2026-11-18 20:11:40.391712');


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.project_members VALUES (1, 1, 13, 'leader', '2026-11-18 16:11:47.004017');
INSERT INTO public.project_members VALUES (2, 1, 14, 'member', '2026-11-18 16:11:47.004027');
INSERT INTO public.project_members VALUES (3, 1, 15, 'member', '2026-11-18 16:11:47.004028');
INSERT INTO public.project_members VALUES (4, 9, 8, 'leader', '2026-11-18 20:11:40.156547');
INSERT INTO public.project_members VALUES (5, 10, 27, 'leader', '2026-11-18 20:11:44.855725');
INSERT INTO public.project_members VALUES (6, 11, 28, 'leader', '2026-11-18 20:11:45.680079');
INSERT INTO public.project_members VALUES (7, 12, 29, 'leader', '2026-11-18 20:11:46.469133');
INSERT INTO public.project_members VALUES (8, 13, 30, 'leader', '2026-11-18 20:11:47.221246');
INSERT INTO public.project_members VALUES (9, 14, 31, 'leader', '2026-11-18 20:11:47.990293');
INSERT INTO public.project_members VALUES (10, 15, 32, 'leader', '2026-11-18 20:11:48.767447');


--
-- Data for Name: project_milestones; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.project_milestones VALUES (1, 1, 'M1: System Architecture & Design Document', NULL, '2026-11-08 16:11:46.981826', 'completed', '2026-11-07 16:11:46.981826', '2026-11-18 16:11:47.019953');
INSERT INTO public.project_milestones VALUES (2, 1, 'M2: Database Schema & API Implementation', NULL, '2026-12-03 16:11:46.981826', 'in_progress', NULL, '2026-11-18 16:11:47.019957');
INSERT INTO public.project_milestones VALUES (3, 1, 'M3: Frontend Integration & Final Defense', NULL, '2027-01-02 16:11:46.981826', 'pending', NULL, '2026-11-18 16:11:47.019958');


--
-- Data for Name: project_risks; Type: TABLE DATA; Schema: public; Owner: devtrack
--



--
-- Data for Name: project_teams; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.project_teams VALUES (1, 1, 'Core Capstone Alpha Team', 13, 'Lead engineering group responsible for the enterprise capstone architecture', '2026-11-18 16:11:46.997603');


--
-- Data for Name: project_templates; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.project_templates VALUES (1, 'Software Development (Full-Stack Agile)', 'Software', 'Tailored for software engineering and capstone computer science projects with Epic/Story/Task hierarchy, CI/CD milestones, and code review.', '{"epics": ["Architecture & Database Schema", "Authentication & Security", "Core Business Logic", "Frontend UI / UX", "Testing & Deployment"], "milestones": ["Sprint 1 - Foundations", "Sprint 2 - MVP Deliverable", "Final Code Review & Defence"]}', '2026-11-18 20:07:01.436538');
INSERT INTO public.project_templates VALUES (2, 'Research & Thesis Project', 'Research', 'Structured academic thesis framework: Literature Review, Methodology, Data Collection, Experimentation, and Manuscript Submission.', '{"epics": ["Literature Review & Survey", "Hypothesis & Methodology", "Experimental Setup & Trials", "Analysis of Results", "Thesis Drafting & Viva"], "milestones": ["Proposal Approved", "Mid-term Defense", "Final Submission"]}', '2026-11-18 20:07:01.436543');
INSERT INTO public.project_templates VALUES (3, 'Final Year Capstone Project', 'Capstone', 'Comprehensive engineering capstone project with multi-disciplinary supervision, progress milestones, and rubrics.', '{"epics": ["Requirements Specification", "System Design & Prototyping", "Implementation Phase", "Integration & Quality Assurance", "Project Documentation"], "milestones": ["Synposis Submission", "Progress Evaluation 1", "Final Viva & Exhibition"]}', '2026-11-18 20:07:01.436544');
INSERT INTO public.project_templates VALUES (4, 'Data Science & AI / ML Pipeline', 'Data Science', 'End-to-end data pipeline: dataset acquisition, cleaning, EDA, feature engineering, model training, evaluation, and inference deployment.', '{"epics": ["Data Collection & Ingestion", "Exploratory Data Analysis", "Feature Engineering & Preprocessing", "Model Architecture & Training", "MLOps & API Serving"], "milestones": ["Baseline Model Benchmark", "Production Model Candidate", "Model Report & Demo"]}', '2026-11-18 20:07:01.436545');
INSERT INTO public.project_templates VALUES (5, 'IoT & Embedded Hardware System', 'IoT', 'Embedded microcontrollers, sensor telemetry, edge computing, wireless communications, and cloud dashboard integration.', '{"epics": ["Hardware Circuit Design", "Firmware & Sensor Drivers", "Communication Protocol (MQTT/HTTP)", "Cloud Backend & Telemetry", "Enclosure & Field Testing"], "milestones": ["Breadboard Prototype", "PCB Fabrication", "Field Demonstration"]}', '2026-11-18 20:07:01.436545');


--
-- Data for Name: project_workflows; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.project_workflows VALUES (1, NULL, 'University Standard Agile Workflow', 'Default multi-stage academic & software workflow with code review and testing stages.', 'standard', true, '2026-11-18 20:07:01.370271');


--
-- Data for Name: saved_filters; Type: TABLE DATA; Schema: public; Owner: devtrack
--



--
-- Data for Name: sprints; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.sprints VALUES (1, 1, 'Sprint 1 — Core Authentication & RBAC', 'Deliver JWT authentication and role-based permissions across all user dashboards', '2026-11-11 16:11:46.981826', '2026-11-25 16:11:46.981826', 'active', '2026-11-18 16:11:47.02868');
INSERT INTO public.sprints VALUES (2, 9, 'Sprint 1 — Core RBAC & Services', 'Deliver fully validated university APIs', '2026-11-18 05:30:00', '2026-11-25 05:30:00', 'planning', '2026-11-18 20:11:40.280305');


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.tasks VALUES (1, 'Build login page', 'Create the React login interface', 'todo', 'high', 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8, 4, 0, '2026-11-18 16:10:56.771522', '2026-11-18 16:10:56.77153', 'DEV-1001', 'task', NULL, NULL, 0, NULL, 0);
INSERT INTO public.tasks VALUES (2, 'Test task', 'Testing task retrieval', 'todo', 'medium', 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8, 4, 0, '2026-11-18 16:10:56.776317', '2026-11-18 16:10:56.776321', 'DEV-1002', 'task', NULL, NULL, 0, NULL, 0);
INSERT INTO public.tasks VALUES (3, 'Build login page', 'Create the React login interface', 'todo', 'high', 7, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8, 4, 0, '2026-11-18 16:10:56.776816', '2026-11-18 16:10:56.776817', 'DEV-1003', 'task', NULL, NULL, 0, NULL, 0);
INSERT INTO public.tasks VALUES (4, 'Test task', 'Testing task retrieval', 'todo', 'medium', 8, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 8, 4, 0, '2026-11-18 16:10:56.777203', '2026-11-18 16:10:56.777204', 'DEV-1004', 'task', NULL, NULL, 0, NULL, 0);
INSERT INTO public.tasks VALUES (5, 'Cloud-Native Microservices Architecture & DB Optimization', 'Comprehensive architecture refactoring to enterprise PostgreSQL schema with connection pooling, automated migrations, and read replicas.', 'in_progress', 'high', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 40, 24, 60, '2026-11-18 20:07:01.45593', '2026-11-18 20:07:01.455935', 'DEV-1101', 'epic', NULL, NULL, 21, 'architecture,postgresql,performance', 0);
INSERT INTO public.tasks VALUES (6, 'Jira-Style Enterprise Project Management Engine', 'Issue key tracking, epic hierarchy, sprint backlogs, visual burndown curves, and workflow automation.', 'in_progress', 'highest', 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 60, 30, 50, '2026-11-18 20:07:01.455938', '2026-11-18 20:07:01.455939', 'DEV-1201', 'epic', NULL, NULL, 34, 'jira,kanban,agile,saas', 0);
INSERT INTO public.tasks VALUES (7, 'Verify RBAC permission matrix', 'Ensure student accounts cannot alter department configurations', 'in_progress', 'urgent', 9, NULL, 8, NULL, NULL, NULL, NULL, NULL, 6, 0, 0, '2026-11-18 20:11:40.193884', '2026-11-18 20:11:40.238317', 'PRJ-0009-1007', 'task', NULL, 8, 0, NULL, 0);
INSERT INTO public.tasks VALUES (8, 'Automated Test Jira Issue', 'Testing issue tracking with story points and automatic key generation', 'todo', 'high', 9, NULL, 8, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, '2026-11-18 20:11:41.794753', '2026-11-18 20:11:41.796085', 'PRJ-0009-1008', 'story', NULL, 8, 8, 'qa,automated-test', 0);
INSERT INTO public.tasks VALUES (9, 'Dep Task 1', NULL, 'todo', 'medium', 9, NULL, 8, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, '2026-11-18 20:11:43.534105', '2026-11-18 20:11:43.535401', 'PRJ-0009-1009', 'task', NULL, 8, 0, NULL, 0);
INSERT INTO public.tasks VALUES (10, 'Dep Task 2', NULL, 'todo', 'medium', 9, NULL, 8, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, '2026-11-18 20:11:43.553879', '2026-11-18 20:11:43.555023', 'PRJ-0009-1010', 'task', NULL, 8, 0, NULL, 0);
INSERT INTO public.tasks VALUES (11, 'Design Database Schema', 'Create Postgres models', 'todo', 'high', 13, NULL, 30, NULL, NULL, NULL, NULL, NULL, 5, 0, 0, '2026-11-18 20:11:47.234469', '2026-11-18 20:11:47.235565', 'PRJ-0013-1011', 'task', NULL, 30, 0, NULL, 0);
INSERT INTO public.tasks VALUES (12, 'Build API Endpoints', NULL, 'in_progress', 'urgent', 14, NULL, 31, NULL, NULL, NULL, NULL, NULL, 0, 0, 0, '2026-11-18 20:11:48.005807', '2026-11-18 20:11:48.007218', 'PRJ-0014-1012', 'task', NULL, 31, 0, NULL, 0);
INSERT INTO public.tasks VALUES (13, 'Kanban Test Task', NULL, 'completed', 'medium', 15, NULL, 32, NULL, NULL, NULL, NULL, NULL, 0, 0, 100, '2026-11-18 20:11:48.781878', '2026-11-18 20:11:48.810497', 'PRJ-0015-1013', 'task', NULL, 32, 0, NULL, 0);


--
-- Data for Name: task_comments; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.task_comments VALUES (1, 7, 8, 'Verified test cases with PostgreSQL ORM transactions.', '2026-11-18 20:11:40.257493');


--
-- Data for Name: task_dependencies; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.task_dependencies VALUES (1, 9, 10, 'blocks');


--
-- Data for Name: team_members; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.team_members VALUES (1, 1, 13, 'leader', '2026-11-18 16:11:47.010816');
INSERT INTO public.team_members VALUES (2, 1, 14, 'developer', '2026-11-18 16:11:47.010819');
INSERT INTO public.team_members VALUES (3, 1, 15, 'developer', '2026-11-18 16:11:47.01082');


--
-- Data for Name: university_profiles; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.university_profiles VALUES (1, 'Apex Global Technological University', 'AGTU', 'University Campus, Tech Boulevard, Knowledge City', 'chancellor@devtrack.edu', '+91-11-29876543', 'https://agtu.devtrack.edu', '/assets/university-logo.svg', '2026-11-18 16:11:46.541294');


--
-- Data for Name: user_stories; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.user_stories VALUES (1, 1, 1, 'As a student, I want to submit capstone deliverables', NULL, NULL, 5, 'high', 'in_progress', '2026-11-18 16:11:47.033061');
INSERT INTO public.user_stories VALUES (2, 1, 1, 'As faculty, I want to grade submissions against rubrics', NULL, NULL, 8, 'high', 'planned', '2026-11-18 16:11:47.033064');
INSERT INTO public.user_stories VALUES (3, 1, 1, 'As HOD, I want department-level analytics on project velocity', NULL, NULL, 3, 'medium', 'backlog', '2026-11-18 16:11:47.033065');


--
-- Data for Name: wiki_pages; Type: TABLE DATA; Schema: public; Owner: devtrack
--



--
-- Data for Name: work_logs; Type: TABLE DATA; Schema: public; Owner: devtrack
--



--
-- Data for Name: workflow_statuses; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.workflow_statuses VALUES (1, 1, 'open', 'Open', 'todo', '#94a3b8', 0, 0);
INSERT INTO public.workflow_statuses VALUES (2, 1, 'todo', 'To Do', 'todo', '#3b82f6', 1, 0);
INSERT INTO public.workflow_statuses VALUES (3, 1, 'in_progress', 'In Progress', 'in_progress', '#f59e0b', 2, 5);
INSERT INTO public.workflow_statuses VALUES (4, 1, 'blocked', 'Blocked', 'in_progress', '#ef4444', 3, 0);
INSERT INTO public.workflow_statuses VALUES (5, 1, 'in_review', 'In Review', 'in_progress', '#8b5cf6', 4, 3);
INSERT INTO public.workflow_statuses VALUES (6, 1, 'testing', 'Testing', 'in_progress', '#06b6d4', 5, 4);
INSERT INTO public.workflow_statuses VALUES (7, 1, 'done', 'Done', 'done', '#10b981', 6, 0);


--
-- Data for Name: workflow_transitions; Type: TABLE DATA; Schema: public; Owner: devtrack
--

INSERT INTO public.workflow_transitions VALUES (1, 1, '*', 'open', 'Create / Reopen', NULL);
INSERT INTO public.workflow_transitions VALUES (2, 1, 'open', 'todo', 'Move to Backlog / To Do', NULL);
INSERT INTO public.workflow_transitions VALUES (3, 1, 'todo', 'in_progress', 'Start Working', NULL);
INSERT INTO public.workflow_transitions VALUES (4, 1, 'in_progress', 'blocked', 'Flag Impediment', NULL);
INSERT INTO public.workflow_transitions VALUES (5, 1, 'blocked', 'in_progress', 'Resolve Impediment', NULL);
INSERT INTO public.workflow_transitions VALUES (6, 1, 'in_progress', 'in_review', 'Submit Code Review', NULL);
INSERT INTO public.workflow_transitions VALUES (7, 1, 'in_review', 'in_progress', 'Request Rework', NULL);
INSERT INTO public.workflow_transitions VALUES (8, 1, 'in_review', 'testing', 'Approve & Test', NULL);
INSERT INTO public.workflow_transitions VALUES (9, 1, 'testing', 'in_progress', 'Test Failed', NULL);
INSERT INTO public.workflow_transitions VALUES (10, 1, 'testing', 'done', 'Verify & Complete', NULL);


--
-- Name: academic_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.academic_sessions_id_seq', 2, true);


--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 2, true);


--
-- Name: announcements_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.announcements_id_seq', 2, true);


--
-- Name: automation_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.automation_logs_id_seq', 1, false);


--
-- Name: automation_rules_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.automation_rules_id_seq', 3, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.departments_id_seq', 6, true);


--
-- Name: discussion_replies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.discussion_replies_id_seq', 1, true);


--
-- Name: discussions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.discussions_id_seq', 1, true);


--
-- Name: faculty_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.faculty_profiles_id_seq', 6, true);


--
-- Name: meetings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.meetings_id_seq', 1, false);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.notifications_id_seq', 9, true);


--
-- Name: programs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.programs_id_seq', 10, true);


--
-- Name: project_evaluations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.project_evaluations_id_seq', 2, true);


--
-- Name: project_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.project_members_id_seq', 10, true);


--
-- Name: project_milestones_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.project_milestones_id_seq', 3, true);


--
-- Name: project_risks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.project_risks_id_seq', 1, false);


--
-- Name: project_submissions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.project_submissions_id_seq', 2, true);


--
-- Name: project_teams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.project_teams_id_seq', 1, true);


--
-- Name: project_templates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.project_templates_id_seq', 5, true);


--
-- Name: project_workflows_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.project_workflows_id_seq', 1, true);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.projects_id_seq', 15, true);


--
-- Name: saved_filters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.saved_filters_id_seq', 1, false);


--
-- Name: schools_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.schools_id_seq', 6, true);


--
-- Name: sections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.sections_id_seq', 2, true);


--
-- Name: semesters_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.semesters_id_seq', 9, true);


--
-- Name: sprints_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.sprints_id_seq', 2, true);


--
-- Name: student_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.student_profiles_id_seq', 6, true);


--
-- Name: task_comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.task_comments_id_seq', 1, true);


--
-- Name: task_dependencies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.task_dependencies_id_seq', 1, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.tasks_id_seq', 13, true);


--
-- Name: team_members_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.team_members_id_seq', 3, true);


--
-- Name: university_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.university_profiles_id_seq', 1, true);


--
-- Name: user_stories_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.user_stories_id_seq', 3, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.users_id_seq', 32, true);


--
-- Name: wiki_pages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.wiki_pages_id_seq', 1, false);


--
-- Name: work_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.work_logs_id_seq', 1, false);


--
-- Name: workflow_statuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.workflow_statuses_id_seq', 7, true);


--
-- Name: workflow_transitions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: devtrack
--

SELECT pg_catalog.setval('public.workflow_transitions_id_seq', 10, true);


--
-- PostgreSQL database dump complete
--



SET session_replication_role = DEFAULT;
SELECT setval('academic_sessions_id_seq', COALESCE((SELECT MAX(id) FROM academic_sessions), 1), true);
SELECT setval('schools_id_seq', COALESCE((SELECT MAX(id) FROM schools), 1), true);
SELECT setval('departments_id_seq', COALESCE((SELECT MAX(id) FROM departments), 1), true);
SELECT setval('university_profiles_id_seq', COALESCE((SELECT MAX(id) FROM university_profiles), 1), true);
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1), true);
SELECT setval('activity_logs_id_seq', COALESCE((SELECT MAX(id) FROM activity_logs), 1), true);
SELECT setval('announcements_id_seq', COALESCE((SELECT MAX(id) FROM announcements), 1), true);
SELECT setval('faculty_profiles_id_seq', COALESCE((SELECT MAX(id) FROM faculty_profiles), 1), true);
SELECT setval('notifications_id_seq', COALESCE((SELECT MAX(id) FROM notifications), 1), true);
SELECT setval('programs_id_seq', COALESCE((SELECT MAX(id) FROM programs), 1), true);
SELECT setval('semesters_id_seq', COALESCE((SELECT MAX(id) FROM semesters), 1), true);
SELECT setval('student_profiles_id_seq', COALESCE((SELECT MAX(id) FROM student_profiles), 1), true);
SELECT setval('projects_id_seq', COALESCE((SELECT MAX(id) FROM projects), 1), true);
SELECT setval('project_members_id_seq', COALESCE((SELECT MAX(id) FROM project_members), 1), true);
SELECT setval('project_milestones_id_seq', COALESCE((SELECT MAX(id) FROM project_milestones), 1), true);
SELECT setval('project_teams_id_seq', COALESCE((SELECT MAX(id) FROM project_teams), 1), true);
SELECT setval('sprints_id_seq', COALESCE((SELECT MAX(id) FROM sprints), 1), true);
SELECT setval('tasks_id_seq', COALESCE((SELECT MAX(id) FROM tasks), 1), true);
SELECT setval('task_comments_id_seq', COALESCE((SELECT MAX(id) FROM task_comments), 1), true);
SELECT setval('task_dependencies_id_seq', COALESCE((SELECT MAX(id) FROM task_dependencies), 1), true);
SELECT setval('work_logs_id_seq', COALESCE((SELECT MAX(id) FROM work_logs), 1), true);
SELECT setval('project_workflows_id_seq', COALESCE((SELECT MAX(id) FROM project_workflows), 1), true);
SELECT setval('workflow_statuses_id_seq', COALESCE((SELECT MAX(id) FROM workflow_statuses), 1), true);
SELECT setval('workflow_transitions_id_seq', COALESCE((SELECT MAX(id) FROM workflow_transitions), 1), true);
SELECT setval('automation_rules_id_seq', COALESCE((SELECT MAX(id) FROM automation_rules), 1), true);
SELECT setval('automation_logs_id_seq', COALESCE((SELECT MAX(id) FROM automation_logs), 1), true);
SELECT setval('project_risks_id_seq', COALESCE((SELECT MAX(id) FROM project_risks), 1), true);
SELECT setval('wiki_pages_id_seq', COALESCE((SELECT MAX(id) FROM wiki_pages), 1), true);
SELECT setval('saved_filters_id_seq', COALESCE((SELECT MAX(id) FROM saved_filters), 1), true);
SELECT setval('project_templates_id_seq', COALESCE((SELECT MAX(id) FROM project_templates), 1), true);
SELECT setval('project_submissions_id_seq', COALESCE((SELECT MAX(id) FROM project_submissions), 1), true);
SELECT setval('project_evaluations_id_seq', COALESCE((SELECT MAX(id) FROM project_evaluations), 1), true);
SELECT setval('project_discussions_id_seq', COALESCE((SELECT MAX(id) FROM project_discussions), 1), true);
