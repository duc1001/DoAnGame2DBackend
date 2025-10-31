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

module.exports = (io, pool) => {
  
  io.on('connection', (socket) => {
    console.log(`Một người chơi đã kết nối: ${socket.id}`);

    // === 1. Xử lý tìm trận ===
    socket.on('find_game', () => {
      console.log(`Người chơi ${socket.id} đang tìm trận...`);
      
      if (waitingPlayer) {
        // --- Đã có người chờ -> Ghép cặp ---
        const player1Socket = waitingPlayer;
        const player2Socket = socket;
        const roomId = `${player1Socket.id}-${player2Socket.id}`;
        
        // Reset người chờ
        waitingPlayer = null;
        
        // Tạo bảng trống
        const initialBoard = Array(boardSize).fill(0).map(() => Array(boardSize).fill(empty));
        
        // Tạo phòng
        rooms[roomId] = {
          players: [player1Socket.id, player2Socket.id],
          board: initialBoard,
          turn: player1, // Player 1 (X) đi trước
        };

        // Cho cả 2 vào chung 1 room của socket.io
        player1Socket.join(roomId);
        player2Socket.join(roomId);

        // Gửi thông báo "Tìm thấy trận" cho cả 2
        console.log(`Trận đấu bắt đầu: ${roomId}`);
        player1Socket.emit('game_found', { roomId: roomId, player: player1, turn: player1, board: initialBoard });
        player2Socket.emit('game_found', { roomId: roomId, player: player2, turn: player1, board: initialBoard });

      } else {
        // --- Chưa có ai chờ -> Cho vào hàng chờ ---
        waitingPlayer = socket;
        socket.emit('waiting_for_opponent', { message: 'Đang tìm đối thủ...' });
      }
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
      
      // Nếu người chơi này đang ở hàng chờ -> Xóa khỏi hàng chờ
      if (waitingPlayer && waitingPlayer.id === socket.id) {
        waitingPlayer = null;
        console.log('Xóa khỏi hàng chờ.');
        return;
      }

      // Nếu người chơi này đang ở trong phòng -> Báo cho người kia
      let roomId = Object.keys(rooms).find(id => rooms[id].players.includes(socket.id));
      if (roomId) {
        io.to(roomId).emit('opponent_disconnected', { message: 'Đối thủ đã thoát!' });
        delete rooms[roomId]; // Xóa phòng
        console.log(`Đã xóa phòng ${roomId} do người chơi thoát.`);
      }
    });

  });
};