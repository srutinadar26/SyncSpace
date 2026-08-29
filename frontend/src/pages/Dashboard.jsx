import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";

export default function Dashboard() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/workspaces");
      setWorkspaces(data.workspaces);
    } catch (err) {
      setError("Could not load workspaces.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setCreating(true);
    setError("");
    try {
      await api.post("/workspaces", form);
      setForm({ name: "", description: "" });
      setShowForm(false);
      await loadWorkspaces();
    } catch (err) {
      setError(err.response?.data?.message || "Could not create workspace.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Your workspaces</h1>
            <p className="text-sm text-gray-500">Projects, hackathons, and group assignments.</p>
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-dark)]"
          >
            {showForm ? "Cancel" : "+ New workspace"}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={handleCreate}
            className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                  placeholder="Smart India Hackathon Team"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)]"
                  placeholder="Optional"
                />
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={creating}
              className="mt-4 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-accent-dark)] disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create workspace"}
            </button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-gray-500">Loading workspaces…</p>
        ) : workspaces.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
            <p className="text-gray-500">No workspaces yet. Create your first one to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((ws) => (
              <Link
                key={ws._id}
                to={`/workspaces/${ws._id}`}
                className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-[var(--color-accent)] hover:shadow-md"
              >
                <h2 className="font-semibold text-gray-900">{ws.name}</h2>
                <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                  {ws.description || "No description"}
                </p>
                <p className="mt-3 text-xs text-gray-400">
                  {ws.members.length} member{ws.members.length !== 1 ? "s" : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
