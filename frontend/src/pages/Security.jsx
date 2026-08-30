import { useEffect, useState } from "react";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import { SkeletonCard } from "../components/Skeleton";

const formatUserAgent = (ua) => {
  if (!ua) return "Unknown device";
  if (/Mobi|Android/i.test(ua)) return "Mobile browser";
  if (/Chrome/i.test(ua)) return "Chrome";
  if (/Firefox/i.test(ua)) return "Firefox";
  if (/Safari/i.test(ua)) return "Safari";
  return "Browser";
};

export default function Security() {
  const [overview, setOverview] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [revokingId, setRevokingId] = useState(null);
  const [revokingOthers, setRevokingOthers] = useState(false);
  const [message, setMessage] = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [overviewRes, sessionsRes] = await Promise.all([
        api.get("/security/overview"),
        api.get("/security/sessions"),
      ]);
      setOverview(overviewRes.data);
      setSessions(sessionsRes.data.sessions);
    } catch (err) {
      // non-fatal
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleRevoke = async (sessionId) => {
    setRevokingId(sessionId);
    try {
      await api.delete(`/security/sessions/${sessionId}`);
      await loadAll();
    } catch (err) {
      // no-op
    } finally {
      setRevokingId(null);
    }
  };

  const handleRevokeOthers = async () => {
    setRevokingOthers(true);
    setMessage("");
    try {
      const { data } = await api.post("/security/sessions/revoke-others");
      setMessage(`Logged out ${data.revokedCount} other device(s).`);
      await loadAll();
    } catch (err) {
      // no-op
    } finally {
      setRevokingOthers(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb] dark:bg-gray-950">
      <Navbar />

      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Security Center</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Your account's login activity and protections.</p>

        {loading ? (
          <div className="mt-6 space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Account overview */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Account overview</h2>
              <dl className="mt-3 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-gray-400 dark:text-gray-500">Last login</dt>
                  <dd className="mt-0.5 text-gray-900 dark:text-gray-100">
                    {overview?.lastLoginAt ? new Date(overview.lastLoginAt).toLocaleString() : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-400 dark:text-gray-500">Active sessions</dt>
                  <dd className="mt-0.5 text-gray-900 dark:text-gray-100">{overview?.activeSessionCount ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 dark:text-gray-500">Recent failed logins</dt>
                  <dd className="mt-0.5 text-gray-900 dark:text-gray-100">{overview?.failedLoginAttempts ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-gray-400 dark:text-gray-500">Account status</dt>
                  <dd className="mt-0.5">
                    {overview?.accountLocked ? (
                      <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                        Temporarily locked
                      </span>
                    ) : (
                      <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        Normal
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Sessions */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 px-5 py-3">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Active sessions</h2>
                <button
                  onClick={handleRevokeOthers}
                  disabled={revokingOthers}
                  className="rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-60"
                >
                  {revokingOthers ? "Logging out…" : "Log out other devices"}
                </button>
              </div>
              {message && <p className="px-5 pt-2 text-xs text-gray-500 dark:text-gray-400">{message}</p>}
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {sessions.map((s) => (
                  <li key={s._id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm text-gray-900 dark:text-gray-100">
                        {formatUserAgent(s.userAgent)}
                        {s.isCurrent && (
                          <span className="ml-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
                            This device
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {s.ip || "Unknown IP"} · last active {new Date(s.lastUsedAt).toLocaleString()}
                      </p>
                    </div>
                    {!s.isCurrent && (
                      <button
                        onClick={() => handleRevoke(s._id)}
                        disabled={revokingId === s._id}
                        className="rounded-lg border border-gray-300 dark:border-gray-700 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 disabled:opacity-60"
                      >
                        {revokingId === s._id ? "…" : "Log out"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Protections checklist */}
            <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Protections enabled</h2>
              <ul className="mt-3 space-y-3">
                {overview?.protections.map((p) => (
                  <li key={p.name} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-400">
                      ✓
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{p.description}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
