export type User = {
  _id: string,
  username: string
}

export type DBUser = {
  user_id: string,
  username: string
}

export type ExerciseResponse = {
  _id: string,
  description: string,
  duration: number,
  date:Date
}

export type Exercise = {
  _id: string,
  description: string,
  duration: number,
  exercise_date: string
}

export type Log = {
    user_id: string,
    username: string,
    description: string
    duration: number,
    exercise_date: string
}