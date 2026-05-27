import type { Deadline, Screen } from "../types";
import { AppButton, Badge } from "../components/primitives";
import { days } from "../data";
import { cn } from "@/lib/utils";
import { cookingEffortReason, workloadLabel } from "../workloadModel";
import type { TrackPrototypeEvent } from "../analytics";

export function CalendarScreen({
  deadlines,
  setDeadlines,
  setScreen,
  track,
}: {
  deadlines: Deadline[];
  setDeadlines: (deadlines: Deadline[]) => void;
  setScreen: (screen: Screen) => void;
  track: TrackPrototypeEvent;
}) {
  function updateDeadline(id: string, patch: Partial<Deadline>) {
    setDeadlines(deadlines.map((deadline) => (deadline.id === id ? { ...deadline, ...patch, confirmed: true } : deadline)));
    track("calendar_workload_updated", { deadline_id: id, fields: Object.keys(patch) });
  }

  return (
    <div>
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Deadline calendar</h1>
          <p className="mt-2 text-stone-600">Confirm which events are academic and how much effort they need, then Autopilot adjusts cooking effort.</p>
        </div>
        <AppButton variant="secondary" onClick={() => { track("calendar_manage_import_clicked", { deadline_count: deadlines.length }); setScreen("settings"); }}>
          Manage import
        </AppButton>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        {days.map((day) => {
          const deadline = deadlines.find((entry) => entry.date === day || entry.date.includes(day.split(" ")[0] ?? ""));

          return (
            <div key={day} className={cn("min-h-52 rounded-lg border p-4", deadline ? "border-amber-200 bg-amber-50" : "border-stone-200 bg-white")}>
              <p className="text-sm font-semibold">{day}</p>
              {deadline ? (
                <div className="mt-5 rounded-lg bg-white p-3 shadow-sm">
                  <Badge tone={deadline.eventType === "academic" ? "amber" : "neutral"}>{workloadLabel(deadline)}</Badge>
                  <p className="mt-2 text-sm font-semibold">{deadline.title}</p>
                  <p className="mt-1 text-xs text-stone-500">{deadline.time}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateDeadline(deadline.id, { eventType: deadline.eventType === "academic" ? "general" : "academic" })}
                      className="rounded-full border border-stone-200 px-2 py-1 text-xs font-medium text-stone-600"
                    >
                      {deadline.eventType === "academic" ? "Academic" : "General"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDeadline(deadline.id, { effortHours: Math.min(10, deadline.effortHours + 1) })}
                      className="rounded-full border border-stone-200 px-2 py-1 text-xs font-medium text-stone-600"
                    >
                      {deadline.effortHours}h effort
                    </button>
                    <button
                      type="button"
                      onClick={() => updateDeadline(deadline.id, { urgency: deadline.urgency === "high" ? "low" : deadline.urgency === "medium" ? "high" : "medium" })}
                      className="rounded-full border border-stone-200 px-2 py-1 text-xs font-medium text-stone-600"
                    >
                      {deadline.urgency} urgency
                    </button>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-stone-500">{cookingEffortReason(deadline)}</p>
                </div>
              ) : (
                <p className="mt-6 text-sm text-stone-400">No academic workload detected</p>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50 p-5">
        <p className="font-semibold text-emerald-900">Why Mixed Mode was chosen</p>
        <p className="mt-2 text-sm text-emerald-800">
          You have clustered academic tasks and late-campus days, but enough time for one short prep session. Your plan places purchased fallbacks on the busiest study days.
        </p>
      </div>
    </div>
  );
}
