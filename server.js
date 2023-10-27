const express = require("express");
const app = express();
const port = process.env.PORT || 3000;
const cors = require("cors");
require("dotenv").config();
const mysql = require("mysql2");
const session = require("express-session");
const jsonwebtoken = require("jsonwebtoken");
const qrcode = require("qr-image");
const SECRET = "bffmovimento";
let USER_ID = 0; //remover MOCK
const URLADMIN = "http://localhost:4300";

app.use(
  session({
    secret: "segredo", // Uma chave secreta para assinar as sessões (deve ser mantida em segredo)
    resave: false, // Evita que as sessões sejam salvas novamente no servidor
    saveUninitialized: true, // Permite que as sessões sejam salvas para visitantes não autenticados
  })
);

// Configure o middleware CORS
app.use(cors());

// Middleware para interceptar todas as requisições
function verifyJWT(req, res, next) {
  const token = req.headers["authorization"];
  jsonwebtoken.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).end();
    USER_ID = decoded.idUser;
    next();
  });
}

console.log("process.env.TESTE", process.env.TEST);

connectDB();

// Middleware para o parsing de JSON no corpo das requisições
app.use(express.json());

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor está rodando na porta ${port}`);
});
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
// Rota GET
app.get("/getInfoUser", verifyJWT, (req, res) => {
  getInfoUser(req, res);
});

// Rota GET
app.get("/resetDB", (req, res) => {
  resetDB(req, res);
});

app.get("/login", (req, res) => {
  validateLogin(req, res);
});

app.get("/validateCode", verifyJWT, (req, res) => {
  validateCode(req, res);
});

app.get("/sendSMS", (req, res) => {
  sendSMS(req, res);
});

app.get("/getConfigGame", verifyJWT, (req, res) => {
  getConfigGame(req, res);
});

app.get("/validateItemGame", verifyJWT, (req, res) => {
  validateItemGame(req, res);
});

app.get("/getQRcode", verifyJWT, (req, res) => {
  getQRcode(req, res);
});

app.get("/getConfigApp", (req, res) => {
  getConfigApp(req, res);
});

// Rota POST

app.post("/toggleItem", (req, res) => {
  toggleItem(req, res);
});

app.post("/validateQrCode", (req, res) => {
  validateQrCode(req, res);
});

app.post("/addFriendCode", async (req, res) => {
  const { idUser } = req.body;
  if (!idUser) {
    return res.json({ message: "idUser nao informado" });
  }
  await queryDB(
    `INSERT INTO games (idUser, statusGame, itemGame) VALUES ('${idUser}', 'open', '1')`
  );
  res.json({ message: "ok" });
});

// functions
async function getInfoUser(req, res) {
  res.json({ USER_ID });
}

async function resetDB(req, res) {
  await queryDB(`DELETE from users`);
  await queryDB(`DELETE from games`);
  res.json({ message: "DB CLEAN" });
}

async function validateQrCode(req, res) {
  console.log("validateQrCode");
  console.log(req.body);
  const { code, password } = req.body;

  if (!code) {
    return res.status(400).json({ message: "Erro code" });
  }
  if (!password) {
    return res.status(400).json({ message: "Password não informado" });
  }

  const resultDBAdmin = await queryDB(
    `SELECT idadmin FROM admin WHERE adminPass = '${password}'`
  );

  if (!resultDBAdmin.length) {
    res.status(401).json({ message: "Admin não encontrado!" });
    return;
  }

  const resultDBgame = await queryDB(
    `SELECT idGame, ticketStatus FROM games WHERE idGame = '${code}' AND statusGame = 'win'`
  );
  console.log(resultDBgame[0]);
  if (resultDBgame.length) {
    if (resultDBgame[0].ticketStatus == "used") {
      return res.status(400).json({ message: "Ticket já validado!" });
    }
    await queryDB(
      `UPDATE games SET ticketStatus = 'used' WHERE idGame = '${code}'`
    );
    res.json({ message: "Ticket validado com sucesso!" });

    return;
  }

  res.status(400).json({ message: "Ticket não encontrado!" });
}

const linkMap = "https://maps.app.goo.gl/8XxbJinGfXbWdPJK7";
const titleBrind = "Espetinho completo";
const statusGame = true;
async function getConfigApp(req, res) {
  const usersWIN = await queryDB("SELECT name, description FROM userswin");

  const response = { usersWIN, linkMap, titleBrind, statusGame };
  res.json(response);
}

async function getQRcode(req, res) {
  const idUser = USER_ID;
  const resultDBgame = await queryDB(
    `SELECT idGame, stateItem FROM games WHERE idUser = '${idUser}' AND statusGame = 'win' AND ticketStatus = 'not-used'`
  );

  console.log("getQRcode", "USER_ID:", USER_ID);
  if (resultDBgame.length) {
    const idGame = resultDBgame[0].idGame;
    const stateItem = resultDBgame[0].stateItem;
    const codeQrcode = `${URLADMIN}/?code=${idGame}`;
    const type = "svg";
    const code = qrcode.imageSync(codeQrcode, { type: type });

    await queryDB(
      `UPDATE games SET stateItem = '0' WHERE idGame = '${resultDBgame[0].idGame}'`
    );

    res.json({ message: "Ticket do jogo ganho", svg: code, stateItem });
    return;
  }
  console.warn("[não tem jogo ganho]");
  res.status(400).json({ message: "Você não tem jogo ganho" });
}

async function getConfigGame(req, res) {
  const idUser = USER_ID;
  const qntGames = await queryDB(
    `SELECT COUNT(*) FROM games WHERE idUser = '${idUser}' AND statusGame = 'open'`
  );
  const chance = qntGames[0]["COUNT(*)"];

  if (chance) {
    const itemGameDB = await queryDB(
      `SELECT idItemsGame, name FROM items_game`
    );
    const itemsGame = itemGameDB;
    const response = { itemsGame, chance };
    res.status(200).json(response);
  } else {
    let codeFriend = await queryDB(
      `SELECT codeFriend FROM users WHERE idUser = '${idUser}'`
    );

    // Se nao tiver código amigo gera um novo
    if (!codeFriend[0].codeFriend) {
      codeFriend = `movimento${idUser}${generateNumberItem(100)}`;
      await queryDB(
        `UPDATE users SET codeFriend = '${codeFriend}' WHERE idUser = '${idUser}'`
      );
    }

    res.status(400).json({
      us: USER_ID,
      message: "Você não possui mais chances para jogar",
      codeFriend: codeFriend[0].codeFriend,
    });
  }
}

function generateNumberItem(qntNumber) {
  // Gera número aleatório entre 1 e 4
  return Math.floor(Math.random() * qntNumber) + 1;
}

async function validateItemGame(req, res) {
  // Verifica se o usuário acertou o tem premiado
  let itemWIN = 0;
  const { id } = req.query;
  const idUser = USER_ID;

  // Verifica na base qual o numero do item premiado
  itemWIN = await queryDB(
    `SELECT idGame, itemGame FROM games WHERE idUser = '${idUser}' AND statusGame = 'open' LIMIT 1; `
  );

  // Verifica se o usuario inseriu o valor do item premiado
  try {
    if (parseInt(itemWIN[0].itemGame) == parseInt(id)) {
      //Usuario ganhou
      queryDB(
        `UPDATE games SET statusGame = 'win' , ticketStatus = 'not-used' WHERE idUser = '${idUser}' AND idGame = '${itemWIN[0].idGame}'`
      );
      const userDB = await queryDB(
        `SELECT name FROM users WHERE idUser = '${idUser}'`
      );
      const titleBrindLowerCase = titleBrind.toLocaleLowerCase();
      await queryDB(
        `INSERT INTO userswin (name, userId, description) VALUES ('${userDB[0].name}', '${idUser}', '${titleBrindLowerCase}')`
      );
      res.json();
    } else {
      //Usuario ganhou perdeu
      await queryDB(
        `UPDATE games SET statusGame = 'defeat' WHERE idUser = '${idUser}' AND idGame = '${itemWIN[0].idGame}'`
      );
      res.status(400).json({
        message: "Nao foi dessa vez",
        codeFriend: codeFriend,
        itemGame: itemWIN[0].itemGame,
        itemWIN,
      });
    }
  } catch (err) {
    //Usuario ganhou perdeu

    const codeFriend = await queryDB(
      `SELECT codeFriend FROM users WHERE idUser = '${idUser}'`
    );
    res.status(400).json({
      message: "Você não possui mais chances para jogar",
      itemGame: itemWIN[0].itemGame,
      codeFriend: codeFriend[0].codeFriend,
    });
  }
}

function sendSMS(req, res) {
  console.log(req.query);

  res.json({ message: "SMS enviado para o telfone (74)9.8842-0307" });
}

async function validateCode(req, res) {
  const { code, codeFriend } = req.query;
  const idUser = USER_ID;
  let resultFriendCpdeDB = [];
  if (!code) {
    return res.status(400).json({ message: "Código não informado" });
  }

  if (!idUser) {
    return res.status(400).json({ message: "Erro phoneSession" });
  }

  // Consulta código do usuario na base
  const resultDB = await queryDB(
    `SELECT smsCode FROM users WHERE idUser = '${idUser}'`
  );

  // Consulta código do amigo
  if (codeFriend) {
    resultFriendCpdeDB[0] = { idUser: 0 };
    resultFriendCpdeDB = await queryDB(
      `SELECT idUser FROM users WHERE codeFriend = '${codeFriend}'`
    );
  }

  // Verifica se o código de o usuário informou é igual ao que esta salvo na base
  // console.log('// Verifica se o código de o usuário informou é igual ao que esta salvo na base', resultDB[0].smsCode, parseInt(code))
  if (parseInt(resultDB[0].smsCode) == parseInt(code)) {
    if (codeFriend) {
      console.log("codeFriend", resultFriendCpdeDB);
      if (resultFriendCpdeDB[0]?.idUser) {
        console.log(resultFriendCpdeDB);
        console.log(
          "adiciona partida para outro jogador",
          resultFriendCpdeDB[0]?.idUser
        );
        //Adicionar partida para outro player
        const itemGame = 1; // generateNumberItem(4);
        await queryDB(
          `INSERT INTO games (idUser, statusGame, itemGame) VALUES ('${resultFriendCpdeDB[0].idUser}', 'open', '${itemGame}')`
        );
      } else {
        return res.status(400).json({ message: "Código amigo inválido" });
      }
    }

    await queryDB(
      `UPDATE users SET smsStatus = 'confirmed', smsCode = '${resultDB[0].smsCode}-used' WHERE idUser = '${idUser}'`
    );

    //Verifica se o usuario tem alguma partida ja criada,
    //Se tiver nao cria outra
    const resultDBgames = await queryDB(
      `SELECT idGame FROM games WHERE idUser = '${idUser}'`
    );

    if (!resultDBgames.length) {
      console.warn("Cadastrar partida");
      const itemGame = 1; //generateNumberItem(4);
      queryDB(
        `INSERT INTO games (idUser, statusGame, itemGame) VALUES ('${idUser}', 'open', '${itemGame}')`
      );
      // Adiviona código amigo para o usuario logado
      const codeFriend = `movimento${idUser}${generateNumberItem(100)}`;
      await queryDB(
        `UPDATE users SET codeFriend = '${codeFriend}' WHERE idUser = '${idUser}'`
      );
    }

    res.json();
  } else {
    console.log("resultDB[0].smsCode", resultDB[0].smsCode);
    return res.status(400).json({ message: "Código inválido" });
  }
}

function contemApenasLetrasEEspacos(str) {
  // Usamos uma expressão regular que verifica se a string contém apenas letras maiúsculas, minúsculas e espaços.
  return /^[A-Za-z\s]+$/.test(str);
}

async function validateLogin(req, res) {
  const name = req.query.name;
  const phone = req.query.phone;
  const padrao = /^[a-zA-Z]+$/;

  if (!name) {
    return res.status(400).json({ message: "Informe o nome" });
  }

  if (name && !contemApenasLetrasEEspacos(name)) {
    return res.status(400).json({ message: "O nome só poder conter letras" });
  }

  if (!phone) {
    return res.status(400).json({ message: "Informe o telefone" });
  }

  const resultDB = await queryDB(
    `SELECT name, idUser, smsStatus FROM users WHERE phone = '${phone}'`
  );

  if (resultDB.length) {
    /**
     * OUtros acessos
     */
    let statusUser = 1;
    const token = jsonwebtoken.sign({ idUser: resultDB[0].idUser }, SECRET, {
      expiresIn: 900,
    });
    if (resultDB[0].smsStatus == "notconfirmed") {
      statusUser = 3;
    }

    // Verifica se o usuario tem algum jogo ganho para resgatar
    const resultDBgames = await queryDB(
      `SELECT idGame FROM games WHERE idUser = '${resultDB[0].idUser}' AND statusGame = 'win' AND ticketStatus <> 'used'`
    );
    if (resultDBgames.length && resultDBgames[0].statusGame != "used") {
      //USuario tem jogo ganho
      statusUser = 4;
    }

    res.json({ message: "Usuário já cadastrado", status: statusUser, token });
  } else {
    /**
     * Primeiro acesso
     */
    console.log("Cadastro nao existe");
    const smsCode = 1234; //generateSMStoken();
    console.log("codSMS:", smsCode);
    const resAddDB = await queryDB(
      `INSERT INTO users (name, phone, smsCode, smsStatus) VALUES ('${name}', '${phone}', ${smsCode}, 'notconfirmed')`
    );
    const idUser = await queryDB(
      `SELECT idUser FROM users WHERE phone = '${phone}'`
    );
    const token = jsonwebtoken.sign({ idUser: idUser[0].idUser }, SECRET, {
      expiresIn: 900,
    });
    res.json({ message: "Usuário não cadastrado", status: 2, token });
  }
}

function generateSMStoken() {
  const min = 1000; // Menor valor de 4 dígitos (1000)
  const max = 9999; // Maior valor de 4 dígitos (9999)
  const randomCode = Math.floor(Math.random() * (max - min + 1)) + min;
  return randomCode;
}

// function connectDB() {
//   // Estabelecer a conexão
//   connection.connect((err) => {
//     if (err) {
//       console.error("Erro ao conectar ao banco de dados:", err);
//       return;
//     }
//     console.log("Conexão ao banco de dados MySQL estabelecida com sucesso.");
//   });
// }

function connectDB() {
  // connection.connect((err) => {
  //   if (err) {
  //     console.error("Erro ao conectar ao banco de dados:", err);
  //   } else {
  //     console.log("Conexão ao banco de dados MySQL estabelecida com sucesso.");
  //   }
  // });
}

async function queryDB(sql) {
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, rows, fields) => {
      if (err) {
        console.error("Erro na consulta:", err);
        reject(err);
      } else {
        // console.log(rows);
        resolve(rows);
      }
    });
  });
}

handleDisconnect();
var connection;

function handleDisconnect() {
  // Recreate the connection, since
  // the old one cannot be reused.
  connection = mysql.createConnection({
    host: process.env.HOST, // Host do banco de dados
    user: process.env.USER, // Nome de usuário do banco de dados
    password: process.env.PASSWORD, // Senha do banco de dados
    database: process.env.DATABASE, // Nome do banco de dados
  });
  connection.connect(function (err) {
    // The server is either down
    if (err) {
      // or restarting (takes a while sometimes).
      console.log("error when connecting to db:", err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    } // to avoid a hot loop, and to allow our node script to
  }); // process asynchronous requests in the meantime.
  // If you're also serving http, display a 503 error.
  console.log('Banco de dados = OK')
  connection.on("error", function (err) {
    console.log("db error", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      // Connection to the MySQL server is usually
      handleDisconnect(); // lost due to either server restart, or a
    } else {
      // connnection idle timeout (the wait_timeout
      throw err; // server variable configures this)
    }
  });
}
