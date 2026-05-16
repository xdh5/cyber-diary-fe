import { http } from './http';

export interface TodoGroup {
  id: number;
  name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TodoGroupCreate {
  name: string;
  is_default?: boolean;
}

export interface TodoGroupUpdate {
  name?: string;
}

export const getTodoGroups = () => {
  return http.get<TodoGroup[]>('/api/v1/todo-group/');
};

export const getTodoGroup = (id: number) => {
  return http.get<TodoGroup>(`/api/v1/todo-group/${id}`);
};

export const createTodoGroup = (data: TodoGroupCreate) => {
  return http.post<TodoGroup>('/api/v1/todo-group/', data);
};

export const updateTodoGroup = (id: number, data: TodoGroupUpdate) => {
  return http.patch<TodoGroup>(`/api/v1/todo-group/${id}`, data);
};

export const deleteTodoGroup = (id: number) => {
  return http.delete(`/api/v1/todo-group/${id}`);
};