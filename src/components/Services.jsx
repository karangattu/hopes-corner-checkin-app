import React, { useState } from "react";
import { LogIn } from "lucide-react";

function Services({ guests, setShowerQueue, setLaundryList }) {
  const [selectedGuestId, setSelectedGuestId] = useState("");
  const [meals, setMeals] = useState(1);

  const handleAddToShower = () => {
    if (!selectedGuestId) return;
    const guest = guests.find((g) => g.id === parseInt(selectedGuestId));
    setShowerQueue((prev) => [...prev, guest]);
  };

  const handleAddToLaundry = () => {
    if (!selectedGuestId) return;
    setLaundryList((prev) => {
      if (prev.length >= 5) {
        alert("Laundry list is full for today.");
        return prev;
      }
      const guest = guests.find((g) => g.id === parseInt(selectedGuestId));
      return [...prev, guest];
    });
  };

  const handleLogMeals = () => {
    if (!selectedGuestId) return;
    const guest = guests.find((g) => g.id === parseInt(selectedGuestId));
    console.log(`${guest.name} received ${meals} meal(s).`);
    alert(`${guest.name} logged for ${meals} meal(s).`);
  };

  return (
    <div className="services-form">
      <select
        onChange={(e) => setSelectedGuestId(e.target.value)}
        value={selectedGuestId}
      >
        <option value="" disabled>
          Select a guest
        </option>
        {guests.map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      <div className="service-action">
        <div className="meal-selector">
          <label>Meals:</label>
          {[1, 2, 3].map((num) => (
            <button
              key={num}
              className={meals === num ? "active" : ""}
              onClick={() => setMeals(num)}
            >
              {num}
            </button>
          ))}
        </div>
        <button onClick={handleLogMeals} disabled={!selectedGuestId}>
          <LogIn size={16} /> Log Meals
        </button>
      </div>

      <div className="service-action">
        <p>Add to a waitlist:</p>
        <button onClick={handleAddToShower} disabled={!selectedGuestId}>
          Add to Shower Queue
        </button>
        <button onClick={handleAddToLaundry} disabled={!selectedGuestId}>
          Add to Laundry List
        </button>
      </div>
    </div>
  );
}

export default Services;
