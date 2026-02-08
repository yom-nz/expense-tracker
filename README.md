# Expense Tracker

A modern expense tracking web application built with React, Shopify Polaris, and Supabase.

## Features

- **Collections**: Create separate expense collections for different events (holidays, dinners, trips, etc.)
- **People Management**: Add people to your collections and organize them into subgroups
- **Expense Tracking**: Record expenses with flexible split options (equal splits among selected people)
- **Balance Calculations**: Automatically calculate who owes whom with suggested settlement amounts
- **Settlements**: Record debt payments between people
- **Statistics**: View spending breakdowns by category and person

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **UI Framework**: Shopify Polaris (no custom CSS)
- **Database**: Supabase (PostgreSQL)
- **Styling**: Polaris component styles only

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173](http://localhost:5173) in your browser

## Database Migration

If you have existing data from the CLI expense tracker (`expenses.json`), you can migrate it:

```bash
node migrate-data.js
```

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in Vercel
3. Add environment variables in Vercel dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

### Netlify

1. Push your code to GitHub
2. Import your repository in Netlify
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Deploy!

### GitHub Pages

1. Update `vite.config.ts` to set the base path:
   ```ts
   export default defineConfig({
     base: '/your-repo-name/',
     // ...
   })
   ```

2. Build and deploy:
   ```bash
   npm run build
   # Then deploy the dist/ folder to GitHub Pages
   ```

## Project Structure

```
src/
├── components/
│   ├── CollectionSelector.tsx  # Collection switcher and creator
│   ├── Dashboard.tsx           # Main dashboard with tabs
│   ├── PeopleManager.tsx       # People and subgroups management
│   ├── ExpenseManager.tsx      # Add/view/delete expenses
│   ├── BalancesView.tsx        # Balance calculations and settlements
│   └── StatsView.tsx           # Statistics and reports
├── lib/
│   └── supabase.ts            # Supabase client and types
├── App.tsx                    # Main app component
└── main.tsx                   # Entry point
```

## Database Schema

- `collections`: Top-level expense groupings
- `people`: People within collections
- `subgroups`: Groups of people (e.g., couples)
- `subgroup_members`: Junction table for subgroup membership
- `expenses`: Individual expenses
- `expense_splits`: How expenses are split among people
- `settlements`: Recorded debt payments

## License

MIT
