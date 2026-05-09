import { Search } from 'lucide-react';
import type { ChatLog } from '../../types/chat';

type SearchFilter = 'all' | 'date' | 'image' | 'file';

type SearchOverlayProps = {
  open: boolean;
  keyword: string;
  onKeywordChange: (value: string) => void;
  onCancel: () => void;
  results: ChatLog[];
  isSearching: boolean;
  onPickResult: (log: ChatLog) => void;
  agentName: string;
  activeFilter: SearchFilter;
  onChangeFilter: (filter: SearchFilter) => void;
  formatTime: (dateLike: string | Date) => string;
  stripContent: (content: string) => string;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightText = (text: string, keyword: string) => {
  const q = keyword.trim();
  if (!q) return text;

  const matcher = new RegExp(`(${escapeRegExp(q)})`, 'ig');
  const parts = text.split(matcher);

  return parts.map((part, index) => {
    const isHit = part.toLowerCase() === q.toLowerCase();
    if (!isHit) return <span key={`${part}-${index}`}>{part}</span>;

    return (
      <mark key={`${part}-${index}`} className="rounded px-0.5 text-[var(--theme-blue)]" style={{ backgroundColor: 'rgba(91, 206, 250, 0.2)' }}>
        {part}
      </mark>
    );
  });
};

const hasImageContent = (content: string) => /\[image\]\s|\.(png|jpe?g|webp|gif)(\?|$)/i.test(content);

const hasFileContent = (content: string) => /\[file\]\s|\.(pdf|docx?|xlsx?|pptx?|txt|zip|rar)(\?|$)/i.test(content);

const SearchOverlay = ({
  open,
  keyword,
  onKeywordChange,
  onCancel,
  results,
  isSearching,
  onPickResult,
  agentName,
  activeFilter,
  onChangeFilter,
  formatTime,
  stripContent,
}: SearchOverlayProps) => {
  if (!open) return null;

  const normalized = keyword.trim().toLowerCase();
  const sorted = [...results].sort((a, b) => b.id - a.id);

  const filtered = sorted.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'date') {
      return formatTime(item.created_at).toLowerCase().includes(normalized);
    }
    if (activeFilter === 'image') {
      return hasImageContent(item.content);
    }
    if (activeFilter === 'file') {
      return hasFileContent(item.content);
    }
    return true;
  });

  return (
    <section className="search-overlay-layer fixed inset-0 z-[95] bg-white/95 backdrop-blur-sm">
      <div className="flex h-full flex-col px-4 pt-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0rem) + 0.75rem)' }}>
        <header className="flex items-center gap-3 border-b border-slate-200 pb-3">
          <div className="relative flex min-w-0 flex-1 items-center">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={keyword}
              onChange={(event) => onKeywordChange(event.target.value)}
              placeholder="搜索聊天记录"
              className="h-10 w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-[var(--theme-blue)]"
            />
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-[var(--theme-blue)]"
          >
            取消
          </button>
        </header>

        <div className="flex gap-2 border-b border-slate-100 py-3">
          {[
            { key: 'date', label: '按日期' },
            { key: 'image', label: '按图片' },
            { key: 'file', label: '按文件' },
          ].map((item) => {
            const key = item.key as SearchFilter;
            const active = activeFilter === key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onChangeFilter(active ? 'all' : key)}
                className={`rounded-full px-3 py-1.5 text-xs transition ${
                  active ? 'bg-[var(--theme-blue)] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto py-3">
          {isSearching ? <p className="text-sm text-slate-500">搜索中...</p> : null}

          {!isSearching && !keyword.trim() ? <p className="text-sm text-slate-500">输入关键词开始搜索</p> : null}

          {!isSearching && keyword.trim() && filtered.length === 0 ? (
            <p className="text-sm text-slate-500">没有找到匹配记录</p>
          ) : null}

          <div className="space-y-2">
            {filtered.map((log) => {
              const content = stripContent(log.content) || '(图片消息)';
              return (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => onPickResult(log)}
                  className="block w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-[var(--theme-blue)]"
                >
                  <p className="text-xs text-slate-400">
                    {log.role === 'user' ? '我' : (agentName || 'Agent')} · {formatTime(log.created_at)}
                  </p>
                  <p className="mt-1 line-clamp-3 text-sm text-slate-700">{highlightText(content, keyword)}</p>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export type { SearchFilter };
export default SearchOverlay;
