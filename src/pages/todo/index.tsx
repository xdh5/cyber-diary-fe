import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, X, Check, XCircle } from 'lucide-react';
import { BaseButton, BaseInput } from '../../components/atoms';
import { getTodos, createTodo, updateTodo, deleteTodo, type Todo } from '../../services/todo';
import { Loading } from '../../components/atoms';
import { getCurrentDiaryDate, formatDateString } from '../../utils/date';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const TodoPage = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', description: '', deadline: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadTodos();
  }, []);

  const loadTodos = async () => {
    try {
      setIsLoading(true);
      const data = await getTodos();
      setTodos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load todos:', error);
      setHasError(true);
      setTodos([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = () => {
    setFormData({ title: '', description: '', deadline: '' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleEdit = (todo: Todo) => {
    setFormData({
      title: todo.title,
      description: todo.description || '',
      deadline: todo.deadline || '',
    });
    setEditingId(todo.id);
    setShowModal(true);
  };

  const handleAddOrEdit = async () => {
    if (!formData.title.trim()) return;

    try {
      setIsSaving(true);
      if (editingId) {
        const updated = await updateTodo(editingId, {
          title: formData.title,
          description: formData.description || undefined,
          deadline: formData.deadline || undefined,
        });
        setTodos(todos.map((item) => (item.id === editingId ? updated : item)));
        setEditingId(null);
      } else {
        const newTodo = await createTodo({
          title: formData.title,
          description: formData.description || undefined,
          deadline: formData.deadline || undefined,
        });
        setTodos([newTodo, ...todos]);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save todo:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定删除吗？')) {
      try {
        await deleteTodo(id);
        setTodos(todos.filter((item) => item.id !== id));
      } catch (error) {
        console.error('Failed to delete todo:', error);
        alert('删除失败，请重试');
      }
    }
  };

  const handleStatusChange = async (id: number, currentStatus: string) => {
    const statusOrder: ('pending' | 'completed' | 'discarded')[] = ['pending', 'completed', 'discarded'];
    const currentIndex = statusOrder.indexOf(currentStatus as any);
    const nextIndex = (currentIndex + 1) % 3;
    const newStatus = statusOrder[nextIndex];

    try {
      const updated = await updateTodo(id, { status: newStatus });
      setTodos(todos.map((item) => (item.id === id ? updated : item)));
    } catch (error) {
      console.error('Failed to update status:', error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'discarded':
        return 'bg-gray-100 text-gray-500 border-gray-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(91,206,250,0.22),_transparent_40%),linear-gradient(180deg,#f6fbff_0%,#eef6ff_38%,#f8fbff_100%)] pb-24 text-slate-900">
        <section className="relative overflow-hidden">
          <div className="relative bg-[linear-gradient(180deg,#9333ea_0%,#a855f7_100%)] px-5 pb-5 pt-5 shadow-[0_1.5rem_3rem_rgba(168,85,247,0.24)]">
            <p className="text-4xl font-semibold tracking-[-0.04em] text-white drop-shadow-[0_1px_12px_rgba(255,255,255,0.18)]">
              待办事项
            </p>
          </div>
        </section>
        <div className="flex items-center justify-center py-12">
          <Loading />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(91,206,250,0.22),_transparent_40%),linear-gradient(180deg,#f6fbff_0%,#eef6ff_38%,#f8fbff_100%)] pb-24 text-slate-900">
      <section className="relative overflow-hidden">
        <div className="relative bg-[linear-gradient(180deg,#9333ea_0%,#a855f7_100%)] px-5 pb-5 pt-5 shadow-[0_1.5rem_3rem_rgba(168,85,247,0.24)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold tracking-[-0.04em] text-white drop-shadow-[0_1px_12px_rgba(255,255,255,0.18)]">
                待办事项
              </p>
            </div>
            <button
              onClick={handleOpenModal}
              className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
      </section>

      <div className="bg-white min-h-[calc(100dvh-140px)] pt-6">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          {todos.length === 0 || hasError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-slate-400 mb-4">暂无待办事项</p>
              <BaseButton
                onClick={handleOpenModal}
                className="bg-purple-500 hover:bg-purple-600"
              >
                添加待办事项
              </BaseButton>
            </div>
          ) : (
            <div className="space-y-3">
              {todos.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md transition"
                >
                  <button
                    onClick={() => handleStatusChange(item.id, item.status)}
                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition ${
                      item.status === 'completed'
                        ? 'bg-green-500 border-green-500 text-white'
                        : item.status === 'discarded'
                        ? 'bg-gray-300 border-gray-300 text-gray-500'
                        : 'border-slate-300 hover:border-purple-400'
                    }`}
                  >
                    {item.status === 'completed' && <Check size={16} />}
                    {item.status === 'discarded' && <XCircle size={16} />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`font-medium ${
                          item.status === 'completed' || item.status === 'discarded'
                            ? 'line-through text-slate-400'
                            : 'text-slate-900'
                        }`}
                      >
                        {item.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full border ${getStatusColor(item.status)}`}
                      >
                        {getStatusText(item.status)}
                      </span>
                    </div>

                    {item.description && (
                      <p className="text-sm text-slate-500 mb-2">{item.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      {item.deadline && (
                        <span>截止: {new Date(item.deadline).toLocaleDateString('zh-CN')}</span>
                      )}
                      {item.completed_at && (
                        <span>完成于: {new Date(item.completed_at).toLocaleString('zh-CN')}</span>
                      )}
                      <span>创建于: {new Date(item.created_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(item)}
                      className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? '编辑待办事项' : '添加待办事项'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  事项标题
                </label>
                <BaseInput
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入事项标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  描述（可选）
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="输入事项描述"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  截止日期（可选）
                </label>
                <DatePicker
                  selected={formData.deadline ? new Date(formData.deadline) : null}
                  onChange={(date: Date | null) =>
                    setFormData({ ...formData, deadline: date ? formatDateString(date) : '' })
                  }
                  dateFormat="yyyy-MM-dd"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg bg-slate-100 py-2 text-slate-900 font-medium transition hover:bg-slate-200 disabled:opacity-50"
                  disabled={isSaving}
                >
                  取消
                </button>
                <button
                  onClick={handleAddOrEdit}
                  className="flex-1 rounded-lg bg-purple-500 py-2 text-white font-medium transition hover:bg-purple-600 disabled:opacity-50"
                  disabled={isSaving || !formData.title.trim()}
                >
                  {isSaving ? '保存中...' : editingId ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default TodoPage;