# README

This file contains the main commands to run the project after a fresh clone or when reopening it.

## Quick start after reopening the project

If your dependencies are already installed and the database already exists, run:

```bash
# Start the database if it is not already running
docker compose up -d db

# Start the backend in one terminal
cd backend
npm run dev

# Start the frontend in another terminal
cd ../frontend
npm run dev
```

- Backend URL: `http://localhost:5050`
- Frontend URL: `http://localhost:5173`

## When you need to install dependencies again

If this is a fresh clone or your dependencies changed, run:

```bash
cd backend
npm install
cd ../frontend
npm install
```

## When to run seeding and importing commands

```bash
`node import-products.js`
```
Run this when:
- you need to import product data from CSV files into the database
- the database is set up and you want to populate it with product information

It imports data from `db/data/` CSV files.

```bash
`npm run seed`
```
Run this when:
- you want to seed the database with sample data
- for testing or initial setup after migrations

## When to run Prisma commands

### `npx prisma migrate deploy`
Run this when:
- the local database is new/fresh
- you are setting up the database for the first time
- you need to apply existing migrations to a local environment

It applies the migrations already stored in `backend/prisma/migrations`.

### `npx prisma generate`
Run this when:
- `backend/prisma/schema.prisma` changed
- you added or removed a model
- you renamed or changed a field
- you added or changed a relation
- you upgraded or reinstalled `@prisma/client` or `prisma`
- you switched branches and the Prisma schema changed

### `npx prisma migrate dev`
Run this when you are actively developing locally and want Prisma to:
- create a new migration file
- apply it to the local database
- regenerate the Prisma client

Use it after changing `backend/prisma/schema.prisma` during development.

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
