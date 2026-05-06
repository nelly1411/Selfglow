# README

## Main commands for running the project from the `develop` branch 06.05.2026 


---

## 1. Use the current `develop` branch
If you don't have branch develop yet, create a new one:
```bash
git fetch origin
git switch -c develop origin/develop
```

If you have branch develop locally, update it:
```bash
git switch develop
git pull origin develop
git status
```



Start new work from `develop`:

```bash
git switch -c feature/your-task-name
```

---

## 2. Create local `.env`

Check if you have `.env` under `/backend`.
If not, create this file:

```bash
backend/.env
```

copy paste this into the .env file:

```env
DATABASE_URL="postgresql://selfglow_user:selfglow_password@localhost:5432/selfglow?schema=public"
JWT_SECRET="your-local-secret-key"
PORT=5050
```

Do **not** commit `backend/.env`.

---

## 3. Fresh setup / after pulling major changes

From the project root, start the database:

```bash
docker compose up -d db
```

Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Set up Prisma and database:

```bash
cd ../backend
npx prisma migrate dev
npx prisma generate
node prisma/import-products.js
```

---

## 4. Start the project

### Terminal 1: database

From the project root:

```bash
docker compose up -d db
```

### Terminal 2: backend

```bash
cd backend
npm run dev
```

Backend URL:

```text
http://localhost:5050
```

### Terminal 3: frontend

```bash
cd frontend
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

#########################################

## Full setup

1. Clone the repository:

```bash
git clone git@gitlab.bht-berlin.de:project_bachelor/ss26/skin_care/skin_care.git
cd skin_care
```

2. Install backend dependencies:

```bash
cd backend
npm install
```

3. Install frontend dependencies:

```bash
cd ../frontend
npm install
```

4. Start the database:

```bash
cd ..
docker compose up -d db
```

5. Apply database migrations and generate Prisma client:

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
```

6. Seed sample data:

```bash
npm run seed
```

7. Start the backend:

```bash
npm run dev
```

8. Start the frontend in a new terminal:

```bash
cd frontend
npm run dev
```

## Notes

- `backend/.env` defines the database connection string.
- `backend/prisma/schema.prisma` is the Prisma schema source file.
- Generated Prisma client code is located in `backend/node_modules/@prisma/client`.
- `db/data/` contains source CSV data, not the database itself.
