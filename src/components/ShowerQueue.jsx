import React from "react";
import { CheckCircle, Clock, Trash2 } from "lucide-react";

function ShowerQueue({ queue, setQueue }) {
  const handleRemove = (guestId) => {
    setQueue((prev) => prev.filter((guest) => guest.id !== guestId));
  };

  const getSlotTime = (index) => {
    const now = new Date();
    const minutes = Math.floor(now.getMinutes() / 15) * 15;
    now.setMinutes(minutes, 0, 0);
    const slotOffset = Math.floor(index / 2) * 15;
    now.setMinutes(now.getMinutes() + slotOffset);
    return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="list-container">
      {queue.length === 0 ? (
        <p>Shower queue is empty.</p>
      ) : (
        <ul>
          {queue.map((guest, index) => (
            <li
              key={`${guest.id}-${index}`}
              className={`list-item ${index < 2 ? "active-service" : ""}`}
            >
              <div className="guest-info">
                <strong>{guest.name}</strong>
                <small>
                  <Clock size={12} /> {getSlotTime(index)}
                </small>
              </div>
              {index < 2 && (
                <span className="in-use-label">
                  <CheckCircle size={14} /> In Use
                </span>
              )}
              <button
                onClick={() => handleRemove(guest.id)}
                className="remove-btn"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ShowerQueue;
