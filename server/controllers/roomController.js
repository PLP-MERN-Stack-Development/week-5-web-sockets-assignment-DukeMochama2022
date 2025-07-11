// In-memory fallback for rooms (can be replaced with DB logic)
let rooms = ["general"];

exports.getRooms = (req, res) => {
  res.json(rooms);
};

exports.addRoom = (room) => {
  if (!rooms.includes(room)) {
    rooms.push(room);
  }
  return rooms;
};
