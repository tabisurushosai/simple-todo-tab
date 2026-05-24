import {
    createTask,
    deleteTaskAt,
    getTodayString,
    moveTaskInList,
    normalizeTasks,
    removeCompletedTasks,
    toggleTaskCompletion,
    toggleTaskFocus,
    type HistoryItem,
    type Task,
} from './core/tasks';
import { chromeTodoStorage } from './storage/chromeTodoStorage';

type TaskControl = 'checkbox' | 'focus' | 'move-up' | 'move-down' | 'delete';
type TaskFocusControl = TaskControl | 'item';
type TaskStatusState = 'loading' | 'empty' | 'active' | 'complete';
type PendingFocusTarget =
    | { type: 'task'; control: TaskFocusControl; index: number }
    | { type: 'input' };

let pendingFocusTarget: PendingFocusTarget | null = null;
type SupportedLocale = 'ja' | 'en';

function getRequiredElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);
    if (!element) {
        throw new Error(`Missing required element: #${id}`);
    }

    return element as T;
}

const title = getRequiredElement<HTMLHeadingElement>('title');
const taskEntryForm = getRequiredElement<HTMLFormElement>('task-entry');
const taskInputLabel = getRequiredElement<HTMLLabelElement>('task-input-label');
const taskInput = getRequiredElement<HTMLInputElement>('task-input');
const addButton = getRequiredElement<HTMLButtonElement>('add-button');
const onboardingGuide = getRequiredElement<HTMLDivElement>('onboarding-guide');
const emptyState = getRequiredElement<HTMLDivElement>('empty-state');
const emptyStateTitle = getRequiredElement<HTMLDivElement>('empty-state-title');
const emptyStateDescription = getRequiredElement<HTMLParagraphElement>('empty-state-description');
const emptyStateAction = getRequiredElement<HTMLButtonElement>('empty-state-action');
const taskList = getRequiredElement<HTMLUListElement>('task-list');
const taskStatus = getRequiredElement<HTMLDivElement>('task-status');
const focusContainer = getRequiredElement<HTMLDivElement>('focus-container');
const focusLabel = getRequiredElement<HTMLDivElement>('focus-label');
const focusText = getRequiredElement<HTMLDivElement>('focus-text');
const premiumGate = getRequiredElement<HTMLDivElement>('premium-gate');
const gateMessage = getRequiredElement<HTMLSpanElement>('gate-message');
const upgradeLink = getRequiredElement<HTMLAnchorElement>('upgrade-link');
const premiumFeatures = getRequiredElement<HTMLDivElement>('premium-features');
const premiumStatus = getRequiredElement<HTMLDivElement>('premium-status');
const themeLabel = getRequiredElement<HTMLLabelElement>('theme-label');
const themeColorInput = getRequiredElement<HTMLInputElement>('theme-color');
const historyTitle = getRequiredElement<HTMLDivElement>('history-title');
const historyList = getRequiredElement<HTMLUListElement>('history-list');
const historyStatus = getRequiredElement<HTMLDivElement>('history-status');

function getSupportedLocale(): SupportedLocale {
    const uiLocale = chrome.i18n.getMessage('@@ui_locale') || chrome.i18n.getUILanguage();
    return uiLocale.toLowerCase().startsWith('en') ? 'en' : 'ja';
}

const supportedLocale = getSupportedLocale();
const numberFormatter = new Intl.NumberFormat(supportedLocale);
const historyDateFormatter = new Intl.DateTimeFormat(supportedLocale, {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

function formatNumber(value: number): string {
    return numberFormatter.format(value);
}

function i18nMessage(messageName: string, replacements: Record<string, string> = {}): string {
    return Object.entries(replacements).reduce(
        (message, [key, value]) => message.replace(`$${key}$`, value),
        chrome.i18n.getMessage(messageName),
    );
}

function setLocalizedText(element: HTMLElement, messageName: string) {
    element.textContent = chrome.i18n.getMessage(messageName);
}

function setTaskStatusMessage(message: string, state: TaskStatusState) {
    taskStatus.textContent = message;
    taskStatus.dataset.state = state;
}

function setupI18n() {
    document.documentElement.lang = supportedLocale;
    document.title = chrome.i18n.getMessage('title');
    setLocalizedText(title, 'title');
    setLocalizedText(focusLabel, 'focusLabel');
    setLocalizedText(taskInputLabel, 'taskInputLabel');
    taskInput.placeholder = chrome.i18n.getMessage('inputPlaceholder');
    setLocalizedText(addButton, 'addButton');
    setLocalizedText(onboardingGuide, 'onboardingGuide');
    setLocalizedText(emptyStateTitle, 'emptyStateTitle');
    setLocalizedText(emptyStateDescription, 'emptyStateDescription');
    setLocalizedText(emptyStateAction, 'emptyStateAction');
    setLocalizedText(upgradeLink, 'upgradeButton');
    setLocalizedText(themeLabel, 'themeLabel');
    themeColorInput.setAttribute('aria-label', chrome.i18n.getMessage('themeLabel'));
    setLocalizedText(historyTitle, 'historyTitle');
    setLocalizedText(premiumStatus, 'premiumActive');
    setTaskStatusMessage(chrome.i18n.getMessage('loadingTasks'), 'loading');
    taskList.setAttribute('aria-busy', 'true');
}

function taskMessage(messageName: string, taskText: string): string {
    return i18nMessage(messageName, { TASK: taskText });
}

function queueTaskFocus(control: TaskFocusControl, index: number) {
    pendingFocusTarget = { type: 'task', control, index };
}

function queueInputFocus() {
    pendingFocusTarget = { type: 'input' };
}

function focusPendingTarget() {
    if (!pendingFocusTarget) return;

    const target = pendingFocusTarget;
    pendingFocusTarget = null;

    if (target.type === 'input') {
        taskInput.focus({ preventScroll: true });
        return;
    }

    const selectors = target.control === 'item'
        ? [`li[data-task-index="${target.index}"]`]
        : [
            `[data-task-control="${target.control}"][data-task-index="${target.index}"]`,
            `li[data-task-index="${target.index}"]`,
        ];

    for (const selector of selectors) {
        const element = taskList.querySelector<HTMLElement>(selector);
        if (!element) continue;
        if (element instanceof HTMLButtonElement && element.disabled) continue;
        if (element instanceof HTMLInputElement && element.disabled) continue;

        element.focus({ preventScroll: true });
        return;
    }

    taskInput.focus({ preventScroll: true });
}

function renderHistory(history: HistoryItem[]) {
    historyList.innerHTML = '';
    if (history.length === 0) {
        historyStatus.hidden = false;
        historyStatus.textContent = chrome.i18n.getMessage('historyEmpty');
        return;
    }

    historyStatus.hidden = true;
    history.slice(-20).reverse().forEach(item => {
        const li = document.createElement('li');
        const date = historyDateFormatter.format(new Date(item.completed_at));
        li.textContent = i18nMessage('historyItem', { DATE: date, TASK: item.text });
        li.className = 'history-item';
        historyList.appendChild(li);
    });
}

function updatePremiumUI(isPremium: boolean, trialStartTs: number) {
    if (isPremium) {
        premiumGate.style.display = 'none';
        premiumFeatures.style.display = 'block';
    } else {
        premiumFeatures.style.display = 'none';
        premiumGate.style.display = 'block';
        const trialDays = 7;
        const elapsed = Date.now() - trialStartTs;
        const remaining = Math.max(0, Math.ceil((trialDays * 24 * 60 * 60 * 1000 - elapsed) / (24 * 60 * 60 * 1000)));
        gateMessage.textContent = i18nMessage(
            remaining === 1 ? 'premiumGateOneDay' : 'premiumGate',
            { DAYS: formatNumber(remaining) },
        );
    }
}

function setTaskStatus(tasks: Task[]) {
    if (tasks.length === 0) {
        setTaskStatusMessage(chrome.i18n.getMessage('emptyTasks'), 'empty');
        return;
    }

    const remaining = tasks.filter(task => !task.completed).length;
    if (remaining === 0) {
        setTaskStatusMessage(chrome.i18n.getMessage('allTasksComplete'), 'complete');
        return;
    }

    setTaskStatusMessage(
        chrome.i18n.getMessage('tasksRemainingStatus')
            .replace('$ACTIVE$', formatNumber(remaining))
            .replace('$TOTAL$', formatNumber(tasks.length)),
        'active',
    );
}

function setTaskControlAttributes(element: HTMLElement, control: TaskControl, index: number) {
    element.setAttribute('data-task-control', control);
    element.setAttribute('data-task-index', index.toString());
}

interface MoveTaskButtonOptions {
    task: Task;
    index: number;
    direction: -1 | 1;
    control: 'move-up' | 'move-down';
    textContent: string;
    messageName: 'moveTaskUpForTask' | 'moveTaskDownForTask';
    disabled: boolean;
}

function createMoveTaskButton({
    task,
    index,
    direction,
    control,
    textContent,
    messageName,
    disabled,
}: MoveTaskButtonOptions): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = textContent;
    button.className = 'task-action-button';
    button.setAttribute('aria-label', taskMessage(messageName, task.text));
    setTaskControlAttributes(button, control, index);
    button.disabled = disabled;
    button.addEventListener('click', () => {
        queueTaskFocus('item', index + direction);
        void moveTask(index, direction);
    });
    return button;
}

function renderTasks(tasks: Task[]) {
    taskList.innerHTML = '';
    taskList.setAttribute('aria-busy', 'false');
    setTaskStatus(tasks);
    const isEmpty = tasks.length === 0;
    onboardingGuide.hidden = !isEmpty;
    emptyState.hidden = !isEmpty;
    const focusedTask = tasks.find(t => t.focused);
    if (focusedTask && !focusedTask.completed) {
        focusContainer.style.display = 'block';
        focusText.textContent = focusedTask.text;
    } else {
        focusContainer.style.display = 'none';
    }

    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.className = `task-item${task.completed ? ' task-item--completed' : ''}`;
        li.tabIndex = -1;
        li.setAttribute('data-task-index', index.toString());

        const checkboxLabel = document.createElement('label');
        checkboxLabel.className = 'task-checkbox-target';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.className = 'task-checkbox';
        checkbox.setAttribute('aria-label', taskMessage(task.completed ? 'markTaskIncomplete' : 'markTaskComplete', task.text));
        setTaskControlAttributes(checkbox, 'checkbox', index);
        checkbox.addEventListener('change', () => {
            queueTaskFocus('checkbox', index);
            void toggleTask(index);
        });
        checkboxLabel.appendChild(checkbox);

        const span = document.createElement('span');
        span.textContent = task.text;
        span.className = 'task-text';

        const focusButton = document.createElement('button');
        focusButton.type = 'button';
        focusButton.textContent = task.focused ? '★' : '☆';
        focusButton.className = `icon-button focus-button${task.focused ? ' focus-button--active' : ''}`;
        focusButton.setAttribute('aria-pressed', (!!task.focused).toString());
        focusButton.setAttribute(
            'aria-label',
            taskMessage(task.focused ? 'clearFocusTaskButtonForTask' : 'focusTaskButtonForTask', task.text),
        );
        setTaskControlAttributes(focusButton, 'focus', index);
        focusButton.addEventListener('click', () => {
            queueTaskFocus('focus', index);
            void toggleFocus(index);
        });

        const moveUpButton = createMoveTaskButton({
            task,
            index,
            direction: -1,
            control: 'move-up',
            textContent: '↑',
            messageName: 'moveTaskUpForTask',
            disabled: index === 0,
        });

        const moveDownButton = createMoveTaskButton({
            task,
            index,
            direction: 1,
            control: 'move-down',
            textContent: '↓',
            messageName: 'moveTaskDownForTask',
            disabled: index === tasks.length - 1,
        });

        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = chrome.i18n.getMessage('deleteButton');
        deleteButton.className = 'delete-button';
        deleteButton.setAttribute('aria-label', taskMessage('deleteTaskButtonForTask', task.text));
        setTaskControlAttributes(deleteButton, 'delete', index);
        deleteButton.addEventListener('click', () => {
            const nextIndex = Math.min(index, tasks.length - 2);
            if (nextIndex >= 0) {
                queueTaskFocus('item', nextIndex);
            } else {
                queueInputFocus();
            }
            void deleteTask(index);
        });

        li.appendChild(checkboxLabel);
        li.appendChild(span);
        li.appendChild(focusButton);
        li.appendChild(moveUpButton);
        li.appendChild(moveDownButton);
        li.appendChild(deleteButton);
        taskList.appendChild(li);
    });

    focusPendingTarget();
}

async function loadTasks() {
    const result = await chromeTodoStorage.get(['tasks', 'last_date', 'trial_start_ts', 'is_premium', 'history', 'theme']);
    const today = getTodayString();
    const lastDate = result.last_date;
    let trialStartTs = result.trial_start_ts;
    const isPremium = !!result.is_premium;
    const history = result.history || [];
    const theme = result.theme || '#f0f2f5';

    if (!trialStartTs) {
        trialStartTs = Date.now();
        void chromeTodoStorage.set({ trial_start_ts: trialStartTs });
    }

    document.body.style.backgroundColor = theme;
    themeColorInput.value = theme;
    updatePremiumUI(isPremium, trialStartTs);
    if (isPremium) {
        renderHistory(history);
    }

    let tasks = normalizeTasks(result.tasks);

    if (lastDate && lastDate !== today) {
        // Date changed: carry over incomplete, reset completed
        tasks = removeCompletedTasks(tasks);
        await chromeTodoStorage.set({ tasks, last_date: today });
        renderTasks(tasks);
    } else {
        if (!lastDate) {
            void chromeTodoStorage.set({ last_date: today });
        }
        renderTasks(tasks);
    }
}

async function moveTask(index: number, direction: -1 | 1) {
    const result = await chromeTodoStorage.get(['tasks']);
    const tasks = normalizeTasks(result.tasks);
    const newTasks = moveTaskInList(tasks, index, direction);
    if (newTasks) {
        await chromeTodoStorage.set({ tasks: newTasks });
        renderTasks(newTasks);
    }
}

async function deleteTask(index: number) {
    const result = await chromeTodoStorage.get(['tasks']);
    const tasks = normalizeTasks(result.tasks);
    const newTasks = deleteTaskAt(tasks, index);
    await chromeTodoStorage.set({ tasks: newTasks });
    renderTasks(newTasks);
}

async function toggleTask(index: number) {
    const result = await chromeTodoStorage.get(['tasks', 'is_premium', 'history']);
    const tasks = normalizeTasks(result.tasks);
    const isPremium = !!result.is_premium;
    const history = result.history || [];
    const toggled = toggleTaskCompletion(tasks, index);

    if (toggled) {
        const newHistory = toggled.completedTask && isPremium
            ? [...history, { text: toggled.completedTask.text, completed_at: Date.now() }]
            : history;

        await chromeTodoStorage.set({ tasks: toggled.tasks, history: newHistory.slice(-100) });
        renderTasks(toggled.tasks);
        if (isPremium) renderHistory(newHistory);
    }
}

async function toggleFocus(index: number) {
    const result = await chromeTodoStorage.get(['tasks']);
    const tasks = normalizeTasks(result.tasks);
    const newTasks = toggleTaskFocus(tasks, index);
    if (newTasks) {
        await chromeTodoStorage.set({ tasks: newTasks });
        renderTasks(newTasks);
    }
}

async function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    const result = await chromeTodoStorage.get(['tasks']);
    const tasks = normalizeTasks(result.tasks);
    const newTasks: Task[] = [...tasks, createTask(text)];
    await chromeTodoStorage.set({ tasks: newTasks });
    taskInput.value = '';
    renderTasks(newTasks);
}

taskEntryForm.addEventListener('submit', (event) => {
    event.preventDefault();
    void addTask();
});

emptyStateAction.addEventListener('click', () => {
    taskInput.focus();
});

themeColorInput.addEventListener('change', () => {
    const theme = themeColorInput.value;
    void chromeTodoStorage.set({ theme }).then(() => {
        document.body.style.backgroundColor = theme;
    });
});

chromeTodoStorage.subscribe((changes) => {
    if (changes.tasks || changes.last_date || changes.is_premium || changes.theme) {
        void loadTasks();
    }
});

setupI18n();
void loadTasks();
taskInput.focus();
