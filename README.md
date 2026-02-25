# MetricMastery Quiz Blast 🎉

A fun, interactive quiz game where you estimate the physical measurements of everyday objects — mass, dimensions, volume, and surface area. Built with React and Vite.

## Overview

MetricMastery Quiz Blast challenges you to guess real-world metric properties of common items like batteries, coins, sports balls, office supplies, and more. Each quiz consists of 10 randomly selected questions in two possible formats:

- **Multiple choice** – Pick the closest measurement from four options.
- **Short answer** – Type in your best numerical estimate and earn partial credit based on how close you are.

## Features

- 10-question quiz drawn from a library of 35+ everyday items
- Two answer modes per question (randomly assigned): multiple choice and short answer
- Partial credit scoring for short-answer questions based on accuracy
- Item images displayed as visual clues
- Instant feedback with a fun message after each answer
- End-of-quiz summary showing your score, each question result, and your estimated vs. correct values

## Scoring

| Mode | Condition | Points |
|------|-----------|--------|
| Multiple choice | Correct answer | 5 |
| Multiple choice | Wrong answer | 0 |
| Short answer | Within 10% of correct value | 5 |
| Short answer | Within 20% of correct value | 3 |
| Short answer | Within 30% of correct value | 1 |
| Short answer | More than 30% off | 0 |

Maximum score per quiz: **50 points** (10 questions × 5 points).

## Item Categories

Questions are drawn from items across these categories:

- **Office** – Paper sheet, sticky note, pencil, eraser, paperclip, glue stick, payment card
- **Currency** – US penny, nickel, dime, quarter, $1 bill
- **Battery** – AA, AAA, 9V, CR2032 coin cell
- **Sports** – Tennis ball, golf ball, table tennis ball, baseball, golf tee
- **Electronics** – Smartphone, TV remote
- **Household** – Soda can, 2 L bottle, 1 gallon milk jug
- **Kitchen** – Metal tablespoon
- **Personal care** – Manual toothbrush, bar soap
- **Toy / Game** – Rubik's Cube, six-sided die, playing card
- **Container** – 500 mL water bottle, bottle cap

## Tech Stack

| Tool | Version |
|------|---------|
| [React](https://react.dev/) | ^18.3.1 |
| [Vite](https://vitejs.dev/) | ^5.4.10 |
| [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react) | ^4.3.1 |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (bundled with Node.js)

### Install dependencies

```bash
npm install
```

### Run in development mode

```bash
npm run dev
```

Open the local URL printed in the terminal (typically `http://localhost:5173`) to play the game.

### Build for production

```bash
npm run build
```

The output is placed in the `dist/` directory.

### Preview the production build

```bash
npm run preview
```

## Run with Docker

### Build the image

```bash
docker build -t metricmastery-quiz .
```

### Run the container

```bash
docker run --rm -p 8080:8080 metricmastery-quiz
```

Open `http://localhost:8080` in your browser.

## Project Structure

```
MetricMastery/
├── index.html              # HTML entry point
├── items_reference.json    # Item data (mass, dimensions, derived metrics)
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx            # React entry point
    ├── App.jsx             # Main application component and game logic
    └── styles.css          # Application styles
```

### `items_reference.json`

Each entry in the item library includes:

| Field | Description |
|-------|-------------|
| `item_key` | Unique identifier |
| `display_name` | Human-readable name shown in the quiz |
| `category` | Item category |
| `standard_level` | `regulated_standard` or `common_typical` |
| `mass_g` | Mass in grams (exact value or min/max range) |
| `dimensions_mm` | Shape and size in millimetres |
| `derived_metrics` | Optional volume (mL) and/or surface area (cm²) |
| `image_url` | URL of the item image shown as a visual clue |

## License

This project is private. All rights reserved.
