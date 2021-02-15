export const generateHelpBlock = () =>
  '```css\n===== HELP =====\n\n' +
  '- Commands -\n' +
  '* wahed play (int) - Initiate play session with optional max questions parameter\n' +
  '* wahed start - Start the Quiz\n' +
  '* wahed stop [admin] - Stops the Quiz\n' +
  '* wahed next [admin] - Skips to next song\n' +
  '* wahed guess (your guess) - Guess on current song. Or just type\n' +
  '* wahed help - Generates this page\n' +
  '* wahed ranking - Display current Highscores\n' +
  '* wahed status - Show current status\n\n' +
  '- Rules -\n' +
  '# Guess song by typing\n' +
  '# Correct guess gives 10 points\n' +
  '# Games done when 20 questions are asked\n' +
  '# Songs are 30s and will be played 2 times\n' +
  '# Thats it..\n\n' +
  '===== HELP =====\n' +
  '```';

export const generateSchedule = () =>
  '```css\n===== SCHEDULE by SJ =====\n\n' +
  '- Time -\n' +
  '* [13:30] - Sink the Bismarck! #quiz\n' +
  '* [16:00] - Rasputin (high funk) #quiz\n' +
  '```';
