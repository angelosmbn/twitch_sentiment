FROM node:22

WORKDIR /app

# Copy only package.json first
COPY package*.json ./

# Clean install without host's node_modules or lockfile problems
RUN rm -rf node_modules package-lock.json && npm install

# Now copy the rest of the frontend code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
