import { useMemo, useState, type UIEvent, useEffect } from 'react';
import { addDays, eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth, startOfWeek } from 'date-fns';
import { api } from '../../services/api';
import { getImageUrl } from '../../services/cloudinary';
import type { CalendarEntry } from '../../types/entry';
import { WEEK_LABELS } from '../../types/ui';

const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`;

const buildCalendarGrid = (year: number, month: number) => {
  const monthStart = startOfMonth(new Date(year, month - 1, 1));
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const monthEnd = endOfMonth(monthStart);

  const days = eachDayOfInterval({ start: calendarStart, end: monthEnd });
  while (days.length % 7 !== 0) {
    days.push(addDays(days[days.length - 1], 1));
  }

  return days.map((date) => ({
    date,
    isCurrentMonth: date.getMonth() === monthStart.getMonth(),
    key: format(date, 'yyyy-MM-dd'),
  }));
};

const getInitialVisibleMonths = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return [`${year}-${String(month).padStart(2, '0')}`, `${nextYear}-${String(nextMonth).padStart(2, '0')}`];
};

const CalendarView = () => {
  const [visibleMonths, setVisibleMonths] = useState<string[]>(getInitialVisibleMonths());
  const [allEntries, setAllEntries] = useState<CalendarEntry[]>([]);

  useEffect(() => {
    const fetchEntries = async () => {
      try {
        const data = await api.getEntries();
        if (Array.isArray(data)) {
          setAllEntries(
            data.map((entry: any) => ({
              id: entry.id,
              timestamp: entry.created_at,
              photo_url: entry.photo_url,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load calendar entries:', err);
      }
    };
    fetchEntries();
  }, []);

  const entriesByDate = useMemo(() => {
    return allEntries.reduce((map, entry) => {
      const key = format(parseISO(entry.timestamp), 'yyyy-MM-dd');
      map.set(key, entry);
      return map;
    }, new Map<string, CalendarEntry>());
  }, [allEntries]);

  const months = useMemo(() => {
    return visibleMonths.map((monthString) => {
      const [year, month] = monthString.split('-').map(Number);
      return {
        label: `${year}年${month}月`,
        year,
        month,
        days: buildCalendarGrid(year, month),
      };
    });
  }, [visibleMonths]);

  const handleScroll = (event: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 160) {
      setVisibleMonths((prev) => {
        const last = prev[prev.length - 1];
        const [year, month] = last.split('-').map(Number);
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const nextKey = monthKey(nextYear, nextMonth);
        if (prev.includes(nextKey)) return prev;
        return [...prev, nextKey];
      });
    }
  };

  return (
    <section className="relative rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">日历缩略图</p>
          <h2 className="text-2xl font-semibold text-slate-950">日记日历</h2>
        </div>
        <div className="hidden sm:flex items-center gap-2 rounded-3xl bg-slate-100 px-4 py-2 text-sm text-slate-600">
          {WEEK_LABELS.map((label) => (
            <span key={label} className="w-9 text-center font-medium">
              {label}
            </span>
          ))}
        </div>
      </div>

      <div
        className="max-h-[calc(100vh-14rem)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100"
        onScroll={handleScroll}
      >
        {months.map((month) => (
          <div key={month.label} className="mb-8">
            <h3 className="mb-4 text-lg font-semibold text-slate-900">{month.label}</h3>
            <div className="grid grid-cols-7 gap-2">
              {WEEK_LABELS.map((label) => (
                <div key={label} className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {label}
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-7 gap-2">
              {month.days.map((day) => {
                const dayKey = day.key;
                const entry = entriesByDate.get(dayKey);
                const dayNumber = format(day.date, 'd');

                if (!day.isCurrentMonth) {
                  return <div key={day.key} className="aspect-square rounded-3xl bg-slate-50" />;
                }

                if (entry) {
                  if (entry.photo_url) {
                    return (
                      <div key={day.key} className="relative aspect-square overflow-hidden rounded-3xl bg-slate-100">
                        <img
                          src={getImageUrl(entry.photo_url, 'thumb')}
                          alt={`日记 ${dayNumber}`}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                        <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-white drop-shadow-sm">
                          {dayNumber}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={day.key} className="flex aspect-square flex-col items-center justify-center rounded-3xl bg-slate-100 text-center text-sm font-semibold text-slate-600 shadow-sm">
                      <span className="text-2xl font-bold text-slate-900">{dayNumber}</span>
                      <span className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">无图</span>
                    </div>
                  );
                }

                return (
                  <div key={day.key} className="flex aspect-square items-center justify-center rounded-3xl bg-slate-50 text-xl font-semibold text-slate-400">
                    {dayNumber}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button className="pointer-events-auto absolute bottom-5 right-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--theme-blue)] text-white shadow-[0_1.125rem_2.5rem_-1.125rem_rgba(91,206,250,0.7)] transition hover:brightness-95">
        <span className="text-3xl leading-none">+</span>
      </button>
    </section>
  );
};

export default CalendarView;
