import type { HistoryItem, StoredTask } from '../core/tasks';

export interface TodoStorageValues {
    tasks?: StoredTask[];
    last_date?: string;
    trial_start_ts?: number;
    is_premium?: boolean;
    history?: HistoryItem[];
    theme?: string;
}

export const TODO_STORAGE_KEYS = [
    'tasks',
    'last_date',
    'trial_start_ts',
    'is_premium',
    'history',
    'theme',
] as const;

export type TodoStorageKey = keyof TodoStorageValues;
export interface TodoStorageChange<T = unknown> {
    oldValue?: T;
    newValue?: T;
}
export type TodoStorageChanges = {
    [K in TodoStorageKey]?: TodoStorageChange<TodoStorageValues[K]>;
};
export type TodoStorageChangeListener = (changes: TodoStorageChanges) => void;
export type TodoStorageUnsubscribe = () => void;

export interface TodoStorage {
    get<K extends TodoStorageKey>(keys: readonly K[]): Promise<Pick<TodoStorageValues, K>>;
    set(values: Partial<TodoStorageValues>): Promise<void>;
    subscribe(listener: TodoStorageChangeListener): TodoStorageUnsubscribe;
}
