// chess.js

// ---------------- 기본 보드/유틸 ----------------
function createInitialBoard() {
  return [
    [..."rnbqkbnr"],
    [..."pppppppp"],
    [..."........"],
    [..."........"],
    [..."........"],
    [..."........"],
    [..."PPPPPPPP"],
    [..."RNBQKBNR"],
  ];
}

function inBounds(r, c) {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

function isWhite(piece) {
  return piece !== "." && piece === piece.toUpperCase();
}

function isBlack(piece) {
  return piece !== "." && piece === piece.toLowerCase();
}

function getColor(piece) {
  if (piece === ".") return null;
  return isWhite(piece) ? "white" : "black";
}

// 유니코드 말 표시
const PIECE_SYMBOLS = {
  "K": "♔", "Q": "♕", "R": "♖", "B": "♗", "N": "♘", "P": "♙",
  "k": "♚", "q": "♛", "r": "♜", "b": "♝", "n": "♞", "p": "♟",
};

// ---------------- 말 이동 규칙 ----------------
function generateMovesForPiece(board, r, c) {
  const piece = board[r][c];
  if (piece === ".") return [];
  const color = getColor(piece);
  const moves = [];
  let directions = null;

  const upper = piece.toUpperCase();

  // 폰
  if (upper === "P") {
    const dir = color === "white" ? -1 : 1;
    const startRow = color === "white" ? 6 : 1;

    // 앞으로 한 칸
    let nr = r + dir;
    if (inBounds(nr, c) && board[nr][c] === ".") {
      moves.push([nr, c]);
      // 처음 위치면 두 칸
      const nr2 = r + 2 * dir;
      if (r === startRow && board[nr2][c] === ".") {
        moves.push([nr2, c]);
      }
    }
    // 대각선 잡기
    for (let dc of [-1, 1]) {
      nr = r + dir;
      const nc = c + dc;
      if (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (target !== "." && getColor(target) !== color) {
          moves.push([nr, nc]);
        }
      }
    }
  }
  // 나이트
  else if (upper === "N") {
    const jumps = [
      [2, 1], [2, -1], [-2, 1], [-2, -1],
      [1, 2], [1, -2], [-1, 2], [-1, -2],
    ];
    for (let [dr, dc] of jumps) {
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(nr, nc)) continue;
      const target = board[nr][nc];
      if (target === "." || getColor(target) !== color) {
        moves.push([nr, nc]);
      }
    }
  }
  // 비숍
  else if (upper === "B") {
    directions = [[1,1], [1,-1], [-1,1], [-1,-1]];
  }
  // 룩
  else if (upper === "R") {
    directions = [[1,0], [-1,0], [0,1], [0,-1]];
  }
  // 퀸
  else if (upper === "Q") {
    directions = [
      [1,1], [1,-1], [-1,1], [-1,-1],
      [1,0], [-1,0], [0,1], [0,-1],
    ];
  }
  // 킹
  else if (upper === "K") {
    for (let dr of [-1, 0, 1]) {
      for (let dc of [-1, 0, 1]) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (!inBounds(nr, nc)) continue;
        const target = board[nr][nc];
        if (target === "." || getColor(target) !== color) {
          moves.push([nr, nc]);
        }
      }
    }
  }

  // 비숍/룩/퀸 슬라이딩
  if (directions) {
    for (let [dr, dc] of directions) {
      let nr = r + dr;
      let nc = c + dc;
      while (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (target === ".") {
          moves.push([nr, nc]);
        } else {
          if (getColor(target) !== color) {
            moves.push([nr, nc]);
          }
          break;
        }
        nr += dr;
        nc += dc;
      }
    }
  }

  return moves;
}

// ---------------- 체크 판정 ----------------
function findKing(board, color) {
  const target = color === "white" ? "K" : "k";
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] === target) return [r, c];
    }
  }
  return null;
}

function isSquareAttacked(board, r, c, byColor) {
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const p = board[i][j];
      if (p === ".") continue;
      if (getColor(p) !== byColor) continue;
      const moves = generateMovesForPiece(board, i, j);
      for (let [tr, tc] of moves) {
        if (tr === r && tc === c) return true;
      }
    }
  }
  return false;
}

function isInCheck(board, color) {
  const kingPos = findKing(board, color);
  if (!kingPos) return true; // 킹 없으면 진 거
  const [r, c] = kingPos;
  const opp = color === "white" ? "black" : "white";
  return isSquareAttacked(board, r, c, opp);
}

// ---------------- 합법 수 생성 ----------------
function makeMove(board, fr, fc, tr, tc) {
  const newBoard = board.map(row => row.slice());
  let piece = newBoard[fr][fc];
  newBoard[fr][fc] = ".";

  // 폰 프로모션(자동 퀸)
  if (piece.toUpperCase() === "P") {
    if ((tr === 0 && isWhite(piece)) || (tr === 7 && isBlack(piece))) {
      piece = isWhite(piece) ? "Q" : "q";
    }
  }
  newBoard[tr][tc] = piece;
  return newBoard;
}

function generateLegalMoves(board, color) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p === "." || getColor(p) !== color) continue;
      const pseudo = generateMovesForPiece(board, r, c);
      for (let [tr, tc] of pseudo) {
        const nb = makeMove(board, r, c, tr, tc);
        if (!isInCheck(nb, color)) {
          moves.push({ fr: r, fc: c, tr, tc });
        }
      }
    }
  }
  return moves;
}

// ---------------- 렌더링 & 클릭 처리 ----------------
document.addEventListener("DOMContentLoaded", () => {
  const boardEl = document.getElementById("board");
  const infoEl = document.getElementById("info");

  let board = createInitialBoard();
  let turn = "white";
  let selected = null;  // {r, c} or null
  let legalMoves = generateLegalMoves(board, turn);
  let gameOver = false;

  function updateInfo() {
    if (gameOver) return;
    const turnText = turn === "white" ? "백(white)" : "흑(black)";
    if (isInCheck(board, turn)) {
      infoEl.textContent = `턴: ${turnText} - 체크 상태!`;
    } else {
      infoEl.textContent = `턴: ${turnText}`;
    }
  }

  function drawBoard() {
    boardEl.innerHTML = "";
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement("div");
        sq.classList.add("square");
        sq.classList.add((r + c) % 2 === 0 ? "light" : "dark");
        sq.dataset.row = r;
        sq.dataset.col = c;

        // 선택/목표 하이라이트
        if (selected && selected.r === r && selected.c === c) {
          sq.classList.add("selected");
        }
        if (selected) {
          const isTarget = legalMoves.some(
            m => m.fr === selected.r && m.fc === selected.c && m.tr === r && m.tc === c
          );
          if (isTarget) sq.classList.add("target");
        }

        const piece = board[r][c];
        if (piece !== ".") {
          const symbol = PIECE_SYMBOLS[piece] || piece;
          sq.textContent = symbol;
          sq.style.color = isWhite(piece) ? "#ffffff" : "#111111";
        }

        sq.addEventListener("click", onSquareClick);
        boardEl.appendChild(sq);
      }
    }
  }

  function onSquareClick(e) {
    if (gameOver) return;

    const sq = e.currentTarget;
    const r = parseInt(sq.dataset.row, 10);
    const c = parseInt(sq.dataset.col, 10);
    const piece = board[r][c];

    if (!selected) {
      // 아직 선택 X → 자기 말만 선택
      if (piece === ".") return;
      if (getColor(piece) !== turn) return;
      selected = { r, c };
    } else {
      const fr = selected.r;
      const fc = selected.c;
      // 같은 칸 다시 클릭 → 선택 해제
      if (fr === r && fc === c) {
        selected = null;
        drawBoard();
        return;
      }

      // 이동 시도
      if (!tryMove(fr, fc, r, c)) {
        // 실패: 새로 선택 가능한 자기 말이면 선택 변경
        if (piece !== "." && getColor(piece) === turn) {
          selected = { r, c };
        } else {
          selected = null;
        }
      } else {
        selected = null;
      }
    }

    drawBoard();
  }

  function tryMove(fr, fc, tr, tc) {
    const move = legalMoves.find(
      m => m.fr === fr && m.fc === fc && m.tr === tr && m.tc === tc
    );
    if (!move) return false;

    board = makeMove(board, fr, fc, tr, tc);

    // 턴 변경
    turn = (turn === "white") ? "black" : "white";
    legalMoves = generateLegalMoves(board, turn);

    if (legalMoves.length === 0) {
      if (isInCheck(board, turn)) {
        const winner = (turn === "white") ? "흑(black)" : "백(white)";
        infoEl.textContent = `체크메이트! ${winner} 승리!`;
      } else {
        infoEl.textContent = "스테일메이트! 무승부.";
      }
      gameOver = true;
    } else {
      updateInfo();
    }

    return true;
  }

  // 초기 렌더
  updateInfo();
  drawBoard();
});
