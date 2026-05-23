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
import { chromeTodoStorage } from './storage/todoStorage';

const taskInput = document.getElementById('task-input') as HTMLInputElement;
const addButton = document.getElementById('add-button') as HTMLButtonElement;
const taskList = document.getElementById('task-list') as HTMLUListElement;
const focusContainer = document.getElementById('focus-container') as HTMLDivElement;
const focusText = document.getElementById('focus-text') as HTMLDivElement;
const premiumGate = document.getElementById('premium-gate') as HTMLDivElement;
const gateMessage = document.getElementById('gate-message') as HTMLSpanElement;
const upgradeLink = document.getElementById('upgrade-link') as HTMLAnchorElement;
const premiumFeatures = document.getElementById('premium-features') as HTMLDivElement;
const premiumStatus = document.getElementById('premium-status') as HTMLDivElement;
const themeColorInput = document.getElementById('theme-color') as HTMLInputElement;
const historyList = document.getElementById('history-list') as HTMLUListElement;

function setupI18n() {
    const title = document.getElementById('title');
    if (title) title.textContent = chrome.i18n.getMessage('title');
    
    const focusLabel = document.getElementById('focus-label');
    if (focusLabel) focusLabel.textContent = chrome.i18n.getMessage('focusLabel');
    
    if (taskInput) taskInput.placeholder = chrome.i18n.getMessage('inputPlaceholder');
    if (addButton) addButton.textContent = chrome.i18n.getMessage('addButton');

    if (upgradeLink) upgradeLink.textContent = chrome.i18n.getMessage('upgradeButton');
    const themeLabel = document.getElementById('theme-label');
    if (themeLabel) themeLabel.textContent = chrome.i18n.getMessage('themeLabel');
    const historyTitle = document.getElementById('history-title');
    if (historyTitle) historyTitle.textContent = chrome.i18n.getMessage('historyTitle');
    if (premiumStatus) premiumStatus.textContent = chrome.i18n.getMessage('premiumActive');
}

function renderHistory(history: HistoryItem[]) {
    historyList.innerHTML = '';
    history.slice(-20).reverse().forEach(item => {
        const li = document.createElement('li');
        const date = new Date(item.completed_at).toLocaleTimeString();
        li.textContent = `${date}: ${item.text}`;
        li.style.borderBottom = '1px solid #f0f0f0';
        li.style.padding = '2px 0';
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
        gateMessage.textContent = chrome.i18n.getMessage('premiumGate').replace('$DAYS$', remaining.toString());
    }
}

function renderTasks(tasks: Task[]) {
    taskList.innerHTML = '';
    const focusedTask = tasks.find(t => t.focused);
    if (focusedTask && !focusedTask.completed) {
        focusContainer.style.display = 'block';
        focusText.textContent = focusedTask.text;
    } else {
        focusContainer.style.display = 'none';
    }

    tasks.forEach((task, index) => {
        const li = document.createElement('li');
        li.style.display = 'flex';
        li.style.alignItems = 'center';
        li.style.padding = '8px';
        li.style.borderBottom = '1px solid #eee';
        
        if (task.completed) {
            li.style.color = '#888';
            li.style.textDecoration = 'line-through';
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.completed;
        checkbox.style.marginRight = '12px';
        checkbox.addEventListener('change', () => {
            void toggleTask(index);
        });

        const span = document.createElement('span');
        span.textContent = task.text;
        span.style.flex = '1';

        const focusButton = document.createElement('button');
        focusButton.textContent = task.focused ? '★' : '☆';
        focusButton.style.marginLeft = '8px';
        focusButton.style.cursor = 'pointer';
        focusButton.style.border = 'none';
        focusButton.style.background = 'transparent';
        focusButton.style.fontSize = '18px';
        focusButton.style.color = task.focused ? '#ffc107' : '#ccc';
        focusButton.addEventListener('click', () => {
            void toggleFocus(index);
        });

        const moveUpButton = document.createElement('button');
        moveUpButton.textContent = '↑';
        moveUpButton.style.marginLeft = '8px';
        moveUpButton.disabled = index === 0;
        moveUpButton.addEventListener('click', () => {
            void moveTask(index, -1);
        });

        const moveDownButton = document.createElement('button');
        moveDownButton.textContent = '↓';
        moveDownButton.style.marginLeft = '4px';
        moveDownButton.disabled = index === tasks.length - 1;
        moveDownButton.addEventListener('click', () => {
            void moveTask(index, 1);
        });

        const deleteButton = document.createElement('button');
        deleteButton.textContent = chrome.i18n.getMessage('deleteButton');
        deleteButton.style.marginLeft = '12px';
        deleteButton.style.padding = '4px 8px';
        deleteButton.style.fontSize = '12px';
        deleteButton.style.color = '#dc3545';
        deleteButton.style.border = '1px solid #dc3545';
        deleteButton.style.backgroundColor = 'transparent';
        deleteButton.style.borderRadius = '4px';
        deleteButton.style.cursor = 'pointer';
        deleteButton.addEventListener('click', () => {
            void deleteTask(index);
        });

        li.appendChild(checkbox);
        li.appendChild(span);
        li.appendChild(focusButton);
        li.appendChild(moveUpButton);
        li.appendChild(moveDownButton);
        li.appendChild(deleteButton);
        taskList.appendChild(li);
    });
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

async function moveTask(index: number, direction: number) {
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

addButton.addEventListener('click', () => {
    void addTask();
});
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        void addTask();
    }
});

themeColorInput.addEventListener('change', () => {
    const theme = themeColorInput.value;
    void chromeTodoStorage.set({ theme }).then(() => {
        document.body.style.backgroundColor = theme;
    });
});

chromeTodoStorage.onChanged((changes) => {
    if (changes.tasks || changes.last_date || changes.is_premium || changes.theme) {
        void loadTasks();
    }
});

setupI18n();
void loadTasks();
taskInput.focus();
