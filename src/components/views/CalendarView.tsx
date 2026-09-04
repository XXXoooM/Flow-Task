import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import zhLocale from "@fullcalendar/core/locales/zh-cn";
import { format } from "date-fns";
import { useTasks } from "@/hooks/useTasks";
import { useTaskStore } from "@/stores/taskStore";
import { PRIORITY_META } from "@/lib/constants";
import type { Task } from "@/types/task";

function dispatchNewTask(due: string) {
  window.dispatchEvent(new CustomEvent("flowtask:new", { detail: due }));
}
function dispatchEdit(id: string) {
  window.dispatchEvent(new CustomEvent("flowtask:edit", { detail: id }));
}

export function CalendarView() {
  const { tasks } = useTasks();
  const patchTask = useTaskStore((s) => s.patchTask);

  const events = useMemo(
    () =>
      tasks
        .filter((t): t is Task => !!t.due_date)
        .map((t) => ({
          id: t.id,
          title: t.title,
          start: t.due_date as string,
          allDay: true,
          backgroundColor: (PRIORITY_META[t.priority] ?? PRIORITY_META[3]).color,
          borderColor: "transparent",
          classNames: t.completed ? ["ft-event-done"] : [],
        })),
    [tasks]
  );

  function setDue(id: string, start: Date | null) {
    if (!start) return;
    void patchTask(id, { due_date: format(start, "yyyy-MM-dd") });
  }

  return (
    <div className="h-full rounded-[10px] bg-bg-surface p-3 ring-1 ring-border/50 ft-calendar">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={zhLocale}
        height="100%"
        firstDay={1}
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek",
        }}
        buttonText={{ today: "今天", month: "月", week: "周" }}
        events={events}
        editable
        dayMaxEventRows={4}
        eventDisplay="block"
        slotDuration="01:00:00"
        nowIndicator
        moreLinkText={(n) => `+${n}`}
        dateClick={(arg) => dispatchNewTask(arg.dateStr.slice(0, 10))}
        eventClick={(arg) => dispatchEdit(arg.event.id)}
        eventDrop={(arg) => setDue(arg.event.id, arg.event.start)}
        eventResize={(arg) => setDue(arg.event.id, arg.event.end ?? arg.event.start)}
      />
    </div>
  );
}
