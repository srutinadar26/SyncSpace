import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import KanbanColumn from "../components/KanbanColumn";
import { useAuth } from "../context/AuthContext";

const COLUMNS = ["TODO", "IN_PROGRESS", "DONE"];

export default function Workspace() {
  const { id } = useParams();
  const { user } = useAuth();

  const [workspace, setWorkspace] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    priority: "MEDIUM",
    deadline: "",
  });
  const [creatingTask, setCreatingTask] = useState(false);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("student");
  const [inviteMsg, setInviteMsg] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [wsRes, tasksRes] = await Promise.all([
        api.get(`/workspaces/${id}`),
        api.get(`/tasks/workspace/${id}`),
      ]);
      setWorkspace(wsRes.data.workspace);
      setTasks(tasksRes.data.tasks);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load workspace.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const myRole = workspace?.members.find((m) => m.user._id === user.id)?.role;
  const canManageMembers = myRole === "lead" || myRole === "mentor";

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setCreatingTask(true);
    try {
      const payload = {
        title: taskForm.title,
        description: taskForm.description,
        workspaceId: id,
        assignedTo: taskForm.assignedTo || undefined,
        priority: taskForm.priority,
        deadline: taskForm.deadline || undefined,
      };
      const { data } = await api.post("/tasks", payload);
      setTasks((prev) => [data.task, ...prev]);
      setTaskForm({ title: "", description: "", assignedTo: "", priority: "MEDIUM", deadline: "" });
      setShowTaskForm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create task.");
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    const prevTasks = tasks;
    setTasks((prev) => prev.filter((t) => t._id !== taskId));
    try {
      await api.delete(`/tasks/${taskId}`);
    } catch (err) {
      setTasks(prevTasks);
      setError("Could not delete task.");
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviteMsg("");
    try {
      const { data } = await api.post(`/workspaces/${id}/members`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setWorkspace(data.workspace);
      setInviteEmail("");
      setInviteMsg("Member added.");
    } catch (err) {
      setInviteMsg(err.response?.data?.message || "Could not add member.");
    }
  };

  const findColumnOfTask = (taskId) => tasks.find((t) => t._id === taskId)?.status;

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeTaskId = active.id;
    const sourceColumn = findColumnOfTask(activeTaskId);

    // `over.id` is either a column id (TODO/IN_PROGRESS/DONE) or another task's id
    const targetColumn = COLUMNS.includes(over.id) ? over.id : findColumnOfTask(over.id);

    if (!targetColumn || sourceColumn === targetColumn) return;

    const prevTasks = tasks;
    setTasks((prev) =>
      prev.map((t) => (t._id === activeTaskId ? { ...t, status: targetColumn } : t))
    );

    try {
      await api.patch(`/tasks/${activeTaskId}/status`, { status: targetColumn });
    } catch (err) {
      setTasks(prevTasks);
      setError("Could not move task — reverted.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f7fb]">
        <Navbar />
        <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-gray-500">Loading workspace…</p>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="min-h-screen bg-[#f7f7fb]">
        <Navbar />
        <p className="mx-auto max-w-6xl px-4 py-8 text-sm text-red-600">{error || "Workspace not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{workspace.name}</h1>
            <p className="text-sm text-gray-500">{workspace.description || "No description"}</p>
            <div className="mt-2 flex -space-x-2">
              {workspace.members.map((m) => (
                <span
                  key={m.user._id}
                  title={`${m.user.name} · ${m.role}`}
                  className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[var(--color-accent)] text-xs font-medium text-white"
                >
                  {m.user.name[0].toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            {canManageMembers && (
              <button
                onClick={() => setShowInvite((s) => !s)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-white"
              >
                {showInvite ? "Close" : "Invite member"}
              </button>
            )}
            <button
              onClick={() => setShowTaskForm((s) => !s)}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-dark)]"
            >
              {showTaskForm ? "Cancel" : "+ New task"}
            </button>
          </div>
        </div>

        {showInvite && (
          <form
            onSubmit={handleInvite}
            className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Email</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
                placeholder="teammate@college.edu"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-700">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
              >
                <option value="student">Student</option>
                <option value="lead">Team Lead</option>
                <option value="mentor">Mentor</option>
              </select>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-dark)]"
            >
              Add
            </button>
            {inviteMsg && <p className="text-xs text-gray-500">{inviteMsg}</p>}
          </form>
        )}

        {showTaskForm && (
          <form
            onSubmit={handleCreateTask}
            className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
                <input
                  type="text"
                  required
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  placeholder="Set up auth API"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Assignee</label>
                <select
                  value={taskForm.assignedTo}
                  onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="">Unassigned</option>
                  {workspace.members.map((m) => (
                    <option key={m.user._id} value={m.user._id}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Priority</label>
                <select
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Deadline</label>
                <input
                  type="date"
                  value={taskForm.deadline}
                  onChange={(e) => setTaskForm({ ...taskForm, deadline: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)]"
                  placeholder="Optional details"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={creatingTask}
              className="mt-4 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-dark)] disabled:opacity-60"
            >
              {creatingTask ? "Creating…" : "Create task"}
            </button>
          </form>
        )}

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="flex flex-col gap-4 sm:flex-row">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col}
                id={col}
                tasks={tasks.filter((t) => t.status === col)}
                onDelete={handleDeleteTask}
              />
            ))}
          </div>
        </DndContext>
      </main>
    </div>
  );
}
