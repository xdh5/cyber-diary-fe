import { useState, useRef, useEffect, ReactNode } from 'react';
import { Trash2, Edit2 } from 'lucide-react';

interface BaseSwipeableProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  onDelete: () => void;
  isDeleting?: boolean;
  confirmTitle?: string;
  confirmMessage?: string;
  deleteButtonWidth?: number;
  maxSwipeOffset?: number;
  threshold?: number;
  rounded?: boolean;
  showEdit?: boolean;
  onEdit?: () => void;
  editButtonWidth?: number;
}

const BaseSwipeable = ({
  children,
  onDelete,
  isDeleting = false,
  confirmTitle = '确认删除',
  confirmMessage = '确认删除吗？删除后无法恢复。',
  deleteButtonWidth = 60,
  maxSwipeOffset = 120,
  threshold = 10,
  rounded = true,
  className = '',
  showEdit = false,
  onEdit,
  editButtonWidth = 60,
  ...rest
}: BaseSwipeableProps) => {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const lastTouchX = useRef<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalButtonWidth = showEdit ? deleteButtonWidth + editButtonWidth : deleteButtonWidth;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (swipeOffset > 0 && containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSwipeOffset(0);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [swipeOffset]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isDeleting) return;
    touchStartX.current = e.touches[0].clientX;
    lastTouchX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsSwiping(true);
    setIsLongPressed(false);

    longPressTimer.current = setTimeout(() => {
      setIsLongPressed(true);
    }, 200);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping || isDeleting) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffY = Math.abs(currentY - touchStartY.current);

    if (diffY > 10) {
      setIsSwiping(false);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
      return;
    }

    const dx = currentX - lastTouchX.current;
    lastTouchX.current = currentX;

    if (dx < 0) {
      if (isLongPressed) {
        setSwipeOffset(totalButtonWidth);
      } else {
        setSwipeOffset((prev) => Math.min(prev + Math.abs(dx), maxSwipeOffset));
      }
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    if (swipeOffset < threshold && !isLongPressed) {
      setSwipeOffset(0);
    } else if (swipeOffset > 0) {
      setSwipeOffset(totalButtonWidth);
    }
  };

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const handleEditClick = () => {
    setSwipeOffset(0);
    onEdit?.();
  };

  const handleConfirmDelete = async () => {
    setShowConfirm(false);
    onDelete();
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
    setSwipeOffset(0);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (swipeOffset > 0) {
      setSwipeOffset(0);
    }
  };

  const roundedClass = rounded ? 'rounded-lg' : '';

  return (
    <>
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${roundedClass} ${className}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleContainerClick}
        {...rest}
      >
        <div className={`absolute inset-0 flex items-center justify-end z-0 ${roundedClass}`}>
          {showEdit && (
            <div className="flex items-center justify-center pr-4 bg-blue-500" style={{ width: `${editButtonWidth}px` }}>
              <Edit2 size={20} className="text-white" />
            </div>
          )}
          <div className={`flex items-center justify-end pr-4 ${showEdit ? 'bg-red-500' : 'bg-red-500'}`} style={{ width: `${deleteButtonWidth}px` }}>
            <Trash2 size={20} className="text-white" />
          </div>
        </div>

        <div
          className={`relative bg-white transition-transform duration-150 ease-out ${roundedClass}`}
          style={{
            transform: `translateX(${swipeOffset > 0 ? -Math.min(swipeOffset, totalButtonWidth) : 0}px)`,
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

          {children}
        </div>

        {swipeOffset > 0 && (
          <>
            {showEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditClick();
                }}
                className="absolute top-0 h-full flex items-center justify-center bg-blue-500 text-white z-10"
                style={{
                  right: `${deleteButtonWidth}px`,
                  width: `${editButtonWidth}px`,
                }}
              >
                <Edit2 size={20} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick();
              }}
              className="absolute right-0 top-0 h-full px-4 flex items-center justify-center bg-red-500 text-white z-10"
              style={{
                width: `${deleteButtonWidth}px`,
              }}
            >
              <Trash2 size={20} />
            </button>
          </>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/45">
          <div className="rounded-3xl bg-white p-6 shadow-2xl max-w-sm w-11/12">
            <h3 className="text-lg font-semibold text-slate-900">{confirmTitle}</h3>
            <p className="mt-2 text-sm text-slate-600">{confirmMessage}</p>
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

export default BaseSwipeable;
