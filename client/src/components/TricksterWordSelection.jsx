import { useState, useEffect } from 'react';

export default function TricksterWordSelection({ socket }) {
    export default function TricksterWordSelection({ socket, onShow }) {
        const [options, setOptions] = useState([]);

        const [customWord, setCustomWord] = useState('');

        useEffect(() => {
            function onTricksterTurnStart(data) {
                setOptions(data.options);
                setCustomWord('');
                if (onShow) onShow(true);
            }

            socket.on('trickster_turn_start', onTricksterTurnStart);

            return () => {
                socket.off('trickster_turn_start', onTricksterTurnStart);
            };
        }, [onShow]);

        const handleSelect = (word) => {
            socket.emit('submit_word', word);
            setOptions([]); // Close modal
            if (onShow) onShow(false);
        };

        const handleCustomSubmit = (e) => {
            e.preventDefault();
            if (customWord.trim()) {
                handleSelect(customWord.trim());
            }
        };

        if (options.length === 0) return null;

        return (
            <div style={{
                position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0,0,0,0.8)', zIndex: 99,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                <div className="input-card pop-in" style={{ width: 450 }}>
                    <h2 style={{ color: 'var(--secondary)', marginBottom: 10 }}>TRICKSTER ADVANTAGE</h2>
                    <p style={{ marginBottom: 20 }}>Pick a word to blend in OR type your own!</p>

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

                    <div style={{ marginTop: 25, borderTop: '1px solid #555', paddingTop: 20 }}>
                        <form onSubmit={handleCustomSubmit} style={{ display: 'flex', gap: 10 }}>
                            <input
                                className="game-input"
                                placeholder="Or type custom word..."
                                value={customWord}
                                onChange={e => setCustomWord(e.target.value)}
                                autoFocus
                            />
                            <button type="submit" className="game-btn primary">SUBMIT</button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }
