import { useState } from 'react';
import DiaryList from '../../components/organisms/DiaryList';

const JournalPage = () => {
  const [yearRange, setYearRange] = useState<string | null>(null);

  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(91,206,250,0.22),_transparent_40%),linear-gradient(180deg,#f6fbff_0%,#eef6ff_38%,#f8fbff_100%)] pb-0 text-slate-900">
      <section className="relative overflow-hidden">

        <div className="relative bg-[linear-gradient(180deg,#56c8ff_0%,#7ddcff_100%)] px-5 pb-5 pt-5 shadow-[0_1.5rem_3rem_rgba(72,180,232,0.24)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold tracking-[-0.04em] text-white drop-shadow-[0_1px_12px_rgba(255,255,255,0.18)]">日志</p>
              {yearRange && <p className="mt-1 text-sm font-medium text-white/85">{yearRange}</p>}
            </div>
            <div className="hidden rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm sm:block">
              只看日志
            </div>
          </div>
        </div>
      </section>

      <div className="bg-white min-h-[calc(100dvh-140px)] pb-6 pt-1">
        <DiaryList onYearRangeChange={setYearRange} />
      </div>
    </main>
  );
};

export default JournalPage;
