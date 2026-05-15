import express from 'express'
import { join } from 'path'
import { app as electronApp } from 'electron'
import { is } from '@electron-toolkit/utils'
import { Server } from 'http'
import type { Response } from 'express'

export interface ObsState {
  isConnected: boolean
  isSessionActive: boolean
  elapsed: number
  currentChord: string
  currentChordQuality: string
  lastChord: string
  streak: number
  totalPracticeToday: number
  activeSong: string
  activeNotes: Record<number, number>   // note → velocity
  sustainedNotes: number[]              // pedal-sustained note numbers
  config: {
    showChord: boolean
    showLastChord: boolean
    showTimer: boolean
    showStreak: boolean
    showTodayMin: boolean
    showDot: boolean
    showPiano: boolean
    fontSize: number
    theme: string
    position: string
    bgOpacity: number
    whiteKeyPressedColor: string
    blackKeyPressedColor: string
    whiteKeySustainedColor: string
    blackKeySustainedColor: string
  }
}

let state: ObsState = {
  isConnected: false,
  isSessionActive: false,
  elapsed: 0,
  currentChord: '',
  currentChordQuality: '',
  lastChord: '',
  streak: 0,
  totalPracticeToday: 0,
  activeSong: '',
  activeNotes: {},
  sustainedNotes: [],
  config: {
    showChord: true, showLastChord: true, showTimer: true,
    showStreak: true, showTodayMin: true, showDot: true, showPiano: true,
    fontSize: 36, theme: 'dark', position: 'bottom-left', bgOpacity: 72,
    whiteKeyPressedColor: 'rgba(66,153,225,1)',
    blackKeyPressedColor: 'rgba(49,103,170,1)',
    whiteKeySustainedColor: 'rgba(100,160,230,0.55)',
    blackKeySustainedColor: 'rgba(70,110,180,0.55)',
  }
}

// SSE 客户端列表
const sseClients = new Set<Response>()

function broadcast(): void {
  const payload = `data: ${JSON.stringify(state)}\n\n`
  for (const res of sseClients) {
    try { res.write(payload) } catch { sseClients.delete(res) }
  }
}

let httpServer: Server | null = null

export function startObsServer(port = 7890): void {
  if (httpServer) return

  const app = express()

  const overlayDir = is.dev
    ? join(process.cwd(), 'resources', 'obs-overlay')
    : join(process.resourcesPath, 'obs-overlay')

  app.use('/overlay', express.static(overlayDir))

  // SSE 端点：客户端连接后实时接收推送
  app.get('/events', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    // 连接后立即发送当前状态
    res.write(`data: ${JSON.stringify(state)}\n\n`)
    sseClients.add(res)

    req.on('close', () => sseClients.delete(res))
  })

  // 兼容旧的 /state 轮询方式
  app.get('/state', (_req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.json(state)
  })

  app.get('/', (_req, res) => res.redirect('/overlay'))

  httpServer = app.listen(port, '127.0.0.1', () => {
    console.log(`[OBS] http://localhost:${port}/overlay`)
  })
}

export function stopObsServer(): void {
  httpServer?.close()
  httpServer = null
}

export function updateObsState(partial: Partial<ObsState>): void {
  state = { ...state, ...partial }
  broadcast()
}
