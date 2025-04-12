# Weather App

A modern weather application with city autocomplete, dark/light mode, 5-day forecast, and search history features.

## Features

- Real-time weather data from OpenWeatherMap API
- City name autocomplete using GeoDB Cities API
- 5-day weather forecast
- Dark/light mode toggle
- Search history stored in localStorage
- Responsive design for all screen sizes

## Setup and Running

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the backend server:
   ```
   npm start
   ```
   The server will run on port 5000 by default.

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm run dev
   ```
   The frontend will be available at http://localhost:5173 or http://localhost:5174

## Troubleshooting

### "City not found" error

If you're receiving a "City not found" error:
- Make sure you're entering a valid city name
- Try using the autocomplete feature by typing at least 2 characters
- Check that your backend server is running

### API rate limits

The GeoDB Cities API (used for city autocompletion) has a rate limit of 1 request per second. If you type too quickly, you might see rate limit errors.

### Backend connection issues

If the frontend cannot connect to the backend, it will automatically switch to direct API access mode. You can check the console for connection logs.

## Technologies Used

- Frontend: React, Vite, Axios
- Backend: Node.js, Express
- APIs: OpenWeatherMap, GeoDB Cities 