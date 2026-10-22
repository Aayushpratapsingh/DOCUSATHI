# Run DocuSathi AI locally

## One-time setup

1. Copy `.env.example` to `.env` in the repository root and fill in the backend settings, including the Supabase values, `JWT_SECRET`, and `GEMINI_API_KEY`. Keep `.env` private; do not commit it or put the Gemini key in the frontend.
2. Install the backend dependencies from the repository root:

   ```sh
   python3 -m venv backend/.venv
   source backend/.venv/bin/activate
   python -m pip install --upgrade pip
   pip install torch --index-url https://download.pytorch.org/whl/cpu
   pip install -r backend/requirements.txt
   ```

3. Install the frontend dependencies:

   ```sh
   cd frontend
   npm install
   ```

## Start the app

Run each service in its own terminal. Start the backend first.

**Terminal 1 — backend** (from the repository root):

```sh
cd backend
./.venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

**Terminal 2 — frontend** (from the repository root):

```sh
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```

Open [http://127.0.0.1:5173](http://127.0.0.1:5173). The backend API is at [http://127.0.0.1:8000](http://127.0.0.1:8000), and its API docs are at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs). Check [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) to confirm the backend can reach the database.

The backend runs database migrations at startup. Stop either service with `Ctrl+C` in its terminal.
