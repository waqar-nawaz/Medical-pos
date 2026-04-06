/* eslint-disable no-console */
const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

const isDev = !app.isPackaged;

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false,
    backgroundColor: '#0b1020',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  const devUrl = process.env.RENDERER_URL || 'http://localhost:4200';

  const prodFile = path.join(
    __dirname,
    '..',
    'dist',
    'renderer',
    'browser',
    'index.html'
  );

  console.log('Running in:', isDev ? 'DEV' : 'PROD');
  console.log('Loading:', isDev ? devUrl : prodFile);

  if (isDev) {
    mainWindow.loadURL(devUrl);
  } else {
    if (!fs.existsSync(prodFile)) {
      console.error('❌ index.html NOT FOUND:', prodFile);
    }
    if (fs.existsSync(prodFile)) {
      mainWindow.loadFile(prodFile);
    } else {
      console.error('❌ index.html not found:', prodFile);
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // mainWindow.webContents.openDevTools();
}

function startBackend() {
  const serverPath = isDev
    ? path.join(__dirname, '..', 'backend', 'src', 'server.js')
    : path.join(process.resourcesPath, 'backend', 'src', 'server.js');

  console.log('Backend path:', serverPath);

  if (!fs.existsSync(serverPath)) {
    console.error('❌ Backend file not found:', serverPath);
    return;
  }

  serverProcess = spawn('node', [serverPath], {
    stdio: 'inherit',

    // 🔥 CRITICAL FIX (THIS FIXES 500 LOGIN ISSUES IN 80% CASES)
    cwd: path.join(__dirname, '..'),

    env: {
      ...process.env,
      NODE_ENV: isDev ? 'development' : 'production'
    }
  });

  serverProcess.on('error', (err) => {
    console.error('❌ Failed to start backend:', err);
  });

  serverProcess.on('exit', (code) => {
    console.log('⚠️ Backend exited with code:', code);
  });
}

app.whenReady().then(() => {
  startBackend();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ✅ Kill backend on exit
app.on('will-quit', () => {
  if (serverProcess) {
    console.log('🔴 Killing backend...');
    serverProcess.kill();
  }
});

// ---------------- IPC ----------------

ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('app:openExternal', async (_evt, url) => {
  if (typeof url !== 'string') return false;
  await shell.openExternal(url);
  return true;
});

ipcMain.handle('print:receipt', async (_evt, html) => {
  const tmpHtml = path.join(os.tmpdir(), `receipt_${Date.now()}.html`);

  try {
    fs.writeFileSync(tmpHtml, html, 'utf-8');
  } catch (err) {
    return { success: false, failureReason: 'Failed to write temp file' };
  }

  await shell.openPath(tmpHtml);

  return { success: true, failureReason: null };
});