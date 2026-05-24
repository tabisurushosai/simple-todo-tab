import type {
    TodoStorageAdapter,
    TodoStorageChangeListener,
    TodoStorageChanges,
    TodoStorageKey,
    TodoStorageSelection,
} from './todoStorage';
import { isTodoStorageKey } from './todoStorage';

export function createChromeTodoStorage(): TodoStorageAdapter {
    return {
        get<K extends TodoStorageKey>(keys: readonly K[]) {
            return new Promise<TodoStorageSelection<K>>(resolve => {
                chrome.storage.local.get([...keys], result => {
                    resolve(result as TodoStorageSelection<K>);
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
