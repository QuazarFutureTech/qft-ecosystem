class Logger {
    static info(msg, meta = {}) {
        console.log(JSON.stringify({ level: 'info', msg, ts: Date.now(), ...meta }));
    }

    static warn(msg, meta = {}) {
        console.warn(JSON.stringify({ level: 'warn', msg, ts: Date.now(), ...meta }));
    }

    static error(msg, meta = {}) {
        console.error(JSON.stringify({ level: 'error', msg, ts: Date.now(), ...meta }));
    }
}

module.exports = Logger;
