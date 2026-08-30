import * as Y from "yjs";
import { YSocketIO } from "y-socket.io/dist/server";
import jwt from "jsonwebtoken";
import Workspace from "../models/Workspace.js";
import DocumentModel from "../models/Document.js";

// The Y.Text field name shared by the client's Quill binding and any
// server-side manipulation (version restore). Keep these in sync.
export const YJS_TEXT_FIELD = "content";

let ySocketIO = null;
const saveTimers = new Map();
const SAVE_DEBOUNCE_MS = 2000;

export const initYjs = (io) => {
  ySocketIO = new YSocketIO(io, {
    // NOTE: y-socket.io's authenticate callback only receives the socket's
    // handshake, not the target namespace/room name, so we can't directly
    // verify the room name being connected to matches the workspaceId
    // being authenticated here. The client is trusted to set roomName ===
    // workspaceId (which our own client code does) — this is a known,
    // documented limitation of the library's auth hook, not a full
    // per-room ACL.
    authenticate: async (handshake) => {
      try {
        const { token, workspaceId } = handshake.auth || {};
        if (!token || !workspaceId) return false;

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const workspace = await Workspace.findById(workspaceId);
        if (!workspace) return false;

        return workspace.members.some((m) => m.user.toString() === decoded.id);
      } catch (err) {
        return false;
      }
    },
  });

  // Hydrate a document from MongoDB the first time it's opened.
  ySocketIO.on("document-loaded", async (doc) => {
    try {
      const record = await DocumentModel.findOne({ workspace: doc.name });
      if (record?.content?.length) {
        Y.applyUpdate(doc, new Uint8Array(record.content));
      }
    } catch (err) {
      console.error("Failed to hydrate Yjs document:", err.message);
    }
  });

  // Debounced autosave of the live document state to MongoDB.
  ySocketIO.on("document-update", ([doc]) => {
    clearTimeout(saveTimers.get(doc.name));
    saveTimers.set(
      doc.name,
      setTimeout(async () => {
        try {
          const content = Buffer.from(Y.encodeStateAsUpdate(doc));
          await DocumentModel.findOneAndUpdate(
            { workspace: doc.name },
            { content },
            { upsert: true }
          );
        } catch (err) {
          console.error("Failed to persist Yjs document:", err.message);
        }
      }, SAVE_DEBOUNCE_MS)
    );
  });

  ySocketIO.initialize();

  return ySocketIO;
};

export const getYSocketIO = () => ySocketIO;
