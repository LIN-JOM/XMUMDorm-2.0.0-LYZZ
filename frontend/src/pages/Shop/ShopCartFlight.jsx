import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ShopCartFlight({ flight }) {
  const [finished, setFinished] = useState(null);
  useEffect(() => {
    if (!flight) return;
    const timer = setTimeout(() => setFinished(flight.id), 800);
    return () => clearTimeout(timer);
  }, [flight]);
  if (!flight || finished === flight.id) return null;
  return createPortal(<img key={flight.id} className="shop-cart-flight" src={flight.image} alt="" aria-hidden="true" style={{ '--flight-x': `${flight.origin.x}px`, '--flight-y': `${flight.origin.y}px`, '--flight-dx': `${flight.target.x - flight.origin.x}px`, '--flight-dy': `${flight.target.y - flight.origin.y}px` }} />, document.body);
}
