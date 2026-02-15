import React from "react";

const baseSudokuUrl = new URL(
  "sudokus/",
  new URL(import.meta.env.BASE_URL, window.location.href)
);

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

function SudokuGrid({ rows, baseRows }) {
  const cells = [];

  for (let rowIndex = 0; rowIndex < 9; rowIndex += 1) {
    for (let colIndex = 0; colIndex < 9; colIndex += 1) {
      const value = rows?.[rowIndex]?.[colIndex] ?? 0;
      const baseValue = baseRows?.[rowIndex]?.[colIndex] ?? 0;
      const classes = ["cell"];

      if (!value) {
        classes.push("empty");
      }
      if (value && !baseValue) {
        classes.push("solved");
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

function PuzzleCard({ puzzle, onOpen, isLowest, isHighest }) {
  return (
    <button
      className={`puzzle-card preview ${isLowest ? "low" : ""} ${
        isHighest ? "high" : ""
      }`}
      type="button"
      onClick={onOpen}
    >
      <h2 className="puzzle-title">{puzzle.name}</h2>
      <SudokuGrid rows={puzzle.rows} />
      {puzzle.errors.length > 0 && (
        <div className="error">{puzzle.errors.join(" ")}</div>
      )}
    </button>
  );
}

function isValid(board, row, col, value) {
  for (let index = 0; index < 9; index += 1) {
    if (board[row][index] === value) return false;
    if (board[index][col] === value) return false;
  }

  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      if (board[r][c] === value) return false;
    }
  }

  return true;
}

function solveBoard(board) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] === 0) {
        for (let value = 1; value <= 9; value += 1) {
          if (isValid(board, row, col, value)) {
            board[row][col] = value;
            if (solveBoard(board)) return true;
            board[row][col] = 0;
          }
        }
        return false;
      }
    }
  }

  return true;
}

function solveSudoku(rows) {
  if (!Array.isArray(rows) || rows.length !== 9) {
    return { solution: null, error: "Puzzle must have 9 rows." };
  }

  const board = rows.map((row) => row.slice());

  for (let row = 0; row < 9; row += 1) {
    if (!Array.isArray(board[row]) || board[row].length !== 9) {
      return { solution: null, error: `Row ${row + 1} must have 9 values.` };
    }

    for (let col = 0; col < 9; col += 1) {
      const value = board[row][col];
      if (!Number.isFinite(value) || value < 0 || value > 9) {
        return { solution: null, error: "Values must be numbers 0-9." };
      }
      if (value !== 0) {
        board[row][col] = 0;
        if (!isValid(board, row, col, value)) {
          return { solution: null, error: "Puzzle has conflicting values." };
        }
        board[row][col] = value;
      }
    }
  }

  if (!solveBoard(board)) {
    return { solution: null, error: "No solution found." };
  }

  return { solution: board, error: null };
}

export default function App() {
  const [puzzles, setPuzzles] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [activePuzzleName, setActivePuzzleName] = React.useState(null);
  const [solutions, setSolutions] = React.useState({});
  const [solveErrors, setSolveErrors] = React.useState({});
  const [searchTerm, setSearchTerm] = React.useState("");

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

  const filteredPuzzles = puzzles.filter((puzzle) =>
    puzzle.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const puzzleNames = puzzles.map((puzzle) => puzzle.name);
  const numericNames = puzzleNames
    .map((name) => Number.parseInt(name, 10))
    .filter((value) => Number.isFinite(value));
  const lowestName =
    numericNames.length > 0
      ? String(Math.min(...numericNames))
      : puzzleNames.slice().sort()[0] || "";
  const highestName =
    numericNames.length > 0
      ? String(Math.max(...numericNames))
      : puzzleNames.slice().sort().slice(-1)[0] || "";

  const activePuzzle = puzzles.find(
    (puzzle) => puzzle.name === activePuzzleName
  );
  const activeSolution = activePuzzle
    ? solutions[activePuzzle.name]
    : undefined;
  const activeSolveError = activePuzzle
    ? solveErrors[activePuzzle.name]
    : undefined;

  const handleSolve = () => {
    if (!activePuzzle) return;
    const { solution, error } = solveSudoku(activePuzzle.rows);

    setSolutions((prev) => ({
      ...prev,
      [activePuzzle.name]: solution,
    }));
    setSolveErrors((prev) => ({
      ...prev,
      [activePuzzle.name]: error,
    }));
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Sudoku Viewer</h1>
        <p>For the Mr Beast challenge.</p>
        <p className="contribute-link">
          To contribute more sudokus, make a PR{" "}
          <a
            href="https://github.com/danicax/mrbeast_sudoku/tree/main/public/sudokus"
            target="_blank"
            rel="noreferrer"
          >
            here
          </a>
          .
        </p>
        <div className="stats-row">
          <span className="stat low">Lowest: {lowestName || "—"}</span>
          <span className="stat high">Highest: {highestName || "—"}</span>
        </div>
        
        <input
          className="search-input"
          type="search"
          placeholder="Search by puzzle name..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
        
      </header>
      {loading && <div className="loading">Loading puzzles...</div>}
      <section className="puzzle-list">
        {filteredPuzzles.map((puzzle) => (
          <PuzzleCard
            key={puzzle.name}
            puzzle={puzzle}
            onOpen={() => setActivePuzzleName(puzzle.name)}
            isLowest={puzzle.name === lowestName}
            isHighest={puzzle.name === highestName}
          />
        ))}
      </section>
      {activePuzzle && (
        <div
          className="modal-backdrop"
          onClick={() => setActivePuzzleName(null)}
          role="presentation"
        >
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <header className="modal-header">
              <div>
                <h2 className="puzzle-title">{activePuzzle.name}</h2>
              </div>
              <button
                className="modal-close"
                type="button"
                onClick={() => setActivePuzzleName(null)}
              >
                Close
              </button>
            </header>
            <SudokuGrid
              rows={activeSolution || activePuzzle.rows}
              baseRows={activePuzzle.rows}
            />
            {activePuzzle.errors.length > 0 && (
              <div className="error">{activePuzzle.errors.join(" ")}</div>
            )}
            {activeSolveError && <div className="error">{activeSolveError}</div>}
            <div className="modal-actions">
              <button
                className="solve-button"
                type="button"
                onClick={handleSolve}
                disabled={activePuzzle.errors.length > 0}
              >
                Solve Sudoku
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

