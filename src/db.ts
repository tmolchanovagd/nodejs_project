import sqlite3, { Database } from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { DBUser, Exercise, ExerciseResponse, User } from './types';
sqlite3.verbose()
let db: Database;

const userExist = async (value: string, type: keyof DBUser, reject: (reason?: any) => void, rejectWhenFlag: boolean) => {
  try {
    const user = await getUserByParam(value, type);
    const userExists = !!user?._id;

    if ((userExists && rejectWhenFlag) || (!userExists && !rejectWhenFlag)) {
      const errorMessage = rejectWhenFlag ? "User with this ID already exists" : "User with this ID doesn't exist";
      reject({
        status: 400,
        message: errorMessage
      });
      return true
    }
  } catch (error) {
    console.error("Error while checking user existence:", error);
    reject({
      status: 500,
      message: "Internal server error"
    });
    return true
  }
  return false
};

export const initDB = (path: string) => {
  db = new sqlite3.Database(path, (err) => {
    if (err) {
      console.log(err)
    }
  });
  db.serialize(function () {
    db.run("CREATE TABLE IF NOT EXISTS users (user_id TEXT PRIMARY KEY, username TEXT NOT NULL);")
    db.run("CREATE TABLE IF NOT EXISTS exercises (_id TEXT PRIMARY KEY, user_id TEXT, description TEXT NOT NULL, duration INTEGER NOT NULL, exercise_date TEXT,  FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE ON UPDATE CASCADE);")
  })
  return db;
}


export const getAllUsers = () => new Promise<User[]>((resolve, reject) => {
  db.all("SELECT * FROM users;", (err, row: User[]) => {
    if (err) {
      reject(err);
    } else {
      resolve(row);
    }
  })
});

export const getAllExercises = (userId: string) => new Promise<ExerciseResponse[]>(async (resolve, reject) => {
  if (await userExist(userId, 'user_id', reject, false))
    return;

  db.all("SELECT * FROM exercises WHERE user_id = ?;", userId, (err, rows: Exercise[]) => {
    if (err) {
      reject(err);
    } else {
      const formattedDate: ExerciseResponse[] = rows.map(({ duration, _id, exercise_date, description }) => ({ _id, duration, description, date: new Date(exercise_date) }))
      resolve(formattedDate);
    }
  })
});


export const addUser = (username: string) => {
  const id = uuidv4();
  return new Promise<User>(async (resolve, reject) => {
    if (await userExist(username, "username", reject, true))
      return
    db.run('INSERT INTO users (user_id, username) VALUES (?,?)', id, username, function (err: Error) {
      if (err) {
        reject(err)
      } else {
        resolve({ _id: id, username })
      }
    })

  })
}

export const addExercise = (userId: string, description: string, duration: number, excercise_date: Date) => {
  const _id = uuidv4();
  return new Promise<ExerciseResponse>(async (resolve, reject) => {
    if (await userExist(userId, "user_id", reject, false))
      return

    db.run(
      'INSERT INTO exercises (_id, user_id, description, duration, exercise_date) VALUES (?,?,?,?,?)',
      _id, userId, description, duration, excercise_date.toISOString(),
      function (err: Error) {
        if (err) {
          reject(err)
        } else {
          console.log(excercise_date.toISOString())
          resolve({ _id: userId, description, duration, date: excercise_date })
        }
      })
  })
}
const getUserByParam = (value: string, param: keyof DBUser) => {
  return new Promise<User>((resolve, reject) => {
    db.get(
      `SELECT user_id, username FROM users WHERE ${param} = ?;`,
      value,
      function (err: Error, row: DBUser) {
        if (err) {
          reject(err)
        }
        resolve({ _id: row?.user_id, username: row?.username })

      })
  })
}

export const getUserById = (user_id: string) => getUserByParam(user_id, "user_id");

export const getLogs = (userId: string, from?: Date, to?: Date) => new Promise<Partial<Exercise>[]>(async (resolve, reject) => {
  if (await userExist(userId, 'user_id', reject, false))
    return
  const query = "SELECT exercises.description, exercises.duration, exercises.exercise_date FROM users INNER JOIN exercises ON users.user_id = exercises.user_id WHERE users.user_id = ?";
  const fromDateQuery = from ? `AND DATE(exercises.exercise_date) >= ?` : "";
  const toDateQuery = to ? `AND DATE(exercises.exercise_date) <= ?` : "";
  const args = [userId, from?.toISOString(), to?.toISOString()].filter(param => param)
  db.all(`${query} ${fromDateQuery} ${toDateQuery}`, ...args, (err: Error, rows: Partial<Exercise>[]) => {
    if (err) {
      reject(err);
    } else {
      resolve(rows);
    }
  })
});
