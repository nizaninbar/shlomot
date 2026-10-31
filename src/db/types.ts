export type Equipment = { id: string; name: string; icon?: string; updatedAt: number }

export type Workout = {
  id: string
  name: string
  description: string
  equipmentIds: string[]
  basedOnId?: string
  createdAt: number
  updatedAt: number
}

export type Lesson = {
  id: string
  workoutId: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  location: string
  updatedAt: number
}
