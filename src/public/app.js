// TODO: npm install --save toastify-js
//         https://github.com/apvarun/toastify-js/blob/master/README.md
// TODO: Setup websocket listener for a "toast" message
class Dashboard {
  constructor() {
    this.gridContainer = document.getElementById('grid-container');
    this.taskbar = document.getElementById('taskbar');
    this.taskbarToggle = document.getElementById('taskbar-toggle');
    this.config = null;
    this.modules = new Map();
    this.ws = null;
    this.taskbarPosition = 'top';
    this.init();
  }

  async init() {
    await this.loadConfig();
    this.setupTaskbar();
    this.setupWebSocket();
    this.render();
  }

  async loadConfig() {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      this.config = data;
    } catch (error) {
      console.error('Failed to load config:', error);
      this.config = { gridWidth: 4, gridHeight: 3, modules: [] };
    }
  }

  setupTaskbar() {
    const taskbarConfig = this.config.taskbar || { enabled: false };

    if (taskbarConfig.enabled) {
      this.taskbarPosition = taskbarConfig.position || 'top';
      this.taskbar.className = this.taskbarPosition;
      this.taskbarToggle.className = 'taskbar-toggle ' + this.taskbarPosition;

      // Add user-defined buttons if configured
      if (taskbarConfig.buttons && Array.isArray(taskbarConfig.buttons)) {
        taskbarConfig.buttons.forEach(buttonConfig => {
          this.addTaskbarButton(buttonConfig);
        });
      }

      // Add minimize and close buttons
      this.addTaskbarButton({
        label: 'Minimize',
        icon: '─',
        action: 'minimize',
        isSystemButton: true
      });

      this.addTaskbarButton({
        label: 'Close',
        icon: '✕',
        action: 'close',
        isSystemButton: true
      });

      // Setup toggle button
      this.taskbarToggle.addEventListener('click', () => {
        this.showTaskbar();
      });

      // Show taskbar by default
      this.showTaskbar();
    } else {
      this.taskbar.style.display = 'none';
      this.taskbarToggle.style.display = 'none';
    }
  }

  showTaskbar() {
    this.taskbar.style.display = 'flex';
    this.taskbarToggle.style.display = 'none';
  }

  minimizeTaskbar() {
    this.taskbar.style.display = 'none';
    this.taskbarToggle.style.display = 'flex';
  }

  closeTaskbar() {
    this.taskbar.style.display = 'none';
    this.taskbarToggle.style.display = 'none';
  }

  addTaskbarButton(config) {
    const button = document.createElement('button');
    button.className = 'taskbar-button';

    if (config.isSystemButton) {
      button.style.marginLeft = config.action === 'minimize' ? 'auto' : '0';
    }

    button.textContent = config.label || 'Button';

    if (config.icon) {
      button.textContent = config.icon + ' ' + button.textContent;
    }

    // Button action handling
    button.addEventListener('click', () => {
      if (config.action) {
        this.handleTaskbarAction(config.action, config);
      }
    });

    this.taskbar.appendChild(button);
  }

  handleTaskbarAction(action, config) {
    console.log('Taskbar action:', action, config);

    switch (action) {
      case 'minimize':
        this.minimizeTaskbar();
        break;
      case 'close':
        this.closeTaskbar();
        break;
      case 'refresh':
        this.reload();
        break;
      case 'custom':
        // Custom actions can be handled here
        if (config.url) {
          window.open(config.url, '_blank');
        }
        break;
      default:
        console.log('Unknown action:', action);
    }
  }

  setupWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${window.location.host}`);

    this.ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'config-changed') {
        console.log('Config changed, reloading...');
        await this.reload();
      }
    };

    this.ws.onclose = () => {
      console.log('WebSocket closed, attempting to reconnect...');
      setTimeout(() => this.setupWebSocket(), 2000);
    };
  }

  async reload() {
    // Clear existing modules
    this.modules.forEach(module => {
      if (module.destroy) {
        module.destroy();
      }
    });
    this.modules.clear();
    this.gridContainer.innerHTML = '';
    this.taskbar.innerHTML = '';

    // Reload config and render
    await this.loadConfig();
    this.setupTaskbar();
    this.render();
  }

  render() {
    const { gridWidth, gridHeight, modules } = this.config;

    // Set up CSS Grid
    this.gridContainer.style.gridTemplateColumns = `repeat(${gridWidth}, 1fr)`;
    this.gridContainer.style.gridTemplateRows = `repeat(${gridHeight}, 1fr)`;

    // Load and render each module
    modules.forEach(moduleConfig => {
      this.loadModule(moduleConfig);
    });
  }

  async loadModule(moduleConfig) {
    const { name, width, height, x, y, config } = moduleConfig;

    // Create wrapper element
    const wrapper = document.createElement('div');
    wrapper.className = 'module-wrapper';
    wrapper.style.gridColumn = `${x + 1} / span ${width}`;
    wrapper.style.gridRow = `${y + 1} / span ${height}`;

    // Create content container
    const content = document.createElement('div');
    content.className = 'module-content';
    content.id = `module-${name}-${Date.now()}`;
    wrapper.appendChild(content);

    this.gridContainer.appendChild(wrapper);

    // Load module script
    try {
      const script = document.createElement('script');
      script.src = `/modules/${name}/module.js`;
      script.onload = () => {
        // Initialize module
        const ModuleClass = window[this.getModuleClassName(name)];
        if (ModuleClass) {
          const instance = new ModuleClass(content, config || {}, {
            log: this.log
          });
          this.modules.set(content.id, instance);
        }
      };
      document.body.appendChild(script);
    } catch (error) {
      console.error(`Failed to load module ${name}:`, error);
      content.innerHTML = `<p style="color: #ff6b6b;">Error loading module: ${name}</p>`;
    }
  }

  getModuleClassName(name) {
    // Convert module name to class name (e.g., 'todo-list' -> 'TodoListModule')
    return name
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('') + 'Module';
  }

  async log(level, module, message) {
    return await fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        logLevel: level,
        module: module,
        message: message
      })
    });
  }
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Dashboard();
});
