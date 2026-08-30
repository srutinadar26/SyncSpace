import { useEffect, useState } from "react";
import api from "../api/axios";
import { getSocket } from "../socket";
import { SkeletonList } from "./Skeleton";

const typeIcons = {
  task_created: "＋",
  task_updated: "✎",
  task_status_changed: "→",
  task_deleted: "✕",
  member_added: "👤",
  member_removed: "👤",
  member_role_changed: "👤",
  milestone_created: "🎯",
  milestone_updated: "🎯",
  milestone_deleted: "🎯",
  goal_created: "🏆",
  goal_updated: "🏆",
  goal_deleted: "🏆",
};

export default function ActivityFeed({ workspaceId }) {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sensitiveOnly, setSensitiveOnly] = useState(false);

  const loadActivity = async (filterSensitive) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/activity/${workspaceId}`, {
        params: filterSensitive ? { sensitiveOnly: "true" } : {},
      });
      setActivity(data.activity);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity(sensitiveOnly);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, sensitiveOnly]);

  useEffect(() => {
    const socket = getSocket();
    const handleNew = ({ activity: entry }) => {
      // Only prepend live if it matches the current filter
      if (!sensitiveOnly || entry.sensitive) {
        setActivity((prev) => [entry, ...prev]);
      }
    };
    socket.on("activity:new", handleNew);
    return () => socket.off("activity:new", handleNew);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sensitiveOnly]);

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-4 py-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Activity</h3>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <input
            type="checkbox"
            checked={sensitiveOnly}
            onChange={(e) => setSensitiveOnly(e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-700"
          />
          Permission changes only
        </label>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <SkeletonList rows={4} />
        ) : activity.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-gray-400 dark:text-gray-500">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {activity.map((entry) => (
              <li key={entry._id} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                    entry.sensitive ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" : "bg-indigo-50 dark:bg-indigo-900/30 text-[var(--color-accent)]"
                  }`}
                >
                  {typeIcons[entry.type] || "•"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {entry.message}
                    {entry.sensitive && (
                      <span className="ml-2 rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                        Permission change
                      </span>
                    )}
                  </p>
                  {entry.diff?.length > 0 && (
                    <ul className="mt-1 space-y-0.5 text-[11px] text-gray-400 dark:text-gray-500">
                      {entry.diff.map((d, i) => (
                        <li key={i}>
                          <span className="font-medium">{d.field}:</span>{" "}
                          {formatDiffValue(d.oldValue)} → {formatDiffValue(d.newValue)}
                        </li>
                      ))}
                    </ul>
                  )}
                  <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                    {new Date(entry.createdAt).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function formatDiffValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
