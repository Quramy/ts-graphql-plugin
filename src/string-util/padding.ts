export function pad(letter: string, length: number) {
  const outs: string[] = [];
  for (let i = 0; i < length; i++) {
    outs.push(letter);
  }
  return outs.join('');
}
