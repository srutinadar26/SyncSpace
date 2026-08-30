// Deterministic "project intelligence" logic — formulas and aggregation
// only, no ML models. Every function here is a pure function of its
// inputs so it's easy to unit test and safe to call on every task change.

const DAY_MS = 1000 * 60 * 60 * 24;

const isOverdue = (task) =>
  task.deadline && new Date(task.deadline) < new Date() && task.status !== "DONE";

// ---------------------------------------------------------------------
// Risk Engine
// ---------------------------------------------------------------------
// Weighted score (0-100) from five signals: overdue tasks, backlog size,
// workload imbalance, blocked tasks, and a velocity slowdown. Higher is
// riskier. Weights are hand-tuned, not learned.
export const computeRiskScore = (tasks, members) => {
  const total = tasks.length || 1;

  const overdueCount = tasks.filter(isOverdue).length;
  const backlogCount = tasks.filter((t) => t.status === "TODO").length;
  const blockedCount = tasks.filter((t) => t.isBlocked).length;

  // Workload imbalance: variance of each member's open-task count,
  // normalized against the mean so it's comparable across team sizes.
  const openCounts = members.map(
    (m) => tasks.filter((t) => t.status !== "DONE" && t.assignedTo?._id === m.user._id).length
  );
  const mean = openCounts.reduce((a, b) => a + b, 0) / (openCounts.length || 1);
  const variance =
    openCounts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / (openCounts.length || 1);
  const imbalanceScore = mean > 0 ? Math.min(variance / (mean * mean || 1), 1) : 0;

  // Velocity trend: tasks completed in the last 7 days vs the 7 days
  // before that. A slowdown (recent < historical) adds risk.
  const now = Date.now();
  const doneTasks = tasks.filter((t) => t.status === "DONE" && t.updatedAt);
  const recentDone = doneTasks.filter((t) => now - new Date(t.updatedAt).getTime() <= 7 * DAY_MS).length;
  const historicalDone = doneTasks.filter((t) => {
    const age = now - new Date(t.updatedAt).getTime();
    return age > 7 * DAY_MS && age <= 14 * DAY_MS;
  }).length;
  const velocitySlowdown =
    historicalDone > 0 ? Math.max(0, (historicalDone - recentDone) / historicalDone) : 0;

  const factors = [
    { name: "Overdue tasks", value: overdueCount, weight: 30, contribution: Math.min(overdueCount / total, 1) * 30 },
    { name: "Backlog size", value: backlogCount, weight: 15, contribution: Math.min(backlogCount / total, 1) * 15 },
    { name: "Workload imbalance", value: Number(imbalanceScore.toFixed(2)), weight: 20, contribution: imbalanceScore * 20 },
    { name: "Blocked tasks", value: blockedCount, weight: 20, contribution: Math.min(blockedCount / total, 1) * 20 },
    { name: "Velocity slowdown", value: `${Math.round(velocitySlowdown * 100)}%`, weight: 15, contribution: velocitySlowdown * 15 },
  ];

  const score = Math.round(factors.reduce((sum, f) => sum + f.contribution, 0));

  let label = "Low";
  if (score >= 60) label = "High";
  else if (score >= 30) label = "Medium";

  // Plain-language recommendation targeting the single biggest contributor.
  const topFactor = [...factors].sort((a, b) => b.contribution - a.contribution)[0];
  let recommendation = "Project is on track — no immediate action needed.";
  if (score >= 30) {
    if (topFactor.name === "Overdue tasks") {
      recommendation = `${overdueCount} task(s) are overdue — reprioritize or extend their deadlines.`;
    } else if (topFactor.name === "Workload imbalance") {
      const maxIdx = openCounts.indexOf(Math.max(...openCounts));
      const overloadedMember = members[maxIdx];
      recommendation = overloadedMember
        ? `Workload is uneven — consider redistributing tasks from ${overloadedMember.user.name}.`
        : "Workload is uneven across the team — consider redistributing tasks.";
    } else if (topFactor.name === "Blocked tasks") {
      recommendation = `${blockedCount} task(s) are blocked on dependencies — unblock these first.`;
    } else if (topFactor.name === "Backlog size") {
      recommendation = "Backlog is growing — consider breaking down or triaging pending tasks.";
    } else if (topFactor.name === "Velocity slowdown") {
      recommendation = "Completion rate has slowed compared to last week — check in with the team.";
    }
  }

  return { score, label, factors, recommendation };
};

// ---------------------------------------------------------------------
// Team Workload Balancer
// ---------------------------------------------------------------------
// Aggregates open-task load per member and suggests moving tasks from
// the most-loaded member to the least-loaded one until load is roughly
// even (or the overload threshold is no longer exceeded).
export const computeWorkload = (tasks, members, overloadThresholdPercent = 40) => {
  const openTasks = tasks.filter((t) => t.status !== "DONE");
  const totalOpen = openTasks.length || 1;

  const memberLoads = members.map((m) => {
    const memberTasks = openTasks.filter((t) => t.assignedTo?._id === m.user._id);
    return {
      userId: m.user._id,
      name: m.user.name,
      openTasks: memberTasks.length,
      percentLoad: Math.round((memberTasks.length / totalOpen) * 100),
    };
  });

  const overloaded = memberLoads
    .map((m) => ({ ...m, overloaded: m.percentLoad > overloadThresholdPercent }))
    .sort((a, b) => b.openTasks - a.openTasks);

  // Greedy reassignment suggestions: move tasks one at a time from the
  // currently-most-loaded member to the currently-least-loaded member,
  // until no member exceeds the threshold or there's nothing left to move.
  const recommendations = [];
  const workingLoads = overloaded.map((m) => ({ ...m }));
  const unassignedTaskPool = new Map(
    workingLoads.map((m) => [
      m.userId,
      openTasks.filter((t) => t.assignedTo?._id === m.userId),
    ])
  );

  let guard = 0;
  while (guard < 50) {
    guard += 1;
    workingLoads.sort((a, b) => b.openTasks - a.openTasks);
    const most = workingLoads[0];
    const least = workingLoads[workingLoads.length - 1];

    if (!most || !least || most.userId === least.userId) break;
    const mostPercent = Math.round((most.openTasks / totalOpen) * 100);
    if (mostPercent <= overloadThresholdPercent) break;
    if (most.openTasks - least.openTasks < 2) break;

    const pool = unassignedTaskPool.get(most.userId) || [];
    const taskToMove = pool.pop();
    if (!taskToMove) break;

    recommendations.push({
      taskId: taskToMove._id,
      taskTitle: taskToMove.title,
      fromUserId: most.userId,
      fromName: most.name,
      toUserId: least.userId,
      toName: least.name,
    });

    most.openTasks -= 1;
    least.openTasks += 1;
  }

  return { members: overloaded, recommendations };
};

// ---------------------------------------------------------------------
// Smart Deadline Prediction
// ---------------------------------------------------------------------
// Linear projection: (remaining tasks, adjusted for blocked tasks) /
// (recent velocity in tasks/day) = days to completion.
export const computeDeadlinePrediction = (tasks, targetDeadline) => {
  const now = Date.now();
  const doneTasks = tasks.filter((t) => t.status === "DONE" && t.updatedAt);
  const recentDone = doneTasks.filter(
    (t) => now - new Date(t.updatedAt).getTime() <= 7 * DAY_MS
  ).length;
  const velocityPerDay = recentDone / 7;

  const remaining = tasks.filter((t) => t.status !== "DONE");
  const blockedRemaining = remaining.filter((t) => t.isBlocked).length;
  // Blocked tasks slow the effective pace: treat each blocked task as
  // worth 1.5x a normal task since it needs its dependency resolved first.
  const adjustedRemaining = remaining.length + blockedRemaining * 0.5;

  if (velocityPerDay <= 0) {
    return {
      velocityPerDay: 0,
      remainingTasks: remaining.length,
      predictedCompletionDate: null,
      targetDeadline: targetDeadline || null,
      atRisk: remaining.length > 0,
      gapDays: null,
      note:
        remaining.length > 0
          ? "No tasks completed in the last 7 days — not enough data to project a completion date."
          : "All tasks are complete.",
    };
  }

  const daysToComplete = Math.ceil(adjustedRemaining / velocityPerDay);
  const predictedDate = new Date(now + daysToComplete * DAY_MS);

  let atRisk = false;
  let gapDays = null;
  if (targetDeadline) {
    const target = new Date(targetDeadline);
    gapDays = Math.ceil((predictedDate.getTime() - target.getTime()) / DAY_MS);
    atRisk = gapDays > 0;
  }

  return {
    velocityPerDay: Number(velocityPerDay.toFixed(2)),
    remainingTasks: remaining.length,
    predictedCompletionDate: predictedDate,
    targetDeadline: targetDeadline || null,
    atRisk,
    gapDays,
    note: null,
  };
};
