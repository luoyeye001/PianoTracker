export interface PracticeSession {
  id: number
  date: string
  started_at: number
  ended_at: number
  duration_s: number
  note_presses: number
  unique_notes: number
  chords_recognized: number
  song_id: number | null
}

export interface DailySummary {
  date: string
  total_s: number
  total_presses: number
  total_unique_notes: number
  total_chords_recognized: number
  count: number
}

export interface Song {
  id: number
  title: string
  composer: string
  status: 'not_started' | 'practicing' | 'completed'
  notes: string
  created_at: number
  updated_at: number
}

export interface PracticePlan {
  id: number
  date: string
  goal_min: number
  note: string
}

declare global {
  interface Window {
    api: {
      app: {
        getVersion: () => Promise<string>
      }
      sessions: {
        save: (s: Omit<PracticeSession, 'id'>) => Promise<number>
        list: () => Promise<PracticeSession[]>
        byDate: (date: string) => Promise<PracticeSession[]>
        dailySummary: () => Promise<DailySummary[]>
      }
      songs: {
        list: () => Promise<Song[]>
        create: (s: Pick<Song, 'title' | 'composer' | 'notes'>) => Promise<number>
        update: (id: number, fields: Partial<Pick<Song, 'title' | 'composer' | 'status' | 'notes'>>) => Promise<void>
        delete: (id: number) => Promise<void>
      }
      plans: {
        get: (date: string) => Promise<PracticePlan | null>
        set: (date: string, goal_min: number, note: string) => Promise<void>
        delete: (date: string) => Promise<void>
        all: () => Promise<PracticePlan[]>
      }
      obs: {
        update: (state: object) => void
      }
    }
  }
}
