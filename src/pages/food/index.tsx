import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api } from '../../services/api';
import { getImageUrl } from '../../services/cloudinary';
import { deletePhotoGroup } from '../../services/food';
import type { FoodPhoto, FoodPhotoDay, FoodPhotoGroup } from '../../types/food';
import FoodUploadModal from '../../components/organisms/FoodUploadModal';
import { Loading, BaseSwipeable } from '../../components/atoms';

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

const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const sortPhotosDesc = (photos: FoodPhoto[]) => {
  return [...photos].sort((a, b) => {
    const aTime = new Date(a.shot_at || a.created_at).getTime();
    const bTime = new Date(b.shot_at || b.created_at).getTime();
    return bTime - aTime;
  });
};

interface SwipeableGroupProps {
  group: FoodPhotoGroup;
  dayDate: string;
  onDelete: () => void;
  onSelectPhoto: (imageUrl: string) => void;
  isDeleting: boolean;
}

const SwipeablePhotoGroup = ({
  group,
  onDelete,
  onSelectPhoto,
  isDeleting,
}: SwipeableGroupProps) => {
  const handleConfirmDelete = async () => {
    try {
      await deletePhotoGroup(group.group_id);
      onDelete();
    } catch (error) {
      console.error('删除照片组失败:', error);
      alert('删除失败，请重试');
    }
  };

  const orderedPhotos = sortPhotosDesc(group.photos);
  const previewPhotos = orderedPhotos.slice(0, 5);
  const hiddenCount = Math.max(orderedPhotos.length - 5, 0);
  const caption = group.caption || orderedPhotos[0]?.caption || '';

  return (
    <BaseSwipeable
      onDelete={handleConfirmDelete}
      isDeleting={isDeleting}
      confirmTitle="确定要删除这组照片和评论吗？"
      confirmMessage="此操作无法撤销"
      className="mb-6"
    >
      <div className="p-0">
        <div className="grid grid-cols-3 gap-2">
          {previewPhotos.map((photo) => {
            const imageUrl = getImageUrl(photo.photo_url, 'thumb');

            return (
              <div
                key={photo.id}
                className="relative aspect-square overflow-hidden rounded-xl bg-slate-100 cursor-pointer"
                onClick={() => onSelectPhoto(imageUrl)}
              >
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

        {hiddenCount > 0 && (
          <span className="text-xs text-slate-400 ml-0 mt-1 block">+{hiddenCount} 张更多</span>
        )}

        {caption && (
          <p className="mt-2 text-sm text-slate-600 px-0">{caption}</p>
        )}

        {group.comments && group.comments.length > 0 && (
          <div className="mt-3 space-y-2 border-l-2 border-slate-200 pl-3">
            {group.comments.map((comment) => (
              <div key={comment.id} className="text-sm">
                <p className="text-slate-700">{comment.content}</p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatTime(comment.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseSwipeable>
  );
};

const FoodPage = () => {
  const [days, setDays] = useState<FoodPhotoDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  const loadPhotos = async () => {
    try {
      const data = await api.getFoodPhotos();
      setDays(data);
    } catch (error) {
      console.error('加载美食照片失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleGroupDelete = (groupId: string) => {
    setDeletingGroupId(groupId);
    // 给用户留出一个短暂的删除动画，再刷新列表
    setTimeout(async () => {
      await loadPhotos();
      setDeletingGroupId(null);
    }, 700);
  };

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white pb-20">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md">
        <div className="border-b border-slate-100 px-4 py-4">
          <h1 className="text-xl font-bold text-slate-800">美食日记</h1>
        </div>
      </header>

      <section className="bg-white px-4 py-5">
        {loading ? (
          <Loading />
        ) : days.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-8">
            <h3 className="text-lg font-semibold text-slate-700 mb-2">还没有美食照片</h3>
            <p className="text-sm text-slate-400 mb-6">记录你的每一餐，留住美好时光</p>
          </div>
        ) : (
          <div className="space-y-8">
            {days.map((day, dayIndex) => (
              <div key={day.date}>
                <h2 className="mb-4 text-sm font-semibold text-slate-800">
                  {formatDateHeader(day.date)}
                </h2>

                <div className="space-y-4">
                  {day.groups.map((group, groupIndex) => (
                    <SwipeablePhotoGroup
                      key={`${day.date}-${groupIndex}`}
                      group={group}
                      dayDate={day.date}
                      onDelete={() => handleGroupDelete(group.group_id)}
                      onSelectPhoto={setSelectedPhoto}
                      isDeleting={deletingGroupId === group.group_id}
                    />
                  ))}
                </div>

                {dayIndex < days.length - 1 && (
                  <div className="my-4 flex items-center justify-center">
                    <div className="w-12 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <button
        type="button"
        onClick={() => setShowUpload(true)}
        className="fixed bottom-24 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-primary)] text-white shadow-lg hover:bg-[var(--color-primary-hover)] hover:scale-105 transition-all duration-300"
        aria-label="添加美食照片"
      >
        <Plus size={28} />
      </button>

      {showUpload && (
        <FoodUploadModal
          onClose={() => setShowUpload(false)}
          onSuccess={loadPhotos}
        />
      )}

      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button 
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
            onClick={() => setSelectedPhoto(null)}
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img 
            src={selectedPhoto} 
            alt="预览" 
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
};

export default FoodPage;