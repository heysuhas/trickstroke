import { useState } from 'react';
import { socket } from '../socket';

export default function Voting({ gameState, myId }) {
    const [selectedId, setSelectedId] = useState(null);
    const [submitted, setSubmitted] = useState(false);

    // Trickster doesn't vote? Rules say everyone votes.

    const handleVote = (targetId) => {
        if (submitted) return;
        setSelectedId(targetId);
    };

    const submitVote = () => {
        if (!selectedId) return;
        socket.emit('submit_vote', selectedId);
        setSubmitted(true);
    };

    return (
        <div className="panel" style={{ height: '100%' }}>
            <h2 style={{ margin: 0, color: 'var(--secondary)' }}>VOTE OUT</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, overflowY: 'auto', flex: 1 }}>
                {gameState.players.map(p => (
                    <button
                        key={p.id}
                        className={`game-btn ${selectedId === p.id ? 'primary' : ''}`}
                        style={{
                            background: selectedId === p.id ? 'var(--secondary)' : '#333',
                            color: 'white',
                            height: 80,
                            fontSize: '1rem',
                            opacity: submitted ? 0.5 : 1
                        }}
                        onClick={() => handleVote(p.id)}
                        disabled={submitted}
                    >
                        {p.name}
                    </button>
                ))}
            </div>
            <button
                className="game-btn big"
                style={{ background: '#555', marginTop: 10, border: '2px solid #888' }}
                disabled={!selectedId || submitted}
                onClick={() => handleVote('SKIP')}
            >
                SKIP VOTING (NO ONE DIES)
            </button>
            <button
                className="game-btn big"
                style={{ background: 'var(--secondary)', marginTop: 10 }}
                disabled={!selectedId || submitted}
                onClick={submitVote}
            >
                {submitted ? 'WAITING...' : 'CONFIRM VOTE'}
            </button>
        </div>
    );
}
