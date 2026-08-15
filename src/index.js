const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// ===== Steam成就系统初始化 =====
const steamworks = require('steamworks.js');
const STEAM_APP_ID = 4993110;  // 你的 App ID
let steamClient = null;

try {
    steamClient = steamworks.init(STEAM_APP_ID);
    console.log('Steam初始化成功！用户:', steamClient.localplayer.getName());
} catch (error) {
    console.error('Steam初始化失败:', error);
}
// ===== Steam初始化结束 =====

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
}

const createWindow = () => {
    const mainWindow = new BrowserWindow({
        width: 1280,
        height: 720,
        webPreferences: {
            devTools: false,
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(`
            // 注入 jQuery
            window.$ = window.jQuery = require('jquery');
            
            // 注入 Steam 功能
            window.steamClient = {
                achievement: {
                    activate: function(id) {
                        const { ipcRenderer } = require('electron');
                        ipcRenderer.send('activate-achievement', id);
                    }
                }
            };
            console.log('Steam功能已注入到网页！');
        `);
    });
};   // ← createWindow 函数在这里结束

// ===== 监听来自网页的IPC消息（放在 createWindow 外面） =====
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

ipcMain.on('get-steam-username', (event) => {
    if (steamClient) {
        event.returnValue = steamClient.localplayer.getName();
    } else {
        event.returnValue = '未连接Steam';
    }
});
// ===== IPC监听结束 =====

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

require('steamworks.js').electronEnableSteamOverlay()
