FROM node as builder

ARG NODE_ENV=development
ENV NODE_ENV=${NODE_ENV}

ENV NPM_CONFIG_UNSAFE_PERM=true


COPY package*.json ./
RUN yarn


# The instructions for second stage
FROM node as pm2
RUN yarn global add pm2

FROM pm2
WORKDIR /app
COPY --from=builder node_modules node_modules

COPY . .

CMD yarn start
