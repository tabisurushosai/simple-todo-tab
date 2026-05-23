const taskInput = document.getElementById('task-input') as HTMLInputElement;
const addButton = document.getElementById('add-button') as HTMLButtonElement;
const taskList = document.getElementById('task-list') as HTMLUListElement;

interface Task {
    text: string;
    completed: boolean;
}

function renderTasks(tasks: Task[]) {
    taskList.innerHTML = '';
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
        li.appendChild(deleteButton);
        taskList.appendChild(li);
    });
}

function loadTasks() {
    chrome.storage.local.get(['tasks'], (result) => {
        const rawTasks = (result.tasks as (string | Task)[]) || [];
        const tasks: Task[] = rawTasks.map(t => typeof t === 'string' ? { text: t, completed: false } : t);
        renderTasks(tasks);
    });
}

function deleteTask(index: number) {
    chrome.storage.local.get(['tasks'], (result) => {
        const rawTasks = (result.tasks as (string | Task)[]) || [];
        const tasks: Task[] = rawTasks.map(t => typeof t === 'string' ? { text: t, completed: false } : t);
        tasks.splice(index, 1);
        chrome.storage.local.set({ tasks }, () => {
            renderTasks(tasks);
        });
    });
}

function toggleTask(index: number) {
    chrome.storage.local.get(['tasks'], (result) => {
        const rawTasks = (result.tasks as (string | Task)[]) || [];
        const tasks: Task[] = rawTasks.map(t => typeof t === 'string' ? { text: t, completed: false } : t);
        if (tasks[index]) {
            tasks[index].completed = !tasks[index].completed;
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
        const tasks: Task[] = rawTasks.map(t => typeof t === 'string' ? { text: t, completed: false } : t);
        const newTasks: Task[] = [...tasks, { text, completed: false }];
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
