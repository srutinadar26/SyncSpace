import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { SocketIOProvider } from "y-socket.io";
import { IndexeddbPersistence } from "y-indexeddb";
import Quill from "quill";
import QuillCursors from "quill-cursors";
import { QuillBinding } from "y-quill";
import "quill/dist/quill.snow.css";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";

Quill.register("modules/cursors", QuillCursors);

const YJS_TEXT_FIELD = "content";

const CURSOR_COLORS = ["#4f46e5", "#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6"];
const colorForUser = (userId) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

export default function CollaborativeEditor({ workspaceId }) {
  const { user } = useAuth();
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const providerRef = useRef(null);
  const idbRef = useRef(null);
  const bindingRef = useRef(null);

  const [status, setStatus] = useState("connecting"); // connecting | online | offline
  const [pendingChanges, setPendingChanges] = useState(0);
  const [justSynced, setJustSynced] = useState(false);
  const [versions, setVersions] = useState([]);
  const [showVersions, setShowVersions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(null);

  const loadVersions = async () => {
    try {
      const { data } = await api.get(`/documents/${workspaceId}`);
      setVersions(data.versions);
    } catch (err) {
      // non-fatal — version history is a secondary feature
    }
  };

  useEffect(() => {
    if (!editorRef.current) return;

    const ydoc = new Y.Doc();
    const ytext = ydoc.getText(YJS_TEXT_FIELD);

    // Persist edits to IndexedDB so they survive a full page reload/browser
    // close while offline, not just a brief disconnect — this is what makes
    // sync genuinely offline-resilient rather than just reconnect-tolerant.
    const idbPersistence = new IndexeddbPersistence(`syncspace-doc-${workspaceId}`, ydoc);
    idbRef.current = idbPersistence;

    const baseURL = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(
      /\/api\/?$/,
      ""
    );
    const token = localStorage.getItem("syncspace_token");

    const provider = new SocketIOProvider(baseURL, workspaceId, ydoc, {
      autoConnect: true,
      auth: { token, workspaceId },
    });
    providerRef.current = provider;

    const quill = new Quill(editorRef.current, {
      theme: "snow",
      modules: {
        cursors: true,
        toolbar: [
          [{ header: [1, 2, 3, false] }],
          ["bold", "italic", "underline", "strike"],
          ["code-block", "blockquote"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["clean"],
        ],
      },
    });
    quillRef.current = quill;

    const binding = new QuillBinding(ytext, quill, provider.awareness);
    bindingRef.current = binding;

    provider.awareness.setLocalStateField("user", {
      name: user.name,
      color: colorForUser(user.id),
    });

    let pending = 0;
    const handleUpdate = (_update, origin) => {
      if (origin === provider) {
        // change came from the network, not local typing
        return;
      }
      if (!provider.synced) {
        pending += 1;
        setPendingChanges(pending);
      }
    };
    ydoc.on("update", handleUpdate);

    provider.on("status", ({ status: s }) => {
      setStatus(s === "connected" ? "online" : "offline");
    });

    provider.on("sync", (isSynced) => {
      if (isSynced) {
        setStatus("online");
        if (pending > 0) {
          setJustSynced(true);
          setTimeout(() => setJustSynced(false), 3000);
        }
        pending = 0;
        setPendingChanges(0);
      }
    });

    loadVersions();

    return () => {
      binding.destroy();
      provider.destroy();
      idbPersistence.destroy();
      ydoc.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const handleSaveVersion = async () => {
    setSaving(true);
    try {
      const label = window.prompt("Label for this version (optional):", "") || "";
      await api.post(`/documents/${workspaceId}/versions`, { label });
      await loadVersions();
    } catch (err) {
      // no-op — surfaced implicitly by the version list not updating
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (versionId) => {
    if (!window.confirm("Restore this version? This will replace the current document content for everyone.")) {
      return;
    }
    setRestoring(versionId);
    try {
      await api.post(`/documents/${workspaceId}/versions/${versionId}/restore`);
    } catch (err) {
      // no-op
    } finally {
      setRestoring(null);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "online" ? "bg-emerald-500" : status === "connecting" ? "bg-amber-400" : "bg-gray-400"
            }`}
          />
          <span className="text-gray-500">
            {status === "online" && pendingChanges === 0 && !justSynced && "Live"}
            {status === "online" && pendingChanges > 0 && `Syncing ${pendingChanges} local change${pendingChanges > 1 ? "s" : ""}…`}
            {status === "online" && justSynced && pendingChanges === 0 && "Local changes merged"}
            {status === "offline" && "Offline — edits are saved locally and will sync when reconnected"}
            {status === "connecting" && "Connecting…"}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSaveVersion}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save version"}
          </button>
          <button
            onClick={() => setShowVersions((s) => !s)}
            className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
          >
            History ({versions.length})
          </button>
        </div>
      </div>

      {showVersions && (
        <div className="max-h-48 overflow-y-auto border-b border-gray-200 bg-gray-50 px-4 py-2">
          {versions.length === 0 ? (
            <p className="py-2 text-xs text-gray-400">No saved versions yet.</p>
          ) : (
            <ul className="divide-y divide-gray-200">
              {versions.map((v) => (
                <li key={v._id} className="flex items-center justify-between py-2 text-xs">
                  <div>
                    <p className="font-medium text-gray-700">{v.label || "Untitled version"}</p>
                    <p className="text-gray-400">
                      {new Date(v.savedAt).toLocaleString()} · {v.savedBy?.name || "Unknown"}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRestore(v._id)}
                    disabled={restoring === v._id}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-600 hover:bg-white disabled:opacity-60"
                  >
                    {restoring === v._id ? "Restoring…" : "Restore"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div ref={editorRef} className="min-h-[300px]" />
    </div>
  );
}
