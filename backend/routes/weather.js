const express = require('express');
const axios = require('axios');
const router = express.Router();

router.get('/weather', async (req, res) => {
  try {
    const { city } = req.query;
    
    if (!city) {
      return res.status(400).json({ 
        success: false, 
        message: 'City parameter is required' 
      });
    }

    const API_KEY = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`;
    
    const response = await axios.get(url);
    
    const weatherData = {
      city: response.data.name,
      country: response.data.sys.country,
      temperature: response.data.main.temp,
      description: response.data.weather[0].description,
      icon: response.data.weather[0].icon,
      humidity: response.data.main.humidity,
      windSpeed: response.data.wind.speed,
      feels_like: response.data.main.feels_like,
      pressure: response.data.main.pressure
    };
    
    res.json({ success: true, data: weatherData });
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ 
        success: false, 
        message: 'City not found' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching weather data' 
    });
  }
});

// 5-day forecast endpoint
router.get('/forecast', async (req, res) => {
  try {
    const { city } = req.query;
    
    if (!city) {
      return res.status(400).json({ 
        success: false, 
        message: 'City parameter is required' 
      });
    }

    const API_KEY = process.env.OPENWEATHER_API_KEY;
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=metric&appid=${API_KEY}`;
    
    const response = await axios.get(url);
    
    // Process forecast data - group by day and get one forecast per day
    const forecastData = processForecastData(response.data);
    
    res.json({ success: true, data: forecastData });
  } catch (error) {
    console.error('Error fetching forecast data:', error.message);
    
    if (error.response && error.response.status === 404) {
      return res.status(404).json({ 
        success: false, 
        message: 'City not found' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching forecast data' 
    });
  }
});

// City autocomplete endpoint using GeoDB Cities API
router.get('/cities', async (req, res) => {
  try {
    const { namePrefix } = req.query;
    
    if (!namePrefix || namePrefix.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name prefix parameter is required and must be at least 2 characters' 
      });
    }

    const options = {
      method: 'GET',
      url: 'https://wft-geo-db.p.rapidapi.com/v1/geo/cities',
      params: {
        namePrefix,
        limit: '10',
        sort: '-population'
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPID_API_KEY || '4165ede424msh31c38e3c8b7f225p150e30jsn873e7133e28b',
        'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com'
      }
    };
    
    const response = await axios.request(options);
    
    // Format the cities data
    const citiesData = response.data.data.map(city => ({
      id: city.id,
      name: city.name,
      country: city.countryCode,
      fullName: `${city.name}, ${city.countryCode}`
    }));
    
    res.json({ success: true, data: citiesData });
  } catch (error) {
    console.error('Error fetching cities data:', error.message);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching cities data' 
    });
  }
});

// Helper function to process forecast data
function processForecastData(data) {
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
}

module.exports = router;