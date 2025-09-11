Face Attend Server

Node.js + Express + MongoDB (Mongoose) server with JWT auth. TypeScript, MVC.

Setup

1. Copy `.env.example` to `.env` and adjust values:

```
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/face-attend
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
```

2. Install dependencies

```
npm install
```

3. Run in development

```
npm run dev
```

4. Build and start

```
npm run build
npm start
```

API

- POST `/api/auth/register` body: `{ name, username, password }`
- POST `/api/auth/login` body: `{ username, password }`

Response includes `user` and `token`.

Health Check

- GET `/health` -> `{ status: 'ok' }`


