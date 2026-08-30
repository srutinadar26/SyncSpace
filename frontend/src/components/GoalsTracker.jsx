import { useEffect, useState } from "react";
import api from "../api/axios";
import { getSocket } from "../socket";
import { SkeletonList } from "./Skeleton";

const emptyKeyResult = () => ({
  title: "",
  type: "tasks",
  linkedTasks: [],
  targetValue: 100,
  currentValue: 0,
  unit: "",
});

export default function GoalsTracker({ workspaceId, allTasks }) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keyResults, setKeyResults] = useState([emptyKeyResult()]);
  const [creating, setCreating] = useState(false);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/goals/workspace/${workspaceId}`);
      setGoals(data.goals);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGoals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  useEffect(() => {
    const socket = getSocket();
    const handleCreated = ({ goal }) => {
      setGoals((prev) => (prev.some((g) => g._id === goal._id) ? prev : [...prev, goal]));
    };
    const handleUpdated = ({ goal }) => {
      setGoals((prev) => prev.map((g) => (g._id === goal._id ? goal : g)));
    };
    const handleDeleted = ({ goalId }) => {
      setGoals((prev) => prev.filter((g) => g._id !== goalId));
    };

    socket.on("goal:created", handleCreated);
    socket.on("goal:updated", handleUpdated);
    socket.on("goal:deleted", handleDeleted);

    return () => {
      socket.off("goal:created", handleCreated);
      socket.off("goal:updated", handleUpdated);
      socket.off("goal:deleted", handleDeleted);
    };
  }, []);

  const updateKeyResult = (index, patch) => {
    setKeyResults((prev) => prev.map((kr, i) => (i === index ? { ...kr, ...patch } : kr)));
  };

  const toggleLinkedTask = (index, taskId) => {
    setKeyResults((prev) =>
      prev.map((kr, i) => {
        if (i !== index) return kr;
        const linked = new Set(kr.linkedTasks);
        if (linked.has(taskId)) linked.delete(taskId);
        else linked.add(taskId);
        return { ...kr, linkedTasks: Array.from(linked) };
      })
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      await api.post(`/goals/workspace/${workspaceId}`, {
        title,
        description,
        keyResults: keyResults.filter((kr) => kr.title.trim()),
      });
      setTitle("");
      setDescription("");
      setKeyResults([emptyKeyResult()]);
      setShowForm(false);
    } catch (err) {
      // no-op
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (goalId) => {
    try {
      await api.delete(`/goals/${goalId}`);
    } catch (err) {
      // no-op
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Goals & key results</h3>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          {showForm ? "Cancel" : "+ New goal"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-4">
          <input
            type="text"
            required
            placeholder="Goal title (e.g. Ship MVP for demo day)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
          />

          <p className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400">Key results</p>
          <div className="mt-2 space-y-3">
            {keyResults.map((kr, i) => (
              <div key={i} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Key result title"
                    value={kr.title}
                    onChange={(e) => updateKeyResult(i, { title: e.target.value })}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
                  />
                  <select
                    value={kr.type}
                    onChange={(e) => updateKeyResult(i, { type: e.target.value })}
                    className="rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1 text-sm outline-none focus:border-[var(--color-accent)]"
                  >
                    <option value="tasks">Linked tasks</option>
                    <option value="manual">Manual value</option>
                  </select>
                </div>

                {kr.type === "tasks" ? (
                  <div className="mt-2 max-h-24 overflow-y-auto rounded-lg border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-2">
                    {allTasks.length === 0 ? (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">No tasks yet — add tasks on the board first.</p>
                    ) : (
                      allTasks.map((t) => (
                        <label key={t._id} className="flex items-center gap-2 py-0.5 text-xs text-gray-600 dark:text-gray-400">
                          <input
                            type="checkbox"
                            checked={kr.linkedTasks.includes(t._id)}
                            onChange={() => toggleLinkedTask(i, t._id)}
                            className="rounded border-gray-300 dark:border-gray-700"
                          />
                          {t.title}
                        </label>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Current"
                      value={kr.currentValue}
                      onChange={(e) => updateKeyResult(i, { currentValue: Number(e.target.value) })}
                      className="w-20 rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
                    />
                    <span className="text-xs text-gray-400 dark:text-gray-500">/</span>
                    <input
                      type="number"
                      placeholder="Target"
                      value={kr.targetValue}
                      onChange={(e) => updateKeyResult(i, { targetValue: Number(e.target.value) })}
                      className="w-20 rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
                    />
                    <input
                      type="text"
                      placeholder="unit"
                      value={kr.unit}
                      onChange={(e) => updateKeyResult(i, { unit: e.target.value })}
                      className="w-16 rounded-lg border border-gray-300 dark:border-gray-700 px-2 py-1 text-xs outline-none focus:border-[var(--color-accent)]"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setKeyResults((prev) => [...prev, emptyKeyResult()])}
            className="mt-2 text-xs font-medium text-[var(--color-accent)] hover:underline"
          >
            + Add key result
          </button>

          <div>
            <button
              type="submit"
              disabled={creating}
              className="mt-3 rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white transition hover:bg-[var(--color-accent-dark)] disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create goal"}
            </button>
          </div>
        </form>
      )}

      <div className="p-4">
        {loading ? (
          <SkeletonList rows={3} />
        ) : goals.length === 0 ? (
          <p className="py-4 text-center text-xs text-gray-400 dark:text-gray-500">No goals yet — set your first OKR.</p>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => (
              <div key={goal._id} className="rounded-lg border border-gray-200 dark:border-gray-800 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{goal.title}</p>
                    {goal.description && <p className="text-xs text-gray-500 dark:text-gray-400">{goal.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{goal.progress}%</span>
                    <button
                      onClick={() => handleDelete(goal._id)}
                      className="text-xs text-gray-300 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                  <div
                    className="h-full rounded-full bg-[var(--color-accent)]"
                    style={{ width: `${goal.progress}%` }}
                  />
                </div>

                <ul className="mt-2 space-y-1.5">
                  {goal.keyResults.map((kr) => (
                    <li key={kr._id} className="flex items-center gap-2 text-xs">
                      <span className="w-32 shrink-0 truncate text-gray-600 dark:text-gray-400">{kr.title}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-emerald-400"
                          style={{ width: `${kr.progress}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-gray-400 dark:text-gray-500">{kr.progress}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
