# Web UI for Microsoft Rewards Script

A simplified, accessible web interface for managing Microsoft Rewards accounts.

## Features

- **Add accounts with email only** - no coding knowledge required
- **Real-time dashboard** - view server status and account statistics
- **Account queue** - see all accounts ready to execute
- **Live point balance** - track points for each account
- **Status tracking** - see which accounts are logged in, expired, or not logged in
- **Selective execution** - choose which accounts to run with checkboxes
- **Responsive design** - works on desktop, tablet, and mobile

## Setup

1. Start the API server:

```bash
npm run api
```

2. Open your browser to:

```
http://127.0.0.1:3010
```

3. Add accounts using the email form
4. Select accounts and click "Run Selected"

## Configuration

The Web UI connects to the Control API at `http://127.0.0.1:3010` by default.

To change the API URL, edit `public/app.js`:

```javascript
const API_BASE_URL = 'http://your-server:3010'
```

## How It Works

- Accounts are stored in browser localStorage for persistence
- The UI polls the API every 5 seconds for status updates
- Point balances and run history come from the Control API
- Account credentials remain in your `.env` file (not exposed to the UI)

## Adding Accounts to .env

After adding an account via the UI, you still need to add credentials to `.env`:

```env
ACCOUNT_1_EMAIL=email@example.com
ACCOUNT_1_PASSWORD=your_password
```

Then rebuild: `npm run build`

## Accessibility

- Keyboard navigable
- Screen reader compatible
- ARIA labels on interactive elements
- High contrast color scheme
- Focus indicators on all controls
