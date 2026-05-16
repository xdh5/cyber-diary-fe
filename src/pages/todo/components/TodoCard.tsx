import { Check, Trash2 } from 'lucide-react';
import { BaseSwipeable } from '../../../components/atoms';
import type { Todo } from '../../../services/todo';

interface TodoCardProps {
  todo: Todo;
  onStatusChange: (id: number, status: string) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: number) => void;
  onDiscard: (id: number) => void;
  showDiscardButton?: boolean;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'pending':
      return {
        icon: null,
        iconBg: 'bg-white border-2 border-yellow-400',
        badge: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        text: 'text-slate-900',
        bg: 'bg-white',
      };
    case 'completed':
      return {
        icon: <Check size={16} />,
        iconBg: 'bg-green-500 text-white',
        badge: 'bg-green-100 text-green-700 border-green-200',
        text: 'text-slate-900',
        bg: 'bg-white',
      };
    case 'discarded':
      return {
        icon: null,
        iconBg: 'bg-gray-100 border-2 border-gray-300',
        badge: 'bg-gray-100 text-gray-500 border-gray-200',
        text: 'text-gray-400 line-through',
        bg: 'bg-gray-50',
      };
    default:
      return {
        icon: null,
        iconBg: 'bg-white border-2 border-slate-300',
        badge: 'bg-slate-100 text-slate-600 border-slate-200',
        text: 'text-slate-900',
        bg: 'bg-white',
      };
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pending':
      return '未完成';
    case 'completed':
      return '已完成';
    case 'discarded':
      return '已废弃';
    default:
      return status;
  }
};

const formatDeadline = (deadline: string) => {
  const date = new Date(deadline);
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} (${weekdays[date.getDay()]})`;
};

const formatDateTime = (dateTime: string) => {
  const date = new Date(dateTime);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export const TodoCard = ({
  todo,
  onStatusChange,
  onEdit,
  onDelete,
  onDiscard,
  showDiscardButton = true,
}: TodoCardProps) => {
  const style = getStatusStyle(todo.status);
  const isDiscarded = todo.status === 'discarded';

  return (
    <BaseSwipeable
      onDelete={() => onDelete(todo.id)}
      confirmTitle="确定删除吗？"
      confirmMessage="删除后无法恢复"
      showEdit={true}
      onEdit={() => onEdit(todo)}
    >
      <div
        className={`flex items-start gap-4 p-4 rounded-xl border ${isDiscarded ? 'border-gray-100' : 'border-slate-100'} transition ${!isDiscarded && 'hover:shadow-md'} ${style.bg}`}
      >
        {!isDiscarded && (
          <button
            onClick={() => onStatusChange(todo.id, todo.status)}
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${style.iconBg}`}
          >
            {style.icon}
          </button>
        )}
        {isDiscarded && (
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${style.iconBg}`}
          >
            {style.icon}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className={`font-medium ${style.text}`}>
              {todo.title}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${style.badge}`}
            >
              {getStatusText(todo.status)}
            </span>
          </div>

          <div className={`flex flex-wrap items-center gap-4 text-xs ${isDiscarded ? 'text-gray-300' : 'text-slate-400'}`}>
            <span>截止: {todo.deadline ? formatDeadline(todo.deadline) : '未设置'}</span>
            {todo.completed_at && <span>完成: {formatDateTime(todo.completed_at)}</span>}
          </div>
        </div>

        {showDiscardButton && !isDiscarded && (
          <button
            onClick={() => onDiscard(todo.id)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </BaseSwipeable>
  );
};