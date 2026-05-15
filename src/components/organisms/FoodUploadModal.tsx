import { useRef, useState } from 'react';
import DatePicker from 'react-datepicker';
import { X, ImagePlus, CalendarDays, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import 'react-datepicker/dist/react-datepicker.css';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const FoodUploadModal = ({ onClose, onSuccess }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side image processing: resize + white-balance + brightness + saturation
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

          // get pixels
          const imgData = ctx.getImageData(0, 0, width, height);
          const d = imgData.data;

          // compute channel averages
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

          // processing params (mild)
          const wbStrength = 0.6; // how strongly to apply auto WB
          const brightnessAdd = 10; // add raw value to channels
          const satFactor = 1.1; // 10% more saturation

          // apply per-pixel adjustments
          for (let i = 0; i < d.length; i += 4) {
            let r = d[i];
            let g = d[i + 1];
            let b = d[i + 2];

            // mild auto white balance: scale each channel toward the global avg
            const rFactor = Math.max(0.85, Math.min(1.15, colorAvg / (rAvg + 1e-6)));
            const gFactor = Math.max(0.85, Math.min(1.15, colorAvg / (gAvg + 1e-6)));
            const bFactor = Math.max(0.85, Math.min(1.15, colorAvg / (bAvg + 1e-6)));
            r = r * (1 - wbStrength) + r * rFactor * wbStrength;
            g = g * (1 - wbStrength) + g * gFactor * wbStrength;
            b = b * (1 - wbStrength) + b * bFactor * wbStrength;

            // brightness
            r = Math.min(255, r + brightnessAdd);
            g = Math.min(255, g + brightnessAdd);
            b = Math.min(255, b + brightnessAdd);

            // simple saturation boost: move channel away from luminance
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            r = lum + (r - lum) * satFactor;
            g = lum + (g - lum) * satFactor;
            b = lum + (b - lum) * satFactor;

            d[i] = Math.max(0, Math.min(255, Math.round(r)));
            d[i + 1] = Math.max(0, Math.min(255, Math.round(g)));
            d[i + 2] = Math.max(0, Math.min(255, Math.round(b)));
            // alpha unchanged
          }

          ctx.putImageData(imgData, 0, 0);

          // export to blob (jpeg)
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
    // Process images sequentially to avoid blocking the UI too hard
    (async () => {
      for (const f of valid) {
        try {
          const processed = await processImageFile(f);
          setFiles((prev) => [...prev, processed]);
          const url = URL.createObjectURL(processed);
          setPreviews((prev) => [...prev, url]);
        } catch (e) {
          // fallback to original
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

  const handleSubmit = async () => {
    if (!files.length && !comment.trim()) {
      setError('请至少添加一张照片或写一条评论');
      return;
    }
    setError('');
    setUploading(true);
    try {
      const shotDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      await api.uploadFoodPhotos(files, comment.trim() || undefined, shotDate);
      previews.forEach((url) => URL.revokeObjectURL(url));
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-t-2xl p-5 pb-8 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">记录美食</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* 照片区域 */}
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

          {/* 添加按钮 */}
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

        {/* 评论 */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="写点什么..."
          rows={2}
          className="w-full text-sm text-slate-700 placeholder-slate-400 border border-slate-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition"
        />

        {/* 日期 */}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <CalendarDays size={16} className="text-slate-400 flex-shrink-0" />
          <DatePicker
            selected={date}
            onChange={(d: Date | null) => d && setDate(d)}
            maxDate={new Date()}
            dateFormat="yyyy年MM月dd日"
            className="w-full border-0 bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* 提交 */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={uploading}
          className="w-full py-3 rounded-xl bg-[var(--color-primary)] text-white text-sm font-medium hover:bg-[var(--color-primary-hover)] disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
        >
          {uploading && <Loader2 size={16} className="animate-spin" />}
          {uploading ? '上传中...' : '确认上传'}
        </button>
      </div>
    </div>
  );
};

export default FoodUploadModal;
