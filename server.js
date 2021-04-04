const User = require('./User.js');
const Message = require('./Message.js');

const http = require('http');
const Koa = require('koa');
const Router = require('koa-router');
const WS = require('ws');
const app = new Koa();

const usersArr = [
  // new User('abc'),
  // new User('zyx'),
];

const messages = [
  new Message('Admin', 'Chat server started', new Date()),
  // new Message(usersArr[1].name, 'From dummy lorem ipsum I hear that', new Date()),
];

// cors
app.use(async (ctx, next) => {
  const origin = ctx.request.get('Origin');
  if (!origin) {
    return await next();
  }
  
  const headers = { 'Access-Control-Allow-Origin': '*', };
  if (ctx.request.method !== 'OPTIONS') {
    ctx.response.set({...headers});
    try {
      return await next();
    } catch (e) {
      e.headers = {...e.headers, ...headers};
      throw e;
    }
  }

  if (ctx.request.get('Access-Control-Request-Method')) {
    ctx.response.set({
      ...headers,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH',
    });
    if (ctx.request.get('Access-Control-Request-Headers')) {
      ctx.response.set('Access-Control-Allow-Headers', ctx.request.get('Access-Control-Request-Headers'));
    }
    ctx.response.status = 204;
  }
});

const router = new Router();

router.get('/index', async (ctx) => {
  ctx.response.body = 'hello';
});

app.use(router.routes()).use(router.allowedMethods());

const port = process.env.PORT || 7070;
const server = http.createServer(app.callback()).listen(port);
const wsServer = new WS.Server({ server }, CLIENTS = []);

wsServer.on('connection', (ws, req) => {
  ws.on('close', function close() {
    const ind = CLIENTS.findIndex((elem) => elem === ws);
    usersArr.splice(ind, 1);
    CLIENTS.splice(ind, 1);
    // console.log('disconnected user #', ind);
    // console.log(usersArr);
    console.log('close', CLIENTS.length);
  });

  ws.on('message', (msg) => {
    const request = JSON.parse(msg);
    let response;

    if (request.login) {
      const userLogged = usersArr.some((user) => user.name === request.login);
      if (userLogged) response = false;
      else {
        CLIENTS.push(ws);
        const userId = CLIENTS.findIndex((elem) => elem === ws);
        usersArr.push(new User(request.login, userId));

        response = usersArr;
      }
    } 
    else if (request.message) {
      const UserId = CLIENTS.findIndex((elem) => elem === ws);
      messages.push(new Message(usersArr[UserId].name, request.message, new Date()));
      response = messages;
    } else if (request.messagesList) {
      response = messages;
    }
    [...wsServer.clients]
    .filter(o => o.readyState === WS.OPEN)
    .forEach(o => o.send(JSON.stringify(response)));
    console.log('message', CLIENTS.length);
  });
});