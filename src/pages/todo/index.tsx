import { useState, useEffect } from 'react';
import { Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { BaseButton, BaseInput } from '../../components/atoms';
import { getTodos, createTodo, updateTodo, deleteTodo, type Todo } from '../../services/todo';
import { getTodoGroups, createTodoGroup, type TodoGroup } from '../../services/todoGroup';
import { Loading } from '../../components/atoms';
import { getCurrentDiaryDate, formatDateString } from '../../utils/date';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { TodoCard } from './components/TodoCard';

const TodoPage = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [groups, setGroups] = useState<TodoGroup[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ title: '', deadline: '', group_id: undefined as number | undefined });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  useEffect(() => {
    Promise.all([loadTodos(), loadGroups()]).then(() => {
      setIsLoading(false);
    });
  }, []);

  const loadTodos = async () => {
    try {
      const data = await getTodos();
      setTodos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load todos:', error);
      setHasError(true);
      setTodos([]);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await getTodoGroups();
      const groupList = Array.isArray(data) ? data : [];
      
      // 如果没有默认分组，创建一个
      if (!groupList.some(g => g.is_default)) {
        const defaultGroup = await createTodoGroup({ name: '日常', is_default: true });
        setGroups([defaultGroup, ...groupList]);
      } else {
        setGroups(groupList);
      }
    } catch (error) {
      console.error('Failed to load groups:', error);
      // 如果加载失败，创建默认分组
      try {
        const defaultGroup = await createTodoGroup({ name: '日常', is_default: true });
        setGroups([defaultGroup]);
      } catch (e) {
        console.error('Failed to create default group:', e);
      }
    }
  };

  const handleOpenModal = () => {
    setFormData({ title: '', deadline: '', group_id: undefined });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleEdit = (todo: Todo) => {
    setFormData({
      title: todo.title,
      deadline: todo.deadline || '',
      group_id: todo.group_id,
    });
    setEditingId(todo.id);
    setShowModal(true);
  };

  const handleAddOrEdit = async () => {
    if (!formData.title.trim()) return;

    try {
      setIsSaving(true);
      if (editingId) {
        const updated = await updateTodo(editingId, {
          title: formData.title,
          deadline: formData.deadline || undefined,
          group_id: formData.group_id,
        });
        setTodos(todos.map((item) => (item.id === editingId ? updated : item)));
        setEditingId(null);
      } else {
        // 如果没有选择分组，使用默认分组
        let groupId = formData.group_id;
        if (!groupId) {
          const defaultGroup = groups.find(g => g.is_default);
          if (defaultGroup) {
            groupId = defaultGroup.id;
          }
        }
        
        const newTodo = await createTodo({
          title: formData.title,
          deadline: formData.deadline || undefined,
          group_id: groupId,
        });
        setTodos([newTodo, ...todos]);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Failed to save todo:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTodo(id);
      setTodos(todos.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
      alert('删除失败，请重试');
    }
  };

  const handleStatusChange = async (id: number, currentStatus: string) => {
    let newStatus: 'pending' | 'completed';
    if (currentStatus === 'pending') {
      newStatus = 'completed';
    } else {
      newStatus = 'pending';
    }

    try {
      const updated = await updateTodo(id, { status: newStatus });
      setTodos(todos.map((item) => (item.id === id ? updated : item)));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleDiscard = async (id: number) => {
    try {
      const updated = await updateTodo(id, { status: 'discarded' });
      setTodos(todos.map((item) => (item.id === id ? updated : item)));
    } catch (error) {
      console.error('Failed to discard todo:', error);
    }
  };

  const handleCreateGroup = async () => {
    const groupName = (document.getElementById('newGroupName') as HTMLInputElement)?.value;
    if (!groupName?.trim()) return;

    try {
      const newGroup = await createTodoGroup({ name: groupName });
      setGroups([...groups, newGroup]);
      setShowGroupModal(false);
      (document.getElementById('newGroupName') as HTMLInputElement)!.value = '';
    } catch (error) {
      console.error('Failed to create group:', error);
      alert('创建分组失败，请重试');
    }
  };

  const toggleGroup = (groupId: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  // 按状态排序：未完成 > 完成 > 废弃，同一状态按创建时间从新到旧
  const statusOrder = { pending: 0, completed: 1, discarded: 2 };

  const getTodosByGroup = (groupId: number | undefined) => {
    return todos
      .filter((t) => t.group_id === groupId)
      .sort((a, b) => {
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  };

  const activeTodosByGroup = (groupId: number | undefined) => {
    return getTodosByGroup(groupId).filter((t) => t.status !== 'discarded');
  };

  const discardedTodosByGroup = (groupId: number | undefined) => {
    return getTodosByGroup(groupId).filter((t) => t.status === 'discarded');
  };

  const getGroupById = (groupId: number | undefined): TodoGroup | undefined => {
    if (!groupId) return undefined;
    return groups.find((g) => g.id === groupId);
  };

  // 分离默认分组和其他分组
  const defaultGroup = groups.find((g) => g.is_default);
  const otherGroups = groups.filter((g) => !g.is_default);

  if (isLoading) {
    return (
      <main className="min-h-[100dvh] bg-white pb-24 text-slate-900">
        <section className="relative overflow-hidden">
          <div className="relative bg-[linear-gradient(180deg,#9333ea_0%,#a855f7_100%)] px-5 pb-5 pt-5 shadow-[0_1.5rem_3rem_rgba(168,85,247,0.24)]">
            <p className="text-4xl font-semibold tracking-[-0.04em] text-white drop-shadow-[0_1px_12px_rgba(255,255,255,0.18)]">
              待办事项
            </p>
          </div>
        </section>
        <div className="flex items-center justify-center py-12">
          <Loading />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-white pb-24 text-slate-900">
      <section className="relative overflow-hidden">
        <div className="relative bg-[linear-gradient(180deg,#9333ea_0%,#a855f7_100%)] px-5 pb-5 pt-5 shadow-[0_1.5rem_3rem_rgba(168,85,247,0.24)]">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold tracking-[-0.04em] text-white drop-shadow-[0_1px_12px_rgba(255,255,255,0.18)]">
                待办事项
              </p>
            </div>
            <button
              onClick={handleOpenModal}
              className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
            >
              <Plus size={24} />
            </button>
          </div>
        </div>
      </section>

      <div className="min-h-[calc(100dvh-140px)] pt-6">
        <div className="mx-auto max-w-2xl px-4 sm:px-6">
          {todos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-slate-400 mb-4">暂无待办事项</p>
              <BaseButton
                onClick={handleOpenModal}
                className="bg-purple-500 hover:bg-purple-600"
              >
                添加待办事项
              </BaseButton>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 默认分组 - 日常 */}
              {defaultGroup && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-2 py-1">
                    <span className="text-sm font-medium text-slate-700">{defaultGroup.name}</span>
                    <span className="text-xs text-slate-400">({activeTodosByGroup(defaultGroup.id).length}个)</span>
                  </div>
                  
                  {/* 活跃任务 */}
                  {activeTodosByGroup(defaultGroup.id).map((item) => (
                    <TodoCard
                      key={item.id}
                      todo={item}
                      onStatusChange={handleStatusChange}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onDiscard={handleDiscard}
                      showDiscardButton={true}
                    />
                  ))}

                  {/* 废弃任务 */}
                  {discardedTodosByGroup(defaultGroup.id).map((item) => (
                    <TodoCard
                      key={item.id}
                      todo={item}
                      onStatusChange={handleStatusChange}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onDiscard={handleDiscard}
                      showDiscardButton={false}
                    />
                  ))}
                </div>
              )}

              {/* 其他分组 */}
              {otherGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.id);
                const activeCount = activeTodosByGroup(group.id).length;
                const discardedCount = discardedTodosByGroup(group.id).length;
                const totalCount = activeCount + discardedCount;

                if (totalCount === 0) return null;

                return (
                  <div key={group.id} className="space-y-3">
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="flex items-center gap-2 w-full px-2 py-1 text-left hover:bg-slate-50 rounded-lg transition"
                    >
                      {isExpanded ? (
                        <ChevronDown size={16} className="text-slate-400" />
                      ) : (
                        <ChevronRight size={16} className="text-slate-400" />
                      )}
                      <span className="text-sm font-medium text-slate-700">{group.name}</span>
                      <span className="text-xs text-slate-400">({activeCount}个)</span>
                    </button>

                    {isExpanded && (
                      <div className="ml-4 space-y-3">
                        {/* 活跃任务 */}
                        {activeTodosByGroup(group.id).map((item) => (
                          <TodoCard
                            key={item.id}
                            todo={item}
                            onStatusChange={handleStatusChange}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onDiscard={handleDiscard}
                            showDiscardButton={true}
                          />
                        ))}

                        {/* 废弃任务 */}
                        {discardedTodosByGroup(group.id).map((item) => (
                          <TodoCard
                            key={item.id}
                            todo={item}
                            onStatusChange={handleStatusChange}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onDiscard={handleDiscard}
                            showDiscardButton={false}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* 添加分组按钮 */}
          {otherGroups.length > 0 && (
            <button
              onClick={() => setShowGroupModal(true)}
              className="mt-4 w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-purple-300 hover:text-purple-500 transition"
            >
              + 添加新分组
            </button>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-xl">
            <div className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">💡</span>
              <p className="text-xs text-blue-600">
                提示: 点击圆圈可切换完成/未完成状态，点击垃圾桶标记为废弃，废弃任务显示在分组内
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 添加/编辑待办事项弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? '编辑待办事项' : '添加待办事项'}
              </h2>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  所属分组
                </label>
                <div className="relative">
                  <select
                    value={formData.group_id || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({ ...formData, group_id: value ? Number(value) : undefined });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none"
                  >
                    <option value="">选择分组...</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name} {group.is_default ? '(默认)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setShowGroupModal(true);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-500"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  事项标题
                </label>
                <BaseInput
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="输入事项标题"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  截止日期（可选）
                </label>
                <DatePicker
                  selected={formData.deadline ? new Date(formData.deadline) : null}
                  onChange={(date: Date | null) =>
                    setFormData({ ...formData, deadline: date ? formatDateString(date) : '' })
                  }
                  dateFormat="yyyy-MM-dd"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 rounded-lg bg-slate-100 py-2 text-slate-900 font-medium transition hover:bg-slate-200 disabled:opacity-50"
                  disabled={isSaving}
                >
                  取消
                </button>
                <button
                  onClick={handleAddOrEdit}
                  className="flex-1 rounded-lg bg-purple-500 py-2 text-white font-medium transition hover:bg-purple-600 disabled:opacity-50"
                  disabled={isSaving || !formData.title.trim()}
                >
                  {isSaving ? '保存中...' : editingId ? '保存' : '添加'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 添加分组弹窗 */}
      {showGroupModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-slate-900">添加分组</h2>
              <button
                onClick={() => setShowGroupModal(false)}
                className="p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <X size={20} className="text-slate-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  分组名称
                </label>
                <input
                  id="newGroupName"
                  type="text"
                  placeholder="输入分组名称"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="flex-1 rounded-lg bg-slate-100 py-2 text-slate-900 font-medium transition hover:bg-slate-200"
                >
                  取消
                </button>
                <button
                  onClick={handleCreateGroup}
                  className="flex-1 rounded-lg bg-purple-500 py-2 text-white font-medium transition hover:bg-purple-600"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default TodoPage;