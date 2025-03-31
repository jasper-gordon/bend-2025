import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FaChevronLeft, FaChevronRight, FaSearch, FaLock, FaUnlock, FaMap, FaList, FaCheck } from 'react-icons/fa';
import HotDogParty from './components/HotDogParty';

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

const CATEGORIES = ['Food', 'Bars', 'Activities', 'Home'];

// Common emojis for different categories (suggestions only)
const CATEGORY_EMOJIS = {
  Food: ['🍽️', '🍕', '🍜', '🍣', '🥗', '🍳', '🥪', '☕', '🍰', '🍦'],
  Bars: ['🍺', '🍷', '🍸', '🍹', '🥂', '🍻', '🥃'],
  Activities: ['🏃', '🚴', '⛷️', '🏂', '🎣', '⛰️', '🏕️', '🎯', '🎨', '🎭', '🎪', '🎢', '🏖️', '🏊'],
  Home: ['🏠', '🏡', '🏘️', '🏚️', '🏛️', '🏰']
};

// This would be replaced with an environment variable in production
const ADMIN_PASSWORD = 'strongjasper';

function App() {
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [mapStyle, setMapStyle] = useState('detailed');
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [view, setView] = useState('map'); // 'map' or 'list'
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
      html: `<div class="emoji-marker">${emoji}</div>`,
      className: 'custom-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
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
    const matchesCategory = selectedCategories.size === 0 || selectedCategories.has(location.category);
    return matchesSearch && matchesCategory;
  });

  const LocationEditor = ({ location }) => {
    const [name, setName] = useState(location.name);
    const [description, setDescription] = useState(location.description);
    const [category, setCategory] = useState(location.category);
    const [emoji, setEmoji] = useState(location.emoji);

    const handleSubmit = (e) => {
      e.preventDefault();
      handleLocationUpdate({
        ...location,
        name,
        description,
        category,
        emoji
      });
    };

    return (
      <form onSubmit={handleSubmit} className="p-4 bg-white rounded-lg shadow">
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
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full p-2 mb-2 border rounded"
        >
          {CATEGORIES.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Choose Icon</label>
          <div className="grid grid-cols-5 gap-2">
            {CATEGORY_EMOJIS[category].map((em) => (
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
      {CATEGORIES.map(category => {
        const categoryLocations = filteredLocations.filter(loc => loc.category === category);
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

  return (
    <div className="h-screen w-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Bend 2025</h1>
            <div className="flex items-center gap-4">
              {/* View Toggle */}
              <div className="flex bg-blue-700 rounded-lg p-1">
                <button
                  onClick={() => setView('map')}
                  className={`px-3 py-1 rounded flex items-center gap-2 ${
                    view === 'map' 
                      ? 'bg-white text-blue-600' 
                      : 'text-white hover:bg-blue-800'
                  }`}
                >
                  <FaMap /> Map
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-1 rounded flex items-center gap-2 ${
                    view === 'list' 
                      ? 'bg-white text-blue-600' 
                      : 'text-white hover:bg-blue-800'
                  }`}
                >
                  <FaList /> List
                </button>
              </div>
              
              {/* Admin Controls */}
              {!isAdmin ? (
                <form onSubmit={handleLogin} className="flex gap-2">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Admin password"
                    className="px-3 py-1 rounded text-gray-800 text-sm w-32"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-400"
                  >
                    <FaLock />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2">
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
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 relative">
        {view === 'map' ? (
          <>
            {/* Sidebar */}
            <div 
              className={`sidebar bg-white shadow-lg transition-all duration-300 ${
                isSidebarOpen ? 'w-80' : 'w-0'
              } overflow-hidden flex flex-col absolute h-full z-[1000]`}
            >
              <div className="p-4">
                <div className="flex items-center mb-4">
                  <FaSearch className="text-gray-400 mr-2" />
                  <input
                    type="text"
                    placeholder="Search locations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="mb-4">
                  <h3 className="font-bold mb-2">Map Style</h3>
                  <select
                    value={mapStyle}
                    onChange={(e) => setMapStyle(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="minimal">Minimal</option>
                    <option value="light">Light</option>
                    <option value="detailed">Detailed</option>
                  </select>
                </div>
                <div className="mb-4">
                  <h3 className="font-bold mb-2">Categories</h3>
                  <div className="flex flex-col gap-2">
                    {CATEGORIES.map(category => (
                      <label key={category} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCategories.has(category)}
                          onChange={(e) => {
                            const newCategories = new Set(selectedCategories);
                            if (e.target.checked) {
                              newCategories.add(category);
                            } else {
                              newCategories.delete(category);
                            }
                            setSelectedCategories(newCategories);
                          }}
                          className="mr-2"
                        />
                        <span>{category}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="overflow-y-auto">
                  {filteredLocations.map(location => (
                    <div
                      key={location.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer rounded mb-2"
                      onClick={() => {
                        setSelectedLocation(location);
                        setIsEditing(isAdmin);
                        mapRef.current?.flyTo(location.position, 15);
                      }}
                    >
                      <div className="font-bold">
                        {location.emoji} {location.name || 'Unnamed Location'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {location.category}
                      </div>
                      <div className="text-sm text-gray-600 truncate">
                        {location.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="absolute top-4 left-0 z-[1001] bg-white p-2 rounded-r shadow-lg"
            >
              {isSidebarOpen ? <FaChevronLeft /> : <FaChevronRight />}
            </button>

            {/* Map */}
            <MapContainer
              center={INITIAL_CENTER}
              zoom={INITIAL_ZOOM}
              className="h-full w-full"
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
                      setSelectedLocation(location);
                      setIsEditing(isAdmin);
                    }
                  }}
                >
                  {selectedLocation?.id === location.id && (
                    <Popup>
                      {isAdmin && isEditing ? (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                          <div className="bg-white p-4 rounded-lg max-w-md w-full">
                            <h2 className="text-xl font-bold mb-4">Edit Location</h2>
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              const updatedLocations = locations.map(loc =>
                                loc.id === selectedLocation.id ? selectedLocation : loc
                              );
                              setLocations(updatedLocations);
                              setSelectedLocation(null);
                              setIsEditing(false);
                            }}>
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-medium">Name</label>
                                  <input
                                    type="text"
                                    value={selectedLocation.name}
                                    onChange={(e) => setSelectedLocation({...selectedLocation, name: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium">Description</label>
                                  <textarea
                                    value={selectedLocation.description}
                                    onChange={(e) => setSelectedLocation({...selectedLocation, description: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                    rows="3"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium">Category</label>
                                  <select
                                    value={selectedLocation.category}
                                    onChange={(e) => setSelectedLocation({...selectedLocation, category: e.target.value})}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                  >
                                    {CATEGORIES.map(category => (
                                      <option key={category} value={category}>{category}</option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-sm font-medium">Emoji</label>
                                  <div className="flex items-center space-x-2">
                                    <EmojiInput
                                      value={selectedLocation.emoji}
                                      onChange={(emoji) => setSelectedLocation({...selectedLocation, emoji: emoji})}
                                    />
                                    <div className="text-sm text-gray-500">
                                      Suggested: {CATEGORY_EMOJIS[selectedLocation.category].map(emoji => (
                                        <button
                                          type="button"
                                          key={emoji}
                                          onClick={() => setSelectedLocation({...selectedLocation, emoji: emoji})}
                                          className="hover:bg-gray-100 px-1 rounded"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end space-x-2 mt-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedLocation(null);
                                    setIsEditing(false);
                                  }}
                                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                                >
                                  Save
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      ) : (
                        <LocationView location={location} />
                      )}
                    </Popup>
                  )}
                </Marker>
              ))}
            </MapContainer>
          </>
        ) : (
          <ListView />
        )}
      </div>
      {/* Save indicator */}
      {isAdmin && showSaveIndicator && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
          <FaCheck />
          <span>Changes saved</span>
        </div>
      )}
      {/* Hot Dog Party Button */}
      <HotDogParty />
    </div>
  );
}

export default App;
