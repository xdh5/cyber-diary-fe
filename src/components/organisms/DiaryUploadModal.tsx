import { useRef, useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { X, ImagePlus, CalendarDays, Loader2, MapPin } from 'lucide-react';
import axios from 'axios';
import { api } from '../../services/api';
import { generateDiary, generateDiaryStream } from '../../services/entry';
import { getCurrentDiaryDate, formatDateString } from '../../utils/date';
import 'react-datepicker/dist/react-datepicker.css';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const DiaryUploadModal = ({ onClose, onSuccess }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [text, setText] = useState('');
  const [date, setDate] = useState<Date>(getCurrentDiaryDate());
  const [district, setDistrict] = useState('');
  const [locationStatus, setLocationStatus] = useState<'pending' | 'prompt' | 'granted' | 'denied'>('pending');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [generatingProgress, setGeneratingProgress] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 图片处理函数（从FoodUploadModal复制）
  const processImageFile = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const MAX_DIM = 1024;
          let { width, height } = img;
          let scale = 1;
          if (Math.max(width, height) > MAX_DIM) {
            scale = MAX_DIM / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            return reject(new Error('Canvas not supported'));
          }

          ctx.drawImage(img, 0, 0, width, height);

          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;

          let rSum = 0, gSum = 0, bSum = 0, count = 0;
          for (let i = 0; i < d.length; i += 4) {
            rSum += d[i];
            gSum += d[i + 1];
            bSum += d[i + 2];
            count++;
          }
          const rAvg = rSum / count;
          const gAvg = gSum / count;
          const bAvg = bSum / count;
          const colorAvg = (rAvg + gAvg + bAvg) / 3;

          const wbStrength = 0.6;
          const brightnessAdd = 10;
          const satFactor = 1.1;

          for (let i = 0; i < d.length; i += 4) {
            let r = d[i];
            let g = d[i + 1];
            let b = d[i + 2];

            const rFactor = Math.max(0.85, Math.min(1.15, colorAvg / (rAvg + 1e-6)));
            const gFactor = Math.max(0.85, Math.min(1.15, colorAvg / (gAvg + 1e-6)));
            const bFactor = Math.max(0.85, Math.min(1.15, colorAvg / (bAvg + 1e-6)));
            r = r * (1 - wbStrength) + r * rFactor * wbStrength;
            g = g * (1 - wbStrength) + g * gFactor * wbStrength;
            b = b * (1 - wbStrength) + b * bFactor * wbStrength;

            r = Math.min(255, r + brightnessAdd);
            g = Math.min(255, g + brightnessAdd);
            b = Math.min(255, b + brightnessAdd);

            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            r = lum + (r - lum) * satFactor;
            g = lum + (g - lum) * satFactor;
            b = lum + (b - lum) * satFactor;

            d[i] = Math.max(0, Math.min(255, Math.round(r)));
            d[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
            d[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
          }

          ctx.putImageData(imgData, 0, 0);

          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              if (!blob) return reject(new Error('Processing failed'));
              const processedFile = new File([blob], file.name, { type: 'image/jpeg' });
              resolve(processedFile);
            },
            'image/jpeg',
            0.92,
          );
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load error'));
      };
      img.src = url;
    });
  };

  const addFiles = (incoming: File[]) => {
    const valid = incoming.filter((f) => f.type.startsWith('image/'));
    if (!valid.length) return;
    (async () => {
      for (const f of valid) {
        try {
          const processed = await processImageFile(f);
          setFiles((prev) => [...prev, processed]);
          const url = URL.createObjectURL(processed);
          setPreviews((prev) => [...prev, url]);
        } catch (e) {
          setFiles((prev) => [...prev, f]);
          const url = URL.createObjectURL(f);
          setPreviews((prev) => [...prev, url]);
        }
      }
    })();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  // 地理位置获取 - 使用浏览器 Geolocation API
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

      const result = parts.length > 0 ? parts.join('') : data.display_name?.split(',').slice(0, 3).join(' ').trim() || null;
      console.log('[Geolocation] Result:', result);
      return result;
    } catch (err) {
      console.error('[Geolocation] Reverse geocode failed:', err);
      return null;
    }
  };

  useEffect(() => {
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
  }, [district, locationStatus]);

  const handleSubmit = async () => {
    if (!files.length && !text.trim()) {
      setError('请至少添加一张图片或输入一些文字');
      return;
    }
    setError('');
    setGeneratingProgress('');
    setUploading(true);

    try {
      // 1. 先上传图片获取URL
      const uploadedImageUrls: string[] = [];
      for (const file of files) {
        const result = await api.uploadImage(file);
        // 使用原始URL而不是通过cloudinary转换
        uploadedImageUrls.push(result.url);
      }

      // 2. 调用后端API流式生成日记
      const entryDate = formatDateString(date);
      const diaryResult = await generateDiaryStream(
        {
          text: text.trim() || undefined,
          image_urls: uploadedImageUrls,
          date: entryDate,
        },
        (event) => {
          if (event.status === 'generating') {
            setGeneratingProgress('🚀 开始生成日记...');
          } else if (event.status === 'streaming') {
            setGeneratingProgress(`📝 生成中... (${event.content?.length || 0} 字)`);
          } else if (event.status === 'complete') {
            setGeneratingProgress('✅ 生成完成');
          }
        }
      );

      // 3. 创建日记
      const payload = {
        title: diaryResult.title,
        content: diaryResult.content,
        district: district || '未知位置',
        date: entryDate,
      };

      await api.createEntry(payload);

      previews.forEach((url) => URL.revokeObjectURL(url));
      onSuccess();
      onClose();
    } catch (err) {
      console.error('上传失败:', err);
      setError(err instanceof Error ? err.message : '上传失败，请重试');
    } finally {
      setUploading(false);
      setGeneratingProgress('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl p-5 pb-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">记录日记</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div
          className="grid grid-cols-4 gap-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          {previews.map((url, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-slate-100">
              <img src={url} className="w-full h-full object-cover" />
              <button
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 bg-black/50 rounded-full p-0.5 text-white hover:bg-black/70 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            <ImagePlus size={22} />
            <span className="text-xs">添加</span>
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="写下今天发生的事情..."
          rows={4}
          className="w-full text-sm text-slate-700 placeholder-slate-400 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
        />

        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CalendarDays size={16} className="text-slate-400 flex-shrink-0" />
          <DatePicker
            selected={date}
            onChange={(d: Date | null) => d && setDate(d)}
            maxDate={getCurrentDiaryDate()}
            dateFormat="yyyy年MM月dd日"
            className="w-full border-0 bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={16} className="text-slate-400 flex-shrink-0" />
            <span className="text-xs">{district || '正在获取位置...'}</span>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-500">
            {locationStatus === 'prompt' && '定位中'}
            {locationStatus === 'granted' && '已定位'}
            {locationStatus === 'denied' && '定位失败'}
            {locationStatus === 'pending' && '等待中'}
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {generatingProgress && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700">{generatingProgress}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={uploading}
          className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {uploading && <Loader2 size={16} className="animate-spin" />}
          {uploading ? 'AI 正在生成日记...' : '确认上传'}
        </button>
      </div>
    </div>
  );
};

export default DiaryUploadModal;
