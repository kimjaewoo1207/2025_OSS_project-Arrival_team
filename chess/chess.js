// chess.js (full upgraded version)
// — includes castling, en passant, promotion modal, undo, improved attack logic —

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

function deepCopyBoard(board) { return board.map(r => r.slice()); }
function inBounds(r,c){ return r>=0 && r<8 && c>=0 && c<8; }
function isWhite(p){ return p!=='.' && p===p.toUpperCase(); }
function isBlack(p){ return p!=='.' && p===p.toLowerCase(); }
function getColor(p){ return p==='.'?null:(isWhite(p)?'white':'black'); }

const PIECE_SYMBOLS = {
  "K":"♔","Q":"♕","R":"♖","B":"♗","N":"♘","P":"♙",
  "k":"♚","q":"♛","r":"♜","b":"♝","n":"♞","p":"♟",
};

// --- Accurate Attack Detection ---
function isSquareAttackedBy(board, r, c, byColor) {
  // Pawn attacks
  const dir = byColor === 'white' ? -1 : 1;
  for (let dc of [-1,1]) {
    const nr=r+dir, nc=c+dc;
    if(inBounds(nr,nc)){
      const p=board[nr][nc];
      if(p!=='.' && getColor(p)===byColor && p.toUpperCase()==='P') return true;
    }
  }
  // Knights
  const jumps=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
  for(let [dr,dc] of jumps){
    const nr=r+dr, nc=c+dc;
    if(inBounds(nr,nc)){
      const p=board[nr][nc];
      if(p!=='.' && getColor(p)===byColor && p.toUpperCase()==='N') return true;
    }
  }
  // Sliding: rooks/bishops/queen
  const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  for(let [dr,dc] of dirs){
    let nr=r+dr, nc=c+dc, dist=1;
    while(inBounds(nr,nc)){
      const p=board[nr][nc];
      if(p!=='.'){
        if(getColor(p)===byColor){
          const up=p.toUpperCase();
          if(dist===1 && up==='K') return true;
          const rookLike = (dr===0||dc===0) && (up==='R'||up==='Q');
          const bishopLike = (dr!==0 && dc!==0) && (up==='B'||up==='Q');
          if(rookLike||bishopLike) return true;
        }
        break;
      }
      nr+=dr; nc+=dc; dist++;
    }
  }
  return false;
}

function findKing(board,color){
  const target=color==='white'?'K':'k';
  for(let r=0;r<8;r++)for(let c=0;c<8;c++) if(board[r][c]===target) return [r,c];
  return null;
}
function isInCheck(board,color){
  const kp=findKing(board,color);
  if(!kp) return true;
  const [r,c]=kp;
  const opp=color==='white'?'black':'white';
  return isSquareAttackedBy(board,r,c,opp);
}

// --- Move generation ---
function generateMovesForPiece(state,r,c){
  const {board,enPassantTarget,castlingRights}=state;
  const piece=board[r][c]; if(piece==='.') return [];
  const color=getColor(piece);
  const moves=[];
  const upper=piece.toUpperCase();

  // Pawn
  if(upper==='P'){
    const dir=color==='white'?-1:1;
    const startRow=color==='white'?6:1;
    const tr1=r+dir;
    if(inBounds(tr1,c) && board[tr1][c]==='.'){
      moves.push([tr1,c]);
      const tr2=r+2*dir;
      if(r===startRow && board[tr2][c]==='.') moves.push([tr2,c]);
    }
    for(let dc of[-1,1]){
      const nr=r+dir, nc=c+dc;
      if(inBounds(nr,nc)){
        const t=board[nr][nc];
        if(t!=='.' && getColor(t)!==color) moves.push([nr,nc]);
      }
    }
    if(enPassantTarget){
      const [er,ec]=enPassantTarget;
      if(er===r+dir && Math.abs(ec-c)===1) moves.push([er,ec]);
    }
    return moves;
  }

  // Knight
  if(upper==='N'){
    const jumps=[[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[1,-2],[-1,2],[-1,-2]];
    for(let[dr,dc]of jumps){
      const nr=r+dr,nc=c+dc;
      if(inBounds(nr,nc)){
        const t=board[nr][nc];
        if(t==='.'||getColor(t)!==color) moves.push([nr,nc]);
      }
    }
    return moves;
  }

  // Bishop/Rook/Queen
  if(['B','R','Q'].includes(upper)){
    const dirs=[];
    if(upper==='B'||upper==='Q') dirs.push([1,1],[1,-1],[-1,1],[-1,-1]);
    if(upper==='R'||upper==='Q') dirs.push([1,0],[-1,0],[0,1],[0,-1]);
    for(let[dr,dc] of dirs){
      let nr=r+dr,nc=c+dc;
      while(inBounds(nr,nc)){
        const t=board[nr][nc];
        if(t==='.') moves.push([nr,nc]);
        else { if(getColor(t)!==color) moves.push([nr,nc]); break; }
        nr+=dr; nc+=dc;
      }
    }
    return moves;
  }

  // King + Castling
  if(upper==='K'){
    for(let dr=-1;dr<=1;dr++)for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc) continue;
      const nr=r+dr,nc=c+dc;
      if(inBounds(nr,nc)){
        const t=board[nr][nc];
        if(t==='.'||getColor(t)!==color) moves.push([nr,nc]);
      }
    }
    const side=color;
    const rank=color==='white'?7:0;
    if(r===rank && c===4){
      if(castlingRights[side].K && board[rank][5]==='.' && board[rank][6]==='.'){
        if(!isSquareAttackedBy(board,rank,4,color==='white'?'black':'white')&&
           !isSquareAttackedBy(board,rank,5,color==='white'?'black':'white')&&
           !isSquareAttackedBy(board,rank,6,color==='white'?'black':'white'))
          moves.push([rank,6]);
      }
      if(castlingRights[side].Q && board[rank][1]==='.' && board[rank][2]==='.' && board[rank][3]==='.'){
        if(!isSquareAttackedBy(board,rank,4,color==='white'?'black':'white')&&
           !isSquareAttackedBy(board,rank,3,color==='white'?'black':'white')&&
           !isSquareAttackedBy(board,rank,2,color==='white'?'black':'white'))
          moves.push([rank,2]);
      }
    }
  }
  return moves;
}

async function makeMoveState(state,fr,fc,tr,tc){
  const board=deepCopyBoard(state.board);
  let piece=board[fr][fc];
  board[fr][fc]='.';
  const color=getColor(piece);

  // En Passant capture
  if(piece.toUpperCase()==='P' && state.enPassantTarget){
    const [er,ec]=state.enPassantTarget;
    if(tr===er && tc===ec && fc!==tc && board[tr][tc]==='.'){
      const capRow = tr + (color==='white'?1:-1);
      board[capRow][tc]='.';
    }
  }

  let newEnPassant=null;
  if(piece.toUpperCase()==='P' && Math.abs(tr-fr)===2)
    newEnPassant=[(fr+tr)/2,fc];

  // Castling
  const castlingRights=JSON.parse(JSON.stringify(state.castlingRights));
  if(piece==='K'||piece==='k'){
    const side=piece==='K'?'white':'black';
    castlingRights[side].K=false;
    castlingRights[side].Q=false;
    if(Math.abs(tc-fc)===2){
      const rank=piece==='K'?7:0;
      if(tc===6){ board[rank][5]=board[rank][7]; board[rank][7]='.'; }
      else      { board[rank][3]=board[rank][0]; board[rank][0]='.'; }
    }
  }
  if(piece==='R'||piece==='r'){
    if(fr===7&&fc===0) castlingRights.white.Q=false;
    if(fr===7&&fc===7) castlingRights.white.K=false;
    if(fr===0&&fc===0) castlingRights.black.Q=false;
    if(fr===0&&fc===7) castlingRights.black.K=false;
  }

  // Promotion
  if(piece.toUpperCase()==='P' && (tr===0||tr===7)){
    const choice = await showPromotionModal(isWhite(piece));
    const promoted = (piece==='P') ? choice.toUpperCase() : choice;
    piece = promoted;
  }

  board[tr][tc]=piece;

  return {
    board,
    turn: state.turn==='white'?'black':'white',
    enPassantTarget:newEnPassant,
    castlingRights,
  };
}

function generateLegalMoves(state,color){
  const moves=[];
  for(let r=0;r<8;r++)for(let c=0;c<8;c++){
    const p=state.board[r][c];
    if(p==='.'||getColor(p)!==color) continue;
    const pseudo=generateMovesForPiece(state,r,c);
    for(let[tr,tc] of pseudo){
      // simulate
      // NOTE: promotion uses async, but for legal check we skip modal → treat as queen
      const backupPiece=p;
      const tempState=JSON.parse(JSON.stringify(state));
      tempState.board=deepCopyBoard(state.board);
      tempState.board[fr][fc]='.';
      tempState.board[tr][tc]=backupPiece.toUpperCase()==='P' && (tr===0||tr===7)
        ? (isWhite(backupPiece)?'Q':'q') : backupPiece;
      if(!isInCheck(tempState.board,color)) moves.push({fr:r,fc:c,tr,tc});
    }
  }
  return moves;
}

// ---------------- Rendering & UI ----------------
document.addEventListener('DOMContentLoaded',()=>{
  const boardEl=document.getElementById('board');
  const infoEl=document.getElementById('info');

  const undoBtn=document.createElement('button');
  undoBtn.textContent='Undo';
  undoBtn.style.marginTop='8px';
  document.querySelector('.app').appendChild(undoBtn);

  let state={
    board:createInitialBoard(),
    turn:'white',
    enPassantTarget:null,
    castlingRights:{white:{K:true,Q:true},black:{K:true,Q:true}},
  };

  let history=[];
  let selected=null;
  let legalMoves=generateLegalMoves(state,state.turn);
  let gameOver=false;

  function updateInfo(){
    if(gameOver) return;
    const turnText=state.turn==='white'?'백(white)':'흑(black)';
    infoEl.textContent = isInCheck(state.board,state.turn)
      ?`턴: ${turnText} - 체크 상태!`
      :`턴: ${turnText}`;
  }

  function drawBoard(){
    boardEl.innerHTML='';
    for(let r=0;r<8;r++)for(let c=0;c<8;c++){
      const sq=document.createElement('div');
      sq.className='square '+((r+c)%2?'dark':'light');
      sq.dataset.row=r; sq.dataset.col=c;

      if(selected && selected.r===r && selected.c===c) sq.classList.add('selected');
      if(selected){
        if(legalMoves.some(m=>m.fr===selected.r&&m.fc===selected.c&&m.tr===r&&m.tc===c))
          sq.classList.add('target');
      }

      const p=state.board[r][c];
      if(p!=='.'){
        sq.textContent=PIECE_SYMBOLS[p]||p;
        sq.style.color=isWhite(p)?'#fff':'#111';
      }

      const last=history[history.length-1];
      if(last){
        if((last.tr===r&&last.tc===c)||(last.fr===r&&last.fc===c))
          sq.classList.add('last-move');
      }

      sq.onclick=onSquareClick;
      boardEl.appendChild(sq);
    }
  }

  async function onSquareClick(e){
    if(gameOver) return;
    const r=+e.currentTarget.dataset.row;
    const c=+e.currentTarget.dataset.col;
    const piece=state.board[r][c];

    if(!selected){
      if(piece==='.'||getColor(piece)!==state.turn) return;
      selected={r,c};
    } else {
      const {r:fr,c:fc}=selected;
      if(fr===r&&fc===c){ selected=null; drawBoard(); return; }

      if(!await tryMove(fr,fc,r,c)){
        if(piece!=='.'&&getColor(piece)===state.turn) selected={r,c};
        else selected=null;
      } else selected=null;
    }
    drawBoard();
  }

  async function tryMove(fr,fc,tr,tc){
    const mv=legalMoves.find(m=>m.fr===fr&&m.fc===fc&&m.tr===tr&&m.tc===tc);
    if(!mv) return false;

    history.push({
      board:deepCopyBoard(state.board),
      turn:state.turn,
      enPassantTarget:state.enPassantTarget?
        state.enPassantTarget.slice():null,
      castlingRights:JSON.parse(JSON.stringify(state.castlingRights)),
      fr,fc,tr,tc,
    });

    state=await makeMoveState(state,fr,fc,tr,tc);
    legalMoves=generateLegalMoves(state,state.turn);

    if(legalMoves.length===0){
      gameOver=true;
      const winner=isInCheck(state.board,state.turn)
        ?(state.turn==='white'?'흑(black)':'백(white)')
        :'무승부';
      infoEl.textContent=isInCheck(state.board,state.turn)
        ?`체크메이트! ${winner} 승리!`
        :'스테일메이트! 무승부.';
    } else updateInfo();

    return true;
  }

  undoBtn.onclick=()=>{
    if(!history.length) return;
    const last=history.pop();
    state.board=deepCopyBoard(last.board);
    state.turn=last.turn;
    state.enPassantTarget=last.enPassantTarget;
    state.castlingRights=last.castlingRights;
    legalMoves=generateLegalMoves(state,state.turn);
    gameOver=false;
    selected=null;
    drawBoard(); updateInfo();
  };

  updateInfo(); drawBoard();
});

// Promotion Modal
function showPromotionModal(isWhite){
  return new Promise(resolve=>{
    const root=document.getElementById('promotion-root');
    const overlay=document.createElement('div'); overlay.className='promo-overlay';
    const box=document.createElement('div'); box.className='promo-box';

    ['q','r','b','n'].forEach(p=>{
      const btn=document.createElement('button');
      btn.className='promo-btn';
      btn.textContent=isWhite?PIECE_SYMBOLS[p.toUpperCase()]:PIECE_SYMBOLS[p];
      btn.onclick=()=>{ root.removeChild(overlay); resolve(p); };
      box.appendChild(btn);
    });

    overlay.appendChild(box);
    root.appendChild(overlay);
  });
}
