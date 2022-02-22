// Preload JS
const { contextBridge, ipcRenderer } = require('electron')
const os = require('os')
const storage = require('electron-json-storage')

const sysUserInfo = os.userInfo();

console.log(sysUserInfo);

console.log("Preload username: "+sysUserInfo.username);

contextBridge.exposeInMainWorld('darkMode', {
  toggle: () => ipcRenderer.invoke('dark-mode:toggle'),
  system: () => ipcRenderer.invoke('dark-mode:system')
})

contextBridge.exposeInMainWorld('userInfo', {
  username: sysUserInfo.username
});

contextBridge.exposeInMainWorld('usage', {
  cpu: process.getCPUUsage().percentCPUUsage.toString().slice(0, 5)
});

ipcRenderer.on('cpu', (event, data) => {
  document.getElementById('cpu').innerHTML = Math.round(data.toFixed(2));
});
ipcRenderer.on('mem', (event, data) => {
  document.getElementById('mem').innerHTML = Math.round(data.toFixed(2));
});
ipcRenderer.on('total-mem', (event, data) => {
  document.getElementById('total-mem').innerHTML = Math.round(data.toFixed(2));
});