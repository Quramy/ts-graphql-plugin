const resetCode = '\u001b[0m';
const colorCode = {
  thin: '\u001b[2m',
  invert: '\u001b[7m',
  black: '\u001b[30m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  magenta: '\u001b[35m',
  cyan: '\u001b[36m',
  white: '\u001b[37m',
};

export const color = Object.entries(colorCode).reduce((acc: any, [name, code]) => {
  return {
    ...acc,
    [name]: (msg: string) => code + msg + resetCode,
  };
}, {}) as {
  [P in keyof typeof colorCode]: (msg: string) => string;
};

export function clearColor(msg: string) {
  const outs: string[] = [];
  let i = 0;
  while (i < msg.length) {
    const charactor = msg[i++];
    if (charactor === '\u001b') {
      while (msg[i++] !== 'm') continue;
    } else {
      outs.push(charactor);
    }
  }
  return outs.join('');
}
