import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion')
  },
  sessions: {
    save: (s: object) => ipcRenderer.invoke('sessions:save', s),
    list: () => ipcRenderer.invoke('sessions:list'),
    byDate: (date: string) => ipcRenderer.invoke('sessions:byDate', date),
    dailySummary: () => ipcRenderer.invoke('sessions:dailySummary')
  },
  stats: {
    recordNotePress: (date: string, note: number) => ipcRenderer.invoke('stats:recordNotePress', date, note)
  },
  songs: {
    list: () => ipcRenderer.invoke('songs:list'),
    create: (s: object) => ipcRenderer.invoke('songs:create', s),
    update: (id: number, fields: object) => ipcRenderer.invoke('songs:update', id, fields),
    delete: (id: number) => ipcRenderer.invoke('songs:delete', id)
  },
  plans: {
    get: (date: string) => ipcRenderer.invoke('plans:get', date),
    set: (date: string, goal_min: number, note: string) => ipcRenderer.invoke('plans:set', date, goal_min, note),
    delete: (date: string) => ipcRenderer.invoke('plans:delete', date),
    all: () => ipcRenderer.invoke('plans:all')
  },
  obs: {
    update: (partial: object) => ipcRenderer.send('obs:update', partial)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
