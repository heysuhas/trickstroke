import React from 'react';

export default function WordBoard({ gameState }) {
    const words = gameState.submittedWords || [];

    return (
        <div className="word-board">
            {words.length === 0 ? (
                <div className="empty-state">Waiting for the first word...</div>
            ) : (
                <div className="word-list">
                    {words.map((entry, i) => (
                        <div key={i} className="word-card fade-in">
                            <div className="word-author">{entry.name}</div>
                            <div className="word-text">{entry.word}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
