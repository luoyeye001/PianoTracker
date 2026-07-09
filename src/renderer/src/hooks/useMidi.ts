import { useState, useEffect, useCallback, useRef } from 'react'

let nextMidiOwnerId = 1
let activeMidiOwnerId = 0

export interface MidiDevice {
  id: string
  name: string
  manufacturer: string
  version: string
  state: MIDIPortDeviceState
  connection: MIDIPortConnectionState
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
  activeNotes: Set<number>
  activeNoteVelocities: Map<number, number>
  sustainedNotes: Set<number>
  sustainActive: boolean
  lastNote: MidiNote | null
  notePressCount: Record<number, number>
  permissionState: 'idle' | 'requesting' | 'granted' | 'denied'
  permissionError: string | null
  requestAccess: () => void
}

export function useMidi(): UseMidiReturn {
  const [isSupported] = useState(() => 'requestMIDIAccess' in navigator)
  const [permissionState, setPermissionState] = useState<UseMidiReturn['permissionState']>('idle')
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const [devices, setDevices] = useState<MidiDevice[]>([])
  const [activeDevice, setActiveDevice] = useState<MidiDevice | null>(null)
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set())
  const [activeNoteVelocities, setActiveNoteVelocities] = useState<Map<number, number>>(new Map())
  const [sustainedNotes, setSustainedNotes] = useState<Set<number>>(new Set())
  const [sustainActive, setSustainActive] = useState(false)
  const [lastNote, setLastNote] = useState<MidiNote | null>(null)
  const [notePressCount, setNotePressCount] = useState<Record<number, number>>({})

  const midiAccessRef = useRef<MIDIAccess | null>(null)
  const ownerIdRef = useRef(nextMidiOwnerId++)
  const sustainActiveRef = useRef(false)
  const sustainedNotesRef = useRef<Set<number>>(new Set())
  const physicallyHeldNotesRef = useRef<Set<number>>(new Set())

  const isConnected = devices.length > 0

  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const rawData = event.data
    if (!rawData || rawData.length < 1) return

    const [status, data1, data2 = 0] = Array.from(rawData)
    const command = status & 0xf0
    const isNoteOn = command === 0x90 && data2 > 0
    const isNoteOff = command === 0x80 || (command === 0x90 && data2 === 0)
    const isCC = command === 0xb0

    if (isNoteOn) {
      const note = data1
      const velocity = data2
      const wasAlreadyHeld = physicallyHeldNotesRef.current.has(note)

      physicallyHeldNotesRef.current = new Set(physicallyHeldNotesRef.current).add(note)

      if (sustainedNotesRef.current.has(note)) {
        sustainedNotesRef.current = new Set(sustainedNotesRef.current)
        sustainedNotesRef.current.delete(note)
        setSustainedNotes(new Set(sustainedNotesRef.current))
      }

      setActiveNotes((prev) => new Set(prev).add(note))
      setActiveNoteVelocities((prev) => new Map(prev).set(note, velocity))
      setLastNote({ note, velocity, timestamp: event.timeStamp })

      // Count one physical key-down transition only. This prevents both React
      // StrictMode duplicate listeners and repeated Note On messages from making
      // a single press count as +2/+N.
      if (!wasAlreadyHeld) {
        setNotePressCount((prev) => ({ ...prev, [note]: (prev[note] ?? 0) + 1 }))
      }

    } else if (isNoteOff) {
      const note = data1
      physicallyHeldNotesRef.current = new Set(physicallyHeldNotesRef.current)
      physicallyHeldNotesRef.current.delete(note)

      if (sustainActiveRef.current) {
        sustainedNotesRef.current = new Set(sustainedNotesRef.current).add(note)
        setSustainedNotes(new Set(sustainedNotesRef.current))
      } else {
        setActiveNotes((prev) => { const s = new Set(prev); s.delete(note); return s })
        setActiveNoteVelocities((prev) => { const m = new Map(prev); m.delete(note); return m })
      }

    } else if (isCC && data1 === 64) {
      const pedal = data2 >= 64
      sustainActiveRef.current = pedal
      setSustainActive(pedal)

      if (!pedal) {
        const toRelease = sustainedNotesRef.current
        sustainedNotesRef.current = new Set()
        setSustainedNotes(new Set())
        setActiveNotes((prev) => {
          const s = new Set(prev)
          toRelease.forEach((n) => {
            if (!physicallyHeldNotesRef.current.has(n)) s.delete(n)
          })
          return s
        })
        setActiveNoteVelocities((prev) => {
          const m = new Map(prev)
          toRelease.forEach((n) => {
            if (!physicallyHeldNotesRef.current.has(n)) m.delete(n)
          })
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
          manufacturer: input.manufacturer ?? '',
          version: input.version ?? '',
          state: input.state,
          connection: input.connection
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

    const ownerId = ownerIdRef.current
    activeMidiOwnerId = ownerId
    setPermissionState('requesting')
    setPermissionError(null)

    navigator
      .requestMIDIAccess({ sysex: false })
      .then((access) => {
        // In React StrictMode dev builds, the first async MIDI request can
        // resolve after its cleanup. Ignore and detach stale access objects so
        // they cannot leave a second onmidimessage handler behind.
        if (activeMidiOwnerId !== ownerId) {
          access.inputs.forEach((input) => { input.onmidimessage = null })
          access.onstatechange = null
          return
        }

        midiAccessRef.current = access
        setPermissionState('granted')
        syncDevices(access)
        access.onstatechange = () => {
          if (activeMidiOwnerId === ownerId) syncDevices(access)
        }
      })
      .catch((error: unknown) => {
        if (activeMidiOwnerId !== ownerId) return
        setPermissionState('denied')
        setPermissionError(error instanceof Error ? error.message : String(error))
        console.error('[midi] requestMIDIAccess failed:', error)
      })
  }, [isSupported, syncDevices])

  useEffect(() => {
    if (isSupported) requestAccess()
    const ownerId = ownerIdRef.current
    return () => {
      if (activeMidiOwnerId === ownerId) activeMidiOwnerId = 0
      if (midiAccessRef.current) {
        midiAccessRef.current.onstatechange = null
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
    permissionError,
    requestAccess
  }
}
