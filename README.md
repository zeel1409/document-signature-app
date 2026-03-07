## Document Signature App

A full-stack document signing application built with:

- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT auth, file storage, audit logs.
- **Frontend**: React (Vite), Axios, React Router, a custom signature pad, and a modern Tailwind-style UI.

Users can upload PDFs, place signatures, generate shareable signing links, and keep an audit trail of all actions. External users can sign or reject documents via a public link.

---

## Features

- **Authentication**
  - Email + password registration and login.
  - Passwords hashed with `bcryptjs`.
  - JWT-based authentication with 7-day expiry.

- **Documents**
  - Upload PDF files (validated and size-limited).
  - View your own documents in a dashboard.
  - Document lifecycle: **pending → signed → rejected**.

- **Signatures**
  - Draw a handwritten-style signature in the browser.
  - Drag and drop signatures onto any page of the PDF.
  - Generate a new **signed PDF** with embedded signature images.

- **Public signing links**
  - Create a share link for a document.
  - External users can:
    - Open the PDF,
    - Draw and place their signature,
    - Sign and download the signed PDF, or
    - Reject the document with a reason.

- **Audit trail**
  - Records who did what, when, and from where (IP + user agent).
  - View recent events per document in the editor.

---

## Project structure

```text
document-signature-app/
  backend/      # Express API + MongoDB models, file storage
  frontend/     # React app (Vite) + UI
  package.json  # NPM workspaces + dev scripts
```

The root `package.json` uses **npm workspaces** to manage `backend` and `frontend`.

---

## Prerequisites

- **Node.js**: v18+ recommended.
- **npm**: comes with Node.js.
- **MongoDB**: a local instance or a hosted MongoDB Atlas connection string.

---

## Environment variables

### Backend (`backend/.env`)

Create a file `backend/.env` based on `backend/.env.example`:

```bash
PORT=5174
MONGO_URI=your-mongodb-connection-string
JWT_SECRET=replace-with-a-long-random-string
CORS_ORIGIN=http://localhost:5173
PUBLIC_SIGN_BASE_URL=http://localhost:5173
```

- **`MONGO_URI`**: Required. Use your local MongoDB or Atlas URI.
- **`JWT_SECRET`**: Use a long, random string in real projects.
- **`CORS_ORIGIN`**: Frontend origin in development.
- **`PUBLIC_SIGN_BASE_URL`**: Base URL used in generated public links.

> **Note**: The real `.env` file should **never** be committed to Git. This repo already ignores `.env` files.

### Frontend (`frontend/.env`)

Optional, but recommended for clarity:

```bash
VITE_API_URL=http://localhost:5174
```

If `VITE_API_URL` is not set, the frontend defaults to `http://localhost:5174`.

---

## Installation

From the project root:

```bash
npm install
```

This installs dependencies for:

- root (dev tools like `concurrently`),
- `backend`,
- `frontend`.

---

## Running the app (development)

From the project root:

```bash
npm run dev
```

This uses `concurrently` to start:

- **API** on `http://localhost:5174`
- **Web app** on (by default) `http://localhost:5173`

You can also run them separately:

```bash
# Backend only
npm run dev:api

# Frontend only
npm run dev:web
```

---

## Basic usage flow

1. **Register** a new account.
2. **Upload** a PDF from the dashboard.
3. **Open** the document in the editor.
4. **Draw** your signature and place it on the PDF.
5. **Save** signatures and **Finalize PDF** to generate a signed version.
6. Optionally, **create a share link** and send it to someone else:
   - They open the public link,
   - Draw and place their signature,
   - Sign to generate/download a signed PDF or reject with a reason.

---

## Helpful notes for beginners

- If something fails, the UI usually shows a **red error box** with a helpful message.
- If you change your `.env` file, **restart** `npm run dev` so the backend picks up the new values.
- Audit logs are “best effort”: they won’t break your API if something goes wrong when writing a log.

---

## Production considerations (future ideas)

This project is focused on learning and local usage. For a production-ready system you would also consider:

- HTTPS everywhere and secure cookie settings.
- Real email notifications (for share links, signed PDFs, rejections).
- Stronger rate limiting and abuse protection.
- S3 or another cloud storage provider for PDFs and signatures.
- More detailed audit reports and admin views.

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

