import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import ParseDashboard from 'parse-dashboard';
import { logger, ParseServer } from 'parse-server';

import { classNames } from './config/live-query';

let serverURL;
let cloudPath;
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
  serverURL = `${process.env.HOST}:${process.env.PORT}${process.env.PARSE_MOUNT}`;
  cloudPath = `${__dirname}/cloud/index.ts`;
} else {
  serverURL = `${process.env.HOST}${process.env.PARSE_MOUNT}`;
  cloudPath = `${__dirname}/cloud/index.js`;
}

const app = express();

app.use(
  process.env.PARSE_MOUNT,
  new ParseServer({
    databaseURI: process.env.MONGODB_URI,
    cloud: cloudPath,
    appId: process.env.APP_ID,
    masterKey: process.env.MASTER_KEY,
    restAPIKey: process.env.REST_API_KEY,
    javascriptKey: process.env.JAVASCRIPT_KEY,
    serverURL,
    liveQuery: { classNames },
    verifyUserEmails: true,
    emailVerifyTokenValidityDuration: 24 * 60 * 60,
    preventLoginWithUnverifiedEmail: true,
    publicServerURL: serverURL,
    appName: process.env.APP_NAME,
    emailAdapter: {
      module: '@parse/simple-mailgun-adapter',
      options: {
        fromAddress: process.env.MAILGUN_FROM,
        domain: process.env.MAILGUN_DOMAIN,
        apiKey: process.env.MAILGUN_API_KEY,
      },
    },
    accountLockout: {
      duration: 10,
      threshold: 5,
    },
    passwordPolicy: {
      validatorPattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{8,})/,
      validationError: 'Password must contains at least 8 char with at least 1 lower case, 1 upper case and 1 digit',
      doNotAllowUsername: true,
      resetTokenValidityDuration: 24 * 60 * 60,
    },
  }),
);

app.use(
  process.env.PARSE_DASHBOARD_MOUNT,
  new ParseDashboard({
    apps: [
      {
        appName: process.env.APP_NAME,
        appId: process.env.APP_ID,
        masterKey: process.env.MASTER_KEY,
        serverURL,
      },
    ],
    users: [
      {
        user: process.env.PARSE_DASHBOARD_ADMIN,
        pass: process.env.PARSE_DASHBOARD_PASSWORD,
        apps: [{ appId: process.env.APP_ID }],
      },
    ],
    trustProxy: 1,
  }),
);

const httpServer = http.createServer(app);
httpServer.listen(process.env.PORT, () => {
  logger.info(`Server running on port ${process.env.HOST}:${process.env.PORT}`);
});

if (classNames.length > 0) {
  ParseServer.createLiveQueryServer(httpServer);
}
