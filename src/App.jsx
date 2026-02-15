import React from "react";

const baseSudokuUrl = new URL("sudokus/", window.location.href);

function parsePuzzle(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const rows = [];
  const errors = [];

  lines.forEach((line, index) => {
    const matches = line.match(/\d+/g) || [];
    const numbers = matches.map((value) => Number.parseInt(value, 10));

    if (numbers.length === 0) {
      return;
    }

    if (numbers.length !== 9) {
      errors.push(`Row ${index + 1} has ${numbers.length} values, expected 9.`);
    }

    rows.push(numbers);
  });

  if (rows.length !== 9) {
    errors.push(`Puzzle has ${rows.length} rows, expected 9.`);
  }

  return {
    rows,
    errors,
  };
}

function SudokuGrid({ rows }) {
  const cells = [];

  for (let rowIndex = 0; rowIndex < 9; rowIndex += 1) {
    for (let colIndex = 0; colIndex < 9; colIndex += 1) {
      const value = rows?.[rowIndex]?.[colIndex] ?? 0;
      const classes = ["cell"];

      if (!value) {
        classes.push("empty");
      }

      if (rowIndex % 3 === 0) {
        classes.push("thick-top");
      }
      if (colIndex % 3 === 0) {
        classes.push("thick-left");
      }
      if (rowIndex === 8) {
        classes.push("thick-bottom");
      }
      if (colIndex === 8) {
        classes.push("thick-right");
      }

      cells.push(
        <div key={`${rowIndex}-${colIndex}`} className={classes.join(" ")}>
          {value || ""}
        </div>
      );
    }
  }

  return <div className="grid">{cells}</div>;
}

function PuzzleCard({ puzzle }) {
  return (
    <article className="puzzle-card">
      <h2 className="puzzle-title">{puzzle.name}</h2>
      <p className="puzzle-meta">Source: {puzzle.file}</p>
      <SudokuGrid rows={puzzle.rows} />
      {puzzle.errors.length > 0 && (
        <div className="error">{puzzle.errors.join(" ")}</div>
      )}
    </article>
  );
}

export default function App() {
  const [puzzles, setPuzzles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let alive = true;

    async function loadPuzzles() {
      try {
        const manifestResponse = await fetch(
          new URL("index.json", baseSudokuUrl)
        );
        const manifest = await manifestResponse.json();

        const loaded = await Promise.all(
          manifest.map(async (entry) => {
            const response = await fetch(new URL(entry.file, baseSudokuUrl));
            const text = await response.text();
            const parsed = parsePuzzle(text);
            return {
              ...entry,
              ...parsed,
            };
          })
        );

        if (alive) {
          setPuzzles(loaded);
        }
      } catch (error) {
        if (alive) {
          setPuzzles([
            {
              name: "Load error",
              rows: [],
              errors: [String(error)],
            },
          ]);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    loadPuzzles();

    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="page">
      <header className="header">
        <h1>Sudoku Viewer</h1>
        <p>For the Mr Beast challenge.</p>
      </header>
      {loading && <div className="loading">Loading puzzles...</div>}
      <section className="puzzle-list">
        {puzzles.map((puzzle) => (
          <PuzzleCard key={puzzle.name} puzzle={puzzle} />
        ))}
      </section>
    </div>
  );
}

