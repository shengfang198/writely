# Writely

Writely is a browser-based document editor built with React, ProseMirror, Tailwind CSS, and Vite. Documents are stored locally in the browser, so the current version does not require an account or backend server.

## Live Website

[Open Writely](https://writely-uly4.onrender.com/)

## Features

- Create documents using A0 through A8 paper sizes
- Automatic page layout and pagination
- Rich-text formatting, lists, links, alignment, colors, and highlighting
- Configurable margins, zoom, spellcheck, and gridlines
- Automatic local saving with IndexedDB
- Import `.docx`, `.md`, `.markdown`, and `.txt` files up to 8 MB
- Export individual documents as `.txt`, `.html`, `.pdf`, or `.docx`
- Merge all documents into one `.docx` file
- Print documents from the browser
- Restore documents through URL hash links

The Agent panel currently provides sample local replies only. It is not connected to an AI service.

## Requirements

- Node.js 20.19 or newer
- npm
- A modern browser with IndexedDB support

## Install and Run

From the project directory:

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://localhost:5173
```

Stop the development server with `Ctrl+C`.

## Production Build

Create an optimized build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

The generated files are written to `dist/`.

## How It Works

1. Create a document and choose a paper size.
2. Writely initializes a ProseMirror document and displays it on a paginated canvas.
3. Editing updates the document state immediately.
4. Changes are saved to IndexedDB after a short delay.
5. Document metadata and content are stored separately for faster document lists and previews.
6. Selecting a document loads it from IndexedDB and updates the URL hash.
7. Import and export utilities convert between Writely's document model and supported file formats.

All documents remain in the current browser profile. Clearing browser site data can permanently remove them, so export important documents regularly.

## Keyboard Shortcuts

- `Ctrl+S`: save pending changes
- `Ctrl+N`: create a new document
- `Ctrl+P`: print the active document

On macOS, use `Command` instead of `Ctrl`.

## Project Structure

```text
src/
├── components/   React interface and editor components
├── constants/    Paper size and margin definitions
├── db/           IndexedDB configuration
├── editor/       ProseMirror schema, commands, and pagination
├── hooks/        Document state and persistence
└── utils/        Import, export, PDF, DOCX, and text utilities
```

## Technology

- React 19
- ProseMirror
- Dexie and IndexedDB
- Tailwind CSS 4
- Vite 8
