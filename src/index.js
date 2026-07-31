const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// ===== 新增：Steam成就系统初始化 =====
const steamworks = require('steamworks.js');
const STEAM_APP_ID = 4993110;
let steamClient = null;

try {
    steamClient = steamworks.init(STEAM_APP_ID);
    console.log('Steam初始化成功！用户:', steamClient.localplayer.getName());
} catch (error) {
    console.error('Steam初始化失败:', error);
}
// ===== Steam初始化结束 =====

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      devTools: false,
      // ===== 新增：允许网页使用Node.js功能 =====
      nodeIntegration: true,
      contextIsolation: false
      // ===== 新增结束 =====
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // ===== 新增：页面加载完成后，把Steam功能暴露给网页 =====
  mainWindow.webContents.on('did-finish-load', () => {
    // 通过IPC方式让网页可以触发成就
    mainWindow.webContents.executeJavaScript(`
      window.steamClient = {
        achievement: {
          activate: function(id) {
            const { ipcRenderer } = require('electron');
            ipcRenderer.send('activate-achievement', id);
          }
        },
        // 可选：获取用户名，方便调试
        getUserName: function() {
          const { ipcRenderer } = require('electron');
          return ipcRenderer.sendSync('get-steam-username');
        }
      };
      console.log('Steam功能已注入到网页！');
    `);
  });
  // ===== 新增结束 =====
};

// ===== 新增：监听来自网页的IPC消息 =====
// 触发成就
ipcMain.on('activate-achievement', (event, achievementId) => {
  if (!steamClient) {
    console.error('Steam客户端未初始化');
    return;
  }
  try {
    steamClient.achievement.activate(achievementId);
    console.log(`✅ 成就已触发: ${achievementId}`);
  } catch (error) {
    console.error(`❌ 触发成就失败: ${achievementId}`, error);
  }
});

// 获取Steam用户名（可选，方便调试）
ipcMain.on('get-steam-username', (event) => {
  if (steamClient) {
    event.returnValue = steamClient.localplayer.getName();
  } else {
    event.returnValue = '未连接Steam';
  }
});
// ===== IPC监听结束 =====

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
