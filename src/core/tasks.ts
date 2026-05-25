export interface HistoryItem {
    text: string;
    completed_at: number;
}

export interface Task {
    text: string;
    completed: boolean;
    focused: boolean;
}

export interface StoredTaskObject {
    text: string;
    completed: boolean;
    focused?: boolean;
}

export type StoredTask = string | StoredTaskObject;
type ToggleTaskCompletionResult =
    | { tasks: Task[]; completedTask: Task }
    | { tasks: Task[]; completedTask?: never };

export function normalizeTasks(rawTasks: readonly StoredTask[] = []): Task[] {
    return rawTasks.map(task => (
        typeof task === 'string'
            ? createTask(task)
            : { ...task, focused: task.focused ?? false }
    ));
}

export function createTask(text: string): Task {
    return { text, completed: false, focused: false };
}

export function getTodayString(date = new Date()): string {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function removeCompletedTasks(tasks: readonly Task[]): Task[] {
    return tasks.filter(task => !task.completed);
}

export function moveTaskInList(tasks: readonly Task[], index: number, direction: -1 | 1): Task[] | null {
    const newIndex = index + direction;
    const movedTask = tasks[index];
    if (!movedTask || newIndex < 0 || newIndex >= tasks.length) {
        return null;
    }

    const nextTasks = [...tasks];
    nextTasks.splice(index, 1);
    nextTasks.splice(newIndex, 0, movedTask);
    return nextTasks;
}

export function deleteTaskAt(tasks: readonly Task[], index: number): Task[] {
    const nextTasks = [...tasks];
    nextTasks.splice(index, 1);
    return nextTasks;
}

export function toggleTaskCompletion(tasks: readonly Task[], index: number): ToggleTaskCompletionResult | null {
    const targetTask = tasks[index];
    if (!targetTask) {
        return null;
    }

    const updatedTask = { ...targetTask, completed: !targetTask.completed };
    const nextTasks = tasks.map((task, taskIndex) => (
        taskIndex === index
            ? updatedTask
            : task
    ));

    return updatedTask.completed
        ? { tasks: nextTasks, completedTask: updatedTask }
        : { tasks: nextTasks };
}

export function toggleTaskFocus(tasks: readonly Task[], index: number): Task[] | null {
    const targetTask = tasks[index];
    if (!targetTask) {
        return null;
    }

    const currentFocus = targetTask.focused;
    return tasks.map((task, taskIndex) => ({
        ...task,
        focused: taskIndex === index ? !currentFocus : false,
    }));
}
