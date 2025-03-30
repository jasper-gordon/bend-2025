import React, { useState, useEffect } from 'react';

const HotDogParty = () => {
  const [hotdogs, setHotdogs] = useState([]);
  const [isPartyTime, setIsPartyTime] = useState(false);

  const startParty = () => {
    if (isPartyTime) return;
    setIsPartyTime(true);
    
    // Create 30 hot dogs with random positions and animations
    const newHotdogs = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      scale: 0.5 + Math.random() * 1.5,
      rotation: Math.random() * 360,
      delay: Math.random() * 0.5,
    }));
    
    setHotdogs(newHotdogs);

    // End party after 5 seconds
    setTimeout(() => {
      setHotdogs([]);
      setIsPartyTime(false);
    }, 5000);
  };

  return (
    <>
      <button
        onClick={startParty}
        disabled={isPartyTime}
        className="fixed bottom-4 right-4 bg-white rounded-full w-16 h-16 shadow-lg flex items-center justify-center text-3xl hover:scale-110 transition-transform z-[9999] cursor-pointer border-2 border-gray-200"
        title="Hot Dog Party!"
        style={{ fontSize: '2rem' }}
      >
        🌭
      </button>
      {hotdogs.map(({ id, left, top, scale, rotation, delay }) => (
        <div
          key={id}
          className="fixed pointer-events-none z-[9998] text-4xl"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            animation: 'hotdog 5s ease-out forwards',
            animationDelay: `${delay}s`,
            fontSize: '3rem'
          }}
        >
          🌭
        </div>
      ))}
    </>
  );
};

export default HotDogParty;
