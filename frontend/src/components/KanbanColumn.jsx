import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import TaskCard from "./TaskCard";

const columnStyles = {
  TODO: { label: "Backlog", dot: "bg-gray-400" },
  IN_PROGRESS: { label: "In Progress", dot: "bg-amber-500" },
  DONE: { label: "Done", dot: "bg-emerald-500" },
};

export default function KanbanColumn({ id, tasks, onDelete }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const meta = columnStyles[id];

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[300px] flex-1 flex-col rounded-xl border p-3 transition ${
        isOver ? "border-[var(--color-accent)] bg-indigo-50/40" : "border-gray-200 bg-gray-50"
      }`}
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
        <h3 className="text-sm font-semibold text-gray-700">{meta.label}</h3>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs text-gray-400">
          {tasks.length}
        </span>
      </div>

      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-1 flex-col gap-2">
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onDelete={onDelete} />
          ))}
          {tasks.length === 0 && (
            <p className="mt-4 text-center text-xs text-gray-400">Drop tasks here</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}
