import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { diaryApi, Diary, CreateDiaryRequest, UpdateDiaryRequest } from '@/api/diaryApi';

export const useDiaries = () => {
  const queryClient = useQueryClient();

  const {
    data: diaries,
    isLoading,
    error,
    refetch,
  } = useQuery<Diary[], Error>({
    queryKey: ['diaries'],
    queryFn: diaryApi.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const createDiary = useMutation({
    mutationFn: (data: CreateDiaryRequest) => diaryApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
    },
  });

  const updateDiary = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDiaryRequest }) =>
      diaryApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
    },
  });

  const deleteDiary = useMutation({
    mutationFn: (id: string) => diaryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diaries'] });
    },
  });

  return {
    diaries,
    isLoading,
    error,
    refetch,
    createDiary,
    updateDiary,
    deleteDiary,
  };
};
