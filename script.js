document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // State & Auth Management
    // ==========================================
    let currentUser = localStorage.getItem('tasktracker_user');
    let tasks = JSON.parse(localStorage.getItem('tasktracker_tasks')) || [];
    let activeTab = 'assigned';
    let editingTaskId = null;

    // DOM Elements
    const loginSection = document.getElementById('login-section');
    const appSection = document.getElementById('app-section');
    const loginForm = document.getElementById('login-form');
    const btnLogout = document.getElementById('btn-logout');
    const displayUserName = document.getElementById('display-user-name');

    // Check initial auth state
    function checkAuth() {
        if (currentUser) {
            loginSection.classList.add('hidden');
            appSection.classList.remove('hidden');
            displayUserName.innerText = `Hello, ${currentUser}`;
            renderDashboard();
        } else {
            loginSection.classList.remove('hidden');
            appSection.classList.add('hidden');
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        if (username) {
            currentUser = username;
            localStorage.setItem('tasktracker_user', currentUser);
            checkAuth();
        }
    });

    btnLogout.addEventListener('click', () => {
        currentUser = null;
        localStorage.removeItem('tasktracker_user');
        checkAuth();
    });

    // ==========================================
    // UI Interactions & Event Bindings
    // ==========================================

    // Modal Bindings
    const modal = document.getElementById('create-task-modal');
    const btnCreate = document.getElementById('btn-create-task');
    const btnCloseModal = document.getElementById('close-modal');
    const taskForm = document.getElementById('task-form');

    if (btnCreate) {
        btnCreate.addEventListener('click', () => {
            editingTaskId = null;
            const modalTitle = document.getElementById('modal-title');
            if(modalTitle) modalTitle.innerText = 'Create New Task';
            if(taskForm) taskForm.reset();
            modal.classList.remove('hidden');
        });
    }
    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => modal.classList.add('hidden'));
    }

    // Sidebar Toggle
    const navToggle = document.getElementById('nav-toggle');
    const sidebar = document.getElementById('sidebar');
    if (navToggle && sidebar) {
        navToggle.addEventListener('click', () => {
            if (sidebar.style.width === '0px') {
                sidebar.style.width = '230px';
            } else {
                sidebar.style.width = '0px';
            }
        });
    }

    // Save Task
    if (taskForm) {
        taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = document.getElementById('task-title').value;
            const priority = document.getElementById('task-priority').value;
            const status = document.getElementById('task-status').value;
            const dateInput = document.getElementById('task-date').value;

            if (editingTaskId) {
                // Update existing
                const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
                if (taskIndex !== -1) {
                    tasks[taskIndex].title = title;
                    tasks[taskIndex].priority = priority;
                    tasks[taskIndex].status = status;
                    tasks[taskIndex].dueDate = dateInput || null;
                    tasks[taskIndex].modified = new Date().toISOString();
                }
            } else {
                // Create new
                const newTask = {
                    id: 'TASK' + Math.floor(Math.random() * 10000),
                    title,
                    priority,
                    status,
                    dueDate: dateInput || null,
                    modified: new Date().toISOString()
                };
                tasks.unshift(newTask);
            }

            saveTasks();
            modal.classList.add('hidden');
            taskForm.reset();
            editingTaskId = null;
            renderDashboard();
        });
    }

    function saveTasks() {
        localStorage.setItem('tasktracker_tasks', JSON.stringify(tasks));
    }

    // Tabs
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeTab = btn.dataset.tab;
            renderTasks();
        });
    });

    // Navigation Links
    const navLinks = document.querySelectorAll('.sidebar-nav a[data-nav]');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.parentElement.classList.remove('active'));
            link.parentElement.classList.add('active');

            const navType = link.dataset.nav;

            if (navType !== 'settings') {
                // Map navigation type to the corresponding tab filter
                const targetTab = navType === 'home' ? 'assigned' : navType;
                activeTab = targetTab;

                // Keep the top tabs visually in sync with the sidebar selection
                const matchingTab = document.querySelector(`.tab-btn[data-tab="${targetTab}"]`);
                if (matchingTab) {
                    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                    matchingTab.classList.add('active');
                }

                renderDashboard(); // Re-render to apply correct filter
            } else {
                alert('This is a mock application. Settings functionality is not implemented.');
            }
        });
    });

    // Table Interactions (Delete mostly)
    const tasksTbody = document.getElementById('tasks-tbody');
    if (tasksTbody) {
        tasksTbody.addEventListener('click', (e) => {
            const tr = e.target.closest('tr');
            if(!tr) return;
            const taskId = tr.dataset.id;
            
            if (e.target.closest('.delete')) {
                if (confirm('Are you sure you want to delete this task?')) {
                    tasks = tasks.filter(t => t.id !== taskId);
                    saveTasks();
                    renderDashboard();
                }
            } else if (e.target.closest('.edit')) {
                const task = tasks.find(t => t.id === taskId);
                if(task) {
                    editingTaskId = taskId;
                    const modalTitle = document.getElementById('modal-title');
                    if(modalTitle) modalTitle.innerText = 'Edit Task';
                    
                    document.getElementById('task-title').value = task.title;
                    document.getElementById('task-priority').value = task.priority;
                    document.getElementById('task-status').value = task.status;
                    document.getElementById('task-date').value = task.dueDate || '';
                    
                    modal.classList.remove('hidden');
                }
            }
        });
    }

    // Delete All Tasks
    const btnDeleteAll = document.getElementById('btn-delete-tasks');
    if (btnDeleteAll) {
        btnDeleteAll.addEventListener('click', () => {
            if (confirm('Are you sure you want to permanently delete ALL tasks?')) {
                tasks = [];
                saveTasks();
                renderDashboard();
            }
        });
    }

    // Check auth on load - THIS MUST HAPPEN AFTER ALL EVENT LISTENERS ARE ATTACHED
    checkAuth();

    // ==========================================
    // Calendar Widget Logic
    // ==========================================
    let calendarSelectedDate = new Date();
    calendarSelectedDate.setHours(0,0,0,0);
    let calendarStripOffset = -1; // Center today roughly

    function renderCalendar() {
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

        // Set Month & Year labels
        const monthLabel = document.getElementById('cw-month-label');
        const yearLabel  = document.getElementById('cw-year-label');
        if(monthLabel) monthLabel.textContent = monthNames[calendarSelectedDate.getMonth()];
        if(yearLabel)  yearLabel.textContent  = calendarSelectedDate.getFullYear();

        // Render Strip
        const daysContainer = document.getElementById('cw-days');
        if(!daysContainer) return;
        daysContainer.innerHTML = '';

        const today = new Date();
        today.setHours(0,0,0,0);

        for(let i=0; i<6; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + calendarStripOffset + i);
            
            const isSelected = d.getTime() === calendarSelectedDate.getTime();
            
            const dayDiv = document.createElement('div');
            dayDiv.className = `cw-day ${isSelected ? 'active' : ''}`;
            dayDiv.innerHTML = `
                <div class="day-name">${dayNames[d.getDay()]}</div>
                <div class="day-num">${d.getDate().toString().padStart(2, '0')}</div>
            `;
            
            dayDiv.addEventListener('click', () => {
                calendarSelectedDate = new Date(d);
                renderCalendar();
            });
            
            daysContainer.appendChild(dayDiv);
        }

        // Render Events
        const eventsContainer = document.getElementById('cw-events');
        
        const tasksOnDate = tasks.filter(t => {
            if(!t.dueDate) return false;
            const tDate = new Date(t.dueDate);
            tDate.setHours(0,0,0,0);
            return tDate.getTime() === calendarSelectedDate.getTime();
        });

        const dateLabel = calendarSelectedDate.toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' });

        if(tasksOnDate.length === 0) {
            eventsContainer.innerHTML = `
                <div class="cw-events-title"><i class="fa-regular fa-calendar-check"></i> Tasks Scheduled</div>
                <div class="cw-event-empty">
                    <i class="fa-regular fa-calendar-xmark"></i>
                    No tasks scheduled for ${dateLabel}
                </div>`;
        } else {
            let html = `<div class="cw-events-title"><i class="fa-regular fa-calendar-check"></i> Tasks for ${dateLabel}</div>`;
            tasksOnDate.forEach((t) => {
                const barClass = t.priority === 'high' ? 'high' : t.priority === 'low' ? 'low' : 'medium';
                const badgeClass = t.priority === 'high' ? 'high' : t.priority === 'low' ? 'low' : 'medium';
                let badgeLabel = t.priority === 'high' ? '<i class="fa-solid fa-fire"></i> High Priority'
                               : t.priority === 'low'  ? '<i class="fa-solid fa-leaf"></i> Low Priority'
                               : `<i class="fa-solid fa-circle-half-stroke"></i> ${t.status}`;

                html += `
                <div class="cw-event">
                    <div class="cw-event-bar ${barClass}"></div>
                    <div class="cw-event-body">
                        <div class="cw-event-header">
                            <div class="cw-event-title">${t.title}</div>
                            <i class="fa-solid fa-ellipsis" style="color:#ccc; cursor:pointer;"></i>
                        </div>
                        <div class="cw-event-time">
                            <i class="fa-regular fa-clock"></i> Due ${dateLabel}
                        </div>
                        <div class="cw-event-footer">
                            <span class="cw-event-badge ${badgeClass}">${badgeLabel}</span>
                            <span style="font-size:11px; color:#bbb;">#${t.id}</span>
                        </div>
                    </div>
                </div>`;
            });
            eventsContainer.innerHTML = html;
        }
    }

    // Nav Bindings
    const cwPrev = document.getElementById('cw-prev');
    const cwNext = document.getElementById('cw-next');
    if(cwPrev) cwPrev.addEventListener('click', () => { calendarStripOffset -= 6; renderCalendar(); });
    if(cwNext) cwNext.addEventListener('click', () => { calendarStripOffset += 6; renderCalendar(); });

    // Month scroll buttons
    const cwMonthUp   = document.getElementById('cw-month-up');
    const cwMonthDown = document.getElementById('cw-month-down');
    const cwYearUp    = document.getElementById('cw-year-up');
    const cwYearDown  = document.getElementById('cw-year-down');

    if(cwMonthUp) cwMonthUp.addEventListener('click', () => {
        calendarSelectedDate.setMonth(calendarSelectedDate.getMonth() - 1);
        calendarStripOffset = -1;
        renderCalendar();
    });
    if(cwMonthDown) cwMonthDown.addEventListener('click', () => {
        calendarSelectedDate.setMonth(calendarSelectedDate.getMonth() + 1);
        calendarStripOffset = -1;
        renderCalendar();
    });
    if(cwYearUp) cwYearUp.addEventListener('click', () => {
        calendarSelectedDate.setFullYear(calendarSelectedDate.getFullYear() - 1);
        calendarStripOffset = -1;
        renderCalendar();
    });
    if(cwYearDown) cwYearDown.addEventListener('click', () => {
        calendarSelectedDate.setFullYear(calendarSelectedDate.getFullYear() + 1);
        calendarStripOffset = -1;
        renderCalendar();
    });

    // ==========================================
    // Rendering & Data Processing
    // ==========================================
    let taskChartInstance = null;

    function renderDashboard() {
        try {
            renderStats();
        } catch (e) { console.error('Error in renderStats:', e); }

        try {
            renderCalendar();
        } catch (e) { console.error('Error in renderCalendar:', e); }

        try {
            renderTasks();
        } catch (e) { console.error('Error in renderTasks:', e); }

        try {
            renderChart();
        } catch (e) { console.error('Error in renderChart:', e); }
    }

    function isOverdue(dueDateStr) {
        if (!dueDateStr) return false;
        const due = new Date(dueDateStr);
        due.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return due < today;
    }

    function isDueToday(dueDateStr) {
        if (!dueDateStr) return false;
        const due = new Date(dueDateStr);
        const today = new Date();
        return due.toDateString() === today.toDateString();
    }

    function renderStats() {
        let incomplete = 0;
        let overdue = 0;
        let dueToday = 0;

        let stats = {
            open: 0,
            inProgress: 0,
            completed: 0,
            onHold: 0,
            canceled: 0
        };

        tasks.forEach(task => {
            if (task.status !== 'Completed' && task.status !== 'Canceled') {
                incomplete++;
                if (isOverdue(task.dueDate)) overdue++;
                if (isDueToday(task.dueDate)) dueToday++;
            }

            if (task.status === 'Open') stats.open++;
            if (task.status === 'In Progress') stats.inProgress++;
            if (task.status === 'Completed') stats.completed++;
            if (task.status === 'On Hold') stats.onHold++;
            if (task.status === 'Canceled') stats.canceled++;
        });

        // Top Cards
        document.getElementById('stat-all-tasks').innerText = tasks.length;
        document.getElementById('stat-incomplete').innerText = incomplete;
        document.getElementById('stat-overdue').innerText = overdue;
        document.getElementById('stat-due-today').innerText = dueToday;

        // Tab counts
        document.querySelector('[data-tab="assigned"]').innerText = `Assigned To[Me] (${tasks.length})`; // mock all to me
        document.querySelector('[data-tab="incomplete"]').innerText = `Incomplete (${incomplete})`;
        document.querySelector('[data-tab="overdue"]').innerText = `Overdue (${overdue})`;
        document.querySelector('[data-tab="duetoday"]').innerText = `Due Today (${dueToday})`;
        document.querySelector('[data-tab="completed"]').innerText = `Completed (${stats.completed})`;

        // Side Panel Stats
        document.getElementById('s-open').innerText = stats.open;
        document.getElementById('s-inprogress').innerText = stats.inProgress;
        document.getElementById('s-completed').innerText = stats.completed;
        document.getElementById('s-onhold').innerText = stats.onHold;
        document.getElementById('s-canceled').innerText = stats.canceled;

        const activeTotal = stats.open + stats.inProgress;
        const closedTotal = stats.completed + stats.canceled;
        const totalcalc = tasks.length || 1;
        document.getElementById('s-active-pct').innerText = Math.round((activeTotal / totalcalc) * 100) + '%';
        document.getElementById('s-closed-pct').innerText = Math.round((closedTotal / totalcalc) * 100) + '%';
    }

    function renderTasks() {
        const tbody = document.getElementById('tasks-tbody');
        tbody.innerHTML = '';

        let displayTasks = tasks;
        if (activeTab === 'incomplete') {
            displayTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled');
        } else if (activeTab === 'overdue') {
            displayTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled' && isOverdue(t.dueDate));
        } else if (activeTab === 'duetoday') {
            displayTasks = tasks.filter(t => t.status !== 'Completed' && t.status !== 'Canceled' && isDueToday(t.dueDate));
        } else if (activeTab === 'completed') {
            displayTasks = tasks.filter(t => t.status === 'Completed');
        } // 'assigned' or 'dueweek' shows all for this mock

        displayTasks.forEach(task => {
            const tr = document.createElement('tr');
            tr.dataset.id = task.id;

            // Format time ago mocked beautifully
            const modified = 'Just now';

            // Priority Icon mapping
            let pIcon = 'ellipsis';
            let pColor = '#ffb300';
            if (task.priority === 'high') { pIcon = 'arrow-up'; pColor = '#e53935'; }
            if (task.priority === 'low') { pIcon = 'arrow-down'; pColor = '#4caf50'; }

            // Due Date formatting
            let dateHtml = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A';
            if (task.status !== 'Completed' && task.status !== 'Canceled') {
                if (isOverdue(task.dueDate)) {
                    dateHtml += `<br><span class="due-date-badge overdue"><i class="fa-regular fa-clock"></i> Overdue</span>`;
                } else if (isDueToday(task.dueDate)) {
                    dateHtml += `<br><span class="due-date-badge"><i class="fa-regular fa-bell"></i> Due Today</span>`;
                }
            }

            tr.innerHTML = `
                <td>
                    <div class="actions">
                        <i class="fa-solid fa-eye action-icon view"></i>
                        <i class="fa-solid fa-pen-to-square action-icon edit"></i>
                        <i class="fa-solid fa-xmark action-icon delete" style="color:red; font-size:16px;"></i>
                    </div>
                </td>
                <td class="task-id">#${task.id}</td>
                <td>${task.title}</td>
                <td><i class="fa-solid fa-${pIcon} priority-icon" style="color:${pColor}"></i></td>
                <td>${task.status}</td>
                <td>${dateHtml}</td>
                <td><i class="fa-regular fa-clock"></i> ${modified}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderChart() {
        const ctx = document.getElementById('taskChart').getContext('2d');

        let stats = { open: 0, progress: 0, completed: 0, hold: 0, canceled: 0 };
        tasks.forEach(t => {
            if (t.status === 'Open') stats.open++;
            if (t.status === 'In Progress') stats.progress++;
            if (t.status === 'Completed') stats.completed++;
            if (t.status === 'On Hold') stats.hold++;
            if (t.status === 'Canceled') stats.canceled++;
        });

        const data = {
            labels: ['Open', 'In Progress', 'Completed', 'On Hold', 'Canceled'],
            datasets: [{
                data: [stats.open, stats.progress, stats.completed, stats.hold, stats.canceled],
                backgroundColor: ['#e53935', '#ffb300', '#4caf50', '#00bcd4', '#9e9e9e'],
                borderWidth: 0,
                cutout: '70%'
            }]
        };

        if (taskChartInstance) {
            taskChartInstance.destroy();
        }

        taskChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                }
            }
        });

        // Update center text dynamically
        const openTasks = stats.open;
        document.getElementById('chart-center-text').innerHTML = `<strong>${openTasks} Open Tasks</strong>`;
    }
});
