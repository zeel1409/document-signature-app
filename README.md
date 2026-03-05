# Document Signature App (JavaScript, no TypeScript)

Full‑stack web app inspired by DocuSign/Adobe Sign:

- JWT auth (`/api/auth/register`, `/api/auth/login`)
- Secure PDF upload & user-owned document list (`/api/docs/*`)
- Drag signature placement on a rendered PDF (`react-pdf`)
- Server-side signed PDF generation using **PDF-Lib**
- Tokenized public signing links (`/api/public/*`)
- Audit trail (`/api/audit/:docId`)

## Prerequisites

- Node.js (installed)
- MongoDB (local or Atlas)

## Setup

1) Create backend env file:

- Copy `backend/.env.example` → `backend/.env`
- Set `MONGO_URI` and `JWT_SECRET`

2) (Optional) Create frontend env file:

- Copy `frontend/.env.example` → `frontend/.env`

3) Install dependencies (already done if you ran `npm install` at root):

```bash
cd document-signature-app
npm install
```

## Run (dev)

```bash
cd document-signature-app
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5174`

## How it works (high level)

- Upload PDF → stored on disk under `backend/storage/uploads/` and tracked in MongoDB.
- Draw a signature in the UI → saved as PNG (data URL) + placed using relative coordinates (percent of page).
- Finalize → backend embeds PNG(s) into the PDF and writes `backend/storage/signed/<docId>_signed.pdf`.
- Share link → backend generates token and returns `http://localhost:5173/sign/<token>`.

