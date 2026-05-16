import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, CalendarDays, Sparkles, X, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { getImageUrl } from '../../services/cloudinary';
import type { DiaryEntry, GroupedDiaryEntries } from '../../types/entry';
import type { ChatLog } from '../../types/chat';
import { WEEK_LABELS } from '../../types/ui';
import { Loading } from '../../components/atoms';
import DiaryUploadModal from './DiaryUploadModal';

const formatMonthLabel = (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return `${year}年${month}月`;
};

const groupDiariesByMonth = (diaries: DiaryEntry[]): GroupedDiaryEntries => {
  return diaries
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .reduce((groups, diary) => {
      const date = new Date(diary.date);
      const label = formatMonthLabel(date);
      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(diary);
      return groups;
    }, {} as GroupedDiaryEntries);
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return {
    weekDay: WEEK_LABELS[(date.getDay() + 6) % 7],
    day: date.getDate(),
  };
};

const extractFirstDiaryImage = (content: string | undefined | null) => {
  if (!content) return null;

  const htmlMatch = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
  if (htmlMatch?.[1]) {
    return htmlMatch[1];
  }

  const markdownMatch = content.match(/!\[[^\]]*\]\s*\(([^\s)]+(?:\?[^)\s]*)?)\)/);
  return markdownMatch?.[1] ?? null;
};

const formatApiDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toISOString().slice(0, 10);
};

interface SwipeableDiaryItemProps {
  diary: DiaryEntry;
  isLast: boolean;
  onDelete: (entryId: number) => void;
  onOpenChat: (diary: DiaryEntry) => void;
  isDeleting: boolean;
}

const SwipeableDiaryItem = ({ diary, isLast, onDelete, onOpenChat, isDeleting }: SwipeableDiaryItemProps) => {
  const navigate = useNavigate();
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const lastTouchX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    touchStartX.current = e.touches[0].clientX;
    lastTouchX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || isDeleting) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffY = Math.abs(currentY - touchStartY.current);

    // 如果用户做垂直滚动，取消滑动手势
    if (diffY > 10) {
      setIsSwiping(false);
      return;
    }

    const dx = currentX - lastTouchX.current;
    lastTouchX.current = currentX;

    const MAX = 100;

    if (dx < 0) {
      // 左滑：增加偏移（显示删除）
      setSwipeOffset((prev) => Math.min(prev + Math.abs(dx), MAX));
    } else if (dx > 0) {
      // 右滑：减少偏移（取消删除）
      setSwipeOffset((prev) => Math.max(prev - dx, 0));
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);

    // 如果滑动距离不足则回弹，否则保持打开状态
    if (swipeOffset < 50) {
      setSwipeOffset(0);
    }
  };

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setShowConfirm(false);
    if (!diary.id) return;
    onDelete(diary.id);
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
    setSwipeOffset(0);
  };

  const { weekDay, day } = formatDate(diary.date);
  const previewImageUrl = extractFirstDiaryImage(diary.content);
  const previewText = diary.preview_text || '';

  return (
    <>
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 删除背景按钮 */}
        <div className="absolute inset-0 bg-red-500 flex items-center justify-end pr-4 z-0">
          <Trash2 size={20} className="text-white" />
        </div>

        {/* 内容容器 */}
        <div
          className="relative bg-white transition-transform duration-150 ease-out"
          style={{
            transform: `translateX(${swipeOffset > 0 ? -Math.min(swipeOffset, 60) : 0}px)`,
          }}
          onClick={(e) => {
            if (swipeOffset > 0) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            navigate(`/editor?id=${diary.id}`);
          }}
        >
          {isDeleting && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/90 px-4 py-3 shadow-lg">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-primary)] border-t-transparent" />
                <span className="text-xs font-medium text-slate-500">删除中...</span>
              </div>
            </div>
          )}

          <article
            className={`flex cursor-pointer gap-3 px-4 py-4 transition active:bg-slate-50 ${
              isLast ? '' : 'border-b border-slate-100'
            }`}
          >
            <div className="flex w-12 shrink-0 flex-col items-center pt-0.5 text-center">
              <p className="text-xs font-medium text-slate-500">{weekDay}</p>
              <p className="mt-1 text-2xl font-semibold leading-none text-slate-950">{day}</p>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="truncate text-base font-semibold text-slate-950">{diary.title || '未命名日记'}</h3>
              {previewText ? (
                <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{previewText}</p>
              ) : null}
              <p className="mt-2 text-xs text-slate-400">{diary.district || '地点未知'}</p>
            </div>

            {previewImageUrl ? (
              <div className="ml-2 h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                <img src={getImageUrl(previewImageUrl, 'thumb')} alt={diary.title || '日记缩略图'} className="h-full w-full object-cover" />
              </div>
            ) : null}

            <div className="sr-only">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onOpenChat(diary);
                }}
              >
                查看原始对话
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (!diary.id) return;
                  onDelete(diary.id);
                }}
              >
                删除日记
              </button>
            </div>
          </article>
        </div>

        {/* 删除按钮（滑动时显示） */}
        {swipeOffset > 0 && (
          <button
            onClick={handleDeleteClick}
            className="absolute right-0 top-0 h-full px-4 flex items-center justify-center bg-red-500 text-white z-10"
            style={{
              width: `${Math.min(swipeOffset, 60)}px`,
              opacity: Math.min(swipeOffset / 60, 1),
            }}
          >
            <Trash2 size={20} />
          </button>
        )}
      </div>

      {/* 删除确认弹窗 */}
      {showConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45">
          <div className="rounded-3xl bg-white p-6 shadow-2xl max-w-sm w-11/12">
            <h3 className="text-lg font-semibold text-slate-900">确认删除</h3>
            <p className="mt-2 text-sm text-slate-600">确认删除这篇日记吗？删除后无法恢复。</p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-200"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface DiaryListProps {
  onYearRangeChange?: (yearRange: string | null) => void;
}

const DiaryList = ({ onYearRangeChange }: DiaryListProps) => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [chatModalOpen, setChatModalOpen] = useState(false);
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatModalTitle, setChatModalTitle] = useState('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const handleDelete = async (entryId: number) => {
    try {
      setDeletingId(entryId);
      await api.deleteEntry(entryId);
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    } catch (err) {
      console.error(err);
      alert('删除失败，请稍后重试');
    } finally {
      setDeletingId(null);
    }
  };

  const openChatModal = async (entry: DiaryEntry) => {
    const day = formatApiDate(entry.date || entry.created_at);
    if (!day) {
      alert('该日记缺少日期，无法查询原始对话');
      return;
    }

    setChatModalOpen(true);
    setChatModalTitle(`${day} 的原始对话`);
    setChatLoading(true);

    try {
      const logs = await api.getChatLogs(day);
      setChatLogs(logs);
    } catch (err) {
      console.error(err);
      setChatLogs([]);
      alert('加载原始对话失败');
    } finally {
      setChatLoading(false);
    }
  };

  const fetchDiaries = async () => {
    setLoading(true);
    try {
      const data = await api.getEntries();
      if (Array.isArray(data)) {
        setEntries(
          data.map((entry: any) => ({
            ...entry,
            date: entry.date || entry.created_at,
          }))
        );
      } else {
        setError('后端返回的数据格式不正确');
      }
    } catch (err) {
      console.error(err);
      setError('加载日记失败，请检查后端连接或重新登录');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const doFetch = async () => {
      try {
        const data = await api.getEntries();
        if (active && Array.isArray(data)) {
          setEntries(
            data.map((entry: any) => ({
              ...entry,
              date: entry.date || entry.created_at,
            }))
          );
        } else if (active) {
          setError('后端返回的数据格式不正确');
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError('加载日记失败，请检查后端连接或重新登录');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    doFetch();
    return () => {
      active = false;
    };
  }, []);

  const groupedEntries = useMemo(() => groupDiariesByMonth(entries), [entries]);
  const groupedLabels = Object.keys(groupedEntries);

  useEffect(() => {
    if (!onYearRangeChange) return;
    
    if (entries.length === 0) {
      onYearRangeChange(null);
      return;
    }

    const years = entries.map(entry => {
      const dateStr = entry.date || entry.created_at;
      if (!dateStr) return new Date().getFullYear();
      const date = new Date(dateStr);
      return date.getFullYear();
    });

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    if (minYear === maxYear) {
      onYearRangeChange(`${minYear}年`);
    } else {
      onYearRangeChange(`${minYear} - ${maxYear}年`);
    }
  }, [entries, onYearRangeChange]);

  const isEmptyState = loading || groupedLabels.length === 0;

  return (
    <section className={`relative pb-24 ${isEmptyState ? 'min-h-[calc(100dvh-140px)] flex flex-col items-center justify-center' : ''}`}>
      {error ? (
        <div className="mb-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {loading ? (
        <Loading />
      ) : groupedLabels.length === 0 ? (
        <div className="flex w-full flex-col items-center justify-center px-5 py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl text-[var(--color-primary)]" style={{ backgroundImage: 'linear-gradient(180deg, rgba(var(--color-primary-rgb), 0.16), rgba(var(--color-primary-rgb), 0.06))' }}>
            <BookOpenText size={28} />
          </div>

          <h3 className="mt-4 text-xl font-semibold text-slate-900">还没有日记条目</h3>
          <p className="mt-2 max-w-[24rem] text-center text-sm leading-6 text-slate-500">
            把今天的心情、路上的风景或一顿饭记下来，时间线会慢慢完整。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedLabels.map((groupLabel) => {
            const diaries = groupedEntries[groupLabel];

            return (
              <section key={groupLabel} className="space-y-2">
                <div className="-mx-3 border-y border-slate-200 bg-white px-4 py-2 text-lg font-semibold text-slate-950">
                  {groupLabel}
                </div>

                <div className="space-y-2 rounded-[1.5rem] bg-white shadow-[0_0.5rem_1.75rem_rgba(15,23,42,0.06)]">
                  {diaries.map((diary, index) => {
                    const isLast = index === diaries.length - 1;
                    const isDeletingThis = deletingId === diary.id;

                    return (
                      <SwipeableDiaryItem
                        key={diary.id}
                        diary={diary}
                        isLast={isLast}
                        onDelete={handleDelete}
                        onOpenChat={openChatModal}
                        isDeleting={isDeletingThis}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {chatModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/45 p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{chatModalTitle}</h3>
              <button
                type="button"
                onClick={() => setChatModalOpen(false)}
                className="rounded-xl bg-slate-100 p-2 text-slate-900 hover:bg-slate-200"
                aria-label="关闭弹窗"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {chatLoading ? <p className="text-sm text-slate-500">加载中...</p> : null}

              {!chatLoading && chatLogs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  当天没有聊天记录
                </div>
              ) : null}

              {chatLogs.map((log) => (
                <div key={log.id} className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-6 whitespace-pre-wrap ${
                      log.role === 'user' ? 'bg-[#121C30] text-white' : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {log.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setUploadModalOpen(true)}
        className="fixed bottom-[6.5rem] right-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition hover:brightness-95"
        style={{ boxShadow: '0 1.125rem 2.5rem -1.125rem rgba(var(--color-primary-rgb), 0.8)' }}
        aria-label="新建日记"
      >
        <span className="text-3xl leading-none">+</span>
      </button>

      {uploadModalOpen && (
        <DiaryUploadModal
          onClose={() => setUploadModalOpen(false)}
          onSuccess={() => {
            fetchDiaries();
          }}
        />
      )}
    </section>
  );
};

export default DiaryList;
