import { useState } from 'react';
import { socket } from '../socket';
import Logo from './Logo';

export default function Lobby({ gameState, onAlert }) {
    const [name, setName] = useState('');
    const [partyCode, setPartyCode] = useState('');

    // Host Config State
    const [rounds, setRounds] = useState(3);
    const [discussionTime, setDiscussionTime] = useState(60);
    const [turnTime, setTurnTime] = useState(15);

    const createParty = () => {
        if (!name.trim()) return onAlert ? onAlert('Enter a valid name') : alert('Enter name');
        socket.emit('create_party', { playerName: name.trim() });
    };

    const joinParty = () => {
        if (!name.trim() || !partyCode.trim()) return onAlert ? onAlert('Enter name and code') : alert('Enter name and code');
        socket.emit('join_party', { playerName: name.trim(), partyId: partyCode.trim() });
    };

    const startGame = () => {
        socket.emit('start_game', {
            rounds,
            discussionTime,
            turnTime
        });
    };

    const copyCode = () => {
        navigator.clipboard.writeText(gameState.partyId);
        if (onAlert) onAlert('PARTY CODE COPIED!');
    };

    const amIHost = gameState?.players.find(p => p.id === socket.id)?.isHost;

    if (gameState) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 20 }}>
                <div className="input-card" style={{ width: 800, maxWidth: '100%' }}>
                    {/* Header & Code */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ width: 200 }}>
                            <Logo />
                        </div>
                        <div className="panel" style={{ padding: '10px 20px', flexDirection: 'row', alignItems: 'center', gap: 15, background: '#333' }}>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white' }}>{gameState.partyId}</div>
                            <button className="game-btn primary" onClick={copyCode} style={{ padding: '5px 10px', fontSize: '0.8rem' }}>
                                COPY
                            </button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 30, flexDirection: 'row', flexWrap: 'wrap' }}>
                        {/* Players List */}
                        <div style={{ flex: 1, minWidth: 300 }}>
                            <div className="panel" style={{ height: '100%', minHeight: 300 }}>
                                <h3 style={{ marginTop: 0, color: 'var(--accent)' }}>PLAYERS ({gameState.players.length})</h3>
                                <div className="player-list" style={{ overflowY: 'auto', flex: 1 }}>
                                    {gameState.players.map(p => (
                                        <div key={p.id} className="player-item">
                                            <span>
                                                <span style={{ fontWeight: 'bold', color: p.isHost ? 'var(--primary)' : 'white' }}>{p.name}</span>
                                                {p.isHost && ' 👑'}
                                            </span>
                                            {p.id === socket.id && <span style={{ opacity: 0.5, fontSize: '0.8rem' }}>(YOU)</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Host Settings */}
                        {amIHost ? (
                            <div style={{ flex: 1, minWidth: 300 }}>
                                <div className="panel" style={{ height: '100%' }}>
                                    <h3 style={{ marginTop: 0, color: 'var(--primary)' }}>GAME SETTINGS</h3>

                                    <div style={{ marginBottom: 15 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <label style={{ fontWeight: 'bold' }}>ROUNDS</label>
                                            <span style={{ color: 'var(--primary)' }}>{rounds}</span>
                                        </div>
                                        <input className="range-input" type="range" min="1" max="5" value={rounds} onChange={e => setRounds(e.target.value)} />
                                    </div>

                                    <div style={{ marginBottom: 15 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <label style={{ fontWeight: 'bold' }}>TURN TIME</label>
                                            <span style={{ color: 'var(--primary)' }}>{turnTime}s</span>
                                        </div>
                                        <input className="range-input" type="range" min="10" max="60" step="5" value={turnTime} onChange={e => setTurnTime(e.target.value)} />
                                    </div>

                                    <div style={{ marginBottom: 15 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <label style={{ fontWeight: 'bold' }}>DISCUSSION TIME</label>
                                            <span style={{ color: 'var(--primary)' }}>{discussionTime}s</span>
                                        </div>
                                        <input className="range-input" type="range" min="30" max="120" step="10" value={discussionTime} onChange={e => setDiscussionTime(e.target.value)} />
                                    </div>

                                    <div style={{ marginTop: 'auto', paddingTop: 20 }}>
                                        <button className="game-btn primary big" onClick={startGame}>
                                            START GAME
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ flex: 1, minWidth: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="panel" style={{ width: '100%', textAlign: 'center', padding: 40 }}>
                                    <h3 style={{ color: '#666' }}>WAITING FOR HOST...</h3>
                                    <p style={{ opacity: 0.5 }}>The host is configuring the game.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
            <div className="input-card" style={{ width: 350, display: 'flex', flexDirection: 'column', gap: 15 }}>
                <div style={{ marginBottom: 10, alignSelf: 'center' }}>
                    <Logo width="250" />
                </div>

                <div style={{ marginTop: 10 }}>
                    <input
                        className="game-input"
                        placeholder="YOUR NAME"
                        value={name}
                        onChange={e => setName(e.target.value)}
                    />
                </div>

                <button className="game-btn primary big" onClick={createParty}>CREATE PARTY</button>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '10px 0', opacity: 0.5 }}>
                    <div style={{ height: 1, background: 'white', flex: 1 }}></div>
                    <span>OR</span>
                    <div style={{ height: 1, background: 'white', flex: 1 }}></div>
                </div>

                <input
                    className="game-input"
                    placeholder="PARTY CODE"
                    value={partyCode}
                    onChange={e => setPartyCode(e.target.value)}
                />
                <button className="game-btn big" style={{ background: '#333', color: 'white' }} onClick={joinParty}>JOIN PARTY</button>
            </div>
        </div>
    );
}
