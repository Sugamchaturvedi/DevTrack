const API_URL = "http://127.0.0.1:8000";

async function request(endpoint, options = {}) {
    const response = await fetch(`${API_URL}${endpoint}`, {
        method: options.method || "GET",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        body: options.body,
    });

    const text = await response.text();

    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = {
            detail: text || "Invalid server response",
        };
    }

    if (!response.ok) {
        let errorMessage = "Request failed";

        if (typeof data.detail === "string") {
            errorMessage = data.detail;
        } else if (Array.isArray(data.detail)) {
            errorMessage = data.detail
                .map((item) => item.msg || "Validation error")
                .join(", ");
        } else if (data.detail) {
            errorMessage = JSON.stringify(data.detail);
        }

        throw new Error(errorMessage);
    }

    return data;
}


export async function registerUser(userData) {
    return request("/auth/register", {
        method: "POST",
        body: JSON.stringify({
            name: userData.name,
            email: userData.email,
            password: userData.password,
        }),
    });
}


export async function loginUser(credentials) {
    return request("/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email: credentials.email,
            password: credentials.password,
        }),
    });
}


export async function getProjects() {
    const token = localStorage.getItem("devtrack_token");

    return request("/projects/", {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}


export async function createProject(projectData) {
    const token = localStorage.getItem("devtrack_token");

    const payload = {
        name: String(projectData.name).trim(),
        description: projectData.description
            ? String(projectData.description).trim()
            : null,
    };

    console.log("Project payload:", payload);

    return request("/projects/", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
}


export async function getTasks(projectId) {
    const token = localStorage.getItem("devtrack_token");

    return request(`/projects/${projectId}/tasks`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
}


export async function createTask(projectId, taskData) {
    const token = localStorage.getItem("devtrack_token");

    const payload = {
        title: String(taskData.title).trim(),
        description: taskData.description
            ? String(taskData.description).trim()
            : null,
        status: taskData.status,
        priority: taskData.priority,
    };

    return request(`/projects/${projectId}/tasks`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
    });
}