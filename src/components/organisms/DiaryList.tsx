import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, CalendarDays, Sparkles, X } from 'lucide-react';
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
    const confirmed = window.confirm('确认删除这篇日记吗？删除后无法恢复。');
    if (!confirmed) return;

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
    if (entries.length === 0) {
      onYearRangeChange?.(null);
      return;
    }

    const years = entries.map(entry => {
      const date = new Date(entry.date || entry.created_at);
      return date.getFullYear();
    });

    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    if (minYear === maxYear) {
      onYearRangeChange?.(`${minYear}年`);
    } else {
      onYearRangeChange?.(`${minYear} - ${maxYear}年`);
    }
  }, [entries, onYearRangeChange]);

  return (
    <section className="relative pb-24">
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
                    const { weekDay, day } = formatDate(diary.date);
                    const previewImageUrl = extractFirstDiaryImage(diary.content);
                    const previewText = diary.preview_text || '';
                    const isLast = index === diaries.length - 1;

                    return (
                      <article
                        key={diary.id}
                        onClick={() => navigate(`/editor?id=${diary.id}`)}
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
                              openChatModal(diary);
                            }}
                          >
                            查看原始对话
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (!diary.id) return;
                              handleDelete(diary.id);
                            }}
                          >
                            删除日记
                          </button>
                        </div>
                      </article>
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
