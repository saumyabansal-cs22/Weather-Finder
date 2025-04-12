import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Switch from 'react-switch'
import './App.css'

function App() {
  // State for weather data
  const [city, setCity] = useState('')
  const [weatherData, setWeatherData] = useState(null)
  const [forecastData, setForecastData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // State for city autocomplete
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState(null)
  const suggestionsRef = useRef(null)
  
  // State for theme
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('weatherAppTheme') === 'dark'
  )
  
  // State for search history
  const [searchHistory, setSearchHistory] = useState(
    JSON.parse(localStorage.getItem('weatherSearchHistory')) || []
  )
  
  // Set theme on component mount and when it changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
    localStorage.setItem('weatherAppTheme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])
  
  // Handle clicks outside suggestions dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target)) {
        setShowSuggestions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])
  
  // Handle city input change with debounce for API calls
  const handleCityInputChange = (e) => {
    const value = e.target.value
    setCity(value)
    
    // Clear any existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }
    
    // Only fetch suggestions if value is 2 or more characters
    if (value.length >= 2) {
      const timeout = setTimeout(() => {
        fetchCitySuggestions(value)
      }, 500) // 500ms debounce
      
      setTypingTimeout(timeout)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }
  
  // Fetch city suggestions from the API
  const fetchCitySuggestions = async (namePrefix) => {
    try {
      // Try backend first
      try {
        const response = await axios.get(`/api/cities?namePrefix=${namePrefix}`);
        if (response.data.data && response.data.data.length > 0) {
          setSuggestions(response.data.data);
          setShowSuggestions(true);
        } else {
          setShowSuggestions(false);
        }
      } catch (backendError) {
        console.log('Backend city API failed, trying direct access', backendError);
        
        // Direct GeoDB Cities API as fallback
        const options = {
          method: 'GET',
          url: 'https://wft-geo-db.p.rapidapi.com/v1/geo/cities',
          params: {
            namePrefix,
            limit: '10',
            sort: '-population'
          },
          headers: {
            'X-RapidAPI-Key': '4165ede424msh31c38e3c8b7f225p150e30jsn873e7133e28b',
            'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com'
          }
        };
        
        const response = await axios.request(options);
        
        // GeoDB API has strict rate limits (1 request per second)
        if (response.data.data && response.data.data.length > 0) {
          // Format the cities data
          const citiesData = response.data.data.map(city => ({
            id: city.id,
            name: city.name,
            country: city.countryCode,
            fullName: `${city.name}, ${city.countryCode}`
          }));
          
          setSuggestions(citiesData);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    } catch (err) {
      console.error('Error fetching city suggestions:', err);
      
      // Special handling for GeoDB API rate limits
      if (err.response && err.response.status === 429) {
        setError('City search limit reached. Please wait a moment before trying again.');
        setTimeout(() => setError(null), 3000);
      }
      
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };
  
  // Handle suggestion selection
  const handleSuggestionClick = (suggestion) => {
    setCity(suggestion.fullName)
    setSuggestions([])
    setShowSuggestions(false)
    fetchWeatherData(suggestion.fullName)
  }
  
  // Add city to search history
  const addToSearchHistory = (cityName) => {
    // Don't add empty or duplicate cities
    if (!cityName.trim() || searchHistory.includes(cityName)) return
    
    // Add to beginning of array and limit to 5 items
    const updatedHistory = [cityName, ...searchHistory.filter(item => item !== cityName)].slice(0, 5)
    setSearchHistory(updatedHistory)
    localStorage.setItem('weatherSearchHistory', JSON.stringify(updatedHistory))
  }
  
  // Clear search history
  const clearSearchHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('weatherSearchHistory')
  }
  
  // Fetch both current weather and forecast
  const fetchWeatherData = async (cityName) => {
    if (!cityName.trim()) return
    
    setLoading(true)
    setError(null)
    
    try {
      console.log(`Fetching weather for: ${cityName}`);
      
      // Try connecting to our backend first
      try {
        // Fetch current weather
        const weatherResponse = await axios.get(`/api/weather?city=${cityName}`);
        console.log('Weather data received:', weatherResponse.data);
        setWeatherData(weatherResponse.data.data)
        
        // Fetch forecast
        const forecastResponse = await axios.get(`/api/forecast?city=${cityName}`);
        console.log('Forecast data received:', forecastResponse.data);
        setForecastData(forecastResponse.data.data)
      } catch (backendError) {
        // If backend fails, try direct OpenWeather API
        console.log('Backend connection failed, trying direct API access');
        
        // Direct API key - using one from environment if available
        const API_KEY = '69e984270a63d3b506198996620124c6';
        
        // Fetch current weather directly
        const weatherURL = `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=metric&appid=${API_KEY}`;
        const weatherResponse = await axios.get(weatherURL);
        
        // Format weather data to match our expected structure
        const weatherData = {
          city: weatherResponse.data.name,
          country: weatherResponse.data.sys.country,
          temperature: weatherResponse.data.main.temp,
          description: weatherResponse.data.weather[0].description,
          icon: weatherResponse.data.weather[0].icon,
          humidity: weatherResponse.data.main.humidity,
          windSpeed: weatherResponse.data.wind.speed,
          feels_like: weatherResponse.data.main.feels_like,
          pressure: weatherResponse.data.main.pressure
        };
        
        setWeatherData(weatherData);
        
        // Fetch forecast directly
        const forecastURL = `https://api.openweathermap.org/data/2.5/forecast?q=${cityName}&units=metric&appid=${API_KEY}`;
        const forecastResponse = await axios.get(forecastURL);
        
        // Process forecast data
        const forecastData = processForecastData(forecastResponse.data);
        setForecastData(forecastData);
      }
      
      // Add to search history
      addToSearchHistory(cityName)
    } catch (err) {
      console.error('Error details:', {
        message: err.message,
        response: err.response,
        request: err.request,
        stack: err.stack
      });
      
      if (err.response) {
        // Server responded with an error
        console.error('Server error response:', err.response.data);
        if (err.response.status === 404) {
          setError('City not found. Please check the spelling and try again.')
        } else {
          setError(`Server error (${err.response.status}): ${err.response.data?.message || err.response.statusText}`)
        }
      } else if (err.request) {
        // Request was made but no response received
        console.error('No response from server:', err.request);
        setError('No response received from server. Please check if the backend server is running.')
      } else {
        // Something else caused the error
        setError(`Error: ${err.message}`)
      }
      setWeatherData(null)
      setForecastData(null)
    } finally {
      setLoading(false)
    }
  }
  
  // Helper function to process forecast data (same logic as backend)
  const processForecastData = (data) => {
    // Group forecast by day
    const forecastByDay = {};
    
    data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const day = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      if (!forecastByDay[day]) {
        forecastByDay[day] = [];
      }
      
      forecastByDay[day].push({
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        temperature: item.main.temp,
        feels_like: item.main.feels_like,
        description: item.weather[0].description,
        icon: item.weather[0].icon,
        humidity: item.main.humidity,
        windSpeed: item.wind.speed,
        pressure: item.main.pressure,
        dt: item.dt
      });
    });
    
    // Get midday forecast for each day (or closest available)
    const dailyForecast = Object.keys(forecastByDay).map(day => {
      const forecasts = forecastByDay[day];
      
      // Try to get forecast around noon (12:00 - 15:00)
      const middayForecast = forecasts.find(f => {
        const hour = new Date(f.dt * 1000).getHours();
        return hour >= 12 && hour <= 15;
      }) || forecasts[0]; // Fallback to first available
      
      return {
        date: day,
        displayDate: new Date(day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        temperature: middayForecast.temperature,
        description: middayForecast.description,
        icon: middayForecast.icon,
        humidity: middayForecast.humidity,
        windSpeed: middayForecast.windSpeed
      };
    });
    
    // Limit to 5 days
    return dailyForecast.slice(0, 5);
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault()
    fetchWeatherData(city)
  }
  
  // Handle history item click
  const handleHistoryItemClick = (cityName) => {
    setCity(cityName)
    fetchWeatherData(cityName)
  }
  
  // Toggle theme
  const toggleTheme = () => {
    setIsDarkMode(prev => !prev)
  }

  return (
    <div className="weather-app">
      {/* Theme toggle */}
      <div className="theme-toggle">
        <div className="theme-toggle-icon">☀️</div>
        <Switch 
          checked={isDarkMode}
          onChange={toggleTheme}
          onColor="#2980b9"
          offColor="#f39c12"
          checkedIcon={false}
          uncheckedIcon={false}
          height={24}
          width={48}
        />
        <div className="theme-toggle-icon">🌙</div>
      </div>
      
      <header>
        <h1>Weather Finder</h1>
        <p>Get real-time weather information for any city</p>
      </header>
      
      <div className="search-container" ref={suggestionsRef}>
        <form className="search-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Enter city name (min 2 chars for suggestions)..."
            value={city}
            onChange={handleCityInputChange}
            onFocus={() => city.length >= 2 && setShowSuggestions(true)}
            autoComplete="off"
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
        
        {showSuggestions && suggestions.length > 0 && (
          <div className="search-suggestions">
            {suggestions.map((suggestion) => (
              <div 
                key={suggestion.id}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion.fullName}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Search history */}
      {searchHistory.length > 0 && (
        <div className="search-history">
          <div className="search-history-title">
            <span>Recent Searches</span>
            <button className="clear-history" onClick={clearSearchHistory}>Clear</button>
          </div>
          <div className="search-history-list">
            {searchHistory.map((item, index) => (
              <div 
                key={index} 
                className="history-item"
                onClick={() => handleHistoryItemClick(item)}
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Fetching weather data...</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {weatherData && (
        <div className="weather-card">
          <div className="weather-card-header">
            <h2>{weatherData.city}</h2>
            <p>{weatherData.country}</p>
          </div>
          
          <div className="weather-card-body">
            <div className="weather-main">
              <div className="temperature">
                {Math.round(weatherData.temperature)}°C
              </div>
              <div className="weather-icon">
                <img 
                  src={`https://openweathermap.org/img/wn/${weatherData.icon}@2x.png`} 
                  alt={weatherData.description} 
                />
                <p className="weather-description">{weatherData.description}</p>
              </div>
            </div>
            
            <div className="weather-details">
              <div className="weather-detail-item">
                <p>Feels Like</p>
                <p>{Math.round(weatherData.feels_like)}°C</p>
              </div>
              <div className="weather-detail-item">
                <p>Humidity</p>
                <p>{weatherData.humidity}%</p>
              </div>
              <div className="weather-detail-item">
                <p>Wind Speed</p>
                <p>{weatherData.windSpeed} m/s</p>
              </div>
              <div className="weather-detail-item">
                <p>Pressure</p>
                <p>{weatherData.pressure} hPa</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* 5-day forecast */}
      {forecastData && forecastData.length > 0 && (
        <div className="forecast-section">
          <h3 className="forecast-title">5-Day Forecast</h3>
          <div className="forecast-container">
            {forecastData.map((day, index) => (
              <div key={index} className="forecast-card">
                <div className="forecast-day">{day.displayDate.split(',')[0]}</div>
                <div className="forecast-date">{day.displayDate.split(',')[1]}</div>
                <img 
                  className="forecast-icon"
                  src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                  alt={day.description}
                />
                <div className="forecast-temp">{Math.round(day.temperature)}°C</div>
                <div className="forecast-desc">{day.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default App
