// src/services/socket.service.js (ĐÃ GỘP CARO VÀ CỜ VUA)

// --- HẰNG SỐ CARO ---
const boardSize = 20; // Kích thước bàn cờ Caro
const empty = 0;
const player1 = 1; // X
const player2 = 2; // O

// --- HẰNG SỐ CỜ VUA ---
const CHESS_BOARD_SIZE = 8;
const CHESS_WHITE = 'white';
const CHESS_BLACK = 'black';

// --- LOGIC KIỂM TRA THẮNG CARO (Giữ nguyên) ---
function checkWin(board, row, col, player) {
  // ... (giữ nguyên logic checkWin của Caro)
  const directions = [
    [1, 0], [0, 1], [1, 1], [1, -1] // Ngang, Dọc, Chéo xuôi, Chéo ngược
  ];

  for (let [dr, dc] of directions) {
    let count = 1;
    // Kiểm tra theo một hướng
    for (let i = 1; i < 5; i++) {
      let r = row + i * dr;
      let c = col + i * dc;
      if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === player) {
        count++;
      } else {
        break;
      }
    }
    // Kiểm tra theo hướng ngược lại
    for (let i = 1; i < 5; i++) {
      let r = row - i * dr;
      let c = col - i * dc;
      if (r >= 0 && r < boardSize && c >= 0 && c < boardSize && board[r][c] === player) {
        count++;
      } else {
        break;
      }
    }
    if (count >= 5) return true;
  }
  return false;
}

function checkDraw(board) {
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      if (board[r][c] === empty) {
        return false; // Còn ô trống
      }
    }
  }
  return true; // Đầy bàn cờ
}

// --- LOGIC CỜ VUA (Đã gộp vào) ---
// (Giữ nguyên các hàm isValidPawnMove, isValidRookMove, v.v. đã có ở chess_socket.service.js)
// Tôi sẽ không dán lại chúng ở đây để tránh file quá dài, nhưng bạn hãy COPY chúng từ file chess_socket.service.js cũ vào đây.

// --- Hàm khởi tạo bàn cờ vua ---
function initializeChessBoard() {
    const board = Array(CHESS_BOARD_SIZE).fill(null).map(() => Array(CHESS_BOARD_SIZE).fill(null));
    // Quân đen
    board[0] = [
        { symbol: '♜', color: CHESS_BLACK, type: 'rook' },
        { symbol: '♞', color: CHESS_BLACK, type: 'knight' },
        { symbol: '♝', color: CHESS_BLACK, type: 'bishop' },
        { symbol: '♛', color: CHESS_BLACK, type: 'queen' },
        { symbol: '♚', color: CHESS_BLACK, type: 'king' },
        { symbol: '♝', color: CHESS_BLACK, type: 'bishop' },
        { symbol: '♞', color: CHESS_BLACK, type: 'knight' },
        { symbol: '♜', color: CHESS_BLACK, type: 'rook' }
    ];
    for (let i = 0; i < CHESS_BOARD_SIZE; i++) {
        board[1][i] = { symbol: '♟', color: CHESS_BLACK, type: 'pawn' };
    }
    // Quân trắng
    for (let i = 0; i < CHESS_BOARD_SIZE; i++) {
        board[6][i] = { symbol: '♙', color: CHESS_WHITE, type: 'pawn' };
    }
    board[7] = [
        { symbol: '♖', color: CHESS_WHITE, type: 'rook' },
        { symbol: '♘', color: CHESS_WHITE, type: 'knight' },
        { symbol: '♗', color: CHESS_WHITE, type: 'bishop' },
        { symbol: '♕', color: CHESS_WHITE, type: 'queen' },
        { symbol: '♔', color: CHESS_WHITE, type: 'king' },
        { symbol: '♗', color: CHESS_WHITE, type: 'bishop' },
        { symbol: '♘', color: CHESS_WHITE, type: 'knight' },
        { symbol: '♖', color: CHESS_WHITE, type: 'rook' }
    ];
    return board;
}
// Giữ nguyên isValidMove, isValidPawnMove, isValidRookMove, isValidKnightMove, isValidBishopMove, isValidQueenMove, isValidKingMove, isCheckmate từ file chess_socket.service.js cũ.

// --- QUẢN LÝ PHÒNG (Cho cả Caro và Cờ Vua) ---
// Thay vì `rooms` chung, chúng ta quản lý các loại phòng riêng biệt
let gameRooms = {}; // { roomId: { type: 'caro'/'chess', players: [...], board: [...], turn: '...' }}
let caroWaitingPlayer = null; // Dành cho Caro cũ (nếu muốn giữ matchmaking)
let chessWaitingPlayer = null; // Dành cho Cờ vua cũ (nếu muốn giữ matchmaking)

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

module.exports = (io, pool) => {
  io.on('connection', (socket) => {
    console.log(`Một người chơi đã kết nối: ${socket.id}`);

    // --- 1. TẠO PHÒNG MỚI (CHUNG CHO CẢ 2 GAME) ---
    socket.on('create_room', (data) => {
      const { gameType } = data; // 'caro' hoặc 'chess'
      const roomId = generateRoomId();
      console.log(`Người chơi ${socket.id} đã tạo phòng ${gameType}: ${roomId}`);

      let initialBoard;
      let initialTurn;
      let playerColor;

      if (gameType === 'caro') {
        initialBoard = Array(boardSize).fill(0).map(() => Array(boardSize).fill(empty));
        initialTurn = player1; // Caro P1 đi trước
        playerColor = player1;
      } else if (gameType === 'chess') {
        initialBoard = initializeChessBoard();
        initialTurn = CHESS_WHITE; // Cờ Vua Trắng đi trước
        playerColor = CHESS_WHITE;
      } else {
        return socket.emit('error_game', { message: 'Loại game không hợp lệ!' });
      }
      
      gameRooms[roomId] = {
        type: gameType,
        players: [socket.id], // Người tạo là người chơi 1 (Caro P1, Chess White)
        board: initialBoard,
        turn: initialTurn, 
      };

      socket.join(roomId);

      // Gửi thông báo "Tạo phòng thành công" CHỈ cho người tạo
      socket.emit('room_created', { 
        roomId: roomId, 
        player: playerColor, // player1/CHESS_WHITE
        turn: initialTurn, 
        board: initialBoard,
        gameType: gameType
      });
    });

    // --- 2. VÀO PHÒNG (CHUNG CHO CẢ 2 GAME) ---
    socket.on('join_room', (data) => {
      const { roomId } = data;
      const room = gameRooms[roomId];

      if (!room) {
        return socket.emit('error_game', { message: 'Phòng không tồn tại!' });
      }
      if (room.players.length >= 2) {
        return socket.emit('error_game', { message: 'Phòng đã đầy!' });
      }

      console.log(`Người chơi ${socket.id} đã vào phòng ${room.type}: ${roomId}`);
      room.players.push(socket.id); // Người vào là người chơi 2

      socket.join(roomId);

      // Xác định màu/số người chơi cho người tạo và người vào
      let player1Info, player2Info;
      if (room.type === 'caro') {
        player1Info = { roomId: roomId, player: player1, turn: room.turn, board: room.board, gameType: 'caro' };
        player2Info = { roomId: roomId, player: player2, turn: room.turn, board: room.board, gameType: 'caro' };
      } else { // chess
        player1Info = { roomId: roomId, player: CHESS_WHITE, turn: room.turn, board: room.board, gameType: 'chess' };
        player2Info = { roomId: roomId, player: CHESS_BLACK, turn: room.turn, board: room.board, gameType: 'chess' };
      }
      
      // Gửi thông báo "Bắt đầu game" cho TẤT CẢ mọi người trong phòng
      io.to(room.players[0]).emit('game_start', player1Info); // Gửi cho người tạo
      io.to(room.players[1]).emit('game_start', player2Info); // Gửi cho người vào
    });


    // --- 3. XỬ LÝ NƯỚC ĐI CARO ---
    socket.on('make_caro_move', (data) => { // Đổi tên event thành make_caro_move
      const { roomId, row, col, player } = data;
      const room = gameRooms[roomId];

      if (!room || room.type !== 'caro') return socket.emit('error_game', { message: 'Không tìm thấy phòng Caro hoặc không phải phòng Caro' });
      if (room.turn !== player) return socket.emit('error_game', { message: 'Không phải lượt của bạn' });
      if (room.board[row][col] !== empty) return socket.emit('error_game', { message: 'Ô đã đánh' });

      room.board[row][col] = player;

      if (checkWin(room.board, row, col, player)) {
        io.to(roomId).emit('game_over', { winner: player, board: room.board, gameType: 'caro' });
        delete gameRooms[roomId];
        return;
      }
      if (checkDraw(room.board)) {
        io.to(roomId).emit('game_over', { winner: 'draw', board: room.board, gameType: 'caro' });
        delete gameRooms[roomId];
        return;
      }

      room.turn = (player === player1) ? player2 : player1;
      io.to(roomId).emit('move_made', { board: room.board, turn: room.turn, gameType: 'caro' });
    });

    // --- 4. XỬ LÝ NƯỚC ĐI CỜ VUA ---
    socket.on('make_chess_move', (data) => { // Vẫn giữ tên event này
      const { roomId, from, to, color } = data;
      const room = gameRooms[roomId];

      if (!room || room.type !== 'chess') return socket.emit('chess_error', { message: 'Không tìm thấy phòng Cờ vua hoặc không phải phòng Cờ vua' });
      if (room.turn !== color) return socket.emit('chess_error', { message: 'Không phải lượt của bạn' });
      
      const [fromRow, fromCol] = from;
      const [toRow, toCol] = to;
      const piece = room.board[fromRow][fromCol];
      
      if (!piece) return socket.emit('chess_error', { message: 'Không có quân ở vị trí này' });
      if (piece.color !== color) return socket.emit('chess_error', { message: 'Không phải quân của bạn' });
      
      // Kiểm tra nước đi hợp lệ (sử dụng các hàm Cờ vua đã định nghĩa)
      if (!isValidMove(room.board, from, to, piece, color)) {
        return socket.emit('chess_error', { message: 'Nước đi không hợp lệ' });
      }

      // ... (Giữ nguyên logic thực hiện nước đi, phong cấp, lưu lịch sử, kiểm tra chiếu hết của Cờ vua)
      const capturedPiece = room.board[toRow][toCol];
      room.board[toRow][toCol] = piece;
      room.board[fromRow][fromCol] = null;
      
      // Phong cấp tốt
      if (piece.type === 'pawn') {
        if ((color === CHESS_WHITE && toRow === 0) || (color === CHESS_BLACK && toRow === 7)) {
          room.board[toRow][toCol] = {
            symbol: color === CHESS_WHITE ? '♕' : '♛',
            color: color,
            type: 'queen'
          };
        }
      }
      
      // Lưu lịch sử
      // room.moveHistory.push({ from, to, piece: piece.symbol, captured: capturedPiece?.symbol }); // Nếu có dùng
      
      // Kiểm tra chiếu hết
      const opponentColor = color === CHESS_WHITE ? CHESS_BLACK : CHESS_WHITE;
      if (isCheckmate(room.board, opponentColor)) {
        io.to(roomId).emit('chess_game_over', { 
          winner: color, 
          board: room.board,
          message: `${color === CHESS_WHITE ? 'Trắng' : 'Đen'} thắng!`,
          gameType: 'chess'
        });
        delete gameRooms[roomId];
        return;
      }

      // Đổi lượt
      room.turn = opponentColor;
      
      io.to(roomId).emit('chess_move_made', { 
        board: room.board, 
        turn: room.turn,
        lastMove: { from, to },
        gameType: 'chess'
      });
    });

    // --- 5. XỬ LÝ NGẮT KẾT NỐI (CHUNG) ---
    socket.on('disconnect', () => {
      console.log(`🚪 Người chơi đã ngắt kết nối: ${socket.id}`);
      
      // Xử lý hàng chờ matchmaking (nếu còn dùng)
      if (caroWaitingPlayer && caroWaitingPlayer.id === socket.id) {
        caroWaitingPlayer = null;
      }
      if (chessWaitingPlayer && chessWaitingPlayer.id === socket.id) {
        chessWaitingPlayer = null;
      }

      // Tìm phòng mà người chơi này đang ở
      let roomId = Object.keys(gameRooms).find(id => gameRooms[id].players.includes(socket.id));
      if (roomId) {
        const room = gameRooms[roomId];
        io.to(roomId).emit('opponent_disconnected', { message: 'Đối thủ đã thoát!', gameType: room.type });
        delete gameRooms[roomId]; // Xóa phòng
        console.log(`🗑️ Đã xóa phòng ${roomId} (${room.type}) do người chơi thoát.`);
      }
    });

    // --- 6. CÁC EVENT MATCHMAKING CŨ (Nếu vẫn muốn dùng cho cờ vua) ---
    socket.on('find_chess_game', () => {
      console.log(`🔍 ${socket.id} đang tìm trận cờ vua...`);
      
      if (chessWaitingPlayer) {
        if (chessWaitingPlayer.id === socket.id) {
          console.log(`⚠️ ${socket.id} đã ở trong hàng chờ cờ vua.`);
          return;
        }
        
        // Ghép cặp
        const player1Socket = chessWaitingPlayer;
        const player2Socket = socket;
        const roomId = generateRoomId(); // Dùng roomId chung
        
        chessWaitingPlayer = null;
        
        // Tạo bàn cờ ban đầu
        const initialBoard = initializeChessBoard();
        
        gameRooms[roomId] = { // Sử dụng gameRooms chung
          type: 'chess', // Loại game
          players: [player1Socket.id, player2Socket.id],
          board: initialBoard,
          turn: CHESS_WHITE, // Trắng đi trước
          // moveHistory: [] // Nếu cần
        };

        player1Socket.join(roomId);
        player2Socket.join(roomId);

        console.log(`✅ Trận cờ vua bắt đầu (matchmaking): ${roomId}`);
        player1Socket.emit('game_start', { // Dùng game_start để chuyển màn hình
          roomId, 
          player: CHESS_WHITE, 
          turn: CHESS_WHITE, 
          board: initialBoard,
          gameType: 'chess' // RẤT QUAN TRỌNG
        });
        player2Socket.emit('game_start', { // Dùng game_start để chuyển màn hình
          roomId, 
          player: CHESS_BLACK, 
          turn: CHESS_WHITE, 
          board: initialBoard,
          gameType: 'chess' // RẤT QUAN TRỌNG
        });

      } else {
        chessWaitingPlayer = socket;
        socket.emit('waiting_for_chess_opponent', { message: 'Đang tìm đối thủ...', gameType: 'chess' });
      }
    });

  });
};