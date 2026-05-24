import type { HistoryItem, StoredTask } from '../core/tasks';

export interface TodoStorageValues {
    tasks?: StoredTask[];
    last_date?: string;
    trial_start_ts?: number;
    is_premium?: boolean;
    history?: HistoryItem[];
    theme?: string;
}

export type TodoStorageKey = keyof TodoStorageValues;

export const TODO_STORAGE_KEYS = [
    'tasks',
    'last_date',
    'trial_start_ts',
    'is_premium',
    'history',
    'theme',
] as const satisfies readonly TodoStorageKey[];

export function isTodoStorageKey(key: string): key is TodoStorageKey {
    return (TODO_STORAGE_KEYS as readonly string[]).includes(key);
}

export interface TodoStorageChange<T = unknown> {
    oldValue?: T;
    newValue?: T;
}
export type TodoStorageChanges = {
    [K in TodoStorageKey]?: TodoStorageChange<TodoStorageValues[K]>;
};
export type TodoStorageChangeListener = (changes: TodoStorageChanges) => void;
export type TodoStorageUnsubscribe = () => void;
export type TodoStorageSelection<K extends TodoStorageKey> = Pick<TodoStorageValues, K>;
export type TodoStoragePatch = Partial<TodoStorageValues>;

/**
 * Platform storage port used by UI code.
 * Keep implementations local/offline and preserve the JSON-compatible value shape above.
 */
export interface TodoStorageAdapter {
    get<K extends TodoStorageKey>(keys: readonly K[]): Promise<TodoStorageSelection<K>>;
    set(values: TodoStoragePatch): Promise<void>;
    subscribe(listener: TodoStorageChangeListener): TodoStorageUnsubscribe;
}

export type TodoStorage = TodoStorageAdapter;
