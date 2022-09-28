const express=require("express");
const routerProducto=require("./src/routes/routes.js")
const{Server:http}=require ("http");
const {Server:ioServer}=require ("socket.io");
const {saveMsjs, getMsjs}=require ("./src/controllers/mensajes.js");
const cookieParser=require("cookie-parser")
const session =require("express-session")
const MongoStore=require("connect-mongo")

//==================
const LocalStrategy = require('passport-local').Strategy;
const passport = require("passport");
const { comparePassword, hashPassword } = require("./utils")
const User=require("./src/schema/schemaUser.js")

const { Types } = require("mongoose");
//==================

const app = express();
const httpserver = http(app)
const io = new ioServer(httpserver)

// app.use(express.static('public'));
app.use("/public", express.static('./public/'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/', routerProducto);

app.use(cookieParser());
// app.use(session({
//     store: MongoStore.create({ mongoUrl: 'mongodb+srv://cristian:Roma2022@cluster0.lohlj66.mongodb.net/ecommerce?retryWrites=true&w=majority' }),
//     secret: 'TanatosAlado',
//     resave: true,
//     saveUninitialized: true,
//     cookie: {
//         maxAge: 60 * 10000
//     }
// }));

app.use(session({
    secret: 'TanatosAlado',
    resave: false,
    saveUninitialized: true,
    store: new MongoStore({
      mongoUrl: 'mongodb+srv://cristian:Roma2022@cluster0.lohlj66.mongodb.net/ecommerce?retryWrites=true&w=majority',
      retries: 0,
      ttl: 10 * 60 , // 10 min
    }),
  })
);

//============

app.use(passport.initialize());
app.use(passport.session());


passport.use("login", new LocalStrategy(async (username, password, done) => {
    const user = await User.findOne({ username });
    const passHash = user.password;
     if (!user || !comparePassword(password, passHash)) {
       return done(null, null, { message: "Usuario o contraseña incorrecto" });
     }
    return done(null, user);
  }));


passport.use("signup", new LocalStrategy({
    passReqToCallback: true
  }, async (req, username, password, done) => {
    const user = await User.findOne({ username });
    if (user) {
     return done(new Error("El usuario ya existe!"),
     null);
    }
    const address = req.body.address;
    const hashedPassword = hashPassword(password);
    const newUser = new User({ username, password: hashedPassword , address });
    await newUser.save();
    return done(null, newUser);
  }));
  
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  
  passport.deserializeUser(async (id, done) => {
    id = Types.ObjectId(id);
    const user = await User.findById(id);
    done(null, user);
  });

//RECUPERO EL NOMBRE YA EN SESION INICIADA
app.get('/loginEnv', (req, res) => {
    process.env.USER=req.user.address;
    const user = process.env.USER;
    
    res.send({
        user
    })
  })
  
  //RECUPERO EL NOMBRE YA EN SESION INICIADA
  app.get('/getUserNameEnv', (req, res) => {
    const user = process.env.USER;
      res.send({
        user
    })
  })
//============

app.get("/", (req,res)=>{

    try{
        if (req.session.user){
           res.sendFile(__dirname + ('/public/index.html'))
        }
        else
        {
            res.sendFile(__dirname + ('/views/login.html'))
        }
    }
    catch (error){
     console.log(error)
    }

})

// DEFINO EL NOMBRE DE USUARIO DE LA SESSION

app.post('/setUserName', (req, res) => {
    req.session.user = req.body.user;
    process.env.USER=req.body.user;
    const usuario=process.env.USER;
    res.redirect('/');
})



//TOMO EL USERNAME POR SESSION

app.get("/getUserName",(req,res)=>{
    try{
        if (req.session.user){
            const user=process.env.USER;
            res.send({
                user,
                
            })
        }
        else
        res.send({
            username:"no existe el usuario"
        })
    }
    catch(error){
        console.log(error)
    }
})

//RECUPERO EL NOMBRE YA EN SESION INICIADA
app.get('/getUserNameEnv', (req, res) => {
    const user = process.env.USER;
    res.send({
        user
    })
})


io.on('connection', async (socket) => {
    console.log('Usuario conectado');
    socket.on('enviarMensaje', (msj) => {
        saveMsjs(msj);
    })

    socket.emit ('mensajes', await getMsjs());
})

// DESLOGUEO DE USUARIO

app.get('/logout', (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log(err);
            } else {
                res.redirect('/logout');
            }
        })
    } catch (err) {
        console.log(err);
    }
})
app.get('/logoutMsj', (req, res) => {
    try {
        res.sendFile(__dirname + '/views/logout.html');
    }
    catch (err) {
        console.log(err);
    }
})


// ==============
app.get("/login", (req, res) => {
    const user=req.session.user;
    res.sendFile(__dirname + "/views/login.html");
  });

  app.get("/signup", (req, res) => {
    res.sendFile(__dirname + "/views/signup.html");
  });

  app.get("/loginFail", (req, res) => {
    res.sendFile(__dirname + "/views/loginFail.html");
  });

  app.get("/signupFail", (req, res) => {
    res.sendFile(__dirname + "/views/signupFail.html");
  });


  app.post("/signup", passport.authenticate("signup", {
    failureRedirect: "/signupFail",
  }) , (req, res) => {  
    req.session.user = req.user;
    res.redirect("/login");
  });
  
  app.post("/login", passport.authenticate("login", {
    failureRedirect: "/loginFail",
  }) ,(req, res) => {
      req.session.user = req.user;
      res.redirect('/');
  });
// ==============



const PORT = process.env.PORT || 8080;

const server = httpserver.listen(PORT, () => {
    console.log(`Server is running on port: ${server.address().port}`);
});
server.on('error', error => console.log(`error running server: ${error}`));

