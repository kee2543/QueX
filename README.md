# QueueX (QueX)

A real-time Virtual Queue Management System.

## Project Structure

- `client/`: React + Vite frontend.
- `server/`: Node.js + Express + Prisma backend.

## Getting Started

### Prerequisites

- Node.js
- PostgreSQL (or your preferred database for Prisma)

### Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   # Server
   cd server
   npm install

   # Client
   cd ../client
   npm install
   ```

3. Setup environment variables:
   - Create a `.env` file in the `server` directory based on the database requirements.

4. Run the applications:
   - Server: `npm run dev` (from `server` folder)
   - Client: `npm run dev` (from `client` folder)

## License

ISC
