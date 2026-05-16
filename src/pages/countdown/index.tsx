import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, X } from 'lucide-react';
import { BaseButton, BaseInput } from '../../components/atoms';
import { countdownService, type Countdown } from '../../services/countdown';
import { Loading } from '../../components/atoms';
import { getCurrentDiaryDate, formatDateString } from '../../utils/date';

const EMOJI_LIST = ['📅', '⏳', '💍', '🎉', '📌', '🚩', '⏰', '🎯', '🏁', '❤️', '🥂', '🎂', '🕯️', '📷', '🎁'];

const CountdownPage = () => {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', targetDate: formatDateString(getCurrentDiaryDate()), emoji: '📅' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [hasError, setHasError] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Load countdowns on mount
  useEffect(() => {
    loadCountdowns();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadCountdowns = async () => {
    try {
      setIsLoading(true);
      const data = await countdownService.getCountdowns();
      setCountdowns(data);
    } catch (error) {
      console.error('Failed to load countdowns:', error);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateDays = (targetDate: string): number => {
    const target = new Date(targetDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    const diff = target.getTime() - today.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getDaysDisplay = (days: number): string => {
    if (days > 0) {
      return `还剩 ${days} 天`;
    } else if (days === 0) {
      return '今天';
    } else {
      return `已过去 ${Math.abs(days)} 天`;
    }
  };

  const handleAddOrEdit = async () => {
    if (!formData.name || !formData.targetDate) {
      alert('请填写所有字段');
      return;
    }

    try {
      setIsSaving(true);
      if (editingId) {
        const updated = await countdownService.updateCountdown(editingId, {
          name: formData.name,
          target_date: formData.targetDate,
          emoji: formData.emoji,
        });
        setCountdowns(
          countdowns.map((item) => (item.id === editingId ? updated : item))
        );
        setEditingId(null);
      } else {
        const newCountdown = await countdownService.createCountdown({
          name: formData.name,
          target_date: formData.targetDate,
          emoji: formData.emoji,
        });
        setCountdowns([...countdowns, newCountdown]);
      }

      setFormData({ name: '', targetDate: '', emoji: '📅' });
      setShowModal(false);
    } catch (error) {
      console.error('Failed to save countdown:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item: Countdown) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      targetDate: item.target_date,
      emoji: item.emoji,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('确定删除吗？')) {
      try {
        await countdownService.deleteCountdown(id);
        setCountdowns(countdowns.filter((item) => item.id !== id));
      } catch (error) {
        console.error('Failed to delete countdown:', error);
        alert('删除失败，请重试');
      }
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData({ name: '', targetDate: '', emoji: '📅' });
    setShowEmojiPicker(false);
  };

  const sortedCountdowns = [...countdowns].sort((a, b) => {
    const daysA = calculateDays(a.target_date);
    const daysB = calculateDays(b.target_date);
    return daysA - daysB;
  });

  if (isLoading) {
    return (
      <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,_rgba(91,206,250,0.22),_transparent_40%),linear-gradient(180deg,#f6fbff_0%,#eef6ff_38%,#f8fbff_100%)] pb-24 text-slate-900">
        <section className="relative overflow-hidden">
          <div className="relative bg-[linear-gradient(180deg,#9333ea_0%,#a855f7_100%)] px-5 pb-5 pt-5 shadow-[0_1.5rem_3rem_rgba(168,85,247,0.24)]">
            <p className="text-4xl font-semibold tracking-[-0.04em] text-white drop-shadow-[0_1px_12px_rgba(255,255,255,0.18)]">
              倒数日
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
      {/* Header */}
      <section className="relative overflow-hidden">
        <div className="relative bg-[linear-gradient(180deg,#9333ea_0%,#a855f7_100%)] px-5 pb-5 pt-5 shadow-[0_1.5rem_3rem_rgba(168,85,247,0.24)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold tracking-[-0.04em] text-white drop-shadow-[0_1px_12px_rgba(255,255,255,0.18)]">
                倒数日
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="bg-white min-h-[calc(100dvh-140px)] pt-6">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          {sortedCountdowns.length === 0 || hasError ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-slate-400 mb-4">暂无数据</p>
              <BaseButton
                onClick={() => setShowModal(true)}
                className="bg-purple-500 hover:bg-purple-600"
              >
                添加倒数日
              </BaseButton>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedCountdowns.map((item) => {
                const days = calculateDays(item.target_date);
                const targetDate = new Date(item.target_date);
                const displayDate = targetDate.toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                });

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg bg-gradient-to-r from-purple-50 to-purple-100 p-4"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{item.emoji}</span>
                        <div>
                          <h3 className="font-medium text-slate-900">{item.name}</h3>
                          <p className="text-sm text-slate-600 mt-1">{displayDate}</p>
                        </div>
                      </div>
                      <p className="text-xl font-bold text-purple-600 mt-3">
                        {getDaysDisplay(days)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="rounded-lg p-2 text-purple-600 hover:bg-purple-200 transition"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="rounded-lg p-2 text-red-600 hover:bg-red-200 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? '编辑倒数日' : '添加倒数日'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  事件名称
                </label>
                <div className="relative flex">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="h-[54px] px-3 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg hover:bg-slate-200 transition flex items-center justify-center"
                    >
                      <span className="text-xl">{formData.emoji}</span>
                    </button>
                    {showEmojiPicker && (
                      <div ref={emojiPickerRef} className="absolute top-full left-0 mt-1 w-48 p-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                        <div className="grid grid-cols-5 gap-1">
                          {EMOJI_LIST.map((emoji) => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, emoji });
                                setShowEmojiPicker(false);
                              }}
                              className={`text-xl p-1.5 rounded hover:bg-slate-100 transition ${
                                formData.emoji === emoji ? 'bg-purple-100' : ''
                              }`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <BaseInput
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="输入事件名称"
                    className="rounded-l-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  目标日期
                </label>
                <BaseInput
                  type="date"
                  value={formData.targetDate}
                  onChange={(e) =>
                    setFormData({ ...formData, targetDate: e.target.value })
                  }
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
                  disabled={isSaving}
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

export default CountdownPage;
