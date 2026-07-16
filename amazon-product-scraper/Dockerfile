FROM mcr.microsoft.com/playwright:v1.46.0-jammy

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 8080

CMD ["npm", "start"]
