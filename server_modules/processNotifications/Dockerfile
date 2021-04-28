FROM node:alpine

# set working directory
WORKDIR /app

# install npm dependencies
COPY package.json ./
COPY package-lock.json ./
RUN npm install --silent

# add app
COPY . ./

# expose ports
EXPOSE 3000

# start app
CMD ["npm", "start"]