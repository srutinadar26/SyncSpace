import { useEffect, useState } from "react";
import api from "../api/axios";

const riskColors = {
  Low: "bg-emerald-100 text-emerald-700",
  Medium: "bg-amber-100 text-amber-700",
  High: "bg-red-100 text-red-700",
};

export default function Insights({ workspaceId, targetDeadline, onTargetDeadlineChange }) {
  const [risk, setRisk] = useState(null);
  const [workload, setWorkload] = useState(null);
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(null);
  const [deadlineInput, setDeadlineInput] = useState(
    targetDeadline ? new Date(targetDeadline).toISOString().slice(0, 10) : ""
  );
  const [savingDeadline, setSavingDeadline] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [riskRes, workloadRes, predictionRes] = await Promise.all([
        api.get(`/insights/${workspaceId}/risk`),
        api.get(`/insights/${workspaceId}/workload`),
        api.get(`/insights/${workspaceId}/deadline-prediction`),
      ]);
      setRisk(riskRes.data.risk);
      setWorkload(workloadRes.data.workload);
      setPrediction(predictionRes.data.prediction);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const handleApply = async (rec) => {
    setApplying(rec.taskId);
    try {
      await api.post(`/insights/${workspaceId}/workload/apply`, {
        taskId: rec.taskId,
        toUserId: rec.toUserId,
      });
      await loadAll();
    } catch (err) {
      // no-op
    } finally {
      setApplying(null);
    }
  };

  const handleSaveDeadline = async () => {
    setSavingDeadline(true);
    try {
      await api.patch(`/insights/${workspaceId}/target-deadline`, {
        targetDeadline: deadlineInput || null,
      });
      onTargetDeadlineChange?.(deadlineInput || null);
      await loadAll();
    } catch (err) {
      // no-op
    } finally {
      setSavingDeadline(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading insights…</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Risk */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Project risk</h3>
          {risk && (
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${riskColors[risk.label]}`}>
              {risk.label} · {risk.score}/100
            </span>
          )}
        </div>
        {risk && (
          <>
            <p className="mt-2 text-sm text-gray-600">{risk.recommendation}</p>
            <ul className="mt-3 space-y-1.5">
              {risk.factors.map((f) => (
                <li key={f.name} className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">{f.name}</span>
                  <span className="text-gray-700">{f.value}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Deadline prediction */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700">Smart deadline prediction</h3>
        {prediction && (
          <div className="mt-2 space-y-1.5 text-sm">
            <p className="text-gray-600">
              Velocity: <span className="font-medium text-gray-900">{prediction.velocityPerDay}</span> tasks/day
            </p>
            <p className="text-gray-600">
              Remaining: <span className="font-medium text-gray-900">{prediction.remainingTasks}</span> tasks
            </p>
            {prediction.predictedCompletionDate ? (
              <p className="text-gray-600">
                Predicted completion:{" "}
                <span className="font-medium text-gray-900">
                  {new Date(prediction.predictedCompletionDate).toLocaleDateString()}
                </span>
              </p>
            ) : (
              <p className="text-gray-400">{prediction.note}</p>
            )}
            {prediction.targetDeadline && prediction.gapDays !== null && (
              <p className={prediction.atRisk ? "font-medium text-red-600" : "font-medium text-emerald-600"}>
                {prediction.atRisk
                  ? `At risk — projected ${prediction.gapDays} day(s) past your target deadline`
                  : "On track to meet your target deadline"}
              </p>
            )}
          </div>
        )}

        <div className="mt-3 flex items-end gap-2 border-t border-gray-100 pt-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-700">Target deadline</label>
            <input
              type="date"
              value={deadlineInput}
              onChange={(e) => setDeadlineInput(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-[var(--color-accent)]"
            />
          </div>
          <button
            onClick={handleSaveDeadline}
            disabled={savingDeadline}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {savingDeadline ? "Saving…" : "Set"}
          </button>
        </div>
      </div>

      {/* Workload */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:col-span-2">
        <h3 className="text-sm font-semibold text-gray-700">Team workload</h3>

        {workload && (
          <div className="mt-3 space-y-2">
            {workload.members.map((m) => (
              <div key={m.userId} className="flex items-center gap-3">
                <span className="w-20 shrink-0 truncate text-xs text-gray-600">{m.name}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full ${m.overloaded ? "bg-red-400" : "bg-[var(--color-accent)]"}`}
                    style={{ width: `${Math.min(m.percentLoad, 100)}%` }}
                  />
                </div>
                <span className="w-24 shrink-0 text-right text-xs text-gray-500">
                  {m.openTasks} open · {m.percentLoad}%
                </span>
              </div>
            ))}
          </div>
        )}

        {workload?.recommendations?.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-xs font-medium text-gray-500">Suggested rebalancing</p>
            <ul className="mt-2 space-y-2">
              {workload.recommendations.map((rec) => (
                <li
                  key={rec.taskId}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs"
                >
                  <span className="text-gray-600">
                    Move <span className="font-medium text-gray-900">"{rec.taskTitle}"</span> from{" "}
                    {rec.fromName} to {rec.toName}
                  </span>
                  <button
                    onClick={() => handleApply(rec)}
                    disabled={applying === rec.taskId}
                    className="rounded-lg border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                  >
                    {applying === rec.taskId ? "Applying…" : "Apply"}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
