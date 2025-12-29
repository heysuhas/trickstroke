import { useState } from 'react';
import { socket } from '../socket';

export default function WordInput({ gameState, myId, myWord }) {
    const [word, setWord] = useState('');

    const isMyTurn = gameState.currentDrawerId === myId;
    const isSubmissionPhase = gameState.phase === 'WORD_SUBMISSION';

    if (!isMyTurn || !isSubmissionPhase) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!word.trim()) return;
        socket.emit('submit_word', word);
        setWord('');
    };

    return (
        <div className="word-input-overlay">
            <div className="input-card">
                <h2>IT'S YOUR TURN!</h2>
                {myWord ? (
                    <div style={{ margin: '10px 0' }}>
                        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>SECRET WORD</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary)' }}>{myWord}</div>
                    </div>
                ) : (
                    <div style={{ margin: '10px 0' }}>
                        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>YOU ARE THE</div>
                        <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--secondary)' }}>TRICKSTER</div>
                    </div>
                )}

                <p>Type a word related to the secret topic.</p>
                <form onSubmit={handleSubmit}>
                    <input
                        className="game-input"
                        value={word}
                        onChange={e => setWord(e.target.value)}
                        placeholder={myWord ? "Type a hint..." : "Blend in..."}
                        autoFocus
                    />
                    <button className="game-btn primary big" type="submit" style={{ marginTop: 10 }}>SUBMIT</button>
                    <div style={{ fontSize: '0.8rem', marginTop: 5, opacity: 0.5 }}>Press Enter to submit</div>
                </form>
            </div>
        </div>
    );
}
