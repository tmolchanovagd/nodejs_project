import { AddressInfo } from 'net'
import express, { Request, Response } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';



import { addExercise, addUser, getAllUsers, getAllExercises, initDB, getLogs, getUserById } from './db';
import { isUsernameValid, validate } from './validators';
import { body, param } from 'express-validator';
require('dotenv').config()


initDB('./users_and_exercises.db')
const app = express()
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
app.use(cors())
app.use(express.static('public'))
app.get('/', (_req: any, res: any) => {
    res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (_req: Request, res: Response) => {
    try {
        const users = await getAllUsers()
        res.json(users)
    } catch (err) {
        res.json(err)
    }
})

app.post('/api/users',
    validate([body('username').custom(isUsernameValid).escape()]),
    async (req: Request, res: Response) => {
        try {
            const username = req.body.username;
            const result = await addUser(username)
            res.json({ _id: result._id, username: result.username })
        } catch (err) {
            res.json(err);
        }
    })

app.post(
    '/api/users/:id/exercises',
    validate([
        param('id').exists({ checkFalsy: true }).isUUID().withMessage("Invalid ID"),
        body('date').optional({values:'falsy'}).isDate({ format: 'yyyy-mm-dd' }).withMessage('Date is invalid or has wrong format'),
        body('description').exists({ checkFalsy: true }).escape().withMessage('Description is required'),
        body('duration').exists({ checkFalsy: true }).isNumeric().withMessage('Invalid duration')
    ]),
    async (req: Request, res: Response) => {
        const id = req.params.id;
        let { description, duration, date } = req.body;
        const exerciseDate = date ? new Date(date) : new Date();
        try {
            const exercise = await addExercise(id, description, duration, exerciseDate)
            res.json({ ...exercise, date: exercise.date?.toDateString() })
        } catch (err) {
            res.json(err)
        }
    })

app.get(
    '/api/users/:id/exercises',
    validate([
        param('id').exists({ checkFalsy: true }).isUUID().withMessage("Invalid ID"),
    ]),
    async (req: Request, res: Response) => {
        const id = req.params.id;
        try {
            const exercises = await getAllExercises(id)
            const formattedExercises = exercises.map(exercise => ({ ...exercise, date: exercise.date?.toDateString() }))
            res.json(formattedExercises)
        } catch (err) {
            res.json(err)
        }
    })

app.get(
    '/api/users/:id/logs',
    validate([
        param('id').exists({ checkFalsy: true }).isUUID().withMessage("Invalid ID"),
        body('from').optional({values:'falsy'}).isDate({ format: 'yyyy-mm-dd' }).withMessage('Date is invalid or has wrong format'),
        body('to').optional({values:'falsy'}).isDate({ format: 'yyyy-mm-dd' }).withMessage('Date is invalid or has wrong format'),
        body('limit').optional().exists({ checkFalsy: true }).isNumeric().withMessage('Invalid limit')
    ]),
    async (req, res) => {
        const id = req.params.id;
        const dateFrom = req.query.from ? new Date(req.query.from as string) : undefined;
        const dateTo = req.query.to ? new Date(req.query.to as string) : undefined;
        const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
        const userData = await getUserById(id)
        const logs = await getLogs(id, dateFrom, dateTo, limit)
        res.json({
            ...userData,
            count: logs.length,
            logs
        })
    })


const listener = app.listen(process.env.PORT || 3000, () => {
    if (listener.address()) {
        console.log('Your app is listening on port ' + (listener.address() as AddressInfo).port)
    }
})
