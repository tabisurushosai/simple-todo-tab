import type {
    TodoStorage,
    TodoStorageChangeListener,
    TodoStorageChanges,
    TodoStorageKey,
    TodoStorageValues,
} from './todoStorage';
import { TODO_STORAGE_KEYS } from './todoStorage';

function isTodoStorageKey(key: string): key is TodoStorageKey {
    return (TODO_STORAGE_KEYS as readonly string[]).includes(key);
}

export function createChromeTodoStorage(): TodoStorage {
    return {
        get<K extends TodoStorageKey>(keys: readonly K[]) {
            return new Promise<Pick<TodoStorageValues, K>>(resolve => {
                chrome.storage.local.get([...keys], result => {
                    resolve(result as Pick<TodoStorageValues, K>);
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
        subscribe(listener: TodoStorageChangeListener) {
            const chromeListener = (
                changes: Record<string, chrome.storage.StorageChange>,
                areaName: string,
            ) => {
                if (areaName !== 'local') {
                    return;
                }

                const todoChanges = Object.fromEntries(
                    Object.entries(changes).filter(([key]) => isTodoStorageKey(key)),
                ) as TodoStorageChanges;
                if (Object.keys(todoChanges).length > 0) {
                    listener(todoChanges);
                }
            };

            chrome.storage.onChanged.addListener(chromeListener);
            return () => {
                chrome.storage.onChanged.removeListener(chromeListener);
            };
        },
    };
}

export const chromeTodoStorage = createChromeTodoStorage();
