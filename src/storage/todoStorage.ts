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
export type TodoStorageChanges = Partial<Record<TodoStorageKey, { oldValue?: unknown; newValue?: unknown }>>;

export interface TodoStorage {
    get<K extends TodoStorageKey>(keys: K[]): Promise<Pick<TodoStorageValues, K>>;
    set(values: Partial<TodoStorageValues>): Promise<void>;
    onChanged(listener: (changes: TodoStorageChanges) => void): void;
}

export const chromeTodoStorage: TodoStorage = {
    get(keys) {
        return new Promise(resolve => {
            chrome.storage.local.get(keys, result => {
                resolve(result as Pick<TodoStorageValues, typeof keys[number]>);
            });
        });
    },
    set(values) {
        return new Promise(resolve => {
            chrome.storage.local.set(values, () => {
                resolve();
            });
        });
    },
    onChanged(listener) {
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local') {
                listener(changes as TodoStorageChanges);
            }
        });
    },
};
