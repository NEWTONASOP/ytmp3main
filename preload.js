const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electron", {
    closeApp: () => ipcRenderer.send("close-app"),
    minimizeApp: () => ipcRenderer.send("minimize-app"),
    downloadMP3: (url) => ipcRenderer.send("download-mp3", url),
    onDownloadStatus: (callback) => ipcRenderer.on("download-status", (event, status) => callback(status))
});
