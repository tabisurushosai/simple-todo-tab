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

interface HistoryItem {
    text: string;
    completed_at: number;
}

interface Task {
    text: string;
    completed: boolean;
    focused?: boolean;
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
            toggleTask(index);
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
        focusButton.addEventListener('click', () => toggleFocus(index));

        const moveUpButton = document.createElement('button');
        moveUpButton.textContent = '↑';
        moveUpButton.style.marginLeft = '8px';
        moveUpButton.disabled = index === 0;
        moveUpButton.addEventListener('click', () => moveTask(index, -1));

        const moveDownButton = document.createElement('button');
        moveDownButton.textContent = '↓';
        moveDownButton.style.marginLeft = '4px';
        moveDownButton.disabled = index === tasks.length - 1;
        moveDownButton.addEventListener('click', () => moveTask(index, 1));

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
            deleteTask(index);
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

function getTodayString(): string {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function loadTasks() {
    chrome.storage.local.get(['tasks', 'last_date', 'trial_start_ts', 'is_premium', 'history', 'theme'], (result) => {
        const today = getTodayString();
        const lastDate = result.last_date as string | undefined;
        let trialStartTs = result.trial_start_ts as number | undefined;
        const isPremium = !!result.is_premium;
        const history = (result.history as HistoryItem[]) || [];
        const theme = result.theme as string || '#f0f2f5';

        if (!trialStartTs) {
            trialStartTs = Date.now();
            chrome.storage.local.set({ trial_start_ts: trialStartTs });
        }

        document.body.style.backgroundColor = theme;
        themeColorInput.value = theme;
        updatePremiumUI(isPremium, trialStartTs);
        if (isPremium) {
            renderHistory(history);
        }

        let rawTasks = (result.tasks as (string | Task)[]) || [];
        let tasks: Task[] = rawTasks.map(t => typeof t === 'string' ? { text: t, completed: false, focused: false } : { focused: false, ...t });

        if (lastDate && lastDate !== today) {
            // Date changed: carry over incomplete, reset completed
            tasks = tasks.filter(t => !t.completed);
            chrome.storage.local.set({ tasks, last_date: today }, () => {
                renderTasks(tasks);
            });
        } else {
            if (!lastDate) {
                chrome.storage.local.set({ last_date: today });
            }
            renderTasks(tasks);
        }
    });
}

function moveTask(index: number, direction: number) {
    chrome.storage.local.get(['tasks'], (result) => {
        const rawTasks = (result.tasks as (string | Task)[]) || [];
        const tasks: Task[] = rawTasks.map(t => typeof t === 'string' ? { text: t, completed: false, focused: false } : { focused: false, ...t });
        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < tasks.length) {
            const [movedTask] = tasks.splice(index, 1);
            tasks.splice(newIndex, 0, movedTask);
            chrome.storage.local.set({ tasks }, () => {
                renderTasks(tasks);
            });
        }
    });
}

function deleteTask(index: number) {
    chrome.storage.local.get(['tasks'], (result) => {
        const rawTasks = (result.tasks as (string | Task)[]) || [];
        const tasks: Task[] = rawTasks.map(t => typeof t === 'string' ? { text: t, completed: false, focused: false } : { focused: false, ...t });
        tasks.splice(index, 1);
        chrome.storage.local.set({ tasks }, () => {
            renderTasks(tasks);
        });
    });
}

function toggleTask(index: number) {
    chrome.storage.local.get(['tasks', 'is_premium', 'history'], (result) => {
        const rawTasks = (result.tasks as (string | Task)[]) || [];
        const tasks: Task[] = rawTasks.map(t => typeof t === 'string' ? { text: t, completed: false, focused: false } : { focused: false, ...t });
        const isPremium = !!result.is_premium;
        const history = (result.history as HistoryItem[]) || [];

        if (tasks[index]) {
            tasks[index].completed = !tasks[index].completed;
            if (tasks[index].completed && isPremium) {
                history.push({ text: tasks[index].text, completed_at: Date.now() });
            }
            chrome.storage.local.set({ tasks, history: history.slice(-100) }, () => {
                renderTasks(tasks);
                if (isPremium) renderHistory(history);
            });
        }
    });
}

function toggleFocus(index: number) {
    chrome.storage.local.get(['tasks'], (result) => {
        const rawTasks = (result.tasks as (string | Task)[]) || [];
        const tasks: Task[] = rawTasks.map(t => typeof t === 'string' ? { text: t, completed: false, focused: false } : { focused: false, ...t });
        if (tasks[index]) {
            const currentFocus = tasks[index].focused;
            tasks.forEach(t => t.focused = false);
            tasks[index].focused = !currentFocus;
            chrome.storage.local.set({ tasks }, () => {
                renderTasks(tasks);
            });
        }
    });
}

function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    chrome.storage.local.get(['tasks'], (result) => {
        const rawTasks = (result.tasks as (string | Task)[]) || [];
        const tasks: Task[] = rawTasks.map(t => typeof t === 'string' ? { text: t, completed: false, focused: false } : { focused: false, ...t });
        const newTasks: Task[] = [...tasks, { text, completed: false, focused: false }];
        chrome.storage.local.set({ tasks: newTasks }, () => {
            taskInput.value = '';
            renderTasks(newTasks);
        });
    });
}

addButton.addEventListener('click', addTask);
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTask();
    }
});

themeColorInput.addEventListener('change', () => {
    const theme = themeColorInput.value;
    chrome.storage.local.set({ theme }, () => {
        document.body.style.backgroundColor = theme;
    });
});

chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
        if (changes.tasks || changes.last_date || changes.is_premium || changes.theme) {
            loadTasks();
        }
    }
});

setupI18n();
loadTasks();
taskInput.focus();
