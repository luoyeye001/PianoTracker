import { useState, useEffect, useCallback, useRef } from 'react'

export interface MidiDevice {
  id: string
  name: string
  manufacturer: string
}

export interface MidiNote {
  note: number
  velocity: number
  timestamp: number
}

export interface UseMidiReturn {
  isSupported: boolean
  isConnected: boolean
  devices: MidiDevice[]
  activeDevice: MidiDevice | null
  activeNotes: Set<number>                   // 物理按住 + 踏板延音
  activeNoteVelocities: Map<number, number>  // note → velocity
  sustainedNotes: Set<number>                // 仅踏板延音（已松键但踏板保持）
  sustainActive: boolean                     // 延音踏板是否踩下
  lastNote: MidiNote | null
  notePressCount: Record<number, number>
  permissionState: 'idle' | 'requesting' | 'granted' | 'denied'
  requestAccess: () => void
}

export function useMidi(): UseMidiReturn {
  const [isSupported] = useState(() => 'requestMIDIAccess' in navigator)
  const [permissionState, setPermissionState] = useState<UseMidiReturn['permissionState']>('idle')
  const [devices, setDevices] = useState<MidiDevice[]>([])
  const [activeDevice, setActiveDevice] = useState<MidiDevice | null>(null)
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())
  const [activeNoteVelocities, setActiveNoteVelocities] = useState<Map<number, number>>(new Map())
  const [sustainedNotes, setSustainedNotes] = useState<Set<number>>(new Set())
  const [sustainActive, setSustainActive] = useState(false)
  const [lastNote, setLastNote] = useState<MidiNote | null>(null)
  const [notePressCount, setNotePressCount] = useState<Record<number, number>>({})

  const midiAccessRef = useRef<MIDIAccess | null>(null)
  // Ref 版本用于在回调中读取最新值（避免闭包陷阱）
  const sustainActiveRef = useRef(false)
  const sustainedNotesRef = useRef<Set<number>>(new Set())

  const isConnected = devices.length > 0

  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const [status, data1, data2] = Array.from(event.data)
    const command = status & 0xf0

    const isNoteOn  = command === 0x90 && data2 > 0
    const isNoteOff = command === 0x80 || (command === 0x90 && data2 === 0)
    const isCC      = command === 0xb0

    if (isNoteOn) {
      const note = data1
      const velocity = data2
      // 如果这个音之前被踏板延着，现在重新按下，从延音集合移除
      if (sustainedNotesRef.current.has(note)) {
        sustainedNotesRef.current = new Set(sustainedNotesRef.current)
        sustainedNotesRef.current.delete(note)
        setSustainedNotes(new Set(sustainedNotesRef.current))
      }
      setActiveNotes((prev) => new Set(prev).add(note))
      setActiveNoteVelocities((prev) => new Map(prev).set(note, velocity))
      setLastNote({ note, velocity, timestamp: event.timeStamp })
      setNotePressCount((prev) => ({ ...prev, [note]: (prev[note] ?? 0) + 1 }))

    } else if (isNoteOff) {
      const note = data1
      if (sustainActiveRef.current) {
        // 踏板踩着：不从 activeNotes 移除，加入延音集合
        sustainedNotesRef.current = new Set(sustainedNotesRef.current).add(note)
        setSustainedNotes(new Set(sustainedNotesRef.current))
      } else {
        setActiveNotes((prev) => { const s = new Set(prev); s.delete(note); return s })
        setActiveNoteVelocities((prev) => { const m = new Map(prev); m.delete(note); return m })
      }

    } else if (isCC && data1 === 64) {
      // 延音踏板 (CC #64)：value >= 64 为踩下
      const pedal = data2 >= 64
      sustainActiveRef.current = pedal
      setSustainActive(pedal)

      if (!pedal) {
        // 踏板松开：把所有延音的键从 activeNotes 里移除
        const toRelease = sustainedNotesRef.current
        sustainedNotesRef.current = new Set()
        setSustainedNotes(new Set())
        setActiveNotes((prev) => {
          const s = new Set(prev)
          toRelease.forEach((n) => s.delete(n))
          return s
        })
        setActiveNoteVelocities((prev) => {
          const m = new Map(prev)
          toRelease.forEach((n) => m.delete(n))
          return m
        })
      }
    }
  }, [])

  const syncDevices = useCallback(
    (access: MIDIAccess) => {
      const found: MidiDevice[] = []
      access.inputs.forEach((input) => {
        found.push({
          id: input.id,
          name: input.name ?? 'Unknown Device',
          manufacturer: input.manufacturer ?? ''
        })
        input.onmidimessage = handleMidiMessage
      })
      setDevices(found)
      setActiveDevice(found.length > 0 ? found[0] : null)
    },
    [handleMidiMessage]
  )

  const requestAccess = useCallback(() => {
    if (!isSupported) return
    setPermissionState('requesting')
    navigator
      .requestMIDIAccess({ sysex: false })
      .then((access) => {
        midiAccessRef.current = access
        setPermissionState('granted')
        syncDevices(access)
        access.onstatechange = () => syncDevices(access)
      })
      .catch(() => setPermissionState('denied'))
  }, [isSupported, syncDevices])

  useEffect(() => {
    if (isSupported) requestAccess()
    return () => {
      if (midiAccessRef.current) {
        midiAccessRef.current.inputs.forEach((input) => { input.onmidimessage = null })
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isSupported,
    isConnected,
    devices,
    activeDevice,
    activeNotes,
    activeNoteVelocities,
    sustainedNotes,
    sustainActive,
    lastNote,
    notePressCount,
    permissionState,
    requestAccess
  }
}
