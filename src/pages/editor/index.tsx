import { useState, useEffect, useMemo, useRef } from 'react';
import { ArrowLeft, Check, Edit, Eraser, AlignCenter, Bold, Italic, Underline, Quote, List, ListOrdered, ImagePlus } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ReactQuill from 'react-quill';
import DOMPurify from 'dompurify';
import axios from 'axios';
import 'react-quill/dist/quill.snow.css';

import { api } from '../../services/api';
import { getImageUrl } from '../../services/cloudinary';
import type { LocationStatus } from '../../types/ui';

const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  try {
    console.log(`[Geolocation] Reverse geocoding: lat=${lat}, lng=${lng}`);
    const response = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`,
      {
        timeout: 8000,
        headers: {
          'User-Agent': 'Cyber-Diary/1.0 (https://cyber-diary.com)',
        },
      }
    );
    const data = response.data;
    console.log('[Geolocation] Response:', data);
    
    const address = data.address || {};
    const country = address.country || '中国';
    const province = address.state || address.region || address.province || address.county || '';
    const cityDistrict =
      address.city_district || address.district || address.county || address.suburb || address.town || address.village || '';
    const street = address.road || address.pedestrian || address.footway || address.neighbourhood || address.residential || address.street || '';

    const parts = [country, province, cityDistrict, street]
      .filter(Boolean)
      .map((part, index, arr) => (arr.indexOf(part) === index ? part : null))
      .filter(Boolean) as string[];

    if (parts.length > 0) return parts.join('');
    if (data.display_name) return data.display_name.split(',').slice(0, 3).join(' ').trim();
    return null;
  } catch (err) {
    console.error('Reverse geocode failed:', err);
    return null;
  }
};


const EditorPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isEditing, setIsEditing] = useState(() => !searchParams.get('id'));
  const [title, setTitle] = useState('');
  const [savedTitle, setSavedTitle] = useState('');
  const [content, setContent] = useState('');
  const [district, setDistrict] = useState('');
  const [savedContent, setSavedContent] = useState('');
  const [savedDistrict, setSavedDistrict] = useState('');
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('pending');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [entryId, setEntryId] = useState<number | undefined>();
  const [hasChanges, setHasChanges] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const quillRef = useRef<ReactQuill | null>(null);

  const currentDate = new Intl.DateTimeFormat('zh-CN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  const sanitizedContent = useMemo(() => DOMPurify.sanitize(content || ''), [content]);

  const toolbarModules = useMemo(
    () => ({
      toolbar: {
        container: '#diary-toolbar',
        handlers: {
          image: () => {
            void handleImageInsert();
          },
        },
      },
      clipboard: {
        matchVisual: false,
      },
    }),
    [],
  );

  const toolbarFormats = ['header', 'bold', 'italic', 'underline', 'blockquote', 'list', 'bullet', 'align', 'image'];

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      loadEntry(parseInt(id, 10));
      return;
    }

    setEntryId(undefined);
    setTitle('');
    setSavedTitle('');
    setContent('');
    setSavedContent('');
    setDistrict('');
    setSavedDistrict('');
    setHasChanges(false);
    setIsEditing(true);
  }, [searchParams]);

  useEffect(() => {
    setHasChanges(title !== savedTitle || content !== savedContent || district !== savedDistrict);
  }, [title, savedTitle, content, savedContent, district, savedDistrict]);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) {
      return;
    }
    if (locationStatus !== 'pending') return;
    if (district) {
      setLocationStatus('granted');
      return;
    }
    if (!navigator.geolocation) {
      console.warn('[Geolocation] Geolocation API not available');
      setLocationStatus('denied');
      setDistrict('未知位置');
      return;
    }
    
    setLocationStatus('prompt');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        console.log(`[Geolocation] Got coordinates: lat=${coords.latitude}, lng=${coords.longitude}`);
        const label = await reverseGeocode(coords.latitude, coords.longitude);
        const finalDistrict = label || '未知位置';
        setDistrict(finalDistrict);
        setLocationStatus(label ? 'granted' : 'denied');
        console.log(`[Geolocation] District set to: ${finalDistrict}`);
      },
      (error) => {
        console.error('[Geolocation] Error getting position - Code:', error.code, 'Message:', error.message);
        setLocationStatus('denied');
        setDistrict('未知位置');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [searchParams, district, locationStatus]);

  const loadEntry = async (id: number) => {
    setIsLoading(true);
    try {
      const entry = await api.getEntry(id);
      setEntryId(entry.id);
      setTitle(entry.title || '');
      setSavedTitle(entry.title || '');
      setContent(entry.content || '');
      setDistrict(entry.district || '');
      setSavedContent(entry.content || '');
      setSavedDistrict(entry.district || '');
      setHasChanges(false);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to load entry:', error);
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!hasChanges) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      handleAutoSave();
    }, 10000);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [title, content, district, hasChanges]);

  const handleAutoSave = async () => {
    try {
      const payload = { title, content, district: district || '未知未知' };
      if (entryId) {
        await api.updateEntry(entryId, payload);
      } else {
        const newEntry = await api.createEntry(payload);
        setEntryId(newEntry.id);
      }
      setSavedTitle(title);
      setSavedContent(content);
      setSavedDistrict(district);
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const payload = { title, content, district: district || '未知未知' };
      if (entryId) {
        await api.updateEntry(entryId, payload);
      } else {
        const newEntry = await api.createEntry(payload);
        setEntryId(newEntry.id);
      }
      setSavedTitle(title);
      setSavedContent(content);
      setSavedDistrict(district);
      return true;
    } catch (error) {
      console.error('Failed to save entry:', error);
      alert('保存失败，请检查后端是否可访问');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDone = async () => {
    const saved = await handleSave();
    if (saved) setIsEditing(false);
  };

  const handleCancel = async () => {
    if (hasChanges) {
      const saved = await handleSave();
      if (!saved) return;
    }
    navigate('/');
  };

  const handleImageInsert = async () => {
    if (isUploadingImage) {
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/jpeg,image/png,image/webp,image/gif';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        alert('图片不能超过 5MB');
        return;
      }

      try {
        setIsUploadingImage(true);
        const uploaded = await api.uploadImage(file);
        const imageUrl = getImageUrl(uploaded.url, 'full');
        const editor = quillRef.current?.getEditor();

        if (editor) {
          const range = editor.getSelection(true);
          const insertAt = range ? range.index : editor.getLength();
          editor.insertEmbed(insertAt, 'image', imageUrl, 'user');
          editor.setSelection(insertAt + 1, 0, 'silent');
        } else {
          setContent((prev) => `${prev}<p><img src="${imageUrl}" alt="图片" /></p>`);
        }
      } catch (error) {
        console.error('Failed to insert image:', error);
        alert('图片上传失败，请检查后端 OSS 配置');
      } finally {
        setIsUploadingImage(false);
      }
    };
    input.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 text-slate-900">
      <header className="fixed top-0 inset-x-0 z-50 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-2 py-3">

          <div className="flex flex-1 ml-2 text-center">
            <button onClick={handleCancel} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition">
              <ArrowLeft size={20} />
            </button>
            <p className="text-sm text-slate-500 flex-1">{currentDate}</p>
          </div>

          <div className="flex items-center gap-3">
            {isEditing ? (
              <button
                onClick={handleDone}
                className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm text-white hover:bg-blue-600 transition"
              >
                <Check size={18} />
                <span>完成</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="pt-10 h-screen flex flex-col overflow-hidden">
        {/* Geographic location was moved below the textarea */}

        {isEditing ? (
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            <div className="border-b border-slate-100 flex-shrink-0">
              <input
                type="text"
                placeholder="日记标题 (选填)"
                className="w-full px-6 py-4 text-2xl font-bold text-slate-900 outline-none placeholder:text-slate-300"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div
              id="diary-toolbar"
              className="diary-toolbar flex flex-wrap items-center gap-1 border-b border-slate-100 bg-white px-4 py-3"
            >
              <button type="button" className="ql-bold" aria-label="加粗" title="加粗">
                <Bold size={16} />
              </button>
              <button type="button" className="ql-italic" aria-label="斜体" title="斜体">
                <Italic size={16} />
              </button>
              <button type="button" className="ql-underline" aria-label="下划线" title="下划线">
                <Underline size={16} />
              </button>
              <button type="button" className="ql-blockquote" aria-label="引用" title="引用">
                <Quote size={16} />
              </button>
              <button type="button" className="ql-list" value="ordered" aria-label="有序列表" title="有序列表">
                <ListOrdered size={16} />
              </button>
              <button type="button" className="ql-list" value="bullet" aria-label="无序列表" title="无序列表">
                <List size={16} />
              </button>
              <button type="button" className="ql-align" value="center" aria-label="居中对齐" title="居中对齐">
                <AlignCenter size={16} />
              </button>
              <button type="button" className="ql-image" aria-label="插入图片" title="插入图片">
                <ImagePlus size={16} />
              </button>
              <button type="button" className="ql-clean" aria-label="清除格式" title="清除格式">
                <Eraser size={16} />
              </button>
            </div>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              value={content}
              onChange={(value) => setContent(value)}
              modules={toolbarModules}
              formats={toolbarFormats}
              className="diary-quill-editor flex-1 min-h-0"
              placeholder="记录今天的心情..."
            />
          </div>
        ) : (
          <div className="flex-1 overflow-auto bg-white">
            <div className="mx-auto max-w-3xl">
              {title && <h1 className="text-xl font-bold text-slate-900 pl-4 py-6">{title}</h1>}
              {sanitizedContent ? (
                <article className="diary-richtext-preview ql-editor" dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
              ) : (
                <p className="text-slate-400">暂无内容</p>
              )}
            </div>
          </div>
        )}
      </main>

      {!isEditing && (
        <button
          onClick={() => setIsEditing(true)}
          className="fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl transition hover:bg-blue-700"
          aria-label="进入编辑模式"
        >
          <Edit size={24} />
        </button>
      )}
    </div>
  );
};

export default EditorPage;
