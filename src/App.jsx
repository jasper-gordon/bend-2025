import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaChevronLeft, FaChevronRight, FaSearch, FaLock, FaUnlock, FaMap, FaList, FaCheck, FaDog } from 'react-icons/fa';
import HotDogParty from './components/HotDogParty';
import CooperParty from './components/CooperParty';

const INITIAL_CENTER = [44.0582, -121.3153]; // Bend, OR coordinates
const INITIAL_ZOOM = 13;

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

const CATEGORIES = ['Food', 'Beverages', 'Activities', 'Home'];

// Common emojis for different categories (suggestions only)
const CATEGORY_EMOJIS = {
  Food: ['🍽️', '🍕', '🍜', '🍣', '🥗', '🥪', '🍰', '🍦'],
  Beverages: ['🍺', '🍷', '🍸', '🍹', '🥂', '🍻', '🥃'],
  Activities: ['🏃', '🚴', '⛷️', '🏂', '🎣', '⛰️', '🏕️', '🎯', '🎨', '🎭', '🎪', '🎢', '🏖️', '🏊'],
  Home: ['🏠', '🏡', '🏘️', '🏚️', '🏛️', '🏰']
};

// This would be replaced with an environment variable in production
const ADMIN_PASSWORD = 'strongjasper';

function App() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Start closed
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [mapStyle, setMapStyle] = useState('detailed');
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [view, setView] = useState('map'); // 'map' or 'list' or 'cooper'
  const [customEmoji, setCustomEmoji] = useState('📍');
  const [showSaveIndicator, setShowSaveIndicator] = useState(false);
  const mapRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Load locations from localStorage or JSON file
  useEffect(() => {
    const savedLocations = localStorage.getItem('locations');
    if (savedLocations) {
      setLocations(JSON.parse(savedLocations));
    } else {
      fetch('/locations.json')
        .then(response => response.json())
        .then(data => setLocations(data.locations))
        .catch(error => console.error('Error loading locations:', error));
    }
  }, []);

  // Save locations whenever they change
  useEffect(() => {
    if (locations.length > 0) {
      localStorage.setItem('locations', JSON.stringify(locations));
      
      // Show save indicator for admin users
      if (isAdmin) {
        setShowSaveIndicator(true);
        // Clear any existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        // Hide indicator after 2 seconds
        saveTimeoutRef.current = setTimeout(() => {
          setShowSaveIndicator(false);
        }, 2000);
      }
      
      // For admin users in production, still offer the JSON download
      if (isAdmin && process.env.NODE_ENV === 'production') {
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

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAdmin(true);
      setPassword('');
    } else {
      alert('Incorrect password');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setIsEditing(false);
    setSelectedLocation(null);
  };

  const createEmojiIcon = (emoji) => {
    return L.divIcon({
      html: `<div class="emoji-marker" style="display: inline-flex; gap: 4px; white-space: nowrap;">${Array.isArray(emoji) ? emoji.join('') : emoji}</div>`,
      className: 'custom-div-icon',
      iconSize: [40, 40],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });
  };

  const handleMapClick = (e) => {
    if (!isEditing && isAdmin) {
      const newLocation = {
        id: Date.now(),
        position: [e.latlng.lat, e.latlng.lng],
        name: '',
        description: '',
        category: 'Food',
        emoji: '📍'
      };
      setLocations([...locations, newLocation]);
      setSelectedLocation(newLocation);
      setIsEditing(true);
    }
  };

  const handleLocationUpdate = (updatedLocation) => {
    setLocations(locations.map(loc => 
      loc.id === updatedLocation.id ? updatedLocation : loc
    ));
    setSelectedLocation(null);
    setIsEditing(false);
  };

  const handleLocationDelete = (id) => {
    setLocations(locations.filter(loc => loc.id !== id));
    setSelectedLocation(null);
    setIsEditing(false);
  };

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
      map.on('click', handleMapClick);
      return () => {
        map.off('click', handleMapClick);
      };
    }, [map]);
    
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
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-lg p-4 z-[1000] flex justify-between items-center fixed top-0 left-0 right-0">
        <h1 className="text-2xl font-bold flex-1 text-center">Bend 2025</h1>
        <div className="flex items-center space-x-4">
          <HotDogParty />
          {!isAdmin && (
            <button
              onClick={() => {
                const password = prompt('Enter admin password:');
                if (password === ADMIN_PASSWORD) {
                  setIsAdmin(true);
                } else if (password !== null) {
                  alert('Incorrect password');
                }
              }}
              className="p-2 text-gray-500 hover:text-gray-700 flex items-center gap-2"
              title="Admin Login"
            >
              <FaLock className="text-xl" />
              <span className="hidden md:inline">Admin Login</span>
            </button>
          )}
          {isAdmin && (
            <div className="flex items-center space-x-4">
              <span className="text-green-300 flex items-center gap-1">
                <FaUnlock /> Admin
              </span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportLocations}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded shadow"
                >
                  Export Locations
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded shadow"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative mt-16">
        {/* Navigation - Same for both mobile and desktop */}
        <div className="fixed bottom-0 left-0 right-0 bg-white shadow-lg flex justify-around items-center p-4 z-[1001]">
          <button
            onClick={() => { setView('map'); setIsSidebarOpen(true); }}
            className={`flex flex-col items-center ${view === 'map' ? 'text-blue-500' : 'text-gray-500'}`}
          >
            <FaMap className="text-2xl" />
            <span className="text-xs">Map</span>
          </button>
          <button
            onClick={() => { setView('list'); setIsSidebarOpen(false); }}
            className={`flex flex-col items-center ${view === 'list' ? 'text-blue-500' : 'text-gray-500'}`}
          >
            <FaList className="text-2xl" />
            <span className="text-xs">List</span>
          </button>
          <button
            onClick={() => setView('cooper')}
            className={`flex flex-col items-center ${view === 'cooper' ? 'text-blue-500' : 'text-gray-500'}`}
          >
            <FaDog className="text-2xl" />
            <span className="text-xs">Cooper</span>
          </button>
        </div>

        {/* Toggle Sidebar Button - Only show in map view */}
        {view === 'map' && (
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="absolute top-4 left-4 z-[1001] bg-white p-2 rounded shadow-lg"
          >
            {isSidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
          </button>
        )}

        {/* Sidebar - Only show in map view */}
        {view === 'map' && (
          <div
            className={`absolute top-0 left-0 h-full bg-white shadow-lg transition-transform duration-300 z-[1000] 
                       w-full md:w-96 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          >
            <div className="h-full overflow-y-auto">
              <div className="p-4">
                <div className="mb-4">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search locations..."
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div className="mb-4">
                  <h3 className="font-semibold mb-2">Categories</h3>
                  <div className="space-y-2">
                    {CATEGORIES.map(category => (
                      <label key={category} className="flex items-center space-x-2">
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

                <div className="space-y-4">
                  {filteredLocations.map(location => (
                    <div
                      key={location.id}
                      className="p-3 bg-gray-50 rounded cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        setSelectedLocation(location);
                        if (mapRef.current) {
                          mapRef.current.setView(location.position, INITIAL_ZOOM);
                        }
                      }}
                    >
                      <div className="font-bold flex items-center gap-1">
                        <span className="inline-flex gap-1">
                          {Array.isArray(location.emoji) ? location.emoji.join(' ') : location.emoji}
                        </span>
                        {location.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {Array.isArray(location.category) ? location.category.join(', ') : location.category}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {location.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        {view === 'map' && (
          <MapContainer
            center={INITIAL_CENTER}
            zoom={INITIAL_ZOOM}
            className="w-full h-full"
            ref={mapRef}
          >
            <TileLayer {...MAP_STYLES[mapStyle]} />
            {filteredLocations.map(location => (
              <Marker
                key={location.id}
                position={location.position}
                icon={createEmojiIcon(Array.isArray(location.emoji) ? location.emoji[0] : location.emoji)}
                eventHandlers={{
                  click: () => {
                    setSelectedLocation(location);
                    setIsEditing(false);
                  }
                }}
              >
                <Popup>
                  <div className="p-4">
                    <div className="font-bold flex items-center gap-1 mb-2">
                      <span className="inline-flex gap-1">
                        {Array.isArray(location.emoji) ? location.emoji.join(' ') : location.emoji}
                      </span>
                      {location.name}
                    </div>
                    <div className="mb-2">{location.description}</div>
                    {isAdmin && (
                      <div className="mt-2">
                        <button
                          onClick={() => setIsEditing(true)}
                          className="px-2 py-1 bg-blue-500 text-white rounded text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleLocationDelete(location.id)}
                          className="px-2 py-1 bg-red-500 text-white rounded text-sm ml-2"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
            {isAdmin && <MapEvents />}
          </MapContainer>
        )}

        {view === 'cooper' && (
          <div className="w-full h-full flex flex-col items-center justify-center bg-orange-300">
            <img
              src="/cooper.jpg"
              alt="Cooper"
              className="w-64 h-64 rounded-full object-cover shadow-lg mb-4"
            />
            <h2 className="text-2xl font-bold mb-2">Cooper</h2>
            <p className="text-gray-600 mb-4">Corvalis Coop as they say</p>
          </div>
        )}

        {view === 'list' && (
          <div className="w-full h-full overflow-auto bg-white">
            <ListView />
          </div>
        )}

        {/* Location Editor */}
        {isEditing && selectedLocation && (
          <LocationEditor location={selectedLocation} />
        )}
      </div>

      {/* Save indicator */}
      {isAdmin && showSaveIndicator && (
        <div className="fixed bottom-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-[1001]">
          <FaCheck />
          <span>Changes saved</span>
        </div>
      )}

      {/* Cooper Party Button - Show in Cooper view for both mobile and desktop */}
      {view === 'cooper' && (
        <div className="fixed bottom-20 right-4 z-[1001]">
          <CooperParty />
        </div>
      )}
    </div>
  );
}

export default App;
