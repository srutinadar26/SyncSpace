import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const priorityStyles = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-amber-100 text-amber-700",
  HIGH: "bg-red-100 text-red-700",
};

export default function TaskCard({ task, onDelete, onManageDependencies }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task._id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue =
    task.deadline && new Date(task.deadline) < new Date() && task.status !== "DONE";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab rounded-lg border bg-white p-3 shadow-sm active:cursor-grabbing ${
        task.isBlocked ? "border-amber-300" : "border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{task.title}</p>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task._id);
          }}
          className="text-xs text-gray-300 hover:text-red-500"
          title="Delete task"
        >
          ✕
        </button>
      </div>

      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-gray-500">{task.description}</p>
      )}

      {task.isBlocked && (
        <p className="mt-1 text-[11px] font-medium text-amber-600">
          🔒 Blocked on {task.dependsOn.filter((d) => d.status !== "DONE").length} dependenc
          {task.dependsOn.filter((d) => d.status !== "DONE").length === 1 ? "y" : "ies"}
        </p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${priorityStyles[task.priority] || priorityStyles.MEDIUM}`}
        >
          {task.priority}
        </span>

        {task.deadline && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              isOverdue ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            }`}
          >
            {new Date(task.deadline).toLocaleDateString()}
          </span>
        )}

        {task.assignedTo && (
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-[var(--color-accent)]">
            {task.assignedTo.name}
          </span>
        )}

        {onManageDependencies && (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onManageDependencies(task);
            }}
            className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-200"
            title="Manage dependencies"
          >
            🔗 {task.dependsOn?.length || 0}
          </button>
        )}
      </div>
    </div>
  );
}
