const express = require('express')
const mongoose = require("mongoose");
const cors = require('cors')
const User = require('./models/User')
const Post = require('./models/Post')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express()
const cookieParser = require('cookie-parser')
// const { default: mongoose } = require('mongoose')
const multer  = require('multer')
const uploadMiddleware = multer({ dest: 'uploads/' });
const fs = require('fs')
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const salt = bcrypt.genSaltSync(10);
const secret = 'asdfe45we45w345wegw345werjktjwertkj';





app.use(cors({origin:['http://localhost:3000','https://mern-stack-chbit-app.onrendre.com','https://mern-forntend.vercel.app'],credentials:false}));
app.use(express.json())
app.use(cookieParser())
app.use('/uploads', express.static(__dirname + '/uploads'));
mongoose.connect('mongodb+srv://hamzachbit7:12345@cluster0.hj8r9xz.mongodb.net/Blog?retryWrites=true&w=majority')

app.post('/api/register', async (req,res)=>{
    const {
      username,
      password
    } = req.body
  try {
    const UserDocs =   await User.create({
      username,
    password:bcrypt.hashSync(password,salt)
    })
 res.json(UserDocs)

  } catch (error) {
    res.status(400).json(error.message)
  }
})

app.post('/api/login', async (req,res) => {
  const {username,password} = req.body;
  const userDoc = await User.findOne({username});
  const passOk = bcrypt.compareSync(password, userDoc.password);
  if (passOk) {
    
    jwt.sign({username,id:userDoc._id}, secret, {}, (err,token) => {
      if (err) throw err;
      res.cookie('token', token).json({
        id:userDoc._id,
        username,
      });
    });
  } else {
    res.status(400).json('wrong credentials');
  }
});

app.get('/api/profile', (req,res) => {
  const {token} = req.cookies;
  jwt.verify(token, secret, {}, (err,info) => {
    if (err) throw err;
    res.json(info);
  });
});
app.post('/logout',(req,res)=>{
  res.cookie('token','').json('ok')
})

app.post('/api/post', uploadMiddleware.single('file'), async (req,res) => {
  const {originalname,path} = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path+'.'+ext;
  fs.renameSync(path, newPath);

  const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {title,summary,content} = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover:newPath,
      author:info.id,
    });
    res.json(postDoc);
  });

});

app.put('/api/post',uploadMiddleware.single('file'), async (req,res) => {
  let newPath = null;
  if (req.file) {
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    newPath = path+'.'+ext;
    fs.renameSync(path, newPath);
  }

  const {token} = req.cookies;
  jwt.verify(token, secret, {}, async (err,info) => {
    if (err) throw err;
    const {id,title,summary,content} = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json('you are not the author');
    }
    await Post.updateOne({ _id: id }, { // Assuming 'id' is the post's _id
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });

    res.json(postDoc);
  });

});


app.get('/api/post', async (req,res) => {
  res.json(
    await Post.find().populate('author', ['username'])
    .sort({createdAt: -1})
    .limit(20)
      
  );
});

app.get('/api/post/:id', async (req,res)=>{
  const {id} = req.params
  const postDoc = await Post.findById(id).populate('author',['username'])
  res.json(postDoc)
})





app.listen(4000, () => {
    console.log(`Server is running on localhost:${4000}`);
  });

  
