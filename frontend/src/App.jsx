import { useEffect, useState } from "react";
import {
    createProject,
    createTask,
    getProjects,
    getTasks,
    loginUser,
    registerUser,
} from "./services/api";
import "./index.css";

function App() {
    const [token, setToken] = useState(
        localStorage.getItem("devtrack_token")
    );

    const [isLogin, setIsLogin] = useState(true);

    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
    });

    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [tasks, setTasks] = useState([]);

    const [projectForm, setProjectForm] = useState({
        name: "",
        description: "",
    });

    const [taskForm, setTaskForm] = useState({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
    });

    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    function handleChange(event) {
        setForm({
            ...form,
            [event.target.name]: event.target.value,
        });
    }

    async function handleSubmit(event) {
        event.preventDefault();

        setMessage("");
        setError("");
        setLoading(true);

        try {
            if (isLogin) {
                const data = await loginUser({
                    email: form.email,
                    password: form.password,
                });

                localStorage.setItem(
                    "devtrack_token",
                    data.access_token
                );

                setToken(data.access_token);
                setMessage("Login successful!");
            } else {
                await registerUser({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                });

                setMessage(
                    "Account created successfully. Please sign in."
                );

                setIsLogin(true);

                setForm({
                    name: "",
                    email: form.email,
                    password: "",
                });
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function loadProjects() {
        try {
            const data = await getProjects();
            setProjects(data);
        } catch (err) {
            setError(err.message);
        }
    }

    useEffect(() => {
        if (token) {
            loadProjects();
        }
    }, [token]);

    async function handleCreateProject(event) {
        event.preventDefault();

        setError("");
        setMessage("");

        try {
            const project = await createProject(projectForm);

            setProjects([
                ...projects,
                project,
            ]);

            setProjectForm({
                name: "",
                description: "",
            });

            setMessage("Project created successfully.");
        } catch (err) {
            setError(err.message);
        }
    }

    async function selectProject(project) {
        setSelectedProject(project);
        setError("");

        try {
            const data = await getTasks(project.id);
            setTasks(data);
        } catch (err) {
            setError(err.message);
        }
    }

    async function handleCreateTask(event) {
        event.preventDefault();

        if (!selectedProject) {
            return;
        }

        setError("");
        setMessage("");

        try {
            const task = await createTask(
                selectedProject.id,
                taskForm
            );

            setTasks([
                ...tasks,
                task,
            ]);

            setTaskForm({
                title: "",
                description: "",
                status: "todo",
                priority: "medium",
            });

            setMessage("Task created successfully.");
        } catch (err) {
            setError(err.message);
        }
    }

    function logout() {
        localStorage.removeItem("devtrack_token");

        setToken(null);
        setProjects([]);
        setSelectedProject(null);
        setTasks([]);
        setMessage("");
        setError("");
    }

    if (!token) {
        return (
            <div className="app">
                <div className="auth-container">

                    <div className="brand-section">
                        <div className="logo">
                            DT
                        </div>

                        <h1>DevTrack</h1>

                        <p>
                            Manage projects. Track tasks.
                            <br />
                            Build better software.
                        </p>

                        <div className="feature-list">
                            <div>✓ Project management</div>
                            <div>✓ Task tracking</div>
                            <div>✓ Secure authentication</div>
                        </div>
                    </div>

                    <div className="form-section">

                        <div className="form-header">
                            <h2>
                                {isLogin
                                    ? "Welcome back"
                                    : "Create your account"}
                            </h2>

                            <p>
                                {isLogin
                                    ? "Sign in to continue to DevTrack"
                                    : "Start managing your projects today"}
                            </p>
                        </div>

                        <form onSubmit={handleSubmit}>

                            {!isLogin && (
                                <div className="input-group">
                                    <label>Full name</label>

                                    <input
                                        name="name"
                                        type="text"
                                        placeholder="Enter your name"
                                        value={form.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            )}

                            <div className="input-group">
                                <label>Email address</label>

                                <input
                                    name="email"
                                    type="email"
                                    placeholder="you@example.com"
                                    value={form.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                            <div className="input-group">
                                <label>Password</label>

                                <input
                                    name="password"
                                    type="password"
                                    placeholder="Enter your password"
                                    value={form.password}
                                    onChange={handleChange}
                                    required
                                    minLength="8"
                                />
                            </div>

                            {error && (
                                <div className="message error">
                                    {error}
                                </div>
                            )}

                            {message && (
                                <div className="message success">
                                    {message}
                                </div>
                            )}

                            <button
                                className="submit-button"
                                type="submit"
                                disabled={loading}
                            >
                                {loading
                                    ? "Please wait..."
                                    : isLogin
                                    ? "Sign in"
                                    : "Create account"}
                            </button>

                        </form>

                        <div className="switch-auth">
                            <span>
                                {isLogin
                                    ? "Don't have an account?"
                                    : "Already have an account?"}
                            </span>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError("");
                                    setMessage("");
                                }}
                            >
                                {isLogin
                                    ? "Create account"
                                    : "Sign in"}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard">

            <header className="topbar">

                <div className="topbar-brand">
                    <div className="small-logo">
                        DT
                    </div>

                    <span>DevTrack</span>
                </div>

                <button
                    className="logout-button"
                    onClick={logout}
                >
                    Logout
                </button>

            </header>

            <main className="dashboard-content">

                <div className="dashboard-heading">
                    <div>
                        <h1>Dashboard</h1>

                        <p>
                            Manage your projects and tasks.
                        </p>
                    </div>
                </div>

                {error && (
                    <div className="message error">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="message success">
                        {message}
                    </div>
                )}

                <section className="stats-grid">

                    <div className="stat-card">
                        <span>Projects</span>

                        <strong>
                            {projects.length}
                        </strong>
                    </div>

                    <div className="stat-card">
                        <span>Tasks</span>

                        <strong>
                            {tasks.length}
                        </strong>
                    </div>

                    <div className="stat-card">
                        <span>Selected Project</span>

                        <strong>
                            {selectedProject ? "1" : "0"}
                        </strong>
                    </div>

                </section>

                <section className="dashboard-grid">

                    <div className="card">

                        <div className="card-header">
                            <h2>Projects</h2>
                        </div>

                        <form onSubmit={handleCreateProject}>

                            <input
                                className="dashboard-input"
                                placeholder="Project name"
                                value={projectForm.name}
                                onChange={(event) =>
                                    setProjectForm({
                                        ...projectForm,
                                        name: event.target.value,
                                    })
                                }
                                required
                            />

                            <textarea
                                className="dashboard-input"
                                placeholder="Project description"
                                value={projectForm.description}
                                onChange={(event) =>
                                    setProjectForm({
                                        ...projectForm,
                                        description:
                                            event.target.value,
                                    })
                                }
                            />

                            <button
                                className="primary-button"
                                type="submit"
                            >
                                + Create Project
                            </button>

                        </form>

                        <div className="project-list">

                            {projects.length === 0 ? (
                                <p className="empty">
                                    No projects yet.
                                </p>
                            ) : (
                                projects.map((project) => (
                                    <button
                                        className={
                                            selectedProject?.id ===
                                            project.id
                                                ? "project-item selected"
                                                : "project-item"
                                        }
                                        key={project.id}
                                        onClick={() =>
                                            selectProject(project)
                                        }
                                    >

                                        <strong>
                                            {project.name}
                                        </strong>

                                        <span>
                                            {project.description ||
                                                "No description"}
                                        </span>

                                    </button>
                                ))
                            )}

                        </div>

                    </div>

                    <div className="card">

                        <div className="card-header">
                            <h2>
                                {selectedProject
                                    ? `Tasks — ${selectedProject.name}`
                                    : "Tasks"}
                            </h2>
                        </div>

                        {selectedProject ? (
                            <>

                                <form onSubmit={handleCreateTask}>

                                    <input
                                        className="dashboard-input"
                                        placeholder="Task title"
                                        value={taskForm.title}
                                        onChange={(event) =>
                                            setTaskForm({
                                                ...taskForm,
                                                title:
                                                    event.target.value,
                                            })
                                        }
                                        required
                                    />

                                    <textarea
                                        className="dashboard-input"
                                        placeholder="Task description"
                                        value={taskForm.description}
                                        onChange={(event) =>
                                            setTaskForm({
                                                ...taskForm,
                                                description:
                                                    event.target.value,
                                            })
                                        }
                                    />

                                    <div className="form-row">

                                        <select
                                            className="dashboard-input"
                                            value={taskForm.status}
                                            onChange={(event) =>
                                                setTaskForm({
                                                    ...taskForm,
                                                    status:
                                                        event.target.value,
                                                })
                                            }
                                        >
                                            <option value="todo">
                                                To Do
                                            </option>

                                            <option value="in_progress">
                                                In Progress
                                            </option>

                                            <option value="done">
                                                Done
                                            </option>
                                        </select>

                                        <select
                                            className="dashboard-input"
                                            value={taskForm.priority}
                                            onChange={(event) =>
                                                setTaskForm({
                                                    ...taskForm,
                                                    priority:
                                                        event.target.value,
                                                })
                                            }
                                        >
                                            <option value="low">
                                                Low
                                            </option>

                                            <option value="medium">
                                                Medium
                                            </option>

                                            <option value="high">
                                                High
                                            </option>
                                        </select>

                                    </div>

                                    <button
                                        className="primary-button"
                                        type="submit"
                                    >
                                        + Create Task
                                    </button>

                                </form>

                                <div className="task-list">

                                    {tasks.length === 0 ? (
                                        <p className="empty">
                                            No tasks yet.
                                        </p>
                                    ) : (
                                        tasks.map((task) => (
                                            <div
                                                className="task-item"
                                                key={task.id}
                                            >

                                                <div>
                                                    <strong>
                                                        {task.title}
                                                    </strong>

                                                    <span>
                                                        {task.description ||
                                                            "No description"}
                                                    </span>
                                                </div>

                                                <div className="task-meta">

                                                    <span>
                                                        {task.status}
                                                    </span>

                                                    <span>
                                                        {task.priority}
                                                    </span>

                                                </div>

                                            </div>
                                        ))
                                    )}

                                </div>

                            </>
                        ) : (
                            <div className="empty large">
                                Select a project to manage its tasks.
                            </div>
                        )}

                    </div>

                </section>

            </main>

        </div>
    );
}

export default App;