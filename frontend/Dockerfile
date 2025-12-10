FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

RUN npm install

# Copy source code
COPY . .

# Build arguments for Next.js public env vars
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL

# Set them as env vars during build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

# Build the app
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]