const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("setbuilderDesktop", {
  getInfo: () => ipcRenderer.invoke("desktop:getInfo"),
  checkForUpdates: () => ipcRenderer.invoke("desktop:checkForUpdates"),
  downloadUpdate: () => ipcRenderer.invoke("desktop:downloadUpdate"),
  installUpdate: () => ipcRenderer.invoke("desktop:installUpdate"),
  onUpdateEvent: (callback) => {
    const handler = (_event, payload) => {
      callback(payload);
    };
    ipcRenderer.on("desktop:update", handler);
    return () => {
      ipcRenderer.removeListener("desktop:update", handler);
    };
  },
});
