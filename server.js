const express=require("express");
const routerProducto=require("./src/routes/routes.js")
const{Server:http}=require ("http");
const {Server:ioServer}=require ("socket.io");
const {saveMsjs, getMsjs}=require ("./src/controllers/mensajes.js");
const cookieParser=require("cookie-parser")
const session =require("express-session")
const MongoStore=require("connect-mongo")

const app = express();
const httpserver = http(app)
const io = new ioServer(httpserver)

// app.use(express.static('public'));
app.use("/public", express.static('./public/'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// //defino __dirname para poder usar la carpeta public
// const path=require('path');
// const { fileURLToPath }=require('url');
// // __filename = fileURLToPath(import.meta.url);
// // const __dirname = path.dirname(__filename);

app.use('/api/', routerProducto);

app.use(cookieParser());
app.use(session({
    store: MongoStore.create({ mongoUrl: 'mongodb+srv://cristian:Roma2022@cluster0.lohlj66.mongodb.net/ecommerce?retryWrites=true&w=majority' }),
    secret: 'TanatosAlado',
    resave: true,
    saveUninitialized: true,
    cookie: {
        maxAge: 60 * 10000
    }
}));



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



const PORT = process.env.PORT || 8080;

const server = httpserver.listen(PORT, () => {
    console.log(`Server is running on port: ${server.address().port}`);
});
server.on('error', error => console.log(`error running server: ${error}`));

