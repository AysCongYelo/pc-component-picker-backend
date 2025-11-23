// scripts/utils/cli.js
import readline from "readline";

/**
 * 🧠 Ask a question in the CLI and wait for user input
 * @param {string} query - The prompt message
 * @param {object} options
 * @param {boolean} [options.lowercase=true] - Convert answer to lowercase
 * @param {string|null} [options.defaultValue=null] - Default value if user presses Enter
 * @returns {Promise<string>} - The user input
 */
export async function askQuestion(query, options = {}) {
  const { lowercase = false, defaultValue = null } = options;

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();

      let response = answer.trim();
      if (!response && defaultValue !== null) {
        response = defaultValue;
      }
      if (lowercase) {
        response = response.toLowerCase();
      }

      resolve(response);
    });
  });
}

/**
 * 🧩 Confirm helper — simple yes/no prompt
 * @param {string} message
 * @returns {Promise<boolean>} true if "y" or "yes"
 */
export async function confirm(message) {
  const answer = await askQuestion(`${message} (y/n): `, { lowercase: true });
  return ["y", "yes"].includes(answer);
}
