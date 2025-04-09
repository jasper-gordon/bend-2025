/**
 * @file App.jsx
 * @description Main application component for the Bend Travel Guide. Handles map display,
 * location management, and user interactions.
 */

import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaChevronLeft, FaChevronRight, FaSearch, FaLock, FaUnlock, FaMap, FaList, FaCheck, FaDog } from 'react-icons/fa';
import HotDogParty from './components/HotDogParty';
import CooperParty from './components/CooperParty';

/**
 * @constant {Array} INITIAL_CENTER
 * @description Default map center coordinates for Bend, Oregon
 */
const INITIAL_CENTER = [44.0582, -121.3153];

/**
 * @constant {number} INITIAL_ZOOM
 * @description Initial zoom level for the map
 */
const INITIAL_ZOOM = 13;

/**
 * @constant {Object} MAP_STYLES
 * @description Different map style configurations for the application
 * @property {Object} minimal - Minimal map style with no labels
 * @property {Object} light - Light map style with labels
 * @property {Object} detailed - Detailed map style with more information
 */
const MAP_STYLES = {
  minimal: {
    url: 'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  },
  detailed: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
  }
};

/**
 * @constant {Array} CATEGORIES
 * @description Available categories for location classification
 */
const CATEGORIES = ['Food', 'Beverages', 'Activities', 'Home'];

/**
 * @constant {Object} CATEGORY_EMOJIS
 * @description Emoji mappings for different location categories
 * @property {Array} Food - Food-related emojis
 * @property {Array} Beverages - Beverage-related emojis
 * @property {Array} Activities - Activity-related emojis
 * @property {Array} Home - Home-related emojis
 */
const CATEGORY_EMOJIS = {
  Food: ['🍽️', '🍕', '🍜', '🍣', '🥗', '🥪', '🍰', '🍦'],
  Beverages: ['🍺', '🍷', '🍸', '🍹', '🥂', '🍻', '🥃'],
  Activities: ['🏃', '🚴', '⛷️', '🏂', '🎣', '⛰️', '🏕️', '🎯', '🎨', '🎭', '🎪', '🎢', '🏖️', '🏊'],
  Home: ['🏠', '🏡', '🏘️', '🏚️', '🏛️', '🏰']
};

/**
 * @constant {string} ADMIN_PASSWORD
 * @description Password for admin access (should be moved to environment variables in production)
 */
const ADMIN_PASSWORD = 'strongjasper';

/**
 * @function App
 * @description Main application component
 * @returns {JSX.Element} The rendered application
 */
function App() {
  /**
   * @state {Array} locations - List of locations to display on the map
   * @state {Object|null} selectedLocation - Currently selected location
   * @state {boolean} isEditing - Whether a location is being edited
   * @state {boolean} isSidebarOpen - Whether the sidebar is open
   * @state {string} searchTerm - Current search term for filtering locations
   * @state {Set} selectedCategories - Set of selected category filters
   * @state {string} mapStyle - Current map style
   * @state {boolean} isAdmin - Whether the user is logged in as admin
   * @state {string} password - Admin password input
   * @state {string} view - Current view ('map', 'list', or 'cooper')
   * @state {string} customEmoji - Custom emoji for location markers
   * @state {boolean} showSaveIndicator - Whether to show the save indicator
   */
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [mapStyle, setMapStyle] = useState('detailed');
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [view, setView] = useState('map'); // 'map' or 'list' or 'cooper'
  const [customEmoji, setCustomEmoji] = useState('📍');
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  
  // Add state variables for location editor
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [emoji, setEmoji] = useState('📍');

  /**
   * @ref {Object} mapRef - Reference to the map instance
   * @ref {Object} saveTimeoutRef - Reference to the save indicator timeout
   */
  const mapRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  /**
   * @effect
   * @description Loads locations from localStorage or JSON file on component mount
   */
  useEffect(() => {
    const savedLocations = localStorage.getItem('locations');
    const isAdminSession = localStorage.getItem('isAdminSession');
    
    // Always start in non-admin mode
    setIsAdmin(false);
    
    // Only load saved locations if there's a valid admin session
    if (isAdminSession === 'true' && savedLocations) {
      setLocations(JSON.parse(savedLocations));
    } else {
      // Load default locations from JSON file
      fetch('/locations.json')
        .then(response => response.json())
        .then(data => setLocations(data.locations))
        .catch(error => console.error('Error loading locations:', error));
    }
  }, []);

  /**
   * @function handleLogin
   * @description Handles admin login
   * @param {Event} e - Form submission event
   */
  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setPassword('');
      localStorage.setItem('isAdminSession', 'true');
      fetch('/locations.json')
        .then(response => response.json())
        .then(data => setLocations(data.locations))
        .catch(error => console.error('Error loading locations:', error));
    } else {
      alert('Incorrect password');
    }
  };

  /**
   * @function handleLogout
   * @description Handles admin logout
   */
  const handleLogout = () => {
    console.log('Logout clicked'); // Debug log
    setIsAdmin(false);
    setIsEditing(false);
    setSelectedLocation(null);
    localStorage.removeItem('isAdminSession');
    localStorage.removeItem('locations');
    window.location.reload();
  };

  /**
   * @effect
   * @description Saves locations to localStorage when they change (admin only)
   */
  useEffect(() => {
    if (locations.length > 0 && isAdmin) {
      localStorage.setItem('locations', JSON.stringify(locations));
      
      setShowSaveIndicator(true);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        setShowSaveIndicator(false);
      }, 2000);
      
      if (process.env.NODE_ENV === 'production') {
        const dataStr = JSON.stringify({ locations }, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'locations.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        alert('Location data has been downloaded. Please update the locations.json file in your GitHub repository to make the changes visible to everyone.');
      }
    }
  }, [locations, isAdmin]);

  /**
   * @effect
   * @description Cleans up timeout on component unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  /**
   * @function createEmojiIcon
   * @description Creates a custom emoji icon for map markers
   * @param {string} emoji - The emoji to use for the marker
   * @returns {L.DivIcon} A Leaflet div icon
   */
  const createEmojiIcon = (emoji) => {
    return L.divIcon({
      html: `<div class="emoji-marker" style="display: inline-flex; gap: 4px; white-space: nowrap;">${Array.isArray(emoji) ? emoji.join('') : emoji}</div>`,
      className: 'custom-div-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  };

  /**
   * @function handleMapClick
   * @description Handles map click events for adding new locations (admin only)
   * @param {Object} e - Leaflet map click event
   */
  const handleMapClick = (e) => {
    if (isAdmin) {
      const newLocation = {
        id: Date.now(),
        position: [e.latlng.lat, e.latlng.lng],
        name: '',
        description: '',
        category: ['Food'],
        emoji: '📍'
      };
      setSelectedLocation(newLocation);
      setName('');
      setDescription('');
      setCategories(['Food']);
      setEmoji('📍');
      setIsEditing(true);
    }
  };

  /**
   * @function handleLocationUpdate
   * @description Updates a location's information
   * @param {Object} updatedLocation - The updated location object
   */
  const handleLocationUpdate = (updatedLocation) => {
    setLocations(prevLocations => {
      const existingIndex = prevLocations.findIndex(loc => loc.id === updatedLocation.id);
      if (existingIndex >= 0) {
        const newLocations = [...prevLocations];
        newLocations[existingIndex] = updatedLocation;
        return newLocations;
      } else {
        return [...prevLocations, updatedLocation];
      }
    });
    setIsEditing(false);
    setSelectedLocation(null);
  };

  /**
   * @function handleLocationDelete
   * @description Deletes a location
   * @param {number} id - The ID of the location to delete
   */
  const handleLocationDelete = (id) => {
    setLocations(prevLocations => prevLocations.filter(loc => loc.id !== id));
    setIsEditing(false);
    setSelectedLocation(null);
  };

  /**
   * @constant {Array} filteredLocations
   * @description Filtered list of locations based on search term and selected categories
   */
  const filteredLocations = locations.filter(location => {
    const matchesSearch = location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         location.description.toLowerCase().includes(searchTerm.toLowerCase());
    const categories = Array.isArray(location.category) ? location.category : [location.category];
    const matchesCategory = selectedCategories.size === 0 || 
                          categories.some(cat => selectedCategories.has(cat));
    return matchesSearch && matchesCategory;
  });

  const LocationEditor = ({ location }) => {
    const [name, setName] = useState(location.name);
    const [description, setDescription] = useState(location.description);
    const [categories, setCategories] = useState(Array.isArray(location.category) ? location.category : [location.category]);
    const [emoji, setEmoji] = useState(location.emoji);

    const handleSubmit = (e) => {
      e.preventDefault();
      handleLocationUpdate({
        ...location,
        name,
        description,
        category: categories.length > 0 ? categories : ['Food'], // Ensure at least one category
        emoji
      });
    };

    const toggleCategory = (category) => {
      setCategories(prev => {
        if (prev.includes(category)) {
          return prev.filter(c => c !== category);
        } else {
          return [...prev, category];
        }
      });
    };

    // Get the first category or default to 'Food'
    const currentCategory = categories[0] || 'Food';
    const availableEmojis = CATEGORY_EMOJIS[currentCategory] || CATEGORY_EMOJIS['Food'];

    return (
      <div className="fixed top-20 right-4 w-80 bg-white rounded-lg shadow-lg p-4 z-[1000]">
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Location name"
            className="w-full p-2 mb-2 border rounded"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full p-2 mb-2 border rounded"
          />
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">Categories</label>
            <div className="space-y-2">
              {CATEGORIES.map(cat => (
                <label key={cat} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={categories.includes(cat)}
                    onChange={() => toggleCategory(cat)}
                    className="form-checkbox h-4 w-4 text-blue-500"
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="mb-2">
            <label className="block text-sm font-medium mb-1">Choose Icon</label>
            <div className="grid grid-cols-5 gap-2">
              {availableEmojis.map((em) => (
                <button
                  key={em}
                  type="button"
                  onClick={() => setEmoji(em)}
                  className={`p-2 text-xl rounded ${
                    emoji === em ? 'bg-blue-100 border-2 border-blue-500' : 'border hover:bg-gray-100'
                  }`}
                >
                  {em}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <label className="block text-sm font-medium mb-1">Custom Emoji</label>
              <EmojiInput value={emoji} onChange={setEmoji} />
            </div>
          </div>
          <div className="flex justify-between">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => handleLocationDelete(location.id)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </form>
      </div>
    );
  };

  const LocationView = ({ location }) => (
    <div className="p-4">
      <h3 className="font-bold text-lg">{location.emoji} {location.name}</h3>
      <p className="text-sm text-gray-600 mt-1">{location.category}</p>
      <p className="mt-2">{location.description}</p>
    </div>
  );

  const MapEvents = () => {
    const map = useMap();
    
    useEffect(() => {
      if (isAdmin) {
        map.on('click', handleMapClick);
      }
      return () => {
        map.off('click', handleMapClick);
      };
    }, [map, isAdmin]);
    
    return null;
  };

  const ListView = () => (
    <div className="flex-1 p-6 overflow-auto">
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search locations..."
          className="w-full p-2 border rounded mb-4"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(category => (
            <label key={category} className="flex items-center space-x-2 bg-gray-100 px-3 py-2 rounded-full">
              <input
                type="checkbox"
                checked={selectedCategories.has(category)}
                onChange={() => {
                  const newCategories = new Set(selectedCategories);
                  if (newCategories.has(category)) {
                    newCategories.delete(category);
                  } else {
                    newCategories.add(category);
                  }
                  setSelectedCategories(newCategories);
                }}
                className="form-checkbox h-4 w-4 text-blue-500"
              />
              <span>{category}</span>
            </label>
          ))}
        </div>
      </div>
      {CATEGORIES.map(category => {
        const categoryLocations = filteredLocations.filter(loc => 
          Array.isArray(loc.category) ? loc.category.includes(category) : loc.category === category
        );
        if (categoryLocations.length === 0) return null;

        return (
          <div key={category} className="mb-8">
            <h2 className="text-2xl font-bold mb-4">{category}</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categoryLocations.map(location => (
                <div 
                  key={location.id}
                  className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{location.emoji}</span>
                    <h3 className="text-xl font-semibold">{location.name}</h3>
                  </div>
                  <p className="text-gray-600">{location.description}</p>
                  {isAdmin && (
                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setSelectedLocation(location);
                          setIsEditing(true);
                          setView('map');
                          mapRef.current?.flyTo(location.position, 15);
                        }}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleLocationDelete(location.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  const EmojiInput = ({ value, onChange }) => {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 text-2xl text-center"
        placeholder="📍"
      />
    );
  };

  const handleExportLocations = () => {
    const dataStr = JSON.stringify({ locations }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'locations.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Add necessary styles to head
    const style = document.createElement('style');
    style.textContent = `
      @keyframes flyAndFade {
        0% {
          transform: translate(0, 0) rotate(0deg);
          opacity: 1;
        }
        100% {
          transform: translate(${Math.random() * 200 - 100}px, ${-Math.random() * 200 - 100}px) rotate(${Math.random() * 360}deg);
          opacity: 0;
        }
      }
      @keyframes hotdog {
        0% {
          transform: translate(0, 0) rotate(0deg) scale(1);
          opacity: 1;
        }
        100% {
          transform: translate(${Math.random() * 200 - 100}px, ${-Math.random() * 200 - 100}px) rotate(${Math.random() * 360}deg) scale(0);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <div className="relative h-screen">
      <header className="bg-[#2ca5b8] shadow-lg py-2 px-4 z-[1000] flex justify-between items-center fixed top-0 left-0 right-0">
        <div className="relative z-10">
          <HotDogParty />
        </div>
        <h1 className="text-2xl md:text-5xl font-bold absolute left-0 right-0 text-center">
          <span className="text-[#F4EAD5] [text-shadow:_-3px_-2px_0_#ab5c95,_1px_-1px_0_#ab5c95,_-1px_1px_0_#ab5c95,_1px_1px_0_#ab5c95]">Bend 2025</span>
        </h1>
        <div className="relative z-10">
          {isAdmin ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleExportLocations}
                className="bg-[#6B4984] hover:bg-[#8FD6E1] text-[#F4EAD5] px-3 py-1.5 rounded transition-colors cursor-pointer"
              >
                Export
              </button>
              <button
                onClick={handleLogout}
                className="bg-[#FF6B6B] hover:bg-[#FF8E8E] text-[#F4EAD5] px-3 py-1.5 rounded transition-colors cursor-pointer"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                const password = prompt('Enter admin password:');
                if (password === ADMIN_PASSWORD) {
                  setIsAdmin(true);
                  localStorage.setItem('isAdminSession', 'true');
                } else if (password) {
                  alert('Incorrect password');
                }
              }}
              className="p-2 bg-[#2ca5b8] text-[#F4EAD5] rounded-full hover:bg-[#6B4984] transition-colors cursor-pointer"
            >
              <FaLock />
            </button>
          )}
        </div>
      </header>

      <main className="pt-16 h-full">
        {view === 'cooper' ? (
          <div className="w-full h-full flex flex-col items-center justify-start bg-gradient-to-br from-[#2A4858] via-[#6B4984] to-[#2A4858] pt-32 pb-64 overflow-auto">
            <div className="max-w-4xl mx-auto p-8 text-center">
              <img 
                src="/cooper.jpg" 
                alt="Cooper" 
                className="w-64 h-64 object-cover rounded-full mx-auto mb-8 shadow-xl"
              />
              <h2 className="text-4xl font-bold text-[#F4EAD5] mb-4">Cooper</h2>
              <p className="text-xl text-[#F4EAD5]">
              Corvallis Coop has been working day and night on his thesis. Something about writing "the single greatest, most literate sentence Central Eastern Oregon will ever read?" I don't know what that means, but it sounds impressive, so let's all agree not to put any extra pressure on him to finish it, okay? I mean, can you imagine if we built a whole elaborate, convoluted thing just to shine a spotlight on him? He would hate that. All the attention. The questions. The silent, reverent admiration of his god-like command of words—and of knowing how to use that little dash thingy for a funny aside—without the artificial intelligencia coming after him. Yeah… no. That would be terrible. Let's not do that to him.
              </p>
            </div>
          </div>
        ) : view === 'list' ? (
          <div className="w-full h-full overflow-auto bg-gradient-to-br from-[#2A4858] via-[#6B4984] to-[#2A4858] p-4">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* Filter Bubbles */}
              <div className="flex justify-center gap-2 p-4">
                {/* Search Bubble */}
                <div className="relative">
                  <button
                    onClick={() => {
                      const existingInput = document.querySelector('.search-input');
                      if (existingInput) {
                        existingInput.remove();
                        setSearchTerm('');
                      } else {
                        const searchInput = document.createElement('input');
                        searchInput.type = 'text';
                        searchInput.placeholder = 'Search locations...';
                        searchInput.className = 'px-4 py-2 rounded-full transition-colors bg-white text-[#2A4858] focus:outline-none focus:ring-2 focus:ring-[#2ca5b8]';
                        searchInput.style.width = '200px';
                        
                        searchInput.classList.add('search-input');
                        searchInput.value = searchTerm;
                        searchInput.addEventListener('input', (e) => {
                          setSearchTerm(e.target.value);
                        });
                        
                        const searchButton = document.querySelector('.search-bubble');
                        searchButton.parentNode.insertBefore(searchInput, searchButton.nextSibling);
                      }
                    }}
                    className="search-bubble px-4 py-2 rounded-full transition-colors bg-white text-[#2A4858] hover:bg-gray-100"
                  >
                    <FaSearch />
                  </button>
                </div>
                
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      const newCategories = new Set(selectedCategories);
                      if (newCategories.has(category)) {
                        newCategories.delete(category);
                      } else {
                        newCategories.add(category);
                      }
                      setSelectedCategories(newCategories);
                    }}
                    className={`px-4 py-2 rounded-full transition-colors ${
                      selectedCategories.has(category)
                        ? 'bg-[#2ca5b8] text-[#F4EAD5]'
                        : 'bg-white text-[#2A4858] hover:bg-gray-100'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              
              {filteredLocations.map(location => (
                <div key={location.id} className="bg-[#F4EAD5] rounded-lg p-4 shadow-lg">
                  <h3 className="text-[#2A4858] font-bold text-lg mb-2">{location.name}</h3>
                  <p className="text-[#2A4858] mb-2">{location.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(location.category) ? (
                      location.category.map(cat => (
                        <span key={cat} className="bg-[#8FD6E1] text-[#2ca5b8] px-2 py-1 rounded-full text-sm">
                          {cat}
                        </span>
                      ))
                    ) : (
                      <span className="bg-[#8FD6E1] text-[#2ca5b8] px-2 py-1 rounded-full text-sm">
                        {location.category}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full h-full">
            {/* Filter Bubbles */}
            <div className="absolute top-20 left-0 right-0 flex flex-col items-center gap-2 p-2 z-[1000]">
              {/* Category Filters */}
              <div className="flex flex-wrap justify-center gap-1 md:gap-2">
                {CATEGORIES.map(category => (
                  <button
                    key={category}
                    onClick={() => {
                      const newCategories = new Set(selectedCategories);
                      if (newCategories.has(category)) {
                        newCategories.delete(category);
                      } else {
                        newCategories.add(category);
                      }
                      setSelectedCategories(newCategories);
                    }}
                    className={`px-2 py-1 md:px-4 md:py-2 rounded-full transition-colors text-xs md:text-base ${
                      selectedCategories.has(category)
                        ? 'bg-[#2ca5b8] text-[#F4EAD5]'
                        : 'bg-white text-[#2A4858] hover:bg-gray-100'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
              
              {/* Search Bubble - Moved below categories */}
              <div className="relative">
                <button
                  onClick={() => {
                    const existingInput = document.querySelector('.search-input');
                    if (existingInput) {
                      existingInput.remove();
                      setSearchTerm('');
                    } else {
                      const searchInput = document.createElement('input');
                      searchInput.type = 'text';
                      searchInput.placeholder = 'Search locations...';
                      searchInput.className = 'px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-colors bg-white text-[#2A4858] focus:outline-none focus:ring-2 focus:ring-[#2ca5b8]';
                      searchInput.style.width = '180px';
                      
                      searchInput.classList.add('search-input');
                      searchInput.value = searchTerm;
                      searchInput.addEventListener('input', (e) => {
                        setSearchTerm(e.target.value);
                      });
                      
                      const searchButton = document.querySelector('.search-bubble');
                      searchButton.parentNode.insertBefore(searchInput, searchButton.nextSibling);
                    }
                  }}
                  className="search-bubble px-3 py-1.5 md:px-4 md:py-2 rounded-full transition-colors bg-white text-[#2A4858] hover:bg-gray-100 text-sm md:text-base"
                >
                  <FaSearch />
                </button>
              </div>
            </div>
            <MapContainer
              center={INITIAL_CENTER}
              zoom={INITIAL_ZOOM}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                url={MAP_STYLES[mapStyle].url}
                attribution={MAP_STYLES[mapStyle].attribution}
              />
              <MapEvents />
              {filteredLocations.map(location => (
                <Marker
                  key={location.id}
                  position={location.position}
                  icon={createEmojiIcon(location.emoji)}
                  eventHandlers={{
                    click: () => {
                      if (isAdmin) {
                        setSelectedLocation(location);
                        setIsEditing(true);
                        setName(location.name);
                        setDescription(location.description);
                        setCategories(Array.isArray(location.category) ? location.category : [location.category]);
                        setEmoji(location.emoji);
                      } else {
                        setSelectedLocation(location);
                      }
                    }
                  }}
                >
                  <Popup>
                    <div className="p-4">
                      <h3 className="font-bold text-lg mb-2">{location.name}</h3>
                      <p className="text-gray-600 mb-2">{location.description}</p>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {Array.isArray(location.category) ? (
                          location.category.map(cat => (
                            <span key={cat} className="bg-[#8FD6E1] text-[#2A4858] px-2 py-1 rounded-full text-xs">
                              {cat}
                            </span>
                          ))
                        ) : (
                          <span className="bg-[#8FD6E1] text-[#2A4858] px-2 py-1 rounded-full text-xs">
                            {location.category}
                          </span>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => {
                              setSelectedLocation(location);
                              setIsEditing(true);
                              setName(location.name);
                              setDescription(location.description);
                              setCategories(Array.isArray(location.category) ? location.category : [location.category]);
                              setEmoji(location.emoji);
                            }}
                            className="px-3 py-1 bg-[#6B4984] text-[#F4EAD5] rounded hover:bg-[#8FD6E1] transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleLocationDelete(location.id)}
                            className="px-3 py-1 bg-[#FF6B6B] text-[#F4EAD5] rounded hover:bg-[#FF8E8E] transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-[#2ca5b8] shadow-lg flex justify-around items-center p-4 z-[1001]">
        <button
          onClick={() => setView('map')}
          className={`flex flex-col items-center ${
            view === 'map' ? 'text-[#6B4984]' : 'text-[#F4EAD5] hover:text-[#6B4984]'
          } transition-colors`}
        >
          <FaMap className="text-2xl" />
          <span className="text-sm mt-1">Map</span>
        </button>
        <button
          onClick={() => setView('list')}
          className={`flex flex-col items-center ${
            view === 'list' ? 'text-[#6B4984]' : 'text-[#F4EAD5] hover:text-[#6B4984]'
          } transition-colors`}
        >
          <FaList className="text-2xl" />
          <span className="text-sm mt-1">List</span>
        </button>
        <button
          onClick={() => setView('cooper')}
          className={`flex flex-col items-center ${
            view === 'cooper' ? 'text-[#6B4984]' : 'text-[#F4EAD5] hover:text-[#6B4984]'
          } transition-colors`}
        >
          <FaDog className="text-2xl" />
          <span className="text-sm mt-1">Cooper</span>
        </button>
      </div>

      

      {/* Location Editor */}
      {isEditing && (
        <div className="fixed top-20 right-4 w-80 bg-[#F4EAD5] rounded-lg shadow-lg p-4 z-[1000]">
          <form onSubmit={(e) => {
            e.preventDefault();
            handleLocationUpdate({
              ...selectedLocation,
              name,
              description,
              category: categories,
              emoji
            });
          }}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Location name"
              className="w-full p-2 mb-2 border border-[#6B4984] rounded focus:outline-none focus:ring-2 focus:ring-[#8FD6E1]"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description"
              className="w-full p-2 mb-2 border border-[#6B4984] rounded focus:outline-none focus:ring-2 focus:ring-[#8FD6E1]"
            />
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1 text-[#2ca5b8]">Categories</label>
              <div className="space-y-2">
                {CATEGORIES.map(cat => (
                  <label key={cat} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={categories.includes(cat)}
                      onChange={() => {
                        setCategories(prev => {
                          if (prev.includes(cat)) {
                            return prev.filter(c => c !== cat);
                          } else {
                            return [...prev, cat];
                          }
                        });
                      }}
                      className="rounded text-[#8FD6E1] focus:ring-[#8FD6E1]"
                    />
                    <span className="text-[#2ca5b8]">{cat}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-[#2A4858]">Emoji</label>
              <input
                type="text"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                placeholder="Enter emoji"
                className="w-full p-2 border border-[#6B4984] rounded focus:outline-none focus:ring-2 focus:ring-[#8FD6E1]"
              />
            </div>
            <div className="flex justify-between">
              <button
                type="submit"
                className="bg-[#8FD6E1] hover:bg-[#6B4984] text-[#2A4858] font-bold py-2 px-4 rounded transition-colors"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedLocation(null);
                }}
                className="bg-[#FF6B6B] hover:bg-[#FF8E8E] text-[#F4EAD5] font-bold py-2 px-4 rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Save indicator */}
      {isAdmin && showSaveIndicator && (
        <div className="fixed bottom-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-[1001]">
          <FaCheck />
          <span>Changes saved</span>
        </div>
      )}

      {/* Cooper Party Button - Show in Cooper view for both mobile and desktop */}
      {view === 'cooper' && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-[1001] mb-8">
          <CooperParty />
        </div>
      )}

      {/* Tumbleweed Animation */}
      <div className="fixed inset-0 pointer-events-none z-[999]">
        <div className="tumbleweed">🌵</div>
        <div className="tumbleweed2">🌵</div>
        <div className="tumbleweed" style={{ animationDelay: `${Math.random() * 10}s` }}>🌵</div>
        <div className="tumbleweed2" style={{ animationDelay: `${Math.random() * 10}s` }}>🌵</div>
      
      </div>

      {/* Add tumbleweed styles */}
      <style>
        {`
          @keyframes tumbleweed {
            0% {
              transform: translate(0, 0) rotate(0deg);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translate(100vw, 100vh) rotate(360deg);
              opacity: 0;
            }
          }

          @keyframes tumbleweed2 {
            0% {
              transform: translate(100vw, 0) rotate(0deg);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translate(0, 100vh) rotate(360deg);
              opacity: 0;
            }
          }

          .tumbleweed {
            position: absolute;
            font-size: 2rem;
            animation: tumbleweed 15s linear infinite;
            animation-delay: ${Math.random() * 10}s;
            left: -50px;
            top: ${Math.random() * 100}vh;
          }

          .tumbleweed2 {
            position: absolute;
            font-size: 2rem;
            animation: tumbleweed2 15s linear infinite;
            animation-delay: ${Math.random() * 10}s;
            right: -50px;
            top: ${Math.random() * 100}vh;
          }
        `}
      </style>
    </div>
  );
}

export default App;
