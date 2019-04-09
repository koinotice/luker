// if (!process.env.docker) {
//     require('dotenv').config({
//         path: __dirname + '/.env'
//     });
// }

let express = require('express');
let ParseServer = require('parse-server').ParseServer;
let ParseDashboard = require('parse-dashboard');
let db = require('./database');
let app = express();
let parseArray = process.env.APP_IDS.split(',');
let dashboardArray = [];

console.log(process.env);
// Parse Server
parseArray.forEach(appId => {
  dashboardArray.push({
    serverURL: `/app/${appId}`,
    masterKey: process.env.PARSE_MASTER_KEY,
    appId: appId,
    appName: appId,
  });
  const parseSetting = {
    //serverURL: process.env.SERVER_URL,
    masterKey: process.env.PARSE_MASTER_KEY,
    javascriptKey: process.env.PARSE_CLIENT_KEY, //Add your master key here. Keep it secret!
    // clientKey: process.env.PARSE_CLIENT_KEY,
    // restAPIKey:process.env.PARSE_CLIENT_KEY,
    readOnlyMasterKey: process.env.PARSE_CLIENT_KEY,
    //allowClientClassCreation:false,
    appId: appId,
    databaseURI: db.buildConnectionUrl(process.env, appId),
    liveQuery: {
      classNames: ['Room', 'Order', 'Token', 'Block', 'Message'], // List of classes to support for query subscriptions
    },
    // enableAnonymousUsers:false,
    // requiresAuthentication:{
    //     classLevelPermissions:
    //         {
    //             "find": {
    //                 "requiresAuthentication": true,
    //                 "role:admin": true
    //             },
    //             "get": {
    //                 "requiresAuthentication": true,
    //                 "role:admin": true
    //             },
    //             "create": { "role:admin": true },
    //             "update": { "role:admin": true },
    //             "delete": { "role:admin": true },
    //         }
    // }
    // cloud: "./cloud/"+appId,
  };
  console.log(parseSetting);
  let parseApp = new ParseServer(parseSetting);

  // Serve the Parse apps on the /app URL prefix
  app.use(`/app/${appId}`, parseApp);
});

// Parse Dashboard
let dashboard = new ParseDashboard(
  {
    apps: dashboardArray,
    users: [
      {
        user: process.env.DASHBOARD_USERNAME,
        pass: process.env.DASHBOARD_PASSWORD,
      },
    ],
  },
  {
    allowInsecureHTTP: true,
  }
);

app.use('/dashboard/', dashboard);

// Parse Server plays nicely with the rest of your web routes
app.get('/', (req, res) => res.status(200).send('Welcome to Parse Server'));

let port = process.env.PARSE_PORT || 1337;
// app.listen(port, () => console.log(`Parse Server is running on port ${port}.`));

//const port = config('PORT')
const httpServer = require('http').createServer(app);
httpServer.listen(port, function() {
  console.log('Paraffin API Server is running on port ' + port + '.');
});

// This will enable the Live Query real-time server
ParseServer.createLiveQueryServer(httpServer);
