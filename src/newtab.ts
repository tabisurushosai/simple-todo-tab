const taskInput = document.getElementById('task-input') as HTMLInputElement;
const addButton = document.getElementById('add-button') as HTMLButtonElement;
const taskList = document.getElementById('task-list') as HTMLUListElement;
const focusContainer = document.getElementById('focus-container') as HTMLDivElement;
const focusText = document.getElementById('focus-text') as HTMLDivElement;

interface Task {
    text: string;
    completed: boolean;
    focused?: boolean;
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
        deleteButton.textContent = '削除';
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
    chrome.storage.local.get(['tasks', 'last_date'], (result) => {
        const today = getTodayString();
        const lastDate = result.last_date as string | undefined;
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
    chrome.storage.local.get(['tasks'], (result) => {
        const rawTasks = (result.tasks as (string | Task)[]) || [];
        const tasks: Task[] = rawTasks.map(t => typeof t === 'string' ? { text: t, completed: false, focused: false } : { focused: false, ...t });
        if (tasks[index]) {
            tasks[index].completed = !tasks[index].completed;
            chrome.storage.local.set({ tasks }, () => {
                renderTasks(tasks);
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

loadTasks();
