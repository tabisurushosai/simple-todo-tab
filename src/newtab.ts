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
import {
    formatDisplayNumber,
    formatHistoryDate,
    type SupportedLocale,
} from './core/formatting';
import { createChromeTodoStorage } from './storage/chromeTodoStorage';
import { TODO_STORAGE_KEYS, type TodoStorageAdapter } from './storage/todoStorage';

const taskControls = ['checkbox', 'focus', 'move-up', 'move-down', 'delete'] as const;
const taskVerticalNavigationKeys = ['ArrowUp', 'ArrowDown', 'Home', 'End'] as const;
const taskNavigationKeys = [...taskVerticalNavigationKeys, 'ArrowLeft', 'ArrowRight'] as const;

type TaskControl = typeof taskControls[number];
type TaskFocusControl = TaskControl | 'item';
type TaskStatusState = 'loading' | 'empty' | 'active' | 'complete';
type TaskNavigationKey = typeof taskNavigationKeys[number];
type TaskVerticalNavigationKey = typeof taskVerticalNavigationKeys[number];
type I18nMessageName =
    | 'addButton'
    | 'allTasksComplete'
    | 'clearFocusTaskButtonForTask'
    | 'deleteButton'
    | 'deleteTaskButtonForTask'
    | 'emptyStateAction'
    | 'emptyStateDescription'
    | 'emptyStateExample'
    | 'emptyStateStepInput'
    | 'emptyStateStepReturn'
    | 'emptyStateTitle'
    | 'emptyTasks'
    | 'focusLabel'
    | 'focusTaskButtonForTask'
    | 'historyEmpty'
    | 'historyItem'
    | 'historyListLabel'
    | 'historyTitle'
    | 'inputPlaceholder'
    | 'loadingTasks'
    | 'markTaskComplete'
    | 'markTaskIncomplete'
    | 'moveTaskDownForTask'
    | 'moveTaskUpForTask'
    | 'onboardingGuide'
    | 'premiumActive'
    | 'premiumGate'
    | 'premiumGateExpired'
    | 'premiumGateOneDay'
    | 'taskCountPlural'
    | 'taskCountSingular'
    | 'taskKeyboardHelp'
    | 'taskInputLabel'
    | 'taskListLabel'
    | 'tasksRemainingStatus'
    | 'themeLabel'
    | 'title'
    | 'upgradeButton';
type TaskTextMessageName =
    | 'clearFocusTaskButtonForTask'
    | 'deleteTaskButtonForTask'
    | 'focusTaskButtonForTask'
    | 'markTaskComplete'
    | 'markTaskIncomplete'
    | 'moveTaskDownForTask'
    | 'moveTaskUpForTask';
type HtmlElementConstructor<T extends HTMLElement> = {
    new(): T;
    readonly name: string;
};
type PendingFocusTarget =
    | { type: 'task'; control: TaskFocusControl; index: number }
    | { type: 'input' };

let pendingFocusTarget: PendingFocusTarget | null = null;
let hasSeenOnboarding = false;
const todoStorage: TodoStorageAdapter = createChromeTodoStorage();

function isStringInList<T extends string>(values: readonly T[], value: string | undefined): value is T {
    return value !== undefined && (values as readonly string[]).includes(value);
}

function isDisabledControlElement(element: HTMLElement): element is HTMLButtonElement | HTMLInputElement {
    return (
        (element instanceof HTMLButtonElement || element instanceof HTMLInputElement)
        && element.disabled
    );
}

function getRequiredElement<T extends HTMLElement>(
    id: string,
    elementType: HtmlElementConstructor<T>,
): T {
    const element = document.getElementById(id);
    if (!(element instanceof elementType)) {
        throw new Error(`Missing required element: #${id} (${elementType.name})`);
    }

    return element;
}

const title = getRequiredElement('title', HTMLHeadingElement);
const taskEntryForm = getRequiredElement('task-entry', HTMLFormElement);
const taskInputLabel = getRequiredElement('task-input-label', HTMLLabelElement);
const taskInput = getRequiredElement('task-input', HTMLInputElement);
const addButton = getRequiredElement('add-button', HTMLButtonElement);
const onboardingGuide = getRequiredElement('onboarding-guide', HTMLDivElement);
const emptyState = getRequiredElement('empty-state', HTMLDivElement);
const emptyStateTitle = getRequiredElement('empty-state-title', HTMLDivElement);
const emptyStateDescription = getRequiredElement('empty-state-description', HTMLParagraphElement);
const emptyStateExample = getRequiredElement('empty-state-example', HTMLParagraphElement);
const emptyStateStepInput = getRequiredElement('empty-state-step-input', HTMLLIElement);
const emptyStateStepReturn = getRequiredElement('empty-state-step-return', HTMLLIElement);
const emptyStateAction = getRequiredElement('empty-state-action', HTMLButtonElement);
const taskList = getRequiredElement('task-list', HTMLUListElement);
const taskKeyboardHelp = getRequiredElement('task-keyboard-help', HTMLParagraphElement);
const taskStatus = getRequiredElement('task-status', HTMLDivElement);
const focusContainer = getRequiredElement('focus-container', HTMLDivElement);
const focusLabel = getRequiredElement('focus-label', HTMLDivElement);
const focusText = getRequiredElement('focus-text', HTMLDivElement);
const premiumGate = getRequiredElement('premium-gate', HTMLDivElement);
const gateMessage = getRequiredElement('gate-message', HTMLSpanElement);
const upgradeLink = getRequiredElement('upgrade-link', HTMLAnchorElement);
const premiumFeatures = getRequiredElement('premium-features', HTMLDivElement);
const premiumStatus = getRequiredElement('premium-status', HTMLDivElement);
const themeLabel = getRequiredElement('theme-label', HTMLLabelElement);
const themeColorInput = getRequiredElement('theme-color', HTMLInputElement);
const historyTitle = getRequiredElement('history-title', HTMLDivElement);
const historyList = getRequiredElement('history-list', HTMLUListElement);
const historyStatus = getRequiredElement('history-status', HTMLDivElement);

function getSupportedLocale(): SupportedLocale {
    const uiLocale = chrome.i18n.getMessage('@@ui_locale') || chrome.i18n.getUILanguage();
    return uiLocale.toLowerCase().startsWith('en') ? 'en' : 'ja';
}

const supportedLocale = getSupportedLocale();

function formatNumber(value: number): string {
    return formatDisplayNumber(value, supportedLocale);
}

function getMessage(messageName: I18nMessageName): string {
    return chrome.i18n.getMessage(messageName);
}

const i18nPlaceholderOrder: Partial<Record<I18nMessageName, readonly string[]>> = {
    clearFocusTaskButtonForTask: ['TASK'],
    deleteTaskButtonForTask: ['TASK'],
    focusTaskButtonForTask: ['TASK'],
    historyItem: ['DATE', 'TASK'],
    markTaskComplete: ['TASK'],
    markTaskIncomplete: ['TASK'],
    moveTaskDownForTask: ['TASK'],
    moveTaskUpForTask: ['TASK'],
    premiumGate: ['DAYS'],
    premiumGateOneDay: ['DAYS'],
    tasksRemainingStatus: ['ACTIVE', 'ACTIVE_TASK_LABEL', 'TOTAL', 'TOTAL_TASK_LABEL'],
};

function i18nMessage(messageName: I18nMessageName, replacements: Record<string, string> = {}): string {
    const placeholderOrder = i18nPlaceholderOrder[messageName] ?? Object.keys(replacements);
    const substitutions = placeholderOrder.map((key) => replacements[key] ?? '');

    return chrome.i18n.getMessage(messageName, substitutions);
}

function setLocalizedText(element: HTMLElement, messageName: I18nMessageName) {
    element.textContent = getMessage(messageName);
}

function setTaskStatusMessage(message: string, state: TaskStatusState) {
    taskStatus.textContent = message;
    taskStatus.dataset['state'] = state;
}

function setupI18n() {
    document.documentElement.lang = supportedLocale;
    document.title = getMessage('title');
    setLocalizedText(title, 'title');
    setLocalizedText(focusLabel, 'focusLabel');
    setLocalizedText(taskInputLabel, 'taskInputLabel');
    taskInput.placeholder = getMessage('inputPlaceholder');
    setLocalizedText(addButton, 'addButton');
    setLocalizedText(onboardingGuide, 'onboardingGuide');
    setLocalizedText(emptyStateTitle, 'emptyStateTitle');
    setLocalizedText(emptyStateDescription, 'emptyStateDescription');
    setLocalizedText(emptyStateExample, 'emptyStateExample');
    setLocalizedText(emptyStateStepInput, 'emptyStateStepInput');
    setLocalizedText(emptyStateStepReturn, 'emptyStateStepReturn');
    setLocalizedText(emptyStateAction, 'emptyStateAction');
    setLocalizedText(upgradeLink, 'upgradeButton');
    setLocalizedText(themeLabel, 'themeLabel');
    setLocalizedText(taskKeyboardHelp, 'taskKeyboardHelp');
    themeColorInput.setAttribute('aria-label', getMessage('themeLabel'));
    taskList.setAttribute('aria-label', getMessage('taskListLabel'));
    taskList.setAttribute('aria-describedby', 'task-status task-keyboard-help');
    setLocalizedText(historyTitle, 'historyTitle');
    historyList.setAttribute('aria-label', getMessage('historyListLabel'));
    setLocalizedText(premiumStatus, 'premiumActive');
    setTaskStatusMessage(getMessage('loadingTasks'), 'loading');
    taskList.setAttribute('aria-busy', 'true');
}

function taskMessage(messageName: TaskTextMessageName, taskText: string): string {
    return i18nMessage(messageName, { TASK: taskText });
}

function taskCountLabel(count: number): string {
    if (supportedLocale === 'en') {
        return getMessage(count === 1 ? 'taskCountSingular' : 'taskCountPlural');
    }

    return getMessage('taskCountPlural');
}

function queueTaskFocus(control: TaskFocusControl, index: number) {
    pendingFocusTarget = { type: 'task', control, index };
}

function queueInputFocus() {
    pendingFocusTarget = { type: 'input' };
}

function markOnboardingSeen() {
    if (hasSeenOnboarding) return;

    hasSeenOnboarding = true;
    void todoStorage.set({ has_seen_onboarding: true });
}

function getTaskFocusSelectors(target: { control: TaskFocusControl; index: number }): string[] {
    return target.control === 'item'
        ? [`li[data-task-index="${target.index}"]`]
        : [
            `[data-task-control="${target.control}"][data-task-index="${target.index}"]`,
            `li[data-task-index="${target.index}"]`,
        ];
}

function focusTaskTarget(target: { control: TaskFocusControl; index: number }): boolean {
    for (const selector of getTaskFocusSelectors(target)) {
        const element = taskList.querySelector<HTMLElement>(selector);
        if (!element) continue;
        if (isDisabledControlElement(element)) continue;

        element.focus({ preventScroll: true });
        return true;
    }

    return false;
}

function focusPendingTarget() {
    if (!pendingFocusTarget) return;

    const target = pendingFocusTarget;
    pendingFocusTarget = null;

    if (target.type === 'input') {
        taskInput.focus({ preventScroll: true });
        return;
    }

    if (focusTaskTarget(target)) {
        return;
    }

    taskInput.focus({ preventScroll: true });
}

function isTaskControl(value: string | undefined): value is TaskControl {
    return isStringInList(taskControls, value);
}

function isTaskNavigationKey(value: string): value is TaskNavigationKey {
    return isStringInList(taskNavigationKeys, value);
}

function isTaskVerticalNavigationKey(value: TaskNavigationKey): value is TaskVerticalNavigationKey {
    return isStringInList(taskVerticalNavigationKeys, value);
}

function getTaskIndexFromElement(element: HTMLElement): number | null {
    const taskElement = element.closest<HTMLElement>('li[data-task-index]');
    const rawIndex = taskElement?.dataset['taskIndex'];
    if (rawIndex === undefined) {
        return null;
    }

    const index = Number(rawIndex);
    return Number.isInteger(index) && index >= 0 ? index : null;
}

function getTaskControlFromElement(element: HTMLElement): TaskFocusControl {
    const control = element.dataset['taskControl'];
    return isTaskControl(control) ? control : 'item';
}

function getKeyboardTargetIndex(key: TaskVerticalNavigationKey, currentIndex: number, taskCount: number): number {
    switch (key) {
        case 'ArrowUp':
            return Math.max(0, currentIndex - 1);
        case 'ArrowDown':
            return Math.min(taskCount - 1, currentIndex + 1);
        case 'Home':
            return 0;
        case 'End':
            return taskCount - 1;
    }
}

function focusTaskControlFromOrder(index: number, startControlIndex: number, step: -1 | 1): boolean {
    for (let controlIndex = startControlIndex; controlIndex >= 0 && controlIndex < taskControls.length; controlIndex += step) {
        const control = taskControls[controlIndex];
        const element = taskList.querySelector<HTMLElement>(
            `[data-task-control="${control}"][data-task-index="${index}"]`,
        );
        if (!element) continue;
        if (isDisabledControlElement(element)) continue;

        element.focus({ preventScroll: true });
        return true;
    }

    return false;
}

function focusAdjacentTaskControl(key: Extract<TaskNavigationKey, 'ArrowLeft' | 'ArrowRight'>, currentIndex: number, currentControl: TaskFocusControl): boolean {
    const step = key === 'ArrowRight' ? 1 : -1;
    const currentControlIndex = currentControl === 'item' ? -1 : taskControls.indexOf(currentControl);
    const startControlIndex = currentControlIndex === -1
        ? (step === 1 ? 0 : taskControls.length - 1)
        : currentControlIndex + step;

    return focusTaskControlFromOrder(currentIndex, startControlIndex, step);
}

function handleTaskListKeydown(event: KeyboardEvent) {
    if (!isTaskNavigationKey(event.key) || !(event.target instanceof HTMLElement)) {
        return;
    }

    const currentIndex = getTaskIndexFromElement(event.target);
    if (currentIndex === null) {
        return;
    }

    const taskCount = taskList.querySelectorAll('li[data-task-index]').length;
    if (taskCount === 0) {
        return;
    }

    event.preventDefault();
    const currentControl = getTaskControlFromElement(event.target);
    if (!isTaskVerticalNavigationKey(event.key)) {
        focusAdjacentTaskControl(event.key, currentIndex, currentControl);
        return;
    }

    focusTaskTarget({
        control: currentControl,
        index: getKeyboardTargetIndex(event.key, currentIndex, taskCount),
    });
}

function renderHistory(history: HistoryItem[]) {
    historyList.innerHTML = '';
    if (history.length === 0) {
        historyStatus.hidden = false;
        historyStatus.textContent = getMessage('historyEmpty');
        return;
    }

    historyStatus.hidden = true;
    history.slice(-20).reverse().forEach(item => {
        const li = document.createElement('li');
        const date = formatHistoryDate(item.completed_at, supportedLocale);
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
            remaining === 0 ? 'premiumGateExpired' : remaining === 1 ? 'premiumGateOneDay' : 'premiumGate',
            { DAYS: formatNumber(remaining) },
        );
    }
}

function setTaskStatus(tasks: Task[]) {
    if (tasks.length === 0) {
        setTaskStatusMessage(getMessage('emptyTasks'), 'empty');
        return;
    }

    const remaining = tasks.filter(task => !task.completed).length;
    if (remaining === 0) {
        setTaskStatusMessage(getMessage('allTasksComplete'), 'complete');
        return;
    }

    setTaskStatusMessage(
        i18nMessage('tasksRemainingStatus', {
            ACTIVE: formatNumber(remaining),
            ACTIVE_TASK_LABEL: taskCountLabel(remaining),
            TOTAL: formatNumber(tasks.length),
            TOTAL_TASK_LABEL: taskCountLabel(tasks.length),
        }),
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
    messageName: Extract<TaskTextMessageName, 'moveTaskUpForTask' | 'moveTaskDownForTask'>;
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
    button.setAttribute('aria-disabled', disabled.toString());
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
    onboardingGuide.hidden = !isEmpty || hasSeenOnboarding;
    emptyState.hidden = !isEmpty;
    const taskEntryDescription = isEmpty
        ? hasSeenOnboarding
            ? 'empty-state-description task-status'
            : 'onboarding-guide empty-state-description task-status'
        : 'task-status';
    taskEntryForm.setAttribute('aria-describedby', taskEntryDescription);
    taskInput.setAttribute('aria-describedby', taskEntryDescription);
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
        li.setAttribute('aria-posinset', (index + 1).toString());
        li.setAttribute('aria-setsize', tasks.length.toString());
        if (task.focused && !task.completed) {
            li.setAttribute('aria-current', 'true');
        }

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
        span.id = `task-${index}-text`;
        span.className = 'task-text';
        li.setAttribute('aria-labelledby', span.id);

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
        deleteButton.textContent = getMessage('deleteButton');
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
    const result = await todoStorage.get(TODO_STORAGE_KEYS);
    const today = getTodayString();
    const lastDate = result.last_date;
    let trialStartTs = result.trial_start_ts;
    const isPremium = !!result.is_premium;
    const history = result.history || [];
    const theme = result.theme || '#f0f2f5';
    hasSeenOnboarding = !!result.has_seen_onboarding;

    if (!trialStartTs) {
        trialStartTs = Date.now();
        void todoStorage.set({ trial_start_ts: trialStartTs });
    }

    document.body.style.backgroundColor = theme;
    themeColorInput.value = theme;
    updatePremiumUI(isPremium, trialStartTs);
    if (isPremium) {
        renderHistory(history);
    }

    let tasks = normalizeTasks(result.tasks);
    if (tasks.length > 0) {
        markOnboardingSeen();
    }

    if (lastDate && lastDate !== today) {
        // Date changed: carry over incomplete, reset completed
        tasks = removeCompletedTasks(tasks);
        await todoStorage.set({ tasks, last_date: today });
        renderTasks(tasks);
    } else {
        if (!lastDate) {
            void todoStorage.set({ last_date: today });
        }
        renderTasks(tasks);
    }
}

async function moveTask(index: number, direction: -1 | 1) {
    const result = await todoStorage.get(['tasks']);
    const tasks = normalizeTasks(result.tasks);
    const newTasks = moveTaskInList(tasks, index, direction);
    if (newTasks) {
        await todoStorage.set({ tasks: newTasks });
        renderTasks(newTasks);
    }
}

async function deleteTask(index: number) {
    const result = await todoStorage.get(['tasks']);
    const tasks = normalizeTasks(result.tasks);
    const newTasks = deleteTaskAt(tasks, index);
    await todoStorage.set({ tasks: newTasks });
    renderTasks(newTasks);
}

async function toggleTask(index: number) {
    const result = await todoStorage.get(['tasks', 'is_premium', 'history']);
    const tasks = normalizeTasks(result.tasks);
    const isPremium = !!result.is_premium;
    const history = result.history || [];
    const toggled = toggleTaskCompletion(tasks, index);

    if (toggled) {
        const newHistory = toggled.completedTask && isPremium
            ? [...history, { text: toggled.completedTask.text, completed_at: Date.now() }]
            : history;

        await todoStorage.set({ tasks: toggled.tasks, history: newHistory.slice(-100) });
        renderTasks(toggled.tasks);
        if (isPremium) renderHistory(newHistory);
    }
}

async function toggleFocus(index: number) {
    const result = await todoStorage.get(['tasks']);
    const tasks = normalizeTasks(result.tasks);
    const newTasks = toggleTaskFocus(tasks, index);
    if (newTasks) {
        await todoStorage.set({ tasks: newTasks });
        renderTasks(newTasks);
    }
}

async function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    const result = await todoStorage.get(['tasks']);
    const tasks = normalizeTasks(result.tasks);
    const newTasks: Task[] = [...tasks, createTask(text)];
    hasSeenOnboarding = true;
    await todoStorage.set({ tasks: newTasks, has_seen_onboarding: true });
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

taskList.addEventListener('keydown', handleTaskListKeydown);

themeColorInput.addEventListener('change', () => {
    const theme = themeColorInput.value;
    void todoStorage.set({ theme }).then(() => {
        document.body.style.backgroundColor = theme;
    });
});

todoStorage.subscribe((changes) => {
    if (changes.tasks || changes.last_date || changes.is_premium || changes.theme) {
        void loadTasks();
    }
});

setupI18n();
void loadTasks();
taskInput.focus();
