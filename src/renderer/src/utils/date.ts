export function toLocalDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function fromLocalDateString(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function addLocalDays(value: string, amount: number): string {
  const date = fromLocalDateString(value)
  date.setDate(date.getDate() + amount)
  return toLocalDateString(date)
}
