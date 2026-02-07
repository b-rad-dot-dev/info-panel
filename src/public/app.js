class Dashboard {
  constructor() {
    this.gridContainer = document.getElementById('grid-container');
    this.config = null;
    this.modules = new Map();
    this.ws = null;
    this.init();
  }

  async init() {
    await this.loadConfig();
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
    
    // Reload config and render
    await this.loadConfig();
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
          const instance = new ModuleClass(content, config || {});
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
}

// Initialize dashboard when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Dashboard();
});
