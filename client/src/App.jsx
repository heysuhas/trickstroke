import { useState, useEffect } from 'react';
import { socket } from './socket';
import Lobby from './components/Lobby';
import GameInfo from './components/GameInfo';
import WordBoard from './components/WordBoard';
import WordInput from './components/WordInput';
import Chat from './components/Chat';
import Voting from './components/Voting';
import TricksterWordSelection from './components/TricksterWordSelection';
import Logo from './components/Logo';
import Leaderboard from './components/Leaderboard';
import './index.css';

function App() {
    const [isConnected, setIsConnected] = useState(socket.connected);
    const [gameState, setGameState] = useState(null);
    const [playerId, setPlayerId] = useState(socket.id);
    const [alertMsg, setAlertMsg] = useState(null);
    const [roundResult, setRoundResult] = useState(null);
    const [isTricksterPicking, setIsTricksterPicking] = useState(false);

    // Track my role info
    const [myRoleData, setMyRoleData] = useState({ role: null, word: null });

    useEffect(() => {
        function onConnect() {
            setIsConnected(true);
            setPlayerId(socket.id);
        }

        function onDisconnect() {
            setIsConnected(false);
        }

        function onUpdateState(state) {
            setGameState(state);
        }

        function onRoleAssigned(data) {
            console.log("Role Assigned:", data);
            setMyRoleData(data);
            setRoundResult(null);
            setIsTricksterPicking(false);
        }

        function onRoundEnd(data) {
            setRoundResult(data);
        }

        function onGameOver(data) {
            setRoundResult(data);
        }

        function onError(data) {
            setAlertMsg(data.message);
            setTimeout(() => setAlertMsg(null), 3000);
        }

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('update_state', onUpdateState);
        socket.on('role_assigned', onRoleAssigned);
        socket.on('round_end', onRoundEnd);
        socket.on('game_over', onGameOver);
        socket.on('error', onError);

        socket.connect();

        return () => {
            socket.off('connect', onConnect);
            socket.off('disconnect', onDisconnect);
            socket.off('update_state', onUpdateState);
            socket.off('role_assigned', onRoleAssigned);
            socket.off('round_end', onRoundEnd);
            socket.off('game_over', onGameOver);
            socket.off('error', onError);
        };
    }, []);

    const handleAlert = (msg) => {
        setAlertMsg(msg);
        setTimeout(() => setAlertMsg(null), 3000);
    };

    if (!gameState || gameState.phase === 'LOBBY') {
        return (
            <>
                <Lobby gameState={gameState} onAlert={handleAlert} />
                {alertMsg && <div className="toast pop-in">{alertMsg}</div>}
            </>
        );
    }

    const isGameActive = [
        'ROLE_ASSIGNMENT',
        'WORD_SELECTION',
        'DRAW_ORDER_ASSIGNMENT',
        'WORD_SUBMISSION',
        'DISCUSSION',
        'VOTING',
        'LEADERBOARD',
        'GAME_OVER'
    ].includes(gameState.phase);

    const isVoting = gameState.phase === 'VOTING';

    return (
        <div className="game-layout">
            {alertMsg && <div className="toast pop-in">{alertMsg}</div>}

            <header className="header">
                <div>
                    <Logo width="200" />
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    {gameState.currentMatch && (
                        <div className="room-badge" style={{ background: 'var(--accent)', color: 'black' }}>
                            MATCH {gameState.currentMatch} | ROUND {gameState.currentRound}
                        </div>
                    )}
                    <div className="room-badge">{gameState.partyId}</div>
                </div>
            </header>

            <div className="sidebar-left">
                <GameInfo gameState={gameState} myId={playerId} />
            </div>

            <main className="main-area">
                <WordBoard gameState={gameState} />

                <WordInput gameState={gameState} myId={playerId} myWord={myRoleData.word} />

                <TricksterWordSelection socket={socket} />

                {/* Leaderboard Overlay */}
                {(gameState.phase === 'LEADERBOARD' || gameState.phase === 'GAME_OVER') && (
                    <Leaderboard
                        gameState={gameState}
                        title={gameState.phase === 'GAME_OVER' ? "FINAL RESULTS" : "ROUND RESULTS"}
                        subTitle={roundResult ? `${roundResult.winner} WON THIS ROUND!` : "SCORES"}
                    />
                )}
            </main>

            <div className="sidebar-right">
                {isVoting ? <Voting gameState={gameState} myId={playerId} /> : <Chat gameState={gameState} myId={playerId} />}
            </div>
        </div>
    );
}

export default App;
