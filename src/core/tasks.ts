export interface HistoryItem {
    text: string;
    completed_at: number;
}

export interface Task {
    text: string;
    completed: boolean;
    focused?: boolean;
}

export type StoredTask = string | Task;

export function normalizeTasks(rawTasks: StoredTask[] = []): Task[] {
    return rawTasks.map(task => (
        typeof task === 'string'
            ? { text: task, completed: false, focused: false }
            : { focused: false, ...task }
    ));
}

export function createTask(text: string): Task {
    return { text, completed: false, focused: false };
}

export function getTodayString(date = new Date()): string {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function removeCompletedTasks(tasks: Task[]): Task[] {
    return tasks.filter(task => !task.completed);
}

export function moveTaskInList(tasks: Task[], index: number, direction: number): Task[] | null {
    const newIndex = index + direction;
    if (!tasks[index] || newIndex < 0 || newIndex >= tasks.length) {
        return null;
    }

    const nextTasks = [...tasks];
    const [movedTask] = nextTasks.splice(index, 1);
    nextTasks.splice(newIndex, 0, movedTask);
    return nextTasks;
}

export function deleteTaskAt(tasks: Task[], index: number): Task[] {
    const nextTasks = [...tasks];
    nextTasks.splice(index, 1);
    return nextTasks;
}

export function toggleTaskCompletion(tasks: Task[], index: number): { tasks: Task[]; completedTask?: Task } | null {
    if (!tasks[index]) {
        return null;
    }

    const nextTasks = tasks.map((task, taskIndex) => (
        taskIndex === index
            ? { ...task, completed: !task.completed }
            : task
    ));
    const updatedTask = nextTasks[index];

    return {
        tasks: nextTasks,
        completedTask: updatedTask.completed ? updatedTask : undefined,
    };
}

export function toggleTaskFocus(tasks: Task[], index: number): Task[] | null {
    if (!tasks[index]) {
        return null;
    }

    const currentFocus = tasks[index].focused;
    return tasks.map((task, taskIndex) => ({
        ...task,
        focused: taskIndex === index ? !currentFocus : false,
    }));
}
