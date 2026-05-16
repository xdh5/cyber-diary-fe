import { http } from './http';

export interface Todo {
  id: number;
  title: string;
  description?: string;
  status: 'pending' | 'completed' | 'discarded';
  deadline?: string;
  group_id?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TodoCreate {
  title: string;
  description?: string;
  deadline?: string;
  group_id?: number;
}

export interface TodoUpdate {
  title?: string;
  description?: string;
  status?: 'pending' | 'completed' | 'discarded';
  deadline?: string;
  group_id?: number;
}

export const getTodos = () => {
  return http.get<Todo[]>('/api/v1/todo/');
};

export const getTodo = (id: number) => {
  return http.get<Todo>(`/api/v1/todo/${id}`);
};

export const createTodo = (data: TodoCreate) => {
  return http.post<Todo>('/api/v1/todo/', data);
};

export const updateTodo = (id: number, data: TodoUpdate) => {
  return http.patch<Todo>(`/api/v1/todo/${id}`, data);
};

export const deleteTodo = (id: number) => {
  return http.delete(`/api/v1/todo/${id}`);
};