// src/services/chess_socket.service.js (FILE MỚI)

// === LOGIC KIỂM TRA THẮNG CỜ VUA ===
function isValidMove(board, from, to, piece, player) {
  const [fromRow, fromCol] = from;
  const [toRow, toCol] = to;
  
  // Kiểm tra ô đích
  const targetPiece = board[toRow][toCol];
  if (targetPiece && targetPiece.color === player) {
    return false; // Không thể ăn quân cùng màu
  }
  
  const type = piece.type;
  const color = piece.color;
  
  switch(type) {
    case 'pawn':
      return isValidPawnMove(board, fromRow, fromCol, toRow, toCol, color);
    case 'rook':
      return isValidRookMove(board, fromRow, fromCol, toRow, toCol);
    case 'knight':
      return isValidKnightMove(fromRow, fromCol, toRow, toCol);
    case 'bishop':
      return isValidBishopMove(board, fromRow, fromCol, toRow, toCol);
    case 'queen':
      return isValidQueenMove(board, fromRow, fromCol, toRow, toCol);
    case 'king':
      return isValidKingMove(fromRow, fromCol, toRow, toCol);
    default:
      return false;
  }
}

function isValidPawnMove(board, fromRow, fromCol, toRow, toCol, color) {
  const direction = color === 'white' ? -1 : 1;
  const startRow = color === 'white' ? 6 : 1;
  
  // Di chuyển thẳng
  if (fromCol === toCol) {
    if (toRow === fromRow + direction && !board[toRow][toCol]) {
      return true;
    }
    if (fromRow === startRow && toRow === fromRow + direction * 2 && 
        !board[fromRow + direction][fromCol] && !board[toRow][toCol]) {
      return true;
    }
  }
  
  // Ăn chéo
  if (Math.abs(fromCol - toCol) === 1 && toRow === fromRow + direction) {
    if (board[toRow][toCol] && board[toRow][toCol].color !== color) {
      return true;
    }
  }
  
  return false;
}

function isValidRookMove(board, fromRow, fromCol, toRow, toCol) {
  if (fromRow !== toRow && fromCol !== toCol) return false;
  
  const rowStep = fromRow === toRow ? 0 : (toRow > fromRow ? 1 : -1);
  const colStep = fromCol === toCol ? 0 : (toCol > fromCol ? 1 : -1);
  
  let row = fromRow + rowStep;
  let col = fromCol + colStep;
  
  while (row !== toRow || col !== toCol) {
    if (board[row][col]) return false;
    row += rowStep;
    col += colStep;
  }
  
  return true;
}

function isValidKnightMove(fromRow, fromCol, toRow, toCol) {
  const rowDiff = Math.abs(toRow - fromRow);
  const colDiff = Math.abs(toCol - fromCol);
  return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
}

function isValidBishopMove(board, fromRow, fromCol, toRow, toCol) {
  if (Math.abs(toRow - fromRow) !== Math.abs(toCol - fromCol)) return false;
  
  const rowStep = toRow > fromRow ? 1 : -1;
  const colStep = toCol > fromCol ? 1 : -1;
  
  let row = fromRow + rowStep;
  let col = fromCol + colStep;
  
  while (row !== toRow) {
    if (board[row][col]) return false;
    row += rowStep;
    col += colStep;
  }
  
  return true;
}

function isValidQueenMove(board, fromRow, fromCol, toRow, toCol) {
  return isValidRookMove(board, fromRow, fromCol, toRow, toCol) ||
         isValidBishopMove(board, fromRow, fromCol, toRow, toCol);
}

function isValidKingMove(fromRow, fromCol, toRow, toCol) {
  return Math.abs(toRow - fromRow) <= 1 && Math.abs(toCol - fromCol) <= 1;
}

function isCheckmate(board, color) {
  // Đơn giản hóa: Kiểm tra xem Vua có bị ăn không
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return false; // Vua còn sống
      }
    }
  }
  return true; // Vua đã bị ăn = Checkmate
}

// === QUẢN LÝ PHÒNG ===
let waitingPlayer = null;
let rooms = {};

module.exports = (io, pool) => {
  
  io.on('connection', (socket) => {
    console.log(`♟️ Người chơi cờ vua kết nối: ${socket.id}`);

    // === 1. TÌM TRẬN ===
    socket.on('find_chess_game', () => {
      console.log(`🔍 ${socket.id} đang tìm trận cờ vua...`);
      
      if (waitingPlayer) {
        if (waitingPlayer.id === socket.id) {
          console.log(`⚠️ ${socket.id} đã ở trong hàng chờ.`);
          return;
        }
        
        // Ghép cặp
        const player1Socket = waitingPlayer;
        const player2Socket = socket;
        const roomId = `chess-${player1Socket.id}-${player2Socket.id}`;
        
        waitingPlayer = null;
        
        // Tạo bàn cờ ban đầu
        const initialBoard = initializeChessBoard();
        
        rooms[roomId] = {
          players: [player1Socket.id, player2Socket.id],
          board: initialBoard,
          turn: 'white', // Trắng đi trước
          moveHistory: []
        };

        player1Socket.join(roomId);
        player2Socket.join(roomId);

        console.log(`✅ Trận cờ vua bắt đầu: ${roomId}`);
        player1Socket.emit('chess_game_found', { 
          roomId, 
          color: 'white', 
          turn: 'white', 
          board: initialBoard 
        });
        player2Socket.emit('chess_game_found', { 
          roomId, 
          color: 'black', 
          turn: 'white', 
          board: initialBoard 
        });

      } else {
        waitingPlayer = socket;
        socket.emit('waiting_for_chess_opponent', { message: 'Đang tìm đối thủ...' });
      }
    });

    // === 2. NƯỚC ĐI ===
    socket.on('make_chess_move', (data) => {
      const { roomId, from, to, color } = data;
      const room = rooms[roomId];

      if (!room) return socket.emit('chess_error', { message: 'Không tìm thấy phòng' });
      if (room.turn !== color) return socket.emit('chess_error', { message: 'Không phải lượt của bạn' });
      
      const [fromRow, fromCol] = from;
      const [toRow, toCol] = to;
      const piece = room.board[fromRow][fromCol];
      
      if (!piece) return socket.emit('chess_error', { message: 'Không có quân ở vị trí này' });
      if (piece.color !== color) return socket.emit('chess_error', { message: 'Không phải quân của bạn' });
      
      // Kiểm tra nước đi hợp lệ
      if (!isValidMove(room.board, from, to, piece, color)) {
        return socket.emit('chess_error', { message: 'Nước đi không hợp lệ' });
      }

      // Thực hiện nước đi
      const capturedPiece = room.board[toRow][toCol];
      room.board[toRow][toCol] = piece;
      room.board[fromRow][fromCol] = null;
      
      // Phong cấp tốt
      if (piece.type === 'pawn') {
        if ((color === 'white' && toRow === 0) || (color === 'black' && toRow === 7)) {
          room.board[toRow][toCol] = {
            symbol: color === 'white' ? '♕' : '♛',
            color: color,
            type: 'queen'
          };
        }
      }
      
      // Lưu lịch sử
      room.moveHistory.push({ from, to, piece: piece.symbol, captured: capturedPiece?.symbol });
      
      // Kiểm tra chiếu hết
      const opponentColor = color === 'white' ? 'black' : 'white';
      if (isCheckmate(room.board, opponentColor)) {
        io.to(roomId).emit('chess_game_over', { 
          winner: color, 
          board: room.board,
          message: `${color === 'white' ? 'Trắng' : 'Đen'} thắng!`
        });
        delete rooms[roomId];
        return;
      }

      // Đổi lượt
      room.turn = opponentColor;
      
      io.to(roomId).emit('chess_move_made', { 
        board: room.board, 
        turn: room.turn,
        lastMove: { from, to }
      });
    });

    // === 3. NGẮT KẾT NỐI ===
    socket.on('disconnect', () => {
      console.log(`🚪 Người chơi cờ vua ngắt kết nối: ${socket.id}`);
      
      if (waitingPlayer && waitingPlayer.id === socket.id) {
        waitingPlayer = null;
        return;
      }

      const roomId = Object.keys(rooms).find(id => 
        id.startsWith('chess-') && rooms[id].players.includes(socket.id)
      );
      
      if (roomId) {
        io.to(roomId).emit('chess_opponent_disconnected', { message: 'Đối thủ đã thoát!' });
        delete rooms[roomId];
        console.log(`🗑️ Đã xóa phòng cờ vua ${roomId}`);
      }
    });

  });
};

// === KHỞI TẠO BÀN CỜ ===
function initializeChessBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  
  // Quân đen
  board[0] = [
    { symbol: '♜', color: 'black', type: 'rook' },
    { symbol: '♞', color: 'black', type: 'knight' },
    { symbol: '♝', color: 'black', type: 'bishop' },
    { symbol: '♛', color: 'black', type: 'queen' },
    { symbol: '♚', color: 'black', type: 'king' },
    { symbol: '♝', color: 'black', type: 'bishop' },
    { symbol: '♞', color: 'black', type: 'knight' },
    { symbol: '♜', color: 'black', type: 'rook' }
  ];
  for (let i = 0; i < 8; i++) {
    board[1][i] = { symbol: '♟', color: 'black', type: 'pawn' };
  }
  
  // Quân trắng
  for (let i = 0; i < 8; i++) {
    board[6][i] = { symbol: '♙', color: 'white', type: 'pawn' };
  }
  board[7] = [
    { symbol: '♖', color: 'white', type: 'rook' },
    { symbol: '♘', color: 'white', type: 'knight' },
    { symbol: '♗', color: 'white', type: 'bishop' },
    { symbol: '♕', color: 'white', type: 'queen' },
    { symbol: '♔', color: 'white', type: 'king' },
    { symbol: '♗', color: 'white', type: 'bishop' },
    { symbol: '♘', color: 'white', type: 'knight' },
    { symbol: '♖', color: 'white', type: 'rook' }
  ];
  
  return board;
}