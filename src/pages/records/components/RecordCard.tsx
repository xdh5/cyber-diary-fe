import { useNavigate } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

type RecordCardProps = {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  color: string;
  iconColor: string;
};

const RecordCard = ({ id, label, icon: Icon, path, color, iconColor }: RecordCardProps) => {
  const navigate = useNavigate();

  return (
    <button
      key={id}
      onClick={() => navigate(path)}
      className={`flex aspect-square flex-col items-center justify-center gap-3 rounded-lg p-6 transition-all hover:shadow-lg active:scale-95 ${color}`}
    >
      <div className={`rounded-full bg-white p-4 shadow-md`}>
        <Icon size={32} className={iconColor} />
      </div>
      <span className="text-sm font-medium text-slate-700">{label}</span>
    </button>
  );
};

export default RecordCard;