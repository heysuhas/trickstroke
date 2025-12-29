export const CONFIG = {
    MIN_PLAYERS: 4,
    MAX_PLAYERS: 8,
    // Defaults
    DEFAULT_ROUNDS: 3,
    DEFAULT_TURN_TIME: 15,
    DEFAULT_DISCUSSION_TIME: 60,
    DEFAULT_VOTING_TIME: 30
};

export const GAME_PHASES = {
    LOBBY: 'LOBBY',
    ROLE_ASSIGNMENT: 'ROLE_ASSIGNMENT',
    WORD_SUBMISSION: 'WORD_SUBMISSION',
    DISCUSSION: 'DISCUSSION',
    VOTING: 'VOTING',
    LEADERBOARD: 'LEADERBOARD',
    GAME_OVER: 'GAME_OVER'
};

export const EVENTS = {
    JOIN_PARTY: 'join_party',
    CREATE_PARTY: 'create_party',
    START_GAME: 'start_game',
    UPDATE_STATE: 'update_state',
    SUBMIT_WORD: 'submit_word',
    SERVER_STROKE: 'server_stroke',
    SEND_CHAT: 'send_chat',
    NEW_CHAT: 'new_chat',
    SUBMIT_VOTE: 'submit_vote',
    VOTE_SKIP: 'vote_skip',
    ERROR: 'error'
};

export const WORD_LIST = [
    // Animals
    'lion', 'tiger', 'elephant', 'giraffe', 'zebra', 'monkey', 'kangaroo', 'penguin', 'dolphin', 'shark', 'whale', 'octopus', 'eagle', 'parrot', 'bear', 'wolf', 'fox', 'rabbit', 'hamster', 'mouse', 'snake', 'frog', 'turtle', 'spider', 'bee', 'butterfly',
    // Food
    'pizza', 'burger', 'sushi', 'taco', 'pasta', 'steak', 'salad', 'soup', 'sandwich', 'pancake', 'waffle', 'ice cream', 'cake', 'cookie', 'donut', 'chocolate', 'popcorn', 'chips', 'apple', 'banana', 'orange', 'grape', 'strawberry', 'watermelon', 'pineapple',
    // Objects
    'computer', 'phone', 'television', 'camera', 'headphones', 'book', 'pencil', 'chair', 'table', 'bed', 'lamp', 'clock', 'mirror', 'umbrella', 'backpack', 'wallet', 'keys', 'glasses', 'watch', 'ring', 'guitar', 'piano', 'drum', 'violin',
    // Places
    'house', 'school', 'hospital', 'park', 'beach', 'mountain', 'forest', 'desert', 'city', 'farm', 'zoo', 'museum', 'library', 'cinema', 'stadium', 'airport', 'station', 'restaurant', 'hotel', 'castle',
    // Nature
    'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'wind', 'fire', 'water', 'tree', 'flower', 'grass', 'rock', 'river', 'ocean', 'volcano',
    // Professions
    'doctor', 'teacher', 'police', 'firefighter', 'chef', 'artist', 'musician', 'actor', 'pilot', 'astronaut', 'scientist', 'athlete',
    // Verbs/actions
    'run', 'jump', 'swim', 'dance', 'sing', 'sleep', 'eat', 'drink', 'read', 'write', 'paint', 'draw', 'cook', 'drive', 'fly'
];
