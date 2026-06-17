// Real, friendly agent names. The overseer ("Pilot") assigns these to spawned agents.
const NAMES = [
  'Nova', 'Atlas', 'Iris', 'Felix', 'Juno', 'Orion', 'Luna', 'Cyrus',
  'Vera', 'Milo', 'Nora', 'Hugo', 'Ada', 'Leo', 'Mira', 'Theo',
  'Ivy', 'Kai', 'Zara', 'Otis', 'Lena', 'Cleo', 'Remy', 'Soren',
];
let counter = 0;

export function uniqueName(): string {
  const n = counter++;
  const name = NAMES[n % NAMES.length]!;
  const cycle = Math.floor(n / NAMES.length);
  return cycle === 0 ? name : `${name}${cycle + 1}`; // Nova, …, Soren, Nova2, …
}
