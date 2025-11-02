// src/services/socket.service.js (FILE MỚI)

// Logic kiểm tra thắng (copy từ code Flutter của bạn và điều chỉnh 1 chút)
const boardSize = 15;
const empty = 0;
const player1 = 1;
const player2 = 2;

function checkWin(board, r, c, player) {
  // 1. Ngang
  let count = 0;
  for (let i = 0; i < boardSize; i++) {
    count = (board[r][i] === player) ? count + 1 : 0;
    if (count >= 5) return true;
  }
  // 2. Dọc
  count = 0;
  for (let i = 0; i < boardSize; i++) {
    count = (board[i][c] === player) ? count + 1 : 0;
    if (count >= 5) return true;
  }
  // 3. Chéo chính
  count = 0;
  for (let i = -4; i <= 4; i++) {
    let row = r + i, col = c + i;
    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize && board[row][col] === player) {
      count++;
      if (count >= 5) return true;
    } else {
      count = 0;
    }
  }
  // 4. Chéo phụ
  count = 0;
  for (let i = -4; i <= 4; i++) {
    let row = r + i, col = c - i;
    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize && board[row][col] === player) {
      count++;
      if (count >= 5) return true;
    } else {
      count = 0;
    }
  }
  return false;
}

function checkDraw(board) {
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (board[r][c] === empty) return false;
        }
    }
    return true;
}

// Biến quản lý trạng thái
let waitingPlayer = null; // Người chơi đang chờ
let rooms = {}; // Lưu trữ các phòng chơi: { roomId: { players: [socket1, socket2], board: [...], turn: ... } }
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
module.exports = (io, pool) => {
  
  io.on('connection', (socket) => {
    console.log(`Một người chơi đã kết nối: ${socket.id}`);

    // === 1. Xử lý tìm trận ===
    socket.on('create_room', () => {
      const roomId = generateRoomId();
      console.log(`Người chơi ${socket.id} đã tạo phòng: ${roomId}`);

      // Tạo bảng trống
      const initialBoard = Array(boardSize).fill(0).map(() => Array(boardSize).fill(empty));
      
      // Tạo phòng
      rooms[roomId] = {
        players: [socket.id], // Người tạo là player 1
        board: initialBoard,
        turn: player1, 
      };

      // Cho người tạo vào phòng
      socket.join(roomId);

      // Gửi thông báo "Tạo phòng thành công" CHỈ cho người tạo
      socket.emit('room_created', { 
        roomId: roomId, 
        player: player1, 
        turn: player1, 
        board: initialBoard 
      });
    });

    // === 2. VÀO PHÒNG ===
    socket.on('join_room', (data) => {
      const { roomId } = data;
      const room = rooms[roomId];

      // 2a. Kiểm tra phòng có tồn tại không
      if (!room) {
        return socket.emit('error_game', { message: 'Phòng không tồn tại!' });
      }

      // 2b. Kiểm tra phòng có đầy không
      if (room.players.length >= 2) {
        return socket.emit('error_game', { message: 'Phòng đã đầy!' });
      }

      // 2c. Vào phòng thành công
      console.log(`Người chơi ${socket.id} đã vào phòng: ${roomId}`);
      room.players.push(socket.id); // Người vào là player 2
      socket.join(roomId);

      // Gửi thông báo "Bắt đầu game" cho TẤT CẢ mọi người trong phòng
      const initialDataP1 = { 
        roomId: roomId, 
        player: player1, // Người tạo là P1
        turn: room.turn, 
        board: room.board 
      };
      const initialDataP2 = { 
        roomId: roomId, 
        player: player2, // Người vào là P2
        turn: room.turn, 
        board: room.board 
      };
      
      // Gửi cho người tạo (P1)
      io.to(room.players[0]).emit('game_start', initialDataP1);
      // Gửi cho người vào (P2)
      io.to(room.players[1]).emit('game_start', initialDataP2);
    });

    // === 2. Xử lý nước đi ===
    socket.on('make_move', (data) => {
      const { roomId, row, col, player } = data;
      const room = rooms[roomId];

      // Kiểm tra xem phòng có tồn tại không
      if (!room) return socket.emit('error_game', { message: 'Không tìm thấy phòng' });
      
      // Kiểm tra lượt đi
      if (room.turn !== player) return socket.emit('error_game', { message: 'Không phải lượt của bạn' });
      
      // Kiểm tra ô hợp lệ
      if (room.board[row][col] !== empty) return socket.emit('error_game', { message: 'Ô đã được đánh' });

      // Cập nhật bàn cờ
      room.board[row][col] = player;
      
      // Kiểm tra thắng
      if (checkWin(room.board, row, col, player)) {
        io.to(roomId).emit('game_over', { winner: player, board: room.board });
        // (Sau này có thể thêm logic lưu kết quả vào DB ở đây)
        delete rooms[roomId]; // Xóa phòng sau khi kết thúc
        return;
      }
      
      // Kiểm tra hòa
      if (checkDraw(room.board)) {
        io.to(roomId).emit('game_over', { winner: 'draw', board: room.board });
        delete rooms[roomId]; // Xóa phòng
        return;
      }

      // Đổi lượt
      room.turn = (player === player1) ? player2 : player1;
      
      // Gửi trạng thái bàn cờ mới cho cả 2 người chơi
      io.to(roomId).emit('move_made', { 
        board: room.board, 
        turn: room.turn 
      });
    });

    // === 3. Xử lý mất kết nối ===
    socket.on('disconnect', () => {
      console.log(`Người chơi đã ngắt kết nối: ${socket.id}`);
      
      // Tìm phòng mà người chơi này đang ở
      let roomId = Object.keys(rooms).find(id => rooms[id].players.includes(socket.id));
      if (roomId) {
        // Báo cho người chơi CÒN LẠI
        io.to(roomId).emit('opponent_disconnected', { message: 'Đối thủ đã thoát!' });
        delete rooms[roomId]; // Xóa phòng
        console.log(`Đã xóa phòng ${roomId} do người chơi thoát.`);
      }
    });

  });
};