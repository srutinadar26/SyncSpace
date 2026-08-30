import { useEffect, useState } from "react";
import api from "../api/axios";
import { getSocket } from "../socket";
import { SkeletonList } from "./Skeleton";

const daysUntil = (dueDate) => {
  const ms = new Date(dueDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
};

const countdownBadge = (dueDate, completed) => {
  if (completed) return { text: "Done", className: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" };
  const days = daysUntil(dueDate);
  if (days < 0) return { text: `${Math.abs(days)}d overdue`, className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" };
  if (days === 0) return { text: "Due today", className: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" };
  if (days <= 3) return { text: `${days}d left`, className: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" };
  return { text: `${days}d left`, className: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400" };
};

export default function MilestoneTracker({ workspaceId }) {
  const [milestones, setMilestones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", dueDate: "" });
  const [creating, setCreating] = useState(false);

  const loadMilestones = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/milestones/workspace/${workspaceId}`);
      setMilestones(data.milestones);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMilestones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    const socket = getSocket();
    const handleCreated = ({ milestone }) => {
      setMilestones((prev) => (prev.some((m) => m._id === milestone._id) ? prev : [...prev, milestone]));
    };
    const handleUpdated = ({ milestone }) => {
      setMilestones((prev) => prev.map((m) => (m._id === milestone._id ? milestone : m)));
    };
    const handleDeleted = ({ milestoneId }) => {
      setMilestones((prev) => prev.filter((m) => m._id !== milestoneId));
    };

    socket.on("milestone:created", handleCreated);
    socket.on("milestone:updated", handleUpdated);
    socket.on("milestone:deleted", handleDeleted);

    return () => {
      socket.off("milestone:created", handleCreated);
      socket.off("milestone:updated", handleUpdated);
      socket.off("milestone:deleted", handleDeleted);
    };
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.dueDate) return;
    setCreating(true);
    try {
      await api.post(`/milestones/workspace/${workspaceId}`, form);
      setForm({ title: "", description: "", dueDate: "" });
      setShowForm(false);
    } catch (err) {
      // no-op
    } finally {
      setCreating(false);
    }
  };

  const toggleComplete = async (milestone) => {
    try {
      await api.patch(`/milestones/${milestone._id}`, { completed: !milestone.completed });
    } catch (err) {
      // no-op
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/milestones/${id}`);
    } catch (err) {
      // no-op
    }
  };

  const sorted = [...milestones].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Milestones & deadlines</h3>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 transition hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          {showForm ? "Cancel" : "+ New milestone"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              type="text"
              required
              placeholder="Milestone title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)] sm:col-span-2"
            />
            <input
              type="date"
              required
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <input
            type="text"
            placeholder="Description (optional)"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-3 w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="submit"
            disabled={creating}
            className="mt-3 rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-dark)] disabled:opacity-60"
          >
            {creating ? "Adding…" : "Add milestone"}
          </button>
        </form>
      )}

      <div className="p-2">
        {loading ? (
          <SkeletonList rows={3} />
        ) : sorted.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-gray-400 dark:text-gray-500">
            No milestones yet — add your first deadline.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {sorted.map((m) => {
              const badge = countdownBadge(m.dueDate, m.completed);
              return (
                <li key={m._id} className="flex items-start gap-3 px-2 py-3">
                  <input
                    type="checkbox"
                    checked={m.completed}
                    onChange={() => toggleComplete(m)}
                    className="mt-1 rounded border-gray-300 dark:border-gray-700"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium ${m.completed ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-900 dark:text-gray-100"}`}>
                      {m.title}
                    </p>
                    {m.description && <p className="text-xs text-gray-500 dark:text-gray-400">{m.description}</p>}
                    <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                      Due {new Date(m.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.className}`}>
                    {badge.text}
                  </span>
                  <button
                    onClick={() => handleDelete(m._id)}
                    className="shrink-0 text-xs text-gray-300 hover:text-red-500"
                    title="Delete milestone"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
