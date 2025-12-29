import { useState, useEffect } from 'react';
import { socket } from '../socket';

export default function GameInfo({ gameState, myId }) {
    const [myRole, setMyRole] = useState(null);
    const [myWord, setMyWord] = useState(null);

    useEffect(() => {
        function onRole(data) {
            setMyRole(data.role);
            setMyWord(data.word);
        }
        socket.on('role_assigned', onRole);
        return () => socket.off('role_assigned', onRole);
    }, []);

    // Timer Sync: We just use gameState.timeLeft directly.
    // If we want smooth countdown between server updates, we'd need local state decrement,
    // but for MVP, server updates every 5s + events should be enough, 
    // OR we can trust the 1s tick if socket latency is low. 
    // Actually, `gameState` is only updated on events. Server sends updates every 5s now.
    // So we should prob run a local timer and sync it.

    const [displayTime, setDisplayTime] = useState(gameState.timeLeft);

    useEffect(() => {
        setDisplayTime(gameState.timeLeft);
    }, [gameState.timeLeft]);

    useEffect(() => {
        if (gameState.phase === 'LOBBY' || gameState.phase === 'RESULT') return;
        const interval = setInterval(() => {
            setDisplayTime(prev => Math.max(0, prev - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState.phase, gameState.timeLeft]); // Sync on updates

    return (
        <div className="game-info">
            <div className="panel" style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: displayTime <= 5 ? 'var(--secondary)' : 'var(--primary)' }}>
                    {displayTime}
                </div>
                <div style={{ textTransform: 'uppercase', letterSpacing: 2, fontSize: '0.8rem' }}>{gameState.phase.replace('_', ' ')}</div>
            </div>

            <div className="panel">
                <h3>PLAYERS</h3>
                <div className="player-list">
                    {gameState.players.map(p => (
                        <div key={p.id} className={`player-item ${p.id === gameState.currentDrawerId ? 'active' : ''}`}>
                            <span style={{ fontWeight: 700 }}>{p.name} {p.id === myId && '(YOU)'}</span>
                            {p.id === gameState.currentDrawerId && ' ✏️'}
                            {/* Show score? */}
                            <span style={{ color: 'var(--primary)' }}>{p.score}</span>
                        </div>
                    ))}
                </div>
            </div>

            {myRole && (
                <div className="panel" style={{ border: '2px solid var(--accent)', background: 'rgba(0, 210, 255, 0.1)' }}>
                    <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>YOUR ROLE</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900 }}>{myRole}</div>
                    {myWord && (
                        <div style={{ marginTop: 10 }}>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>SECRET WORD</div>
                            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>{myWord}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
