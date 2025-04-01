import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

const CooperParty = () => {
  const [isPartyTime, setIsPartyTime] = useState(false);

  const startParty = () => {
    setIsPartyTime(true);
    
    // Create confetti
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const colors = ['#FFD700', '#FFA500', '#FF6B6B'];
    
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());

    // Add clapping hands emojis
    const emojis = Array(15).fill('👏');
    emojis.forEach((emoji, i) => {
      const el = document.createElement('div');
      el.innerHTML = emoji;
      el.className = 'flying-emoji';
      el.style.cssText = `
        position: fixed;
        font-size: 2rem;
        pointer-events: none;
        left: ${Math.random() * 100}vw;
        top: ${Math.random() * 100}vh;
        animation: flyAndFade 2s ease-out forwards;
      `;
      document.body.appendChild(el);
      setTimeout(() => document.body.removeChild(el), 2000);
    });

    setTimeout(() => {
      setIsPartyTime(false);
    }, 2000);
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
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <button
      onClick={startParty}
      className="bg-yellow-400 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2"
      disabled={isPartyTime}
    >
      <span>Pre-Congratulate Cooper!</span>
      <span>🎉</span>
    </button>
  );
};

export default CooperParty;
