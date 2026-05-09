import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Plus, Search } from 'lucide-react';
import { api } from '../../services/api';
import { getImageUrl } from '../../services/cloudinary';
import type { FoodPhoto, FoodPhotoDay } from '../../types/food';

type FoodGalleryView = 'day' | 'all';

const formatDateHeader = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[date.getDay()];
  
  return `${year}年${month}月${day}日（${weekday}）`;
};

const sortPhotosDesc = (photos: FoodPhoto[]) => {
  return [...photos].sort((a, b) => {
    const aTime = new Date(a.shot_at || a.created_at).getTime();
    const bTime = new Date(b.shot_at || b.created_at).getTime();
    return bTime - aTime;
  });
};

const FoodPage = () => {
  const [days, setDays] = useState<FoodPhotoDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<FoodGalleryView>('day');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const galleryPhotos = useMemo(() => {
    return sortPhotosDesc(
      days.flatMap((day) =>
        day.groups.flatMap((group) => group.photos)
      )
    );
  }, [days]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await api.getFoodPhotos();
        if (!active) return;
        setDays(data);
      } catch (error) {
        console.error('加载美食照片失败:', error);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, []);

  const handleAddPhoto = () => {
    fileInputRef.current?.click();
  };

  return (
    <main className="min-h-[100dvh] bg-white pb-20">
      <header className="sticky top-0 z-30 bg-white">
        <div className="border-b border-slate-100 px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900">照片墙</h1>
          </div>
        </div>

        <div className="flex border-b border-slate-100">
          <button
            type="button"
            onClick={() => setActiveView('day')}
            className={`flex-1 py-3 text-sm font-medium transition relative ${
              activeView === 'day'
                ? 'text-[var(--color-primary)]'
                : 'text-slate-400'
            }`}
          >
            每天的照片
            {activeView === 'day' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-16 bg-[var(--color-primary)] rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveView('all')}
            className={`flex-1 py-3 text-sm font-medium transition relative ${
              activeView === 'all'
                ? 'text-[var(--color-primary)]'
                : 'text-slate-400'
            }`}
          >
            所有照片
            {activeView === 'all' && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-16 bg-[var(--color-primary)] rounded-full" />
            )}
          </button>
        </div>

        {activeView === 'all' && (
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-1">
              <span className="text-sm text-slate-400">全部时间</span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
            <button className="text-sm text-[var(--color-primary)] font-medium">选择</button>
          </div>
        )}
      </header>

      <section className="py-4">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">加载中...</div>
        ) : galleryPhotos.length === 0 ? (
          <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
            还没有美食照片
          </div>
        ) : activeView === 'day' ? (
          <div className="space-y-6">
            {days.map((day) => (
              <div key={day.date} className="px-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {formatDateHeader(day.date)}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  {day.groups.map((group, groupIndex) => {
                    const orderedPhotos = sortPhotosDesc(group.photos);
                    const previewPhotos = orderedPhotos.slice(0, 5);
                    const hiddenCount = Math.max(orderedPhotos.length - 5, 0);
                    const caption = group.caption || orderedPhotos[0]?.caption || '';
                    const firstPhoto = orderedPhotos[0];
                    
                    return (
                      <article key={`${day.date}-${groupIndex}`} className="rounded-xl bg-white p-2 border border-slate-100">
                        {firstPhoto && (
                          <div className="text-xs text-slate-400 mb-2">
                            {firstPhoto.shot_at?.split('T')[1]?.slice(0, 5) || 
                             firstPhoto.created_at.split('T')[1]?.slice(0, 5) || ''}
                          </div>
                        )}
                        
                        <div className="grid grid-cols-3 gap-1">
                          {previewPhotos.map((photo, photoIndex) => {
                            const imageUrl = getImageUrl(photo.photo_url, 'thumb');
                            const isLastPreview = photoIndex === previewPhotos.length - 1;
                            
                            return (
                              <div
                                key={photo.id}
                                className="relative aspect-square overflow-hidden rounded-lg bg-slate-100"
                              >
                                <img
                                  src={imageUrl}
                                  alt="美食照片"
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                                {hiddenCount > 0 && isLastPreview && (
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-sm font-semibold text-white">
                                    +{hiddenCount}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        
                        {caption && (
                          <p className="mt-2 text-sm text-slate-600">{caption}</p>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-[2px]">
            {galleryPhotos.map((photo) => {
              const imageUrl = getImageUrl(photo.photo_url, 'thumb');
              return (
                <div key={photo.id} className="aspect-square overflow-hidden">
                  <img
                    src={imageUrl}
                    alt="美食照片"
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              );
            })}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={handleAddPhoto}
        className="fixed bottom-24 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg"
        aria-label="添加美食照片"
      >
        <Plus size={24} />
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
      />
    </main>
  );
};

export default FoodPage;