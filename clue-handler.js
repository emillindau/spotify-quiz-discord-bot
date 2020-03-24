export default (() => {
  let asArray = [];
  let clueArray = [];
  let indexTracker = {};

  const reset = (n1) => {
    asArray = n1.split('');
    clueArray = asArray.map((s) => (s === ' ' ? ' ' : '♫'));
    indexTracker = asArray.reduce((acc, curr, idx) => {
      if (!acc[curr]) {
        acc[curr] = [];
      }
      acc[curr].push(idx);
      return acc;
    }, {});
  };

  const handleClue = () => {
    // Get random index from the answer
    const randomIdx = Math.floor(Math.random() * asArray.length);
    // Figure out which char
    const findIdx = asArray[randomIdx];
    // Fetch thar chars indices
    const indices = indexTracker[findIdx];

    if (indices) {
      // Assign that char at each pos to the clue (revealing)
      indices.forEach((i) => (clueArray[i] = findIdx));
      // Remove char from the original array
      asArray = asArray.filter((char) => char !== findIdx);
    }

    // If there is a space we don't want to handle it as a clue
    if (findIdx === ' ') {
      return handleClue();
    }
    return clueArray.join('');
  };

  return {
    getClue: () => {
      const clue = handleClue();
      const revealed = asArray.length === 0;
      return {
        clue,
        revealed,
      };
    },
    reset,
  };
})();
