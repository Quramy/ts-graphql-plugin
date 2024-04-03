export function globToRegExp(pattern: string) {
  let reStr = '';
  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    switch (char) {
      case '/':
      case '$':
      case '^':
      case '+':
      case '.':
      case '(':
      case ')':
      case '=':
      case '!':
      case '|':
      case '[':
      case ']':
      case '{':
      case '}':
        reStr += '\\' + char;
        break;

      case '?':
        reStr += '.';
        break;

      case '*': {
        const prevChar = pattern[i - 1];
        let starCount = 1;
        while (pattern[i + 1] === '*') {
          starCount++;
          i++;
        }
        const nextChar = pattern[i + 1];
        const isGlobstar =
          starCount > 1 && (prevChar === '/' || prevChar == null) && (nextChar === '/' || nextChar == null);

        if (isGlobstar) {
          reStr += '((?:[^/]*(?:/|$))*)';
          i++;
        } else {
          reStr += '([^/]*)';
        }
        break;
      }

      default:
        reStr += char;
    }
  }

  reStr = '^' + reStr + '$';
  return new RegExp(reStr);
}
