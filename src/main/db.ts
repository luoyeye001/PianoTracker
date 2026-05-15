import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'

let db: Database.Database

export function getDb(): Database.Database {
  if (db) return db

  const dbPath = join(app.getPath('userData'), 'pianotracker.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  initSchema(db)
  return db
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL,          -- YYYY-MM-DD
      started_at  INTEGER NOT NULL,       -- Unix ms
      ended_at    INTEGER NOT NULL,       -- Unix ms
      duration_s  INTEGER NOT NULL,       -- 秒
      note_presses INTEGER DEFAULT 0,     -- 总按键次数
      song_id     INTEGER REFERENCES songs(id)
    );

    CREATE TABLE IF NOT EXISTS songs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      title       TEXT NOT NULL,
      composer    TEXT DEFAULT '',
      status      TEXT DEFAULT 'not_started',  -- not_started | practicing | completed
      notes       TEXT DEFAULT '',
      created_at  INTEGER NOT NULL,
      updated_at  INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_date ON practice_sessions(date);

    CREATE TABLE IF NOT EXISTS practice_plans (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      date        TEXT NOT NULL UNIQUE,   -- YYYY-MM-DD
      goal_min    INTEGER DEFAULT 0,      -- 目标练习分钟数，0 表示不设
      note        TEXT DEFAULT ''         -- 今日练习备注/计划内容
    );

    CREATE INDEX IF NOT EXISTS idx_plans_date ON practice_plans(date);
  `)
}
