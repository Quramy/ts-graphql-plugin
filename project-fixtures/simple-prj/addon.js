module.exports = (ctx) => {
  return {
    document: () => {
      ctx.source.writeLeadingComment('Hello, Addon!');
    },
  };
};
