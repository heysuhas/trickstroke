import { useEffect, useState } from 'react';

export default function Leaderboard({ gameState, title = "LEADERBOARD", subTitle = "SCORES" }) {
    const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.95)', zIndex: 200,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(10px)'
        }}>
            <div className="input-card pop-in" style={{ width: 600, maxWidth: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                <h1 style={{ fontSize: '3rem', color: 'var(--primary)', margin: '0 0 10px 0', textShadow: '0 0 20px var(--primary-dark)' }}>{title}</h1>
                <div style={{ fontSize: '1.2rem', color: '#888', marginBottom: 30, letterSpacing: 2 }}>{subTitle}</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 15, width: '100%' }}>
                    {sortedPlayers.map((p, i) => (
                        <div key={p.id} className="panel" style={{
                            padding: '15px 30px',
                            background: i === 0 ? 'var(--primary)' : '#333',
                            color: i === 0 ? 'black' : 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            transform: `scale(${i === 0 ? 1.05 : 1})`,
                            border: i === 0 ? '4px solid white' : 'none',
                            transition: 'all 0.3s ease'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900, width: 30 }}>#{i + 1}</div>
                                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{p.name}</div>
                            </div>
                            <div style={{ fontSize: '2rem', fontWeight: 900 }}>{p.score}</div>
                        </div>
                    ))}
                </div>

                {gameState.phase === 'LEADERBOARD' && (
                    <div style={{ marginTop: 30, color: 'var(--accent)', animation: 'pulse 1s infinite' }}>
                        NEXT ROUND STARTING SOON...
                    </div>
                )}

                {gameState.phase === 'GAME_OVER' && (
                    <div style={{ marginTop: 30 }}>
                        <button className="game-btn primary big" onClick={() => location.reload()}>EXIT TO LOBBY</button>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0% { opacity: 0.5; }
                    50% { opacity: 1; }
                    100% { opacity: 0.5; }
                }
            `}</style>
        </div>
    );
}
