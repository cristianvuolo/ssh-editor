const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');
const os = require('os');

const configPath = path.join(os.homedir(), '.ssh', 'config');
console.log('SSH config path:', configPath);

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
      contextIsolation: false
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
    let content;
    try {
      content = await fs.readFile(configPath, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') {
        console.log('Config file does not exist, creating empty file');
        await fs.writeFile(configPath, '');
        return [];
      }
      throw error;
    }
    
    const configs = [];
    let currentConfig = null;
    let inHostBlock = false;

    const lines = content.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('#')) continue;

      // Verifica se é uma linha de Host (pode estar indentada)
      if (trimmedLine.toLowerCase().startsWith('host ')) {
        if (currentConfig) {
          configs.push(currentConfig);
        }
        const host = trimmedLine.substring(5).trim();
        currentConfig = { host };
        inHostBlock = true;
      } else if (inHostBlock) {
        // Remove a indentação se existir
        const cleanLine = line.trim();
        const [key, ...valueParts] = cleanLine.split(/\s+/);
        const value = valueParts.join(' ').trim();
        
        if (key && value) {
          const normalizedKey = key.toLowerCase();
          switch (normalizedKey) {
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
              currentConfig.port = value;
              break;
            case 'forwardagent':
              currentConfig.forwardAgent = value.toLowerCase();
              break;
            case 'proxyjump':
              currentConfig.proxyJump = value;
              break;
            default:
              currentConfig[normalizedKey] = value;
          }
        }
      }
    }

    // Adiciona a última configuração se existir
    if (currentConfig && currentConfig.host) {
      configs.push(currentConfig);
    }

    return configs;
  } catch (error) {
    console.error('Error reading SSH config:', error);
    return [];
  }
});

ipcMain.handle('save-configs', async (event, configs) => {
  try {
    // Lê o arquivo atual para preservar as configurações globais
    let content = '';
    try {
      content = await fs.readFile(configPath, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }

    // Separa as configurações globais (antes do primeiro Host)
    const lines = content.split('\n');
    let globalConfig = [];
    let foundFirstHost = false;

    for (const line of lines) {
      if (line.trim().toLowerCase().startsWith('host ')) {
        foundFirstHost = true;
        break;
      }
      globalConfig.push(line);
    }

    // Gera o conteúdo das configurações de host com indentação correta
    const hostConfigs = configs.map(config => {
      const entries = Object.entries(config)
        .filter(([key]) => key !== 'host')
        .map(([key, value]) => `    ${key} ${value}`)
        .join('\n');
      return `Host ${config.host}\n${entries}`;
    }).join('\n\n');

    // Combina as configurações globais com as configurações de host
    const newContent = [
      ...globalConfig,
      ...(globalConfig.length > 0 ? [''] : []),
      hostConfigs
    ].join('\n');

    await fs.writeFile(configPath, newContent);
    return true;
  } catch (error) {
    console.error('Error saving SSH config:', error);
    return false;
  }
}); 