import { Trash2 } from 'lucide-react';

export default function LaundryList({ list, setList }) {
  const slots = [
    '8:30 - 9:30',
    '9:30 - 10:30',
    '10:30 - 11:30',
    '11:30 - 12:30',
    '12:30 - 1:30',
  ];

  const handleSlotChange = (guestId, slot) => {
    setList(prev => prev.map(guest =>
      guest.id === guestId ? { ...guest, slot } : guest
    ));
  };

  const handleRemove = (guestId) => {
    setList(prev => prev.filter(guest => guest.id !== guestId));
  };

  const slotsUsed = list.filter(guest => guest.slot).length;

  return (
    <div className="list-container">
      {list.length === 0 ? (
        <p>Laundry list is empty.</p>
      ) : (
        <ul>
          {list.map((guest, index) => (
            <li key={`${guest.id}-${index}`} className="list-item">
              <span><strong>{index + 1}.</strong> {guest.name}</span>
              <select
                value={guest.slot || ''}
                onChange={e => handleSlotChange(guest.id, e.target.value)}
                disabled={!!guest.slot || (slotsUsed >= 5 && !guest.slot)}
                className="ml-2 border rounded px-2 py-1"
              >
                <option value="">Select Slot</option>
                {slots.map(slot => (
                  <option key={slot} value={slot} disabled={list.some(g => g.slot === slot && g.id !== guest.id)}>
                    {slot}
                  </option>
                ))}
              </select>
              <button onClick={() => handleRemove(guest.id)} className="remove-btn ml-2"><Trash2 size={16} /></button>
              {guest.slot && <span className="ml-2 text-green-600">{guest.slot}</span>}
            </li>
          ))}
        </ul>
      )}
      <div className="slot-counter">
        <strong>Slots Used:</strong> {slotsUsed} / 5
      </div>
    </div>
  );
}
