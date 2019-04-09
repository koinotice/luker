# parse-server-boilerplate

### For Local Development

- Install mongo locally using http://docs.mongodb.org/master/tutorial/install-mongodb-on-os-x/
- Run `mongod` to start your database

- Clone this repo and change directory to it.
- Run `cp .env.example .env` and change your environment variables in the .env file
- Run `npm install`
- Run the test : `npm run test`, `npm run test:cov` or `npm run test:watch`
- Run prettier : `npm run format`
- Run tslint : `npm run tslint`
- Run the server with: `npm run start:dev`

### For Production

- Put your production environment variables in your host configuration
- Run `npm install`
- Run the server with: `npm run start`
