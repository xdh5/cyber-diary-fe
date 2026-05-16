import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, BookOpen, Clock } from 'lucide-react';

const RecordsPage = () => {
  const navigate = useNavigate();

  const records = [
    {
      id: 'food',
      label: '美食',
      icon: UtensilsCrossed,
      path: '/food',
      color: 'bg-gradient-to-br from-orange-100 to-orange-50',
      iconColor: 'text-orange-500',
    },
    {
      id: 'diary',
      label: '日记',
      icon: BookOpen,
      path: '/journal',
      color: 'bg-gradient-to-br from-blue-100 to-blue-50',
      iconColor: 'text-blue-500',
    },
    {
      id: 'countdown',
      label: '倒数日',
      icon: Clock,
      path: '/countdown',
      color: 'bg-gradient-to-br from-purple-100 to-purple-50',
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(91,206,250,0.22),_transparent_40%),linear-gradient(180deg,#f6fbff_0%,#eef6ff_38%,#f8fbff_100%)] pb-24 text-slate-900">
      {/* Header */}
      <section className="relative overflow-hidden">
        <div className="relative bg-[linear-gradient(180deg,#56c8ff_0%,#7ddcff_100%)] px-5 pb-5 pt-5 shadow-[0_1.5rem_3rem_rgba(72,180,232,0.24)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold tracking-[-0.04em] text-white drop-shadow-[0_1px_12px_rgba(255,255,255,0.18)]">
                记录
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid Content */}
      <div className="bg-white min-h-[calc(100dvh-140px)] pt-8">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-4 sm:gap-6">
            {records.map((record) => {
              const Icon = record.icon;
              return (
                <button
                  key={record.id}
                  onClick={() => navigate(record.path)}
                  className={`flex aspect-square flex-col items-center justify-center gap-3 rounded-lg p-6 transition-all hover:shadow-lg active:scale-95 ${record.color}`}
                >
                  <div className={`rounded-full bg-white p-4 shadow-md`}>
                    <Icon size={32} className={record.iconColor} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {record.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
};

export default RecordsPage;
