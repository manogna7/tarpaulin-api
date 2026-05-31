# Use a current LTS Node.js image.
FROM node:20-alpine

# Create and change to the app directory.
WORKDIR /usr/src/app

RUN apk add --no-cache su-exec

# Copy application dependency manifests to the container image.
COPY package*.json ./

# Install production dependencies.
RUN npm ci --omit=dev

# Copy local code to the container image.
COPY . .

RUN mkdir -p /usr/src/app/uploads && chown -R node:node /usr/src/app

# Repair mounted upload volume permissions, then run the app as the node user.
CMD [ "sh", "-c", "mkdir -p /usr/src/app/uploads && chown -R node:node /usr/src/app/uploads && exec su-exec node node server.js" ]

# Expose the port the app runs on
EXPOSE 3000

