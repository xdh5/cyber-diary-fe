import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, FileText, Image, MessageCircle, Paperclip, Plus, Search, Send, Settings2, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../services/api';
import { getImageUrl } from '../../services/cloudinary';
import { useAuth } from '../../contexts/AuthContext';
import UserMenu from '../../components/organisms/UserMenu';
import type { ChatLog } from '../../types/chat';
import SearchOverlay, { type SearchFilter } from '../../components/organisms/SearchOverlay';

const CHAT_PAGE_SIZE = 50;
const TIME_GAP_MS = 5 * 60 * 1000;

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  imageUrls?: string[];
  fileAttachments?: MessageFileAttachment[];
};

type MessageFileAttachment = {
  id: string;
  name: string;
  sizeLabel?: string;
  url?: string;
  mimeType?: string;
};

type PendingAttachment = {
  id: string;
  file: File;
  kind: 'image' | 'file';
  previewUrl?: string;
};

type FoodDraftImage = {
  id: string;
  file: File;
  previewUrl: string;
};

const normalizeAssetUrl = (rawUrl?: string) => {
  if (!rawUrl) return '';
  const url = rawUrl.trim();
  if (!url) return '';

  return getImageUrl(url, 'preview') || url;
};

const extractImageUrls = (content: string): string[] => {
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.startsWith('[image] '))
    .map((line) => normalizeAssetUrl(line.replace('[image] ', '').trim()))
    .filter(Boolean);
};

const stripImageLines = (content: string): string => {
  const lines = content
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => !line.trim().startsWith('[image] '));
  return lines.join('\n').trim();
};

const extractFileAttachments = (content: string): MessageFileAttachment[] => {
  const lines = content.split('\n');
  const files: MessageFileAttachment[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i].trim();

    if (current === '【文件】') {
      const next = (lines[i + 1] || '').trim();
      const next2 = (lines[i + 2] || '').trim();
      if (next && !next.startsWith('[file_url] ')) {
        const fileUrl = next2.startsWith('[file_url] ') ? normalizeAssetUrl(next2.replace('[file_url] ', '').trim()) : undefined;
        files.push({ id: `history-file-${i}`, name: next, url: fileUrl });
        i += fileUrl ? 2 : 1;
      }
      continue;
    }

    if (current.startsWith('【文件】') && current !== '【文件】') {
      const name = current.replace('【文件】', '').trim();
      if (name) {
        const next = (lines[i + 1] || '').trim();
        const fileUrl = next.startsWith('[file_url] ') ? normalizeAssetUrl(next.replace('[file_url] ', '').trim()) : undefined;
        files.push({ id: `history-file-${i}`, name, url: fileUrl });
        if (fileUrl) {
          i += 1;
        }
      }
    }
  }

  return files;
};

const stripFileLines = (content: string): string => {
  const lines = content.split('\n');
  const cleaned: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const current = lines[i].trim();
    if (current.startsWith('[file_url] ')) {
      continue;
    }
    if (current === '【文件】') {
      const next = (lines[i + 1] || '').trim();
      if (next && !next.startsWith('[file_url] ')) {
        i += 1;
      }
      const next2 = (lines[i + 1] || '').trim();
      if (next2.startsWith('[file_url] ')) {
        i += 1;
      }
      continue;
    }
    if (current.startsWith('【文件】')) {
      const next = (lines[i + 1] || '').trim();
      if (next.startsWith('[file_url] ')) {
        i += 1;
      }
      continue;
    }
    cleaned.push(lines[i]);
  }

  return cleaned.join('\n').trim();
};

const getShanghaiParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
    hour12: false,
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value || '';

  return {
    year: Number(get('year') || '1970'),
    month: Number(get('month') || '1'),
    day: Number(get('day') || '1'),
    hour: get('hour') || '00',
    minute: get('minute') || '00',
    weekday: (get('weekday') || '').replace('周', '星期'),
  };
};

const dayIndex = (year: number, month: number, day: number) => {
  return Math.floor(Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000));
};

const formatMessageTime = (dateLike: string | Date) => {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  const now = new Date();

  const current = getShanghaiParts(date);
  const today = getShanghaiParts(now);

  const currentDay = dayIndex(current.year, current.month, current.day);
  const todayDay = dayIndex(today.year, today.month, today.day);
  const diffDays = todayDay - currentDay;

  const hhmm = `${current.hour}:${current.minute}`;
  if (diffDays === 0) return hhmm;
  if (diffDays === 1) return `昨天 ${hhmm}`;
  if (diffDays > 1 && diffDays < 7 && current.year === today.year) return `${current.weekday} ${hhmm}`;
  return `${String(current.year).padStart(4, '0')}年${String(current.month).padStart(2, '0')}月${String(current.day).padStart(2, '0')}日 ${hhmm}`;
};

const shouldShowTime = (current: ChatMessage, previous?: ChatMessage) => {
  if (!previous) return true;
  const currentTs = new Date(current.createdAt).getTime();
  const prevTs = new Date(previous.createdAt).getTime();
  if (!Number.isFinite(currentTs) || !Number.isFinite(prevTs)) return true;
  return currentTs - prevTs > TIME_GAP_MS;
};

const TodayPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const chatOpen = searchParams.get('chat') === '1';

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [oldestMessageId, setOldestMessageId] = useState<number | null>(null);
  const [isThinking, setIsThinking] = useState(false);
  const [uploadingFood, setUploadingFood] = useState(false);
  const [quickStatus, setQuickStatus] = useState('');
  const [foodComposerOpen, setFoodComposerOpen] = useState(false);
  const [foodComposerCaption, setFoodComposerCaption] = useState('');
  const [foodDraftImages, setFoodDraftImages] = useState<FoodDraftImage[]>([]);
  const [agentName, setAgentName] = useState('Agent');
  const [agentPrompt, setAgentPrompt] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [searchFilter, setSearchFilter] = useState<SearchFilter>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchResults, setSearchResults] = useState<ChatLog[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSavingAgentSettings, setIsSavingAgentSettings] = useState(false);
  const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const viewportRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const foodCameraInputRef = useRef<HTMLInputElement>(null);
  const foodAlbumInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const prependScrollHeightRef = useRef(0);
  const isPrependingRef = useRef(false);
  const settingsReadyRef = useRef(false);
  const lastSavedSettingsRef = useRef({ agentName: 'Agent', agentPrompt: '' });
  const oldestMessageIdRef = useRef<number | null>(null);
  const hasMoreHistoryRef = useRef(true);
  const messageNodeRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const highlightTimerRef = useRef<number | null>(null);
  const generatedObjectUrlsRef = useRef<string[]>([]);

  const currentDate = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const currentWeekday = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    weekday: 'long',
  }).format(new Date());

  const currentHour = Number(
    new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai',
      hour: '2-digit',
      hour12: false,
    }).format(new Date()),
  );

  const dayGreeting = useMemo(() => {
    if (currentHour < 6) return '夜深了';
    if (currentHour < 11) return '早上好';
    if (currentHour < 14) return '中午好';
    if (currentHour < 18) return '下午好';
    return '晚上好';
  }, [currentHour]);

  const displayName = (user?.nickname || user?.email?.split('@')[0] || '你').trim();

  useEffect(() => {
    let active = true;

    const loadHistory = async () => {
      try {
        const logs = await api.getChatLogsPage({ limit: CHAT_PAGE_SIZE });
        if (!active) return;

        const mapped: ChatMessage[] = logs.map((log: ChatLog) => ({
          id: String(log.id),
          role: log.role,
          content: stripFileLines(stripImageLines(log.content)),
          imageUrls: extractImageUrls(log.content),
          fileAttachments: extractFileAttachments(log.content),
          createdAt: log.created_at,
        }));
        setMessages(mapped);
        setOldestMessageId(logs.length ? logs[0].id : null);
        setHasMoreHistory(logs.length === CHAT_PAGE_SIZE);
      } catch (error) {
        console.error('Failed to load chat logs:', error);
      } finally {
        if (active) setIsLoadingHistory(false);
      }
    };

    loadHistory();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    oldestMessageIdRef.current = oldestMessageId;
  }, [oldestMessageId]);

  useEffect(() => {
    hasMoreHistoryRef.current = hasMoreHistory;
  }, [hasMoreHistory]);

  useEffect(() => {
    let active = true;

    const loadAgentSettings = async () => {
      try {
        const settings = await api.getAgentSettings();
        if (!active) return;
        const loadedName = (settings.agent_name || 'Agent').trim() || 'Agent';
        const loadedPrompt = settings.agent_system_prompt || '';
        setAgentName(loadedName);
        setAgentPrompt(loadedPrompt);
        lastSavedSettingsRef.current = { agentName: loadedName, agentPrompt: loadedPrompt };
        settingsReadyRef.current = true;
      } catch (error) {
        console.error('Failed to load agent settings:', error);
        if (active) {
          setAgentName('Agent');
          setAgentPrompt('');
          lastSavedSettingsRef.current = { agentName: 'Agent', agentPrompt: '' };
          settingsReadyRef.current = true;
        }
      }
    };

    loadAgentSettings();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!settingsReadyRef.current || !settingsOpen) return;

    const nextName = agentName.trim() || 'Agent';
    const nextPrompt = agentPrompt;
    const sameAsSaved =
      nextName === lastSavedSettingsRef.current.agentName && nextPrompt === lastSavedSettingsRef.current.agentPrompt;

    if (sameAsSaved) return;

    const timer = window.setTimeout(async () => {
      try {
        setIsSavingAgentSettings(true);
        const updated = await api.updateAgentSettings({
          agent_name: nextName,
          agent_system_prompt: nextPrompt,
        });
        lastSavedSettingsRef.current = {
          agentName: (updated.agent_name || 'Agent').trim() || 'Agent',
          agentPrompt: updated.agent_system_prompt || '',
        };
      } catch (error) {
        console.error('Failed to save agent settings:', error);
      } finally {
        setIsSavingAgentSettings(false);
      }
    }, 1400);

    return () => {
      window.clearTimeout(timer);
    };
  }, [agentName, agentPrompt, settingsOpen]);

  useEffect(() => {
    if (!searchOverlayOpen) return;

    const query = searchKeyword.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const logs = await api.searchChatLogs(query, 30);
        setSearchResults(logs);
      } catch (error) {
        console.error('Failed to search chat logs:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchOverlayOpen, searchKeyword]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) {
        window.clearTimeout(highlightTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      pendingAttachments.forEach((attachment) => {
        if (attachment.previewUrl) {
          window.URL.revokeObjectURL(attachment.previewUrl);
        }
      });
    };
  }, [pendingAttachments]);

  useEffect(() => {
    return () => {
      foodDraftImages.forEach((item) => {
        window.URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [foodDraftImages]);

  useEffect(() => {
    return () => {
      generatedObjectUrlsRef.current.forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
      generatedObjectUrlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (!cameraOpen) {
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      return;
    }

    let active = true;

    void (async () => {
      try {
        setCameraError('');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        cameraStreamRef.current = stream;
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
          await cameraVideoRef.current.play().catch(() => undefined);
        }
      } catch (error) {
        console.error('Failed to open camera:', error);
        setCameraError('无法打开相机，请检查权限或设备');
      }
    })();

    return () => {
      active = false;
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    };
  }, [cameraOpen]);

  useEffect(() => {
    if (!chatOpen || !viewportRef.current) return;

    if (isPrependingRef.current) {
      const delta = viewportRef.current.scrollHeight - prependScrollHeightRef.current;
      viewportRef.current.scrollTop = Math.max(delta, 0);
      isPrependingRef.current = false;
      return;
    }

    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
  }, [chatOpen, messages, isThinking]);

  const loadOlderHistory = async () => {
    if (isLoadingHistory || isLoadingOlder || !hasMoreHistory || oldestMessageId === null) {
      return;
    }

    const viewport = viewportRef.current;
    if (viewport) {
      isPrependingRef.current = true;
      prependScrollHeightRef.current = viewport.scrollHeight;
    }

    setIsLoadingOlder(true);
    try {
      const olderLogs = await api.getChatLogsPage({
        limit: CHAT_PAGE_SIZE,
        beforeId: oldestMessageId,
      });

      const mapped: ChatMessage[] = olderLogs.map((log: ChatLog) => ({
        id: String(log.id),
        role: log.role,
        content: stripFileLines(stripImageLines(log.content)),
        imageUrls: extractImageUrls(log.content),
        fileAttachments: extractFileAttachments(log.content),
        createdAt: log.created_at,
      }));

      if (mapped.length > 0) {
        setMessages((prev) => [...mapped, ...prev]);
        setOldestMessageId(olderLogs[0].id);
      } else {
        isPrependingRef.current = false;
      }

      setHasMoreHistory(olderLogs.length === CHAT_PAGE_SIZE);
    } catch (error) {
      isPrependingRef.current = false;
      console.error('Failed to load older chat logs:', error);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const mapLogsToMessages = (logs: ChatLog[]): ChatMessage[] => {
    return logs.map((log: ChatLog) => ({
      id: String(log.id),
      role: log.role,
      content: stripFileLines(stripImageLines(log.content)),
      imageUrls: extractImageUrls(log.content),
      fileAttachments: extractFileAttachments(log.content),
      createdAt: log.created_at,
    }));
  };

  const createMessageObjectUrl = (file: File) => {
    const url = window.URL.createObjectURL(file);
    generatedObjectUrlsRef.current.push(url);
    return url;
  };

  const openWithSystemViewer = (url?: string) => {
    const targetUrl = normalizeAssetUrl(url);
    if (!targetUrl) return;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  const ensureMessageLoaded = async (targetMessageId: number) => {
    const existsInDom = !!messageNodeRefs.current[String(targetMessageId)];
    if (existsInDom) return true;

    let beforeId = oldestMessageIdRef.current;
    let canLoadMore = hasMoreHistoryRef.current;
    let prepended: ChatMessage[] = [];

    while (beforeId !== null && canLoadMore && targetMessageId < beforeId) {
      const olderLogs = await api.getChatLogsPage({
        limit: CHAT_PAGE_SIZE,
        beforeId,
      });

      if (!olderLogs.length) {
        canLoadMore = false;
        break;
      }

      prepended = [...mapLogsToMessages(olderLogs), ...prepended];
      beforeId = olderLogs[0].id;
      canLoadMore = olderLogs.length === CHAT_PAGE_SIZE;

      if (olderLogs.some((log) => log.id === targetMessageId)) {
        break;
      }
    }

    if (prepended.length > 0) {
      setMessages((prev) => [...prepended, ...prev]);
      setOldestMessageId(beforeId);
      setHasMoreHistory(canLoadMore);
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
    return !!messageNodeRefs.current[String(targetMessageId)];
  };

  const jumpToMessage = async (targetMessageId: number) => {
    const found = await ensureMessageLoaded(targetMessageId);
    if (!found) return;

    const node = messageNodeRefs.current[String(targetMessageId)];
    if (!node) return;

    node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightMessageId(String(targetMessageId));

    if (highlightTimerRef.current !== null) {
      window.clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightMessageId(null);
      highlightTimerRef.current = null;
    }, 2000);
  };

  const handleViewportScroll = () => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    if (viewport.scrollTop <= 40) {
      void loadOlderHistory();
    }
  };

  const autoResizeInput = () => {
    const node = inputRef.current;
    if (!node) return;
    const rootSize = Number.parseFloat(window.getComputedStyle(document.documentElement).fontSize || '16') || 16;
    const maxHeight = rootSize * 8.25;
    node.style.height = 'auto';
    node.style.height = `${Math.min(node.scrollHeight, maxHeight)}px`;
  };

  useEffect(() => {
    autoResizeInput();
  }, [input]);

  const sendDisabled = useMemo(() => !input.trim() && pendingAttachments.length === 0 || isThinking, [input, pendingAttachments.length, isThinking]);

  const appendAssistantMessage = (text: string) => {
    const assistantId = `a-${Date.now()}`;
    const nowISO = new Date().toISOString();
    setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: text, createdAt: nowISO }]);
  };

  const getErrorText = (error: unknown) => {
    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }
    return 'AI 暂时不可用，请稍后重试。';
  };

  const getFileBaseName = (fileName: string) => {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  };

  const getFileExtension = (fileName: string) => {
    const dotIndex = fileName.lastIndexOf('.');
    return dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : '';
  };

  const summarizeFile = (file: File) => {
    const sizeKb = Math.max(1, Math.round(file.size / 1024));
    return `${file.name} · ${sizeKb}KB`;
  };

  const sendMessage = async (
    message: string,
    appendUserMessage: boolean,
    attachmentsSnapshot: PendingAttachment[] = pendingAttachments,
  ) => {
    const trimmedMessage = message.trim();
    if ((!trimmedMessage && attachmentsSnapshot.length === 0) || isThinking) return;

    const nowISO = new Date().toISOString();

    setIsThinking(true);

    try {
      const imageAttachments = attachmentsSnapshot.filter((attachment) => attachment.kind === 'image');
      const fileAttachments = attachmentsSnapshot.filter((attachment) => attachment.kind === 'file');
      const attachmentFiles = [...imageAttachments, ...fileAttachments].map((attachment) => attachment.file);
      const previewImageUrls = imageAttachments.map((attachment) => createMessageObjectUrl(attachment.file));
      const previewFileAttachments: MessageFileAttachment[] = fileAttachments.map((attachment) => ({
        id: `file-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: attachment.file.name,
        sizeLabel: `${Math.max(1, Math.round(attachment.file.size / 1024))}KB`,
        url: createMessageObjectUrl(attachment.file),
        mimeType: attachment.file.type,
      }));
      const finalMessage = trimmedMessage || (attachmentFiles.length > 0 ? '请查看附件' : '');

      if (appendUserMessage) {
        const userMessage: ChatMessage = {
          id: `u-${Date.now()}`,
          role: 'user',
          content: trimmedMessage || (attachmentFiles.length > 0 ? '请查看附件' : finalMessage),
          createdAt: nowISO,
          imageUrls: previewImageUrls,
          fileAttachments: previewFileAttachments,
        };
        setMessages((prev) => [...prev, userMessage]);
      }

      const response = await api.sendChatMessage({
        message: finalMessage || trimmedMessage,
        attachments: attachmentFiles,
      });
      const answer = typeof response?.answer === 'string' ? response.answer.trim() : '';

      if (!answer) {
        throw new Error('后端未返回有效回复');
      }

      appendAssistantMessage(answer);
    } catch (error) {
      console.error('Failed to send chat message:', error);
      const failId = `e-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: failId, role: 'assistant', content: getErrorText(error), createdAt: new Date().toISOString() },
      ]);
    } finally {
      setIsThinking(false);
      setAttachmentMenuOpen(false);
    }
  };

  const handleSend = async () => {
    const message = input.trim();
    if ((!message && pendingAttachments.length === 0) || isThinking) return;

    const attachmentsSnapshot = [...pendingAttachments];
    setInput('');
    setPendingAttachments([]);
    setAttachmentMenuOpen(false);
    await sendMessage(message, true, attachmentsSnapshot);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter') return;
    if (event.shiftKey) return;
    if (event.nativeEvent.isComposing) return;

    event.preventDefault();
    void handleSend();
  };

  const openAttachmentMenu = () => {
    setAttachmentMenuOpen((prev) => !prev);
  };

  const openCamera = () => {
    setAttachmentMenuOpen(false);
    setCameraError('');
    setCameraOpen(true);
  };

  const closeCamera = () => {
    setCameraOpen(false);
    setCameraError('');
  };

  const capturePhoto = async () => {
    const video = cameraVideoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((nextBlob) => resolve(nextBlob), 'image/jpeg', 0.92));
    if (!blob) return;

    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
    const previewUrl = window.URL.createObjectURL(file);
    setPendingAttachments((prev) => [...prev, { id: `${Date.now()}-${file.name}`, file, kind: 'image', previewUrl }]);
    setCameraOpen(false);
  };

  const addAttachments = (files: FileList | null, kind: 'image' | 'file') => {
    if (!files || files.length === 0) return;

    const next = Array.from(files).map((file) => ({
      id: `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`,
      file,
      kind,
      previewUrl: kind === 'image' ? window.URL.createObjectURL(file) : undefined,
    }));

    setPendingAttachments((prev) => [...prev, ...next]);
    setAttachmentMenuOpen(false);
  };

  const removeAttachment = (attachmentId: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((item) => item.id === attachmentId);
      if (target?.previewUrl) {
        window.URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== attachmentId);
    });
  };

  const openChat = () => {
    const next = new URLSearchParams(searchParams);
    next.set('chat', '1');
    setSearchParams(next, { replace: true });
  };

  const closeChat = () => {
    setSettingsOpen(false);
    setSearchOverlayOpen(false);
    const next = new URLSearchParams(searchParams);
    next.delete('chat');
    setSearchParams(next, { replace: true });
  };

  const handlePickSearchResult = (log: ChatLog) => {
    setSearchOverlayOpen(false);
    void jumpToMessage(log.id);
  };

  const closeFoodComposer = () => {
    setFoodComposerOpen(false);
    setFoodComposerCaption('');
    foodDraftImages.forEach((item) => {
      window.URL.revokeObjectURL(item.previewUrl);
    });
    setFoodDraftImages([]);
  };

  const appendFoodDraftFiles = (files: File[]) => {
    const newImages = files.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      file,
      previewUrl: window.URL.createObjectURL(file),
    }));
    setFoodDraftImages((prev) => [...prev, ...newImages]);
  };

  const removeFoodDraftImage = (id: string) => {
    setFoodDraftImages((prev) => {
      const target = prev.find((item) => item.id === id);
      if (target) {
        window.URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== id);
    });
  };

  const handleFoodCameraPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    event.target.value = '';
    if (!file) return;
    if (!foodComposerOpen) {
      setFoodComposerCaption('');
    }
    appendFoodDraftFiles([file]);
    setFoodComposerOpen(true);
  };

  const handleFoodAlbumPick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = '';
    if (files.length === 0) return;
    if (!foodComposerOpen) {
      setFoodComposerCaption('');
    }
    appendFoodDraftFiles(files);
    setFoodComposerOpen(true);
  };

  const submitFoodRecord = async () => {
    if (uploadingFood) return;
    if (foodDraftImages.length === 0 && !foodComposerCaption.trim()) return;

    try {
      setUploadingFood(true);
      setQuickStatus('AI 正在思考这顿饭的滋味...');

      let photoCount = 0;
      let infoCount = 0;

      const response = await api.uploadFoodPhotos(
        foodDraftImages.map((item) => item.file),
        foodComposerCaption,
      );
      photoCount = response.photo_count;
      infoCount = response.info_count;

      let statusMsg = '';
      if (photoCount > 0 || infoCount > 0) {
        const parts = [];
        if (photoCount > 0) parts.push(`照片墙 ${photoCount} 张`);
        if (infoCount > 0) parts.push(`日记流 ${infoCount} 条`);
        statusMsg = `已处理 ${foodDraftImages.length} 张：${parts.join('，')}`;
      } else {
        statusMsg = '已完成';
      }

      setQuickStatus(statusMsg);
      closeFoodComposer();
    } catch (error) {
      console.error('Food upload failed:', error);
      setQuickStatus(error instanceof Error && error.message ? error.message : '上传失败，请重试');
    } finally {
      setUploadingFood(false);
    }
  };

  const openFoodMenu = () => {
    setFoodComposerCaption('');
    setFoodDraftImages([]);
    setFoodComposerOpen(true);
  };

  return (
    <>
      <main
        className="today-shell flex min-h-0 flex-col px-5 pt-8"
        style={{
          minHeight:
            'calc(100dvh - var(--app-bottom-nav-height) - var(--app-tab-bottom-gap) - env(safe-area-inset-bottom, 0rem) - var(--app-today-tab-gap))',
          paddingBottom: 'calc(var(--app-bottom-nav-height) + var(--app-today-tab-gap))',
        }}
      >
        <header className="mb-8 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="today-title today-page-title text-slate-950">今天</h1>
            <p className="today-page-date text-slate-500">{currentDate} · {currentWeekday}</p>
          </div>
          <div className="today-avatar-wrap">
            <UserMenu mode="avatar" />
          </div>
        </header>

        <section className="space-y-6">
          <article className="pe-0 today-hero-card relative overflow-hidden rounded-[2rem] border border-white/60 px-6 py-7 shadow-[0_20px_48px_rgba(80,117,173,0.13)]">
            <div className="pointer-events-none absolute -right-8 -top-7 h-24 w-24 rounded-full bg-[radial-gradient(circle,#dbeafe_0%,rgba(219,234,254,0.08)_72%)]" />
            <div className="relative z-10 grid grid-cols-2 gap-4 sm:gap-10 sm:items-center">
              <div className="min-w-0 sm:pr-2">
                <h2 className="today-hero-greeting text-slate-900">
                  {dayGreeting}，{displayName}
                </h2>
                <p className="today-hero-question mt-3 text-slate-600">今天想聊点什么？</p>
                <p className="today-hero-desc mt-3 text-slate-500">无论是开心的事、难过的事，都可以和我聊聊。</p>
                <button
                  type="button"
                  onClick={openChat}
                  className="today-chat-btn today-chat-text group mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#4A86FF] to-[#2F6EF2] px-5 font-semibold text-white shadow-[0_16px_28px_rgba(52,109,238,0.36)] transition duration-200 hover:brightness-95 active:scale-[0.99] sm:w-auto sm:justify-start sm:px-7"
                >
                  <MessageCircle size={18} className="transition-transform duration-200 group-hover:scale-110 group-active:scale-95" />
                  和 AI 聊聊
                </button>
              </div>

              <div className="flex min-h-[10rem] items-center justify-center sm:min-h-[16rem] sm:justify-end sm:pl-2" aria-hidden="true">
                <div className="today-mascot block h-[8rem] w-[8rem] sm:h-[13rem] sm:w-[13rem] md:h-[14.5rem] md:w-[14.5rem]">
                  <img src="/assets/today/hero-mascot.png" alt="" className="today-mascot-image" loading="lazy" />
                </div>
              </div>
            </div>
          </article>

          <div className="today-quote-wrap mt-8 flex flex-1 items-center justify-center pb-8">
            <img src="/assets/today/quote-slow-life.png" alt="慢慢生活，也没关系。" className="today-quote-image" loading="lazy" />
          </div>

        </section>
      </main>

      <input ref={foodCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoodCameraPick} />
      <input ref={foodAlbumInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/*" multiple className="hidden" onChange={handleFoodAlbumPick} />

      {foodComposerOpen ? (
        <section className="fixed inset-0 z-[79] flex items-end bg-black/45 p-0 sm:items-center sm:justify-center sm:p-4" onClick={uploadingFood ? undefined : closeFoodComposer}>
          <div
            className="flex w-full flex-col overflow-hidden rounded-t-[1.75rem] bg-white p-4 shadow-2xl sm:h-[48rem] sm:max-h-[92dvh] sm:max-w-xl sm:rounded-[1.75rem]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">记录美食</h3>
              <button
                type="button"
                onClick={uploadingFood ? undefined : closeFoodComposer}
                disabled={uploadingFood}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
                aria-label="关闭记录美食弹窗"
              >
                <X size={18} />
              </button>
            </div>

            {uploadingFood ? (
              <div className="mb-4">
                <div className="h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full w-1/3 animate-pulse rounded-full bg-[var(--theme-blue)]" />
                </div>
                <p className="mt-2 text-center text-sm text-[var(--theme-blue)]">AI 正在思考这顿饭的滋味...</p>
              </div>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto pb-3">

            <div className="mb-4">
              {foodDraftImages.length > 0 ? (
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 grid grid-cols-3 gap-2">
                    {foodDraftImages.map((item) => (
                      <div key={item.id} className="relative overflow-hidden rounded-xl">
                        <img src={item.previewUrl} alt="food draft" className="h-24 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFoodDraftImage(item.id)}
                          disabled={uploadingFood}
                          className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/55 text-white transition hover:bg-black/65 disabled:opacity-60"
                          aria-label="删除图片"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => foodCameraInputRef.current?.click()}
                      disabled={uploadingFood}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[var(--theme-blue)] disabled:opacity-60"
                    >
                      继续拍照
                    </button>
                    <button
                      type="button"
                      onClick={() => foodAlbumInputRef.current?.click()}
                      disabled={uploadingFood}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[var(--theme-blue)] disabled:opacity-60"
                    >
                      继续添加相册
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5">
                  <button
                    type="button"
                    onClick={() => foodAlbumInputRef.current?.click()}
                    disabled={uploadingFood}
                    className="flex w-full flex-col items-center justify-center rounded-2xl bg-white px-4 py-12 text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Image size={30} className="text-[var(--theme-blue)]" />
                    <p className="mt-3 text-base font-semibold text-slate-900">上传这顿饭的照片</p>
                    <p className="mt-1 text-sm text-slate-500">支持拍照和相册选择</p>
                  </button>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => foodCameraInputRef.current?.click()}
                      disabled={uploadingFood}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[var(--theme-blue)] disabled:opacity-60"
                    >
                      拍照
                    </button>
                    <button
                      type="button"
                      onClick={() => foodAlbumInputRef.current?.click()}
                      disabled={uploadingFood}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[var(--theme-blue)] disabled:opacity-60"
                    >
                      从相册选择
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <textarea
                value={foodComposerCaption}
                onChange={(event) => setFoodComposerCaption(event.target.value)}
                rows={6}
                placeholder="记录一下这顿饭的心情或细节..."
                className="w-full resize-none rounded-2xl bg-transparent px-1 py-2 text-base leading-7 text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
            </div>

            <div className="border-t border-slate-100 pt-2" style={{ paddingBottom: 'max(0.25rem, env(safe-area-inset-bottom, 0rem))' }}>
              <button
                type="button"
                onClick={() => void submitFoodRecord()}
                disabled={uploadingFood || (foodDraftImages.length === 0 && !foodComposerCaption.trim())}
                className="w-full rounded-2xl bg-[#5BCEFA] px-4 py-3.5 text-base font-semibold text-white transition hover:brightness-95 disabled:opacity-50"
              >
                交给 Agent 记录
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {chatOpen ? (
        <section className="fixed inset-0 z-[70] flex flex-col bg-white">
          <header className="relative border-b border-slate-200 px-4 py-3 text-center">
            <button
              type="button"
              onClick={closeChat}
              className="absolute left-4 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded-full px-2 py-1 text-slate-600 transition hover:bg-slate-100"
              aria-label="返回主页"
            >
              <ArrowLeft size={18} />
              <span className="text-sm">返回</span>
            </button>
            <h2 className="text-base font-semibold text-slate-900">{agentName || 'Agent'}</h2>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-0.5"
              aria-label="打开Agent设置"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="admin avatar" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[var(--theme-blue)]" />
              )}
            </button>
          </header>

          <div ref={viewportRef} onScroll={handleViewportScroll} className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {!isLoadingHistory && isLoadingOlder ? (
              <div className="pb-2 text-center text-xs text-slate-500">加载更早消息...</div>
            ) : null}

            {isLoadingHistory ? <div className="text-center text-sm text-slate-500">加载聊天记录中...</div> : null}

            {!isLoadingHistory && messages.length === 0 ? (
              <div className="text-center text-sm text-slate-500">还没有消息，开始聊天吧</div>
            ) : null}

            {messages.map((message, index) => {
              const prev = index > 0 ? messages[index - 1] : undefined;
              const showTime = shouldShowTime(message, prev);
              const isHighlighted = highlightMessageId === message.id;

              return (
                <div
                  key={message.id}
                  ref={(node) => {
                    messageNodeRefs.current[message.id] = node;
                  }}
                  className={`mb-3 rounded-xl transition-colors duration-700 ${
                    isHighlighted ? 'bg-[rgba(91,206,250,0.24)]' : 'bg-transparent'
                  }`}
                >
                  {showTime ? (
                    <div className="mb-2 text-center text-xs text-slate-400">{formatMessageTime(message.createdAt)}</div>
                  ) : null}

                  <div className={`flex items-start gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {message.role === 'assistant' ? <div className="h-8 w-8 rounded bg-slate-100" /> : null}

                    <div
                      className="max-w-[78%] rounded-md px-3 py-2 text-base leading-6 text-slate-900"
                      style={{ backgroundColor: message.role === 'user' ? 'var(--theme-blue-soft)' : '#F8FAFC' }}
                    >
                      {message.imageUrls?.length ? (
                        <div className="mb-2 grid grid-cols-3 gap-2">
                          {message.imageUrls.map((url) => (
                            <button
                              key={url}
                              type="button"
                              onClick={() => openWithSystemViewer(url)}
                              className="overflow-hidden rounded-lg border border-slate-200"
                              aria-label="用系统应用打开图片"
                            >
                              <img src={url} alt="uploaded" className="h-24 w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      ) : null}

                      {message.fileAttachments?.length ? (
                        <div className="mb-2 space-y-1.5">
                          {message.fileAttachments.map((attachment) => (
                            <button
                              key={attachment.id}
                              type="button"
                              onClick={() => {
                                if (!attachment.url) return;
                                openWithSystemViewer(attachment.url);
                              }}
                              disabled={!attachment.url}
                              className="flex max-w-full items-center gap-1.5 text-left text-sm text-slate-700 disabled:cursor-not-allowed disabled:text-slate-400"
                            >
                              <Paperclip size={14} />
                              <span className="max-w-[16rem] truncate underline decoration-slate-400 underline-offset-2">
                                {attachment.name}
                                {attachment.sizeLabel ? ` · ${attachment.sizeLabel}` : ''}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}

                      <div className="whitespace-pre-wrap break-words">{message.content}</div>
                    </div>

                    {message.role === 'user' ? <div className="h-8 w-8 rounded bg-[var(--theme-blue)]" /> : null}
                  </div>
                </div>
              );
            })}

            {isThinking ? (
              <div className="mb-3 flex justify-start gap-2">
                <div className="h-8 w-8 rounded bg-slate-100" />
                <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-500">正在输入...</div>
              </div>
            ) : null}
          </div>

          <div
            className="border-t border-slate-200 bg-white px-3 pt-2"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0rem) + 0.625rem)' }}
          >
            {pendingAttachments.length > 0 ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {pendingAttachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex max-w-[12rem] items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1.5"
                  >
                    {attachment.kind === 'image' && attachment.previewUrl ? (
                      <img src={attachment.previewUrl} alt={attachment.file.name} className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-slate-500">
                        <FileText size={16} />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-slate-700">{getFileBaseName(attachment.file.name)}</p>
                      <p className="truncate text-[11px] text-slate-400">{attachment.file.type || '未知类型'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttachment(attachment.id)}
                      className="ml-1 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                      aria-label="移除附件"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <div className="relative self-end">
                <button
                  type="button"
                  onClick={openAttachmentMenu}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition hover:bg-slate-200"
                  aria-label="添加附件"
                >
                  <Plus size={18} className={`transition ${attachmentMenuOpen ? 'rotate-45' : ''}`} />
                </button>

                {attachmentMenuOpen ? (
                  <div className="absolute bottom-12 left-0 z-20 w-40 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_1rem_3rem_rgba(15,23,42,0.18)]">
                    <button
                      type="button"
                      onClick={openCamera}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <Camera size={18} className="text-[var(--theme-blue)]" />
                      拍照
                    </button>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <Image size={18} className="text-[var(--theme-blue)]" />
                      传图片
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                    >
                      <Paperclip size={18} className="text-[var(--theme-blue)]" />
                      传文件
                    </button>
                  </div>
                ) : null}
              </div>

              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="发消息"
                className="min-h-10 max-h-32 flex-1 resize-none overflow-y-hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-base leading-6 text-slate-900 outline-none focus:border-[var(--theme-blue)]"
              />

              <button
                type="button"
                onClick={handleSend}
                disabled={sendDisabled}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--theme-blue)] text-white disabled:opacity-45"
                aria-label="发送消息"
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,image/*"
            className="hidden"
            onChange={(event) => {
              addAttachments(event.target.files, 'image');
              event.target.value = '';
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="*/*"
            className="hidden"
            onChange={(event) => {
              addAttachments(event.target.files, 'file');
              event.target.value = '';
            }}
          />
        </section>
      ) : null}

      {cameraOpen ? (
        <section className="fixed inset-0 z-[90] flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
          <div className="flex w-full max-w-md flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-900">拍照</h3>
              <button type="button" onClick={closeCamera} className="rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="关闭相机">
                <X size={18} />
              </button>
            </header>

            <div className="bg-black">
              <video ref={cameraVideoRef} autoPlay playsInline muted className="aspect-[3/4] w-full object-cover" />
            </div>

            {cameraError ? <p className="px-4 pt-3 text-sm text-rose-600">{cameraError}</p> : null}

            <div className="flex items-center justify-between gap-3 px-4 py-4">
              <button type="button" onClick={closeCamera} className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                取消
              </button>
              <button
                type="button"
                onClick={() => void capturePhoto()}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[var(--theme-blue)] text-white shadow-[0_1rem_2rem_rgba(91,206,250,0.45)]"
                aria-label="拍摄照片"
              >
                <div className="h-10 w-10 rounded-full border-2 border-white" />
              </button>
              <button type="button" onClick={() => imageInputRef.current?.click()} className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700">
                相册
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {chatOpen && settingsOpen ? (
        <section className="fixed inset-0 z-[80] bg-black/30">
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl">
            <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <Settings2 size={18} className="text-[var(--theme-blue)]" />
                <h3 className="text-base font-semibold text-slate-900">Agent 设置</h3>
              </div>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-full p-1 text-slate-500 transition hover:bg-slate-100"
                aria-label="关闭设置"
              >
                <X size={18} />
              </button>
            </header>

            <div className="h-[calc(100%-3.25rem)] space-y-5 overflow-y-auto px-4 py-4">
              <section className="space-y-2">
                <label className="text-sm font-medium text-slate-700">改名部</label>
                <input
                  value={agentName}
                  onChange={(event) => setAgentName(event.target.value)}
                  placeholder="Agent"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[var(--theme-blue)]"
                />
              </section>

              <section className="space-y-2">
                <label className="text-sm font-medium text-slate-700">查找部</label>
                <button
                  type="button"
                  onClick={() => {
                    setSettingsOpen(false);
                    setSearchOverlayOpen(true);
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-600 transition hover:border-[var(--theme-blue)]"
                >
                  打开全屏搜索
                </button>
              </section>

              <section className="space-y-2">
                <label className="text-sm font-medium text-slate-700">人格规则 / Prompt</label>
                <textarea
                  value={agentPrompt}
                  onChange={(event) => setAgentPrompt(event.target.value)}
                  rows={6}
                  placeholder="例如：你是一个上海老克勒，说话要带点腔调。"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm leading-6 outline-none focus:border-[var(--theme-blue)]"
                />
                <p className="text-xs text-slate-500">{isSavingAgentSettings ? '正在保存...' : '输入停顿后自动保存到当前账号'}</p>
              </section>
            </div>
          </div>
        </section>
      ) : null}

      <SearchOverlay
        open={chatOpen && searchOverlayOpen}
        keyword={searchKeyword}
        onKeywordChange={setSearchKeyword}
        onCancel={() => setSearchOverlayOpen(false)}
        results={searchResults}
        isSearching={isSearching}
        onPickResult={handlePickSearchResult}
        agentName={agentName}
        activeFilter={searchFilter}
        onChangeFilter={setSearchFilter}
        formatTime={formatMessageTime}
        stripContent={stripImageLines}
      />
    </>
  );
};

export default TodayPage;
