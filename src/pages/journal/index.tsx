import { useState } from 'react';
import DiaryList from '../../components/organisms/DiaryList';
import CalendarView from '../../components/organisms/CalendarView';
import MapView from '../../components/organisms/MapView';
import type { TabKey } from '../../types/ui';

const navItems = [
  { key: 'list', label: '列表' },
  { key: 'calendar', label: '日历' },
  { key: 'map', label: '地图' },
] as const;

const JournalPage = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('list');

  return (
    <main className="min-h-0 bg-slate-100 pb-0">
      <section className="bg-[linear-gradient(180deg,#5BCEFA_0%,#6ED6FF_58%,#8AE1FF_100%)] px-0 pb-4 pt-4 text-slate-950">
        <div className="flex items-start justify-between gap-4">
          <div className="px-4 pt-1">
            <p className="text-4xl font-semibold tracking-[-0.04em] text-white drop-shadow-[0_1px_12px_rgba(255,255,255,0.18)]">日志</p>
            <p className="mt-1 text-sm font-medium text-white/85">2023 - 2026年</p>
          </div>
        </div>

        <div className="mx-4 mt-5 flex items-center rounded-[1.5rem] bg-white/92 px-4 py-3 shadow-[0_1.25rem_3rem_rgba(15,23,42,0.12)] backdrop-blur-xl">
          {navItems.map((item) => {
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveTab(item.key)}
                className="relative flex flex-1 items-center justify-center py-2 text-sm font-medium transition"
                style={{ color: active ? '#111827' : '#9CA3AF' }}
              >
                {item.label}
                {active ? <span className="absolute -bottom-0.5 h-1 w-5 rounded-full bg-[var(--theme-blue)]" /> : null}
              </button>
            );
          })}
        </div>
      </section>

      <div className="-mt-3 bg-slate-100 px-0 pb-6 pt-3">
        {activeTab === 'list' && <DiaryList />}
        {activeTab === 'calendar' && <CalendarView />}
        {activeTab === 'map' && <MapView />}
      </div>
    </main>
  );
};

export default JournalPage;
