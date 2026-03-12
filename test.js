const fs = require('fs');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

const html = fs.readFileSync('e:/taskmanager/index.html', 'utf8');
const script = fs.readFileSync('e:/taskmanager/script.js', 'utf8');

const dom = new JSDOM(html, {
  url: "http://localhost/",
  runScripts: "dangerously",
  resources: "usable"
});

// Mock localStorage
const localStorageMock = (function() {
  let store = {};
  return {
    getItem: function(key) { return store[key] || null; },
    setItem: function(key, value) { store[key] = value.toString(); },
    removeItem: function(key) { delete store[key]; },
    clear: function() { store = {}; }
  };
})();
Object.defineProperty(dom.window, 'localStorage', { value: localStorageMock });

// We only want to test our script.js execution
// Let's strip Chart.js parts since we don't need UI rendering of charts that crash JSDOM
let cleanScript = script.replace('taskChartInstance = new Chart', '// excluded');

dom.window.eval(cleanScript);

setTimeout(() => {
    try {
        const window = dom.window;
        const document = window.document;
        
        // Log in
        document.getElementById('login-username').value = "test_user";
        document.getElementById('login-form').dispatchEvent(new window.Event("submit"));
        
        console.log("Logged in? appSection hidden:", document.getElementById('app-section').classList.contains('hidden'));

        // Add task
        document.getElementById('task-title').value = "Test Task";
        document.getElementById('task-priority').value = "high";
        document.getElementById('task-status').value = "Open";
        document.getElementById('task-form').dispatchEvent(new window.Event("submit"));

        console.log("Task added?");
        console.log("localStorage tasks:", localStorageMock.getItem('tasktracker_tasks'));
        
        // Check UI
        const rows = document.getElementById('tasks-tbody').children;
        console.log("Table rows:", rows.length);
        if(rows.length > 0) {
           console.log("First row title:", rows[0].children[2].textContent);
        }
    } catch(e) {
        console.error("Test Error:", e);
    }
}, 500);
