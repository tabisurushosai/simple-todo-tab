const taskInput = document.getElementById('task-input') as HTMLInputElement;
const addButton = document.getElementById('add-button') as HTMLButtonElement;
const taskList = document.getElementById('task-list') as HTMLUListElement;

interface AppState {
    tasks: string[];
}

function renderTasks(tasks: string[]) {
    taskList.innerHTML = '';
    tasks.forEach((task) => {
        const li = document.createElement('li');
        li.textContent = task;
        li.style.padding = '8px';
        li.style.borderBottom = '1px solid #eee';
        taskList.appendChild(li);
    });
}

function loadTasks() {
    chrome.storage.local.get(['tasks'], (result) => {
        const tasks = (result.tasks as string[]) || [];
        renderTasks(tasks);
    });
}

function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    chrome.storage.local.get(['tasks'], (result) => {
        const tasks = (result.tasks as string[]) || [];
        const newTasks = [...tasks, text];
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
