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
            <div className="bottom-input-bar">
                <div className="input-info">
                    {myWord ? (
                        <>
                            <div style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase' }}>Secret Word</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--primary)', lineHeight: 1 }}>{myWord}</div>
                        </>
                    ) : (
                        <>
                            <div style={{ fontSize: '0.8rem', opacity: 0.8, textTransform: 'uppercase' }}>Role</div>
                            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--secondary)', lineHeight: 1 }}>TRICKSTER</div>
                        </>
                    )}
                </div>

                <form className="input-form" onSubmit={handleSubmit}>
                    <input
                        className="game-input"
                        style={{ borderRadius: 50, padding: '10px 25px' }}
                        value={word}
                        onChange={e => setWord(e.target.value)}
                        placeholder={myWord ? "Type a hint..." : "Blend in..."}
                        autoFocus
                    />
                    <button className="game-btn primary" type="submit" style={{ borderRadius: 50, padding: '0 30px' }}>SUBMIT</button>
                </form>
            </div>
        </div>
    );
}
