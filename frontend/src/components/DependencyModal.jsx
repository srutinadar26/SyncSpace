import { useState } from "react";
import api from "../api/axios";

export default function DependencyModal({ task, allTasks, onClose, onSaved }) {
  const [selected, setSelected] = useState(new Set(task.dependsOn.map((d) => d._id || d)));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const otherTasks = allTasks.filter((t) => t._id !== task._id);

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.patch(`/tasks/${task._id}/dependencies`, {
        dependsOn: Array.from(selected),
      });
      onSaved(data.task);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update dependencies.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-lg">
        <h3 className="text-sm font-semibold text-gray-900">
          Dependencies for "{task.title}"
        </h3>
        <p className="mt-1 text-xs text-gray-500">
          This task will be blocked until the selected tasks are marked Done.
        </p>

        <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-gray-200">
          {otherTasks.length === 0 ? (
            <p className="p-3 text-xs text-gray-400">No other tasks in this workspace yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {otherTasks.map((t) => (
                <li key={t._id} className="flex items-center gap-2 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(t._id)}
                    onChange={() => toggle(t._id)}
                    className="rounded border-gray-300"
                  />
                  <span className="flex-1 text-sm text-gray-700">{t.title}</span>
                  <span className="text-[10px] text-gray-400">{t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-accent-dark)] disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
