const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const configPath = path.join(os.homedir(), '.ssh', 'config');

function parseSSHConfig(content) {
  const configs = [];
  let currentConfig = null;
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) continue;

    const [key, ...values] = trimmedLine.split(/\s+/);
    const value = values.join(' ');

    if (key.toLowerCase() === 'host') {
      if (currentConfig) {
        configs.push(currentConfig);
      }
      currentConfig = { host: value };
    } else if (currentConfig) {
      switch (key.toLowerCase()) {
        case 'hostname':
          currentConfig.hostName = value;
          break;
        case 'user':
          currentConfig.user = value;
          break;
        case 'identityfile':
          currentConfig.identityFile = value;
          break;
        case 'port':
          currentConfig.port = parseInt(value);
          break;
        case 'forwardagent':
          currentConfig.forwardAgent = value.toLowerCase();
          break;
        case 'proxyjump':
          currentConfig.proxyJump = value;
          break;
      }
    }
  }

  if (currentConfig) {
    configs.push(currentConfig);
  }

  return configs;
}

function generateSSHConfig(configs) {
  let content = '';
  for (const config of configs) {
    content += `Host ${config.host}\n`;
    content += `  HostName ${config.hostName}\n`;
    content += `  User ${config.user}\n`;
    if (config.identityFile) {
      content += `  IdentityFile ${config.identityFile}\n`;
    }
    if (config.port) {
      content += `  Port ${config.port}\n`;
    }
    if (config.forwardAgent) {
      content += `  ForwardAgent ${config.forwardAgent}\n`;
    }
    if (config.proxyJump) {
      content += `  ProxyJump ${config.proxyJump}\n`;
    }
    content += '\n';
  }
  return content;
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../public/index.html'));

  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  return mainWindow;
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('load-configs', async () => {
  try {
    if (!fs.existsSync(configPath)) {
      console.log('Config file does not exist, creating empty file');
      fs.writeFileSync(configPath, '');
      return [];
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    console.log('Config file content:', content);
    return parseSSHConfig(content);
  } catch (error) {
    console.error('Error loading SSH config:', error);
    return [];
  }
});

ipcMain.handle('save-configs', async (event, configs) => {
  try {
    console.log('Saving configs:', configs);
    const content = generateSSHConfig(configs);
    console.log('Writing to config file:', content);
    fs.writeFileSync(configPath, content);
    return true;
  } catch (error) {
    console.error('Error saving SSH config:', error);
    return false;
  }
}); 