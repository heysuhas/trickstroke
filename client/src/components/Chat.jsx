import { useState, useEffect, useRef } from 'react';
import { socket } from '../socket';

export default function Chat({ gameState, myId }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const bottomRef = useRef(null);
    const [hasSkipped, setHasSkipped] = useState(false);

    const isChatPhase = ['LOBBY', 'DISCUSSION', 'VOTING', 'RESULT'].includes(gameState.phase);
    const isDiscussion = gameState.phase === 'DISCUSSION';

    useEffect(() => {
        function onNewChat(msg) {
            setMessages(prev => [...prev, msg]);
        }
        socket.on('new_chat', onNewChat);
        return () => socket.off('new_chat', onNewChat);
    }, []);

    useEffect(() => {
        if (gameState.phase !== 'DISCUSSION') {
            setHasSkipped(false);
        }
    }, [gameState.phase]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const send = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        socket.emit('send_chat', input);
        setInput('');
    };

    const voteSkip = () => {
        socket.emit('vote_skip');
        setHasSkipped(true);
    };

    const skipCount = gameState.skipVotesCount || 0;
    const totalPlayers = gameState.players.filter(p => p.isConnected).length;

    return (
        <div className="panel chat-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0 }}>CHAT</h3>
                {isDiscussion && (
                    <button
                        className="game-btn"
                        style={{ padding: '5px 10px', fontSize: '0.7rem', background: hasSkipped ? '#444' : 'var(--secondary)', color: 'white' }}
                        onClick={voteSkip}
                        disabled={hasSkipped}
                    >
                        SKIP ({skipCount}/{totalPlayers})
                    </button>
                )}
            </div>

            <div className="chat-messages">
                {messages.map((m, i) => (
                    <div key={m.id || i} className="chat-msg">
                        {m.sender && <strong>{m.sender}: </strong>}
                        {m.text}
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            <form onSubmit={send} style={{ display: 'flex', gap: 5 }}>
                <input
                    className="game-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={isChatPhase ? "Say something..." : "Chat disabled"}
                    disabled={!isChatPhase}
                    style={{ padding: '10px' }}
                />
            </form>
        </div>
    );
}
