import { useState, useEffect } from 'react';

export default function TricksterWordSelection({ socket }) {
    const [options, setOptions] = useState([]);

    useEffect(() => {
        function onTricksterTurnStart(data) {
            setOptions(data.options);
        }

        socket.on('trickster_turn_start', onTricksterTurnStart);

        return () => {
            socket.off('trickster_turn_start', onTricksterTurnStart);
        };
    }, []);

    const handleSelect = (word) => {
        socket.emit('submit_word', word);
        setOptions([]); // Close modal
    };

    if (options.length === 0) return null;

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.8)', zIndex: 99,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div className="input-card" style={{ width: 400 }}>
                <h2 style={{ color: 'var(--secondary)', marginBottom: 10 }}>TRICKSTER ADVANTAGE</h2>
                <p style={{ marginBottom: 20 }}>You are submitting first! Pick a word to blend in or mislead others.</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {options.map((word, i) => (
                        <button
                            key={i}
                            className="game-btn primary"
                            style={{ background: '#333', border: '2px solid var(--primary)', color: 'white', padding: 15 }}
                            onClick={() => handleSelect(word)}
                        >
                            {word}
                        </button>
                    ))}
                </div>

                <div style={{ marginTop: 20, fontSize: '0.8rem', opacity: 0.5 }}>
                    (Or type manually in the main input)
                </div>
                <button
                    className="game-btn"
                    style={{ marginTop: 10, background: 'transparent', color: '#888', textDecoration: 'underline' }}
                    onClick={() => setOptions([])}
                >
                    Close & Type Manually
                </button>
            </div>
        </div>
    );
}
