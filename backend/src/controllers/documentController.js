import * as Y from "yjs";
import DocumentModel from "../models/Document.js";
import Workspace from "../models/Workspace.js";
import { getYSocketIO, YJS_TEXT_FIELD } from "../sockets/yjs.js";

const MAX_VERSIONS = 20;

const assertMembership = async (workspaceId, userId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return null;
  const isMember = workspace.members.some((m) => m.user.toString() === userId.toString());
  return isMember ? workspace : null;
};

// Returns the live in-memory Yjs doc if an editor session is currently
// open for this workspace, otherwise reconstructs one from the last
// persisted state in MongoDB.
const getDocState = async (workspaceId) => {
  const io = getYSocketIO();
  const liveDoc = io?.documents.get(workspaceId.toString());
  if (liveDoc) return { doc: liveDoc, isLive: true };

  const record = await DocumentModel.findOne({ workspace: workspaceId });
  const scratch = new Y.Doc();
  if (record?.content?.length) {
    Y.applyUpdate(scratch, new Uint8Array(record.content));
  }
  return { doc: scratch, isLive: false };
};

export const getDocumentMeta = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const doc = await DocumentModel.findOne({ workspace: workspaceId })
      .select("versions updatedAt")
      .populate("versions.savedBy", "name email");

    const versions = (doc?.versions || [])
      .map((v) => ({ _id: v._id, label: v.label, savedAt: v.savedAt, savedBy: v.savedBy }))
      .sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    res.status(200).json({
      updatedAt: doc?.updatedAt || null,
      versions,
    });
  } catch (error) {
    console.error("Get document meta error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const saveVersion = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { label } = req.body;

    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const { doc } = await getDocState(workspaceId);
    const content = Buffer.from(Y.encodeStateAsUpdate(doc));

    const record = await DocumentModel.findOneAndUpdate(
      { workspace: workspaceId },
      {
        $push: {
          versions: {
            $each: [
              { content, label: label || "", savedBy: req.user._id, savedAt: new Date() },
            ],
            $slice: -MAX_VERSIONS,
          },
        },
      },
      { upsert: true, new: true }
    ).populate("versions.savedBy", "name email");

    const saved = record.versions[record.versions.length - 1];

    res.status(201).json({
      message: "Version saved",
      version: {
        _id: saved._id,
        label: saved.label,
        savedAt: saved.savedAt,
        savedBy: saved.savedBy,
      },
    });
  } catch (error) {
    console.error("Save version error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};

export const restoreVersion = async (req, res) => {
  try {
    const { workspaceId, versionId } = req.params;

    const workspace = await assertMembership(workspaceId, req.user._id);
    if (!workspace) {
      return res.status(403).json({ message: "Not a member of this workspace" });
    }

    const record = await DocumentModel.findOne({ workspace: workspaceId });
    const version = record?.versions.id(versionId);
    if (!version) {
      return res.status(404).json({ message: "Version not found" });
    }

    const scratch = new Y.Doc();
    Y.applyUpdate(scratch, new Uint8Array(version.content));
    const delta = scratch.getText(YJS_TEXT_FIELD).toDelta();

    const { doc, isLive } = await getDocState(workspaceId);
    const ytext = doc.getText(YJS_TEXT_FIELD);
    doc.transact(() => {
      ytext.delete(0, ytext.length);
      ytext.applyDelta(delta);
    });

    if (!isLive) {
      // No active editor session, so nothing will pick up the doc's
      // 'update' event automatically — persist the restored state directly.
      const content = Buffer.from(Y.encodeStateAsUpdate(doc));
      await DocumentModel.findOneAndUpdate(
        { workspace: workspaceId },
        { content },
        { upsert: true }
      );
    }
    // If live, y-socket.io's own update listener on the doc already
    // broadcasts this change to connected clients, and the debounced
    // autosave in sockets/yjs.js will persist it shortly after.

    res.status(200).json({ message: "Version restored" });
  } catch (error) {
    console.error("Restore version error:", error.message);
    res.status(500).json({ message: "Server error" });
  }
};
