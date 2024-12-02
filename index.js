const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser')
const { ObjectId } = require('bson')

app.use(bodyParser.urlencoded({extended: false}))
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const userList = []
const userdb = new Map()

function checkUserExisting(id) {
  return userList.find(user => user['_id'] === id)
}

function formatExerciseResponse(user, exercise) {
  return {
    _id: user._id,
    username: user.username, 
    ...exercise
  }
}

// POST + GET method for username form 
app.post("/api/users", (req, res) => {
  const { username } = req.body

  if (!username) return res.status(400).send({error: "Username is required!!!"})

  for (const [id, name] of userdb.entries()) {
    if (name === username) return res.send({username: name, _id: id})
  }
  const userObj = {}
  const newId = new ObjectId().toString()
  userdb.set(newId, username)

  userObj._id = newId
  userObj.username = username
  userObj.count = 0 
  userObj.log = []

  userList.push(userObj)
  res.send({username: username, _id: newId})
})

app.get("/api/users", (req, res) => {
  res.send(userList.map(user => {return {_id: user['_id'], username:user['username']}}))
})

// POST method for adding exercise form
app.post("/api/users/:_id/exercises", (req, res) => {
  const id = req.params._id
  const { description, duration, date } = req.body
  if (!description || !duration) return res.status(400).send({error: "Description and duration are required!!!"})

  const user = checkUserExisting(id)

  if (user) {
    // Handle date data:  turn into String or now time (if none)
    const formattedDate = date ? new Date(date).toDateString() : new Date().toDateString()

    user['count'] += 1
    const exercise = {
      description: description, 
      duration: parseInt(duration), 
      date: formattedDate
    }
    user['log'].push(exercise)

    return res.send(formatExerciseResponse(user, exercise))
  } else {
    return res.status(404).send({ error: "User not found" })
  }
})

// GET method to retrieve all exercise with specialize id
app.get("/api/users/:_id/logs?",(req, res) => {
  const id = req.params._id
  const user = checkUserExisting(id)

  const startTime = req.query.from ? new Date(req.query.from) : null
  const endTime = req.query.to ? new Date(req.query.to) : null
  const numOfLog = req.query.limit ? parseInt(req.query.limit, 10) : null

  if (!startTime && !endTime && !numOfLog) {
    return res.send(user)
  }

  const filteredLog = user.log.filter(exercise => {
    const filteredDate = new Date(exercise.date)
    return (!startTime || filteredDate >= startTime) && (!endTime || filteredDate <= endTime)
  })

  const limit = numOfLog ? filteredLog.slice(0,numOfLog) : filteredLog
  return res.send({
    _id: id,
    username: user.username,
    from: startTime,
    to: endTime,
    count: limit.length,
    log: limit
  })
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
