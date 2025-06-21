const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const multer = require("multer");
const path = require("path");


const app = express()
app.use(cors())
app.use(express.json())
app.use("/uploads",express.static('uploads'))

const db = new sqlite3.Database('./meds.db');

db.serialize(()=>{

 db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  )
`);


   db.run(`CREATE TABLE IF NOT EXISTS medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    name TEXT,
    dosage TEXT,
    frequency TEXT,
    taken INTEGER DEFAULT 0,
    photo TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`);

})


app.post("/api/signup", (req,res)=>{
    const {username,password,role} = req.body
    db.run(`INSERT INTO users (username,password,role) VALUES (?,?,?)` , [username,password,role] , function(err){
         if (err) return res.status(400).json({ error: 'Username already exists' });
      res.json({ id: this.lastID });
    })
})

app.post("/api/login" , (req,res)=>{
    const {username,password} = req.body 
     db.get(`SELECT * FROM users WHERE username = ? AND password = ?`,
    [username, password],
    (err, row) => {
      if (row) res.json(row);
      else res.status(401).json({ error: 'Invalid credentials' });
    });
})

const storage = multer.diskStorage({
    destination: "server/uploads",
    filename: (req,file,cb)=>cb(null,Date.now() + path.extname(file.originalname))
})

const upload = multer({storage})

app.post('/api/medications', upload.single('photo'), (req, res) => {
  const { userId, name, dosage, frequency } = req.body;
  const photo = req.file ? `/uploads/${req.file.filename}` : null;

  db.run(`INSERT INTO medications (userId, name, dosage, frequency, photo) VALUES (?, ?, ?, ?, ?)`,
    [userId, name, dosage, frequency, photo],
    function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ id: this.lastID });
    });
    console.log(userId)
});


app.get('/api/medications/:userId', (req, res) => {
  db.all(`SELECT * FROM medications WHERE userId = ?`,
    [req.params.userId],
    (err, rows) => {
      if (err) return res.status(400).json({ error: err.message });
      res.json(rows);
    });
});


app.patch('/api/medications/:id/toggle', (req, res) => {
  db.get(`SELECT taken FROM medications WHERE id = ?`, [req.params.id], (err, row) => {
    if (err || !row) return res.status(400).json({ error: 'Medication not found' });

    const newTaken = row.taken === 1 ? 0 : 1;

    db.run(`UPDATE medications SET taken = ? WHERE id = ?`, [newTaken, req.params.id], function (err) {
      if (err) return res.status(400).json({ error: err.message });
      res.json({ updated: this.changes, newTaken });
    });
  });
});



app.listen(5000, () => console.log('Server started on http://localhost:5000'));